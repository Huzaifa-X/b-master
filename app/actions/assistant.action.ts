"use server"

import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { openai } from "@/lib/openai";
import { GenerateInstructionsParams, GenerateInstructionsResponse } from "@/types/ai-instruction"
import { AssistantCategory } from "@/types/assistant"
import { revalidatePath } from "next/cache"
import { uploadAssistantImage } from "@/app/actions/image.actions"
import { uploadToS3 } from "@/lib/aws-s3"
import {
    createVectorStore,
    addNoteToVectorStore,
    uploadAndAddToVectorStore,
} from '@/lib/vector-store'
import { triggerWebScraping } from '@/lib/web-scraper'

const INSTRUCTION_GENERATION_PROMPT = `You are an expert AI assistant creator with extensive knowledge of prompt engineering and AI system design.

Your task is to generate comprehensive, clear, and actionable instructions for AI assistants based on user descriptions. Follow these guidelines:

1. **Structure**: Create well-organized instructions with clear sections and formatting
2. **Specificity**: Be specific about behaviors, tone, and capabilities
3. **Completeness**: Cover all aspects mentioned in the user's description
4. **Professional**: Use clear, professional language suitable for AI systems
5. **Actionable**: Provide concrete instructions that an AI can follow
6. **Extensible**: Make instructions that can handle variations and edge cases

Format your response as a complete instruction set that can be directly used as an AI assistant's system prompt.`

export async function generateAssistantInstructions({
    prompt,
}: GenerateInstructionsParams): Promise<GenerateInstructionsResponse> {
    try {
        // Get authenticated user
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return {
                success: false,
                error: 'Authentication required'
            }
        }

        const userId = BigInt(session.user.id)

        if (!prompt?.trim()) {
            return {
                success: false,
                error: 'Prompt cannot be empty'
            }
        }

        const model = 'gpt-5'
        const startTime = Date.now()

        const response = await openai.responses.create({
            model: model,
            reasoning: { effort: "low" },
            instructions: INSTRUCTION_GENERATION_PROMPT,
            input: prompt,
        });

        if (!response.output_text) {
            return {
                success: false,
                error: 'No instructions were generated',
            }
        }

        // Track usage metrics
        try {
            const inputToken = response.usage?.input_tokens || 0
            const outputToken = response.usage?.output_tokens || 0
            const totalToken = inputToken + outputToken

            // Calculate cost based on pricing per 1K tokens
            const cost_per_1k_input = 0.002
            const cost_per_1k_output = 0.008
            const input_cost = (inputToken / 1000) * cost_per_1k_input
            const output_cost = (outputToken / 1000) * cost_per_1k_output
            const totalCost = input_cost + output_cost

            await prisma.usageMetric.create({
                data: {
                    userId,
                    assistantId: null as any, // No specific assistant for instruction generation
                    inputToken,
                    outputToken,
                    totalToken,
                    totalCost,
                    toolUsing: null, // No tools used for instruction generation
                    costType: 'instruction_generation'
                }
            })
        } catch (metricError) {
            console.error('Error tracking usage metrics:', metricError)
            // Don't fail the main operation if metrics tracking fails
        }

        return {
            success: true,
            instructions: response.output_text
        }
    } catch (error) {
        console.error('Error generating instructions:', error)
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to generate instructions',
        }
    }
}

// ============================================
// MULTI-STEP ASSISTANT CREATION
// ============================================

interface CreateAssistantBasicParams {
    name: string
    price: string
    category: AssistantCategory
    description: string
}

interface AssistantActionResponse {
    success: boolean
    error?: string
    assistantId?: string
}

export async function createAssistantBasic({
    name,
    price,
    category,
    description,
}: CreateAssistantBasicParams): Promise<AssistantActionResponse> {
    try {
        // Get authenticated user
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return {
                success: false,
                error: 'Authentication required'
            }
        }

        const userId = BigInt(session.user.id)

        // Validate required fields
        if (!name?.trim() || !price?.trim() || !description?.trim()) {
            return {
                success: false,
                error: 'Name, price, and description are required'
            }
        }

        // Parse and validate price
        const parsedPrice = parseFloat(price)
        if (isNaN(parsedPrice) || parsedPrice < 0) {
            return {
                success: false,
                error: 'Invalid price format'
            }
        }

        // Map category string to enum
        const categoryEnumMap: Record<AssistantCategory, any> = {
            "Education": "EDUCATION",
            "Travelling": "TRAVELLING",
            "Programming": "PROGRAMMING",
            "Markteting": "MARKETING", // Note: typo in types file
            "Analysis": "ANALYSIS",
            "Booking": "BOOKING",
            "Other": "OTHER"
        }

        const mappedCategory = categoryEnumMap[category] || "OTHER"

        // Create assistant with basic info
        const assistant = await prisma.assistant.create({
            data: {
                userId,
                name: name.trim(),
                price: parsedPrice,
                currency: "chf",
                priceType: parsedPrice === 0 ? "free" : "paid",
                category: mappedCategory,
                description: description.trim(),
                public: false, // Default to private, will be updated in sharing step
                specialAssistant: false,
            }
        })

        // Revalidate paths to update UI
        revalidatePath('/assistants')
        revalidatePath('/dashboard')

        return {
            success: true,
            assistantId: assistant.id.toString()
        }
    } catch (error) {
        console.error('Error creating assistant basic info:', error)
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to create assistant'
        }
    }
}

interface UploadAssistantImageParams {
    assistantId: string
    imageData: string // Base64 data URL
}

export async function uploadAssistantImageStep({
    assistantId,
    imageData,
}: UploadAssistantImageParams): Promise<AssistantActionResponse> {
    try {
        // Validate assistant exists and user owns it
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return {
                success: false,
                error: 'Authentication required'
            }
        }

        const userId = BigInt(session.user.id)

        const assistant = await prisma.assistant.findFirst({
            where: {
                id: BigInt(assistantId),
                userId,
            }
        })

        if (!assistant) {
            return {
                success: false,
                error: 'Assistant not found or access denied'
            }
        }

        // Validate image data
        if (!imageData || !imageData.startsWith('data:image/')) {
            return {
                success: false,
                error: 'Invalid image data'
            }
        }

        // Upload image using existing function
        const uploadResult = await uploadAssistantImage(assistantId, imageData)

        if (!uploadResult.success) {
            return {
                success: false,
                error: uploadResult.error
            }
        }

        // Revalidate paths
        revalidatePath('/assistants')
        revalidatePath('/dashboard')

        return {
            success: true,
            assistantId
        }
    } catch (error) {
        console.error('Error uploading assistant image:', error)
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to upload image'
        }
    }
}

interface CreateAssistantVectorStoreParams {
    assistantId: string
    notes: string[]
    urls: string[]
    files: File[]
}

export async function createAssistantVectorStore({
    assistantId,
    notes,
    urls,
    files,
}: CreateAssistantVectorStoreParams): Promise<AssistantActionResponse> {
    try {
        // Validate assistant exists and user owns it
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return {
                success: false,
                error: 'Authentication required'
            }
        }

        const userId = BigInt(session.user.id)

        const assistant = await prisma.assistant.findFirst({
            where: {
                id: BigInt(assistantId),
                userId,
            }
        })

        if (!assistant) {
            return {
                success: false,
                error: 'Assistant not found or access denied'
            }
        }

        // Create OpenAI vector store
        const vectorStoreName = `${assistant.name} Knowledge Base`
        const vectorStoreId = await createVectorStore(vectorStoreName)

        // Update assistant with vector store ID
        await prisma.assistant.update({
            where: { id: BigInt(assistantId) },
            data: { vectorStoreId }
        })

        // Process notes - add directly to OpenAI vector store
        for (const note of notes) {
            if (note.trim()) {
                try {
                    const noteIndex = notes.indexOf(note)
                    const noteName = `note_${noteIndex + 1}_${Date.now()}`
                    
                    // Add note to OpenAI vector store
                    const openaiFileId = await addNoteToVectorStore(
                        vectorStoreId,
                        note.trim(),
                        noteName
                    )

                    // Also save to S3 as backup
                    const noteBuffer = Buffer.from(note.trim(), 'utf-8')
                    const noteFileName = `${noteName}.txt`
                    const noteUrl = await uploadToS3(noteBuffer, noteFileName, 'text/plain', 'knowledge-base')

                    // Save to database
                    await prisma.assistantKnowledgebase.create({
                        data: {
                            assistantId: BigInt(assistantId),
                            name: `Note ${noteIndex + 1}`,
                            note: note.trim(),
                            file: noteUrl,
                            fileId: openaiFileId, // Store OpenAI file ID
                            type: 'text',
                        }
                    })

                    console.log(`✅ Note ${noteIndex + 1} added to vector store`)
                } catch (noteError) {
                    console.error(`Error processing note:`, noteError)
                    // Continue with other notes
                }
            }
        }

        // Process URLs - save to DB and trigger async scraping
        for (const url of urls) {
            if (url.trim()) {
                try {
                    // Save URL to database first
                    await prisma.assistantKnowledgebase.create({
                        data: {
                            assistantId: BigInt(assistantId),
                            name: `URL: ${url.trim()}`,
                            url: url.trim(),
                            type: 'url',
                            isCrawled: false, // Will be processed by cron job
                        }
                    })

                    // Trigger async web scraping (non-blocking)
                    triggerWebScraping({
                        url: url.trim(),
                        vectorStoreId: vectorStoreId,
                        maxPages: 20,
                    }).catch((err) => {
                        console.error(`Error triggering scraping for ${url}:`, err)
                        // Don't throw - let cron job retry later
                    })

                    console.log(`✅ URL ${url} queued for scraping`)
                } catch (urlError) {
                    console.error(`Error processing URL ${url}:`, urlError)
                    // Continue with other URLs
                }
            }
        }

        // Process files - upload to both OpenAI vector store and S3
        for (const file of files) {
            try {
                const buffer = Buffer.from(await file.arrayBuffer())
                const timestamp = Date.now()
                const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
                const fileName = `file_${timestamp}_${sanitizedName}`

                // Upload to OpenAI vector store with attributes
                const openaiFileId = await uploadAndAddToVectorStore(
                    vectorStoreId,
                    buffer,
                    file.name,
                    {
                        original_name: file.name,
                        file_type: file.type,
                        uploaded_at: Math.floor(Date.now() / 1000),
                    }
                )

                // Also upload to S3 as backup
                const fileUrl = await uploadToS3(buffer, fileName, file.type, 'knowledge-base')

                // Save to database
                await prisma.assistantKnowledgebase.create({
                    data: {
                        assistantId: BigInt(assistantId),
                        name: file.name,
                        file: fileUrl,
                        fileId: openaiFileId, // Store OpenAI file ID
                        type: 'file',
                    }
                })

                console.log(`✅ File ${file.name} added to vector store`)
            } catch (fileError) {
                console.error(`Error processing file ${file.name}:`, fileError)
                // Continue with other files
            }
        }

        // Revalidate paths
        revalidatePath('/assistants')
        revalidatePath('/dashboard')

        return {
            success: true,
            assistantId
        }
    } catch (error) {
        console.error('Error creating assistant vector store:', error)
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to create knowledge base'
        }
    }
}

interface UpdateAssistantInstructionsParams {
    assistantId: string
    instructions: string
}

export async function updateAssistantInstructions({
    assistantId,
    instructions,
}: UpdateAssistantInstructionsParams): Promise<AssistantActionResponse> {
    try {
        // Validate assistant exists and user owns it
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return {
                success: false,
                error: 'Authentication required'
            }
        }

        const userId = BigInt(session.user.id)

        const assistant = await prisma.assistant.findFirst({
            where: {
                id: BigInt(assistantId),
                userId,
            }
        })

        if (!assistant) {
            return {
                success: false,
                error: 'Assistant not found or access denied'
            }
        }

        // Validate instructions
        if (!instructions?.trim()) {
            return {
                success: false,
                error: 'Instructions cannot be empty'
            }
        }

        // Update assistant instructions
        await prisma.assistant.update({
            where: { id: BigInt(assistantId) },
            data: { instructions: instructions.trim() }
        })

        // Revalidate paths
        revalidatePath('/assistants')
        revalidatePath('/dashboard')

        return {
            success: true,
            assistantId
        }
    } catch (error) {
        console.error('Error updating assistant instructions:', error)
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to update instructions'
        }
    }
}

interface UpdateAssistantApiConfigParams {
    assistantId: string
    authenticationType: string
    apiKey?: string
    authType?: string
    customHeaderName?: string
    clientId?: string
    clientSecret?: string
    authorizationUrl?: string
    tokenUrl?: string
    scope?: string
    tokenExchangeMethod?: string
    schemaText?: string
    schema?: any
}

export async function updateAssistantApiConfig({
    assistantId,
    authenticationType,
    apiKey,
    authType,
    customHeaderName,
    clientId,
    clientSecret,
    authorizationUrl,
    tokenUrl,
    scope,
    tokenExchangeMethod,
    schemaText,
    schema,
}: UpdateAssistantApiConfigParams): Promise<AssistantActionResponse> {
    try {
        // Validate assistant exists and user owns it
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return {
                success: false,
                error: 'Authentication required'
            }
        }

        const userId = BigInt(session.user.id)

        const assistant = await prisma.assistant.findFirst({
            where: {
                id: BigInt(assistantId),
                userId,
            }
        })

        if (!assistant) {
            return {
                success: false,
                error: 'Assistant not found or access denied'
            }
        }

        // Prepare API configuration data
        const apiConfigData = {
            authenticationType,
            // API Key auth fields
            apiKey: authenticationType === 'api_key' ? apiKey : null,
            authType: authenticationType === 'api_key' ? authType : null,
            customHeaderName: authenticationType === 'api_key' ? customHeaderName : null,
            // OAuth auth fields
            clientId: authenticationType === 'oauth' ? clientId : null,
            clientSecret: authenticationType === 'oauth' ? clientSecret : null,
            authorizationUrl: authenticationType === 'oauth' ? authorizationUrl : null,
            tokenUrl: authenticationType === 'oauth' ? tokenUrl : null,
            scope: authenticationType === 'oauth' ? scope : null,
            tokenExchangeMethod: authenticationType === 'oauth' ? tokenExchangeMethod : null,
            // OpenAPI schema
            schemaText,
            schema,
        }

        // Upsert API configuration (create if doesn't exist, update if exists)
        await prisma.assistantApiConfiguration.upsert({
            where: {
                assistantId: BigInt(assistantId)
            },
            update: apiConfigData,
            create: {
                assistantId: BigInt(assistantId),
                ...apiConfigData
            }
        })

        // Revalidate paths
        revalidatePath('/assistants')
        revalidatePath('/dashboard')

        return {
            success: true,
            assistantId
        }
    } catch (error) {
        console.error('Error updating assistant API configuration:', error)
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to update API configuration'
        }
    }
}

interface UpdateAssistantSharingParams {
    assistantId: string
    permissionLevel: string // "private" | "public"
    sharedUsers: Array<{
        id: string
        name: string
        email: string
        permissions: {
            chat: boolean
            contact: boolean
            messenger: boolean
            artifact: boolean
            newsFeed: boolean
        }
    }>
}

export async function updateAssistantSharing({
    assistantId,
    permissionLevel,
    sharedUsers,
}: UpdateAssistantSharingParams): Promise<AssistantActionResponse> {
    try {
        // Validate assistant exists and user owns it
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return {
                success: false,
                error: 'Authentication required'
            }
        }

        const userId = BigInt(session.user.id)

        const assistant = await prisma.assistant.findFirst({
            where: {
                id: BigInt(assistantId),
                userId,
            }
        })

        if (!assistant) {
            return {
                success: false,
                error: 'Assistant not found or access denied'
            }
        }

        // Update assistant public status
        const isPublic = permissionLevel === 'public'
        await prisma.assistant.update({
            where: { id: BigInt(assistantId) },
            data: { public: isPublic }
        })

        // Process shared users
        if (sharedUsers.length > 0) {
            // Clear existing permissions and contacts first
            await prisma.assistantUserPermission.deleteMany({
                where: { assistantId: BigInt(assistantId) }
            })

            await prisma.assistantContact.deleteMany({
                where: { assistantId: BigInt(assistantId) }
            })

            // Create new permissions and contacts
            for (const sharedUser of sharedUsers) {
                const sharedUserId = BigInt(sharedUser.id)

                // Create user permissions
                await prisma.assistantUserPermission.create({
                    data: {
                        assistantId: BigInt(assistantId),
                        userId: sharedUserId,
                        access: 'viewer', // Default access level
                        permissions: JSON.stringify(sharedUser.permissions)
                    }
                })

                // Create contact record
                await prisma.assistantContact.create({
                    data: {
                        assistantId: BigInt(assistantId),
                        userId: sharedUserId,
                    }
                })
            }
        } else {
            // If no shared users, clear all existing permissions and contacts
            await prisma.assistantUserPermission.deleteMany({
                where: { assistantId: BigInt(assistantId) }
            })

            await prisma.assistantContact.deleteMany({
                where: { assistantId: BigInt(assistantId) }
            })
        }

        // Revalidate paths
        revalidatePath('/assistants')
        revalidatePath('/dashboard')

        return {
            success: true,
            assistantId
        }
    } catch (error) {
        console.error('Error updating assistant sharing:', error)
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to update sharing settings'
        }
    }
}