"use server"

import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { openai } from "@/lib/openai";
import { GenerateInstructionsParams, GenerateInstructionsResponse } from "@/types/ai-instruction"
import { AssistantCategory } from "@/types/assistant"
import { revalidatePath } from "next/cache"
import { uploadToS3 } from "@/lib/aws-s3"
import {
    createVectorStore,
    addNoteToVectorStore,
    uploadAndAddToVectorStore,
} from '@/lib/vector-store'
import { triggerWebScraping } from '@/lib/web-scraper'
import { randomUUID } from "crypto";

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
                    assistantId: null as any,
                    inputToken,
                    outputToken,
                    totalToken,
                    totalCost,
                    toolUsing: null,
                    costType: 'instruction_generation'
                }
            })
        } catch (metricError) {
            console.error('Error tracking usage metrics:', metricError)
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
// COMPLETE ASSISTANT CREATION (ALL AT ONCE)
// ============================================

interface CreateCompleteAssistantParams {
    // Step 1: Basic Info
    name: string
    price: string
    category: AssistantCategory
    description: string

    // Step 2: Image
    imageData?: string | null

    // Step 3: Knowledge Base
    notes: string[]
    urls: string[]
    files: File[]

    // Step 4: Instructions
    instructions: string

    // Step 5: API Config
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

    // Step 6: Sharing
    permissionLevel: string
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

interface AssistantActionResponse {
    success: boolean
    error?: string
    assistantId?: string
}

export async function createCompleteAssistant(
    params: CreateCompleteAssistantParams
): Promise<AssistantActionResponse> {
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

        // ============================================
        // STEP 1: CREATE ASSISTANT WITH BASIC INFO
        // ============================================

        // Validate required fields
        if (!params.name?.trim() || !params.price?.trim() || !params.description?.trim()) {
            return {
                success: false,
                error: 'Name, price, and description are required'
            }
        }

        // Parse and validate price
        const parsedPrice = parseFloat(params.price)
        if (isNaN(parsedPrice) || parsedPrice < 0) {
            return {
                success: false,
                error: 'Invalid price format'
            }
        }

        // Map category string to enum
        const categoryEnumMap: Record<AssistantCategory, any> = {
            "Education": "EDUCATION",
            "Travelling": "TRAVEL",
            "Programming": "PROGRAMMING",
            "Markteting": "MARKETING",
            "Analysis": "ANALYSIS",
            "Booking": "BOOKING",
            "Other": "OTHER"
        }

        const mappedCategory = categoryEnumMap[params.category] || "OTHER"
        const isPublic = params.permissionLevel === 'public'

        // Create assistant with basic info
        const assistant = await prisma.assistant.create({
            data: {
                userId,
                name: params.name.trim(),
                price: parsedPrice,
                currency: "chf",
                priceType: isPublic ? "paid" : "free",
                category: mappedCategory,
                description: params.description.trim(),
                instructions: params.instructions?.trim() || null,
                public: isPublic,
            }
        })

        const assistantId = assistant.id.toString()

        console.log(`✅ Assistant created: ${assistantId}`)

        // ============================================
        // STEP 2: UPLOAD IMAGE (IF PROVIDED)
        // ============================================

        if (params.imageData && params.imageData.startsWith('data:image/')) {
            try {
                // Extract base64 data
                const base64Data = params.imageData.split(',')[1]
                const imageBuffer = Buffer.from(base64Data, 'base64')

                // Determine file extension from data URL
                const mimeMatch = params.imageData.match(/data:image\/(\w+);/)
                const extension = mimeMatch ? mimeMatch[1] : 'png'

                const fileName = `assistant_${assistantId}_${Date.now()}.${extension}`
                const mimeType = `image/${extension}`

                // Upload to S3
                const imageUrl = await uploadToS3(imageBuffer, fileName, mimeType, 'assistants')

                // Update assistant with image URL
                await prisma.assistant.update({
                    where: { id: assistant.id },
                    data: { image: imageUrl }
                })

                console.log(`✅ Image uploaded: ${imageUrl}`)
            } catch (imageError) {
                console.error('Error uploading image:', imageError)
                // Don't fail the entire operation if image upload fails
            }
        }

        // ============================================
        // STEP 3: CREATE VECTOR STORE & KNOWLEDGE BASE
        // ============================================

        let vectorStoreId: string | null = null

        // Only create vector store if there's content to add
        if (params.notes.length > 0 || params.urls.length > 0 || params.files.length > 0) {
            try {
                // Create OpenAI vector store
                const vectorStoreName = `${params.name}_${randomUUID()}`
                vectorStoreId = await createVectorStore(vectorStoreName)

                // Update assistant with vector store ID
                await prisma.assistant.update({
                    where: { id: assistant.id },
                    data: { vectorStoreId }
                })

                console.log(`✅ Vector store created: ${vectorStoreId}`)

                // Process notes
                for (const note of params.notes) {
                    if (note.trim()) {
                        try {
                            const noteIndex = params.notes.indexOf(note)
                            const noteName = `note_${noteIndex + 1}_${Date.now()}`

                            // Add note to OpenAI vector store
                            const vectorFileId = await addNoteToVectorStore(
                                vectorStoreId,
                                note.trim(),
                                noteName
                            )

                            // Save to database
                            await prisma.assistantKnowledgebase.create({
                                data: {
                                    assistantId: assistant.id,
                                    note: note.trim(),
                                    vectorFileId: vectorFileId,
                                    isCrawled: false,
                                    type: 'note',
                                }
                            })

                            console.log(`✅ Note ${noteIndex + 1} added`)
                        } catch (noteError) {
                            console.error(`Error processing note:`, noteError)
                        }
                    }
                }

                // Process URLs
                for (const url of params.urls) {
                    if (url.trim()) {
                        try {
                            // Save URL to database
                            await prisma.assistantKnowledgebase.create({
                                data: {
                                    assistantId: assistant.id,
                                    url: url.trim(),
                                    isCrawled: false,
                                    type: 'url',
                                }
                            })

                            // Trigger async web scraping
                            triggerWebScraping({
                                url: url.trim(),
                                vectorStoreId: vectorStoreId,
                                maxPages: 20,
                            }).catch((err) => {
                                console.error(`Error triggering scraping for ${url}:`, err)
                            })

                            console.log(`✅ URL queued: ${url}`)
                        } catch (urlError) {
                            console.error(`Error processing URL ${url}:`, urlError)
                        }
                    }
                }

                // Process files
                for (const file of params.files) {
                    try {
                        const buffer = Buffer.from(await file.arrayBuffer())

                        // Upload to OpenAI vector store
                        const openaiFileId = await uploadAndAddToVectorStore(
                            vectorStoreId,
                            buffer,
                            file.name.trim()
                        )

                        // Save to database
                        await prisma.assistantKnowledgebase.create({
                            data: {
                                assistantId: assistant.id,
                                file: file.name.trim() || "",
                                vectorFileId: openaiFileId,
                                type: 'file',
                            }
                        })

                        console.log(`✅ File added: ${file.name}`)
                    } catch (fileError) {
                        console.error(`Error processing file ${file.name}:`, fileError)
                    }
                }
            } catch (vectorStoreError) {
                console.error('Error creating vector store:', vectorStoreError)
                // Don't fail the entire operation
            }
        }

        // ============================================
        // STEP 5: CREATE API CONFIGURATION
        // ============================================

        try {
            const apiConfigData = {
                authenticationType: params.authenticationType,
                apiKey: params.authenticationType === 'api_key' ? params.apiKey : null,
                authType: params.authenticationType === 'api_key' ? params.authType : null,
                customHeaderName: params.authenticationType === 'api_key' ? params.customHeaderName : null,
                clientId: params.authenticationType === 'oauth' ? params.clientId : null,
                clientSecret: params.authenticationType === 'oauth' ? params.clientSecret : null,
                authorizationUrl: params.authenticationType === 'oauth' ? params.authorizationUrl : null,
                tokenUrl: params.authenticationType === 'oauth' ? params.tokenUrl : null,
                scope: params.authenticationType === 'oauth' ? params.scope : null,
                tokenExchangeMethod: params.authenticationType === 'oauth' ? params.tokenExchangeMethod : null,
                schemaText: params.schemaText,
                schema: params.schema,
            }

            await prisma.assistantApiConfiguration.create({
                data: {
                    assistantId: assistant.id,
                    ...apiConfigData
                }
            })

            console.log(`✅ API configuration created`)
        } catch (apiConfigError) {
            console.error('Error creating API configuration:', apiConfigError)
        }

        // ============================================
        // STEP 6: SET UP PERMISSIONS & SHARING
        // ============================================

        if (params.sharedUsers.length > 0) {
            try {
                for (const sharedUser of params.sharedUsers) {
                    const sharedUserId = BigInt(sharedUser.id)

                    // Create contact record with permissions
                    await prisma.assistantContact.create({
                        data: {
                            assistantId: assistant.id,
                            userId: sharedUserId,
                            access: 'editor',
                            permissions: JSON.stringify(sharedUser.permissions),
                        }
                    })
                }

                console.log(`✅ Permissions set for ${params.sharedUsers.length} users`)
            } catch (permissionsError) {
                console.error('Error setting permissions:', permissionsError)
            }
        }

        // Pin assistant to user's sidebar
        await prisma.assistantPin.create({
            data: {
                assistantId: assistant.id,
                userId: userId
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
        console.error('Error creating complete assistant:', error)
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to create assistant'
        }
    }
}