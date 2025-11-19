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

        // Send notification to creator about assistant creation
        try {
            const notificationService = (await import('@/lib/services/notifactionService')).default
            await notificationService.notifyAssistantCreated(assistantId, session.user.id)
        } catch (notificationError) {
            console.error('Error sending assistant creation notification:', notificationError)
            // Don't fail the operation if notification fails
        }

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
                                    type: 'text',
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

                        // s
                        const fileBuffer = Buffer.from(await file.arrayBuffer())
                        const fileFileName = `${file.name}.${file.type}`
                        const fileUrl = await uploadToS3(fileBuffer, fileFileName, file.type, 'knowledge-base')
                        
                        // Upload to OpenAI vector store
                        const vectorFileId = await uploadAndAddToVectorStore(
                            vectorStoreId,
                            buffer,
                            file.name
                        )
                        
                        // Save to database
                        await prisma.assistantKnowledgebase.create({
                            data: {
                                assistantId: assistant.id,
                                file: fileUrl,
                                vectorFileId: vectorFileId,
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
        
        // Automatically create AssistantContact record for the owner
        try {
            await prisma.assistantContact.create({
                data: {
                    assistantId: assistant.id,
                    userId: userId,
                    access: 'admin', // Owner gets admin access
                    permissions: JSON.stringify(['chat', 'contacts', 'messenger', 'newsfeed', 'artifacts']), // All permissions
                }
            })
            console.log('✅ Owner added to AssistantContact')
        } catch (ownerContactError) {
            // If owner contact already exists (shouldn't happen, but handle gracefully)
            console.error('Error creating owner contact (may already exist):', ownerContactError)
        }
        
        // Add shared users (filter out owner if accidentally included)
        if (params.sharedUsers.length > 0) {
            try {
                for (const sharedUser of params.sharedUsers) {
                    const sharedUserId = BigInt(sharedUser.id)
                    
                    // Skip if trying to add the owner (owner is already added above)
                    if (sharedUserId === userId) {
                        console.log('⚠️ Skipping owner in shared users list (already added automatically)')
                        continue
                    }
                    
                    // Check if contact already exists (prevent duplicates)
                    const existingContact = await prisma.assistantContact.findFirst({
                        where: {
                            assistantId: assistant.id,
                            userId: sharedUserId,
                        }
                    })
                    
                    if (existingContact) {
                        console.log(`⚠️ Skipping duplicate contact for user ${sharedUser.id}`)
                        continue
                    }
                    
                    // Create contact record with permissions
                    // Convert permission object to array format
                    const permissionArray: string[] = []
                    if (sharedUser.permissions.chat) permissionArray.push('chat')
                    if (sharedUser.permissions.contact) permissionArray.push('contacts')
                    if (sharedUser.permissions.messenger) permissionArray.push('messenger')
                    if (sharedUser.permissions.newsFeed) permissionArray.push('newsfeed')
                    if (sharedUser.permissions.artifact) permissionArray.push('artifacts')
                    
                    await prisma.assistantContact.create({
                        data: {
                            assistantId: assistant.id,
                            userId: sharedUserId,
                            access: 'user', // Shared users get 'user' access, not 'editor'
                            permissions: JSON.stringify(permissionArray),
                        }
                    })

                    // Send notification to shared user
                    try {
                        const notificationService = (await import('@/lib/services/notifactionService')).default
                        await notificationService.notifyAssistantShared(
                            assistantId,
                            sharedUser.id,
                            session.user.id
                        )
                    } catch (notificationError) {
                        console.error(`Error sending notification to shared user ${sharedUser.id}:`, notificationError)
                        // Don't fail the operation if notification fails
                    }
                }
                
                console.log(`✅ Permissions set for shared users`)
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

// ================================================================
// ASSISTANT PIN MANAGEMENT
// ================================================================

/**
 * Get all pinned assistants for the current user
 */
export async function getPinnedAssistants() {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return {
                success: false,
                error: 'Authentication required',
                assistants: []
            }
        }

        const userId = BigInt(session.user.id)

        const pinnedAssistants = await prisma.assistantPin.findMany({
            where: {
                userId
            },
            include: {
                assistant: {
                    select: {
                        id: true,
                        name: true,
                        description: true,
                        image: true,
                        category: true,
                        public: true,
                        userId: true,
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        })

        return {
            success: true,
            assistants: pinnedAssistants.map(pin => ({
                ...pin.assistant,
                id: pin.assistant.id.toString(),
                userId: pin.assistant.userId.toString(),
                pinnedAt: pin.createdAt
            }))
        }
    } catch (error) {
        console.error('Error fetching pinned assistants:', error)
        return {
            success: false,
            error: 'Failed to fetch pinned assistants',
            assistants: []
        }
    }
}

/**
 * Pin an assistant to the sidebar
 */
export async function pinAssistant(assistantId: string) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return {
                success: false,
                error: 'Authentication required'
            }
        }

        const userId = BigInt(session.user.id)
        const assistantBigInt = BigInt(assistantId)

        // Check if assistant exists
        const assistant = await prisma.assistant.findUnique({
            where: { id: assistantBigInt }
        })

        if (!assistant) {
            return {
                success: false,
                error: 'Assistant not found'
            }
        }

        // Check if already pinned
        const existingPin = await prisma.assistantPin.findUnique({
            where: {
                userId_assistantId: {
                    userId,
                    assistantId: assistantBigInt
                }
            }
        })

        if (existingPin) {
            return {
                success: false,
                error: 'Assistant already pinned'
            }
        }

        // Create pin
        await prisma.assistantPin.create({
            data: {
                userId,
                assistantId: assistantBigInt
            }
        })

        revalidatePath('/')
        revalidatePath('/assistants')

        return {
            success: true,
            message: 'Assistant pinned successfully'
        }
    } catch (error) {
        console.error('Error pinning assistant:', error)
        return {
            success: false,
            error: 'Failed to pin assistant'
        }
    }
}

/**
 * Unpin an assistant from the sidebar
 */
export async function unpinAssistant(assistantId: string) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return {
                success: false,
                error: 'Authentication required'
            }
        }

        const userId = BigInt(session.user.id)
        const assistantBigInt = BigInt(assistantId)

        // Delete pin
        await prisma.assistantPin.delete({
            where: {
                userId_assistantId: {
                    userId,
                    assistantId: assistantBigInt
                }
            }
        })

        revalidatePath('/')
        revalidatePath('/assistants')

        return {
            success: true,
            message: 'Assistant unpinned successfully'
        }
    } catch (error) {
        console.error('Error unpinning assistant:', error)
        return {
            success: false,
            error: 'Failed to unpin assistant'
        }
    }
}

/**
 * Toggle pin status for an assistant
 */
export async function togglePinAssistant(assistantId: string) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return {
                success: false,
                error: 'Authentication required'
            }
        }

        const userId = BigInt(session.user.id)
        const assistantBigInt = BigInt(assistantId)

        // Check if already pinned
        const existingPin = await prisma.assistantPin.findUnique({
            where: {
                userId_assistantId: {
                    userId,
                    assistantId: assistantBigInt
                }
            }
        })

        if (existingPin) {
            // Unpin
            await prisma.assistantPin.delete({
                where: {
                    userId_assistantId: {
                        userId,
                        assistantId: assistantBigInt
                    }
                }
            })

            revalidatePath('/')
            revalidatePath('/assistants')

            return {
                success: true,
                isPinned: false,
                message: 'Assistant unpinned successfully'
            }
        } else {
            // Pin
            await prisma.assistantPin.create({
                data: {
                    userId,
                    assistantId: assistantBigInt
                }
            })

            revalidatePath('/')
            revalidatePath('/assistants')

            return {
                success: true,
                isPinned: true,
                message: 'Assistant pinned successfully'
            }
        }
    } catch (error) {
        console.error('Error toggling pin:', error)
        return {
            success: false,
            error: 'Failed to toggle pin'
        }
    }
}

// ================================================================
// ASSISTANT DETAILS
// ================================================================

/**
 * Get single assistant details by ID
 */
export async function getAssistantById(assistantId: string) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return {
                success: false,
                error: 'Authentication required',
                assistant: null
            }
        }

        const userId = BigInt(session.user.id)
        const assistantBigInt = BigInt(assistantId)

        const assistant = await prisma.assistant.findUnique({
            where: {
                id: assistantBigInt,
                deletedAt: null
            },
            select: {
                id: true,
                name: true,
                description: true,
                image: true,
                price: true,
                currency: true,
                priceType: true,
                category: true,
                public: true,
                instructions: true,
                vectorStoreId: true,
                userId: true,
                createdAt: true,
                updatedAt: true,
                pins: {
                    where: { userId },
                    select: { id: true }
                }
            }
        })

        if (!assistant) {
            return {
                success: false,
                error: 'Assistant not found',
                assistant: null
            }
        }

        return {
            success: true,
            assistant: {
                id: assistant.id.toString(),
                name: assistant.name,
                description: assistant.description,
                image: assistant.image,
                price: Number(assistant.price),
                currency: assistant.currency,
                priceType: assistant.priceType,
                category: assistant.category,
                public: assistant.public,
                instructions: assistant.instructions,
                vectorStoreId: assistant.vectorStoreId,
                userId: assistant.userId.toString(),
                createdAt: assistant.createdAt,
                updatedAt: assistant.updatedAt,
                isPinned: assistant.pins && assistant.pins.length > 0
            }
        }
    } catch (error) {
        console.error('Error fetching assistant:', error)
        return {
            success: false,
            error: 'Failed to fetch assistant',
            assistant: null
        }
    }
}

// ================================================================
// ASSISTANT FETCHING (MY, PURCHASED, SHARED)
// ================================================================

export interface AssistantListItem {
    id: string
    name: string
    description: string | null
    image: string | null
    price: number
    currency: string
    priceType: string
    category: string
    public: boolean
    createdAt: Date
    isPinned?: boolean
}

interface GetAssistantsParams {
    type: 'my' | 'purchased' | 'shared'
    page?: number
    limit?: number
    search?: string
}

interface GetAssistantsResponse {
    success: boolean
    error?: string
    assistants: AssistantListItem[]
    pagination: {
        page: number
        limit: number
        total: number
        totalPages: number
        hasMore: boolean
    }
}

/**
 * Get assistants based on type (my, purchased, shared) with pagination
 */
export async function getAssistants({
    type,
    page = 1,
    limit = 12,
    search = ''
}: GetAssistantsParams): Promise<GetAssistantsResponse> {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return {
                success: false,
                error: 'Authentication required',
                assistants: [],
                pagination: {
                    page: 1,
                    limit,
                    total: 0,
                    totalPages: 0,
                    hasMore: false
                }
            }
        }

        const userId = BigInt(session.user.id)
        const skip = (page - 1) * limit

        // Build search filter
        const searchFilter = search ? {
            OR: [
                { name: { contains: search, mode: 'insensitive' as const } },
                { description: { contains: search, mode: 'insensitive' as const } }
            ]
        } : {}

        let assistants: any[] = []
        let total = 0

        switch (type) {
            case 'my':
                // Get assistants created by the user
                [assistants, total] = await Promise.all([
                    prisma.assistant.findMany({
                        where: {
                            userId,
                            deletedAt: null,
                            ...searchFilter
                        },
                        select: {
                            id: true,
                            name: true,
                            description: true,
                            image: true,
                            price: true,
                            currency: true,
                            priceType: true,
                            category: true,
                            public: true,
                            createdAt: true,
                            pins: {
                                where: { userId },
                                select: { id: true }
                            }
                        },
                        orderBy: { createdAt: 'desc' },
                        skip,
                        take: limit
                    }),
                    prisma.assistant.count({
                        where: {
                            userId,
                            deletedAt: null,
                            ...searchFilter
                        }
                    })
                ])
                break

            case 'purchased':
                // Get assistants purchased by the user
                [assistants, total] = await Promise.all([
                    prisma.assistantPurchase.findMany({
                        where: {
                            buyerId: userId,
                            status: 'completed',
                            deletedAt: null,
                            assistant: {
                                deletedAt: null,
                                ...searchFilter
                            }
                        },
                        select: {
                            assistant: {
                                select: {
                                    id: true,
                                    name: true,
                                    description: true,
                                    image: true,
                                    price: true,
                                    currency: true,
                                    priceType: true,
                                    category: true,
                                    public: true,
                                    createdAt: true,
                                    pins: {
                                        where: { userId },
                                        select: { id: true }
                                    }
                                }
                            }
                        },
                        orderBy: { purchaseDate: 'desc' },
                        skip,
                        take: limit
                    }).then(purchases => purchases.map(p => p.assistant)),
                    prisma.assistantPurchase.count({
                        where: {
                            buyerId: userId,
                            status: 'completed',
                            deletedAt: null,
                            assistant: {
                                deletedAt: null,
                                ...searchFilter
                            }
                        }
                    })
                ])
                break

            case 'shared':
                // Get assistants shared with the user
                [assistants, total] = await Promise.all([
                    prisma.assistantContact.findMany({
                        where: {
                            userId,
                            assistant: {
                                deletedAt: null,
                                ...searchFilter
                            }
                        },
                        select: {
                            assistant: {
                                select: {
                                    id: true,
                                    name: true,
                                    description: true,
                                    image: true,
                                    price: true,
                                    currency: true,
                                    priceType: true,
                                    category: true,
                                    public: true,
                                    createdAt: true,
                                    pins: {
                                        where: { userId },
                                        select: { id: true }
                                    }
                                }
                            }
                        },
                        orderBy: { createdAt: 'desc' },
                        skip,
                        take: limit
                    }).then(contacts => contacts.map(c => c.assistant)),
                    prisma.assistantContact.count({
                        where: {
                            userId,
                            assistant: {
                                deletedAt: null,
                                ...searchFilter
                            }
                        }
                    })
                ])
                break
        }

        const totalPages = Math.ceil(total / limit)
        const hasMore = page < totalPages

        return {
            success: true,
            assistants: assistants.map(assistant => ({
                id: assistant.id.toString(),
                name: assistant.name,
                description: assistant.description,
                image: assistant.image,
                price: Number(assistant.price),
                currency: assistant.currency,
                priceType: assistant.priceType,
                category: assistant.category,
                public: assistant.public,
                createdAt: assistant.createdAt,
                isPinned: assistant.pins && assistant.pins.length > 0
            })),
            pagination: {
                page,
                limit,
                total,
                totalPages,
                hasMore
            }
        }
    } catch (error) {
        console.error('Error fetching assistants:', error)
        return {
            success: false,
            error: 'Failed to fetch assistants',
            assistants: [],
            pagination: {
                page: 1,
                limit,
                total: 0,
                totalPages: 0,
                hasMore: false
            }
        }
    }
}

/**
 * Get user's permissions for an assistant
 */
export async function getUserAssistantPermissions(assistantId: string) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return {
                success: false,
                error: "Authentication required",
                permissions: null,
            }
        }

        const userId = BigInt(session.user.id)
        const assistantIdBigInt = BigInt(assistantId)

        // Import permission helper
        const { getUserAssistantPermissions: getPermissions } = await import("@/lib/permissions/assistant-permissions")
        
        const result = await getPermissions(assistantIdBigInt, userId)

        return {
            success: true,
            permissions: {
                hasAccess: result.hasAccess,
                access: result.access,
                permissions: result.permissions,
                isOwner: result.isOwner,
                isPurchaser: result.isPurchaser,
                isShared: result.isShared,
            },
        }
    } catch (error) {
        console.error("Error fetching user permissions:", error)
        return {
            success: false,
            error: "Failed to fetch permissions",
            permissions: null,
        }
    }
}