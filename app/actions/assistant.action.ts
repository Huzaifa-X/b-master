"use server"

import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { generateText } from "ai";
import { ai_sdk_openai } from "@/lib/ai-sdk";
import { GenerateInstructionsParams, GenerateInstructionsResponse } from "@/types/ai-instruction"
import { AssistantCategory } from "@/types/assistant"
import { revalidatePath } from "next/cache"
import {
    createVectorStore,
    addNoteToVectorStore,
    uploadAndAddToVectorStore,
    deleteVectorStore,
    deleteFileFromVectorStore,
} from '@/lib/vector-store'
import { triggerWebScraping } from '@/lib/web-scraper'
import { randomUUID } from "crypto"
import { canCreateAssistant } from '@/lib/utils/subscription-limits'
import { stripe } from '@/lib/stripe'
import { getAssistantGptPromptGeneratorPrompt } from "@/utils/prompts"
import { encrypt, decrypt } from "@/lib/encryption"
import { parseOpenAPISchema } from "@/lib/openapi-parser"
import { convertToOpenAITools, AuthConfig } from "@/lib/openapi-tool-converter"

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

        const model = 'gpt-5-mini'

        const result = await generateText({
            model: ai_sdk_openai(model),
            system: await getAssistantGptPromptGeneratorPrompt(),
            prompt,
        });

        if (!result.text) {
            return {
                success: false,
                error: 'No instructions were generated',
            }
        }

        // Track usage metrics
        try {
            const inputToken = result.totalUsage.inputTokens || 0
            const outputToken = result.totalUsage.outputTokens || 0
            const totalToken = result.totalUsage.totalTokens || 0

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
            instructions: result.text
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

    // Step 2: Image (now receives S3 URL instead of base64)
    imageURL?: string | null

    // Step 3: Knowledge Base (now receives S3 URLs instead of File objects)
    notes: string[]
    urls: string[]
    fileURLs: Array<{
        url: string
        fileName: string
        fileSize: number
    }>

    // Step 4: Instructions
    instructions: string

    // Step 5: API Config
    authenticationType: string
    apiKey?: string
    authType?: string
    customHeaderName?: string
    customQueryParamName?: string
    clientId?: string
    clientSecret?: string
    authorizationUrl?: string
    tokenUrl?: string
    scope?: string
    tokenExchangeMethod?: string
    schemaText?: string
    schema?: any
    // NEW: up to 2 API connections
    apiConfigs?: Array<{
        authenticationType: string
        apiKey?: string
        authType?: string
        customHeaderName?: string
        customQueryParamName?: string
        clientId?: string
        clientSecret?: string
        authorizationUrl?: string
        tokenUrl?: string
        scope?: string
        tokenExchangeMethod?: string
        schema?: any
        schemaText?: string
    }>

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
            library: boolean
        }
    }>
    buyerPermissions: {
        chat: boolean
        contact: boolean
        messenger: boolean
        artifact: boolean
        newsFeed: boolean
        library: boolean
    }
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
        // CHECK SUBSCRIPTION LIMITS
        // ============================================
        const limitCheck = await canCreateAssistant()
        if (!limitCheck.allowed) {
            return {
                success: false,
                error: limitCheck.error || `You have reached your plan limit of ${limitCheck.limit} assistant(s). Please upgrade your plan to create more assistants.`
            }
        }

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

        // Convert buyer permissions to JSON string array
        // Only process buyer permissions if assistant is public and buyerPermissions exists
        const buyerPermissionArray: string[] = []
        if (isPublic && params.buyerPermissions) {
            if (params.buyerPermissions.chat) buyerPermissionArray.push('chat')
            if (params.buyerPermissions.contact) buyerPermissionArray.push('contacts')
            if (params.buyerPermissions.messenger) buyerPermissionArray.push('messenger')
            if (params.buyerPermissions.newsFeed) buyerPermissionArray.push('newsfeed')
            if (params.buyerPermissions.artifact) buyerPermissionArray.push('artifacts')
        }

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
                buyerPermissions: isPublic ? JSON.stringify(buyerPermissionArray) : null,
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
        // STEP 2: SET IMAGE URL (ALREADY UPLOADED TO S3)
        // ============================================

        if (params.imageURL) {
            try {
                // Image was already uploaded to S3 by the client
                // Just update the assistant record with the URL
                await prisma.assistant.update({
                    where: { id: assistant.id },
                    data: { image: params.imageURL }
                })
                console.log(`✅ Image URL saved: ${params.imageURL}`)
            } catch (imageError) {
                console.error('⚠️ Error saving image URL:', imageError)
                // Don't fail the entire operation if saving URL fails
            }
        }

        // ============================================
        // STEP 3: CREATE VECTOR STORE & KNOWLEDGE BASE
        // ============================================

        let vectorStoreId: string | null = null

        // Only create vector store if there's content to add
        if (params.notes.length > 0 || params.urls.length > 0 || params.fileURLs.length > 0) {
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

                // Process files in parallel (already uploaded to S3, now add to OpenAI vector store)
                await Promise.all(params.fileURLs.map(async (fileData) => {
                    try {
                        // Files are already uploaded to S3, we have the URL
                        // Now we need to download from S3 and upload to OpenAI vector store

                        // Fetch file from S3 URL
                        const response = await fetch(fileData.url)
                        if (!response.ok) {
                            throw new Error(`Failed to fetch file from S3: ${response.statusText}`)
                        }

                        const arrayBuffer = await response.arrayBuffer()
                        const buffer = Buffer.from(arrayBuffer)

                        // Upload to OpenAI vector store
                        const vectorFileId = await uploadAndAddToVectorStore(
                            vectorStoreId,
                            buffer,
                            fileData.fileName
                        )

                        // Save to database with S3 URL
                        await prisma.assistantKnowledgebase.create({
                            data: {
                                assistantId: assistant.id,
                                file: fileData.url, // S3 URL (already uploaded)
                                vectorFileId: vectorFileId,
                                type: 'file',
                            }
                        })

                        console.log(`✅ File added to knowledge base: ${fileData.fileName} (S3: ${fileData.url})`)
                    } catch (fileError) {
                        console.error(`❌ Error processing file ${fileData.fileName}:`, fileError)
                        // Continue with other files even if one fails
                    }
                }))
            } catch (vectorStoreError) {
                console.error('Error creating vector store:', vectorStoreError)
                // Don't fail the entire operation
            }
        }

        // ============================================
        // STEP 5: CREATE API CONFIGURATION
        // ============================================

        // Create API configuration if schema exists OR authentication type is not 'none'
        if (params.schema || (params.authenticationType && params.authenticationType !== 'none')) {
            try {
                // Build auth config for tool generation (only if schema exists)
                const authConfigForTools: AuthConfig | undefined = params.schema ? {
                    type: params.authenticationType,
                    apiKey: params.apiKey,
                    authType: params.authType,
                    customHeaderName: params.customHeaderName,
                    clientId: params.clientId,
                    clientSecret: params.clientSecret,
                    tokenUrl: params.tokenUrl,
                } : undefined

                // Generate tools from schema (only if schema exists)
                let tools = null
                if (params.schema && authConfigForTools) {
                    try {
                        const parsedSchema = parseOpenAPISchema(params.schema)
                        const openAITools = convertToOpenAITools(parsedSchema, authConfigForTools)

                        // Store tools in format: { openaiTool: {...}, metadata: {...} }
                        // This allows us to reconstruct executors later
                        tools = openAITools.map(tool => ({
                            type: tool.openaiTool.type,
                            name: tool.openaiTool.name,
                            description: tool.openaiTool.description,
                            parameters: tool.openaiTool.parameters,
                            metadata: {
                                method: tool.metadata.method,
                                path: tool.metadata.path,
                                baseUrl: tool.metadata.baseUrl,
                                operationId: tool.metadata.operationId,
                                // Store parameter definitions for executor reconstruction
                                parameterDefinitions: tool.metadata.parameterDefinitions || []
                            }
                        }))

                        console.log(`✅ Generated ${tools.length} tools from schema`)
                    } catch (toolError) {
                        console.error('Error generating tools from schema:', toolError)
                        // Continue without tools - user can fix schema later
                    }
                }

                // Build API config data with encryption
                // Check if secondary API config was provided
                const secondaryConfig = params.apiConfigs?.[1]
                let secondaryTools: any[] | null = null

                if (secondaryConfig?.schema) {
                    try {
                        const secAuthConfig: AuthConfig = {
                            type: secondaryConfig.authenticationType,
                            apiKey: secondaryConfig.apiKey,
                            authType: secondaryConfig.authType,
                            customHeaderName: secondaryConfig.customHeaderName,
                            clientId: secondaryConfig.clientId,
                            clientSecret: secondaryConfig.clientSecret,
                            tokenUrl: secondaryConfig.tokenUrl,
                        }
                        const parsedSecSchema = parseOpenAPISchema(secondaryConfig.schema)
                        const secOpenAITools = convertToOpenAITools(parsedSecSchema, secAuthConfig)
                        secondaryTools = secOpenAITools.map(tool => ({
                            type: tool.openaiTool.type,
                            name: tool.openaiTool.name,
                            description: tool.openaiTool.description,
                            parameters: tool.openaiTool.parameters,
                            metadata: {
                                method: tool.metadata.method,
                                path: tool.metadata.path,
                                baseUrl: tool.metadata.baseUrl,
                                operationId: tool.metadata.operationId,
                                parameterDefinitions: tool.metadata.parameterDefinitions || []
                            }
                        }))
                        console.log(`✅ Generated ${secondaryTools.length} tools from secondary API schema`)
                    } catch (secToolError) {
                        console.error('Error generating tools from secondary API schema:', secToolError)
                    }
                }

                // Compose final tools value - v2 format if secondary config present
                const hasSecondary = secondaryConfig && (
                    (secondaryConfig.authenticationType && secondaryConfig.authenticationType !== 'none') ||
                    secondaryConfig.schema
                )
                const finalTools: any = hasSecondary ? {
                    version: 2,
                    primary: { tools: tools || [] },
                    secondary: {
                        authenticationType: secondaryConfig!.authenticationType,
                        apiKey: secondaryConfig!.authenticationType === 'api_key' && secondaryConfig!.apiKey ? encrypt(secondaryConfig!.apiKey) : null,
                        authType: secondaryConfig!.authenticationType === 'api_key' ? (secondaryConfig!.authType || null) : null,
                        customHeaderName: secondaryConfig!.authenticationType === 'api_key' ? (secondaryConfig!.customHeaderName || null) : null,
                        clientId: secondaryConfig!.authenticationType === 'oauth' ? (secondaryConfig!.clientId || null) : null,
                        clientSecret: secondaryConfig!.authenticationType === 'oauth' && secondaryConfig!.clientSecret ? encrypt(secondaryConfig!.clientSecret) : null,
                        tokenUrl: secondaryConfig!.authenticationType === 'oauth' ? (secondaryConfig!.tokenUrl || null) : null,
                        scope: secondaryConfig!.authenticationType === 'oauth' ? (secondaryConfig!.scope || null) : null,
                        tokenExchangeMethod: secondaryConfig!.authenticationType === 'oauth' ? (secondaryConfig!.tokenExchangeMethod || null) : null,
                        schemaText: secondaryConfig!.schemaText || null,
                        tools: secondaryTools || [],
                    }
                } : tools

                const apiConfigData = {
                    authenticationType: params.authenticationType,

                    // Encrypt API key if provided
                    apiKey: params.authenticationType === 'api_key' && params.apiKey
                        ? encrypt(params.apiKey)
                        : null,
                    authType: params.authenticationType === 'api_key' ? params.authType : null,
                    customHeaderName: params.authenticationType === 'api_key' ? params.customHeaderName : null,
                    customQueryParamName: params.authenticationType === 'api_key' && params.authType === 'query'
                        ? (params.customQueryParamName || null)
                        : null,

                    clientId: params.authenticationType === 'oauth' ? params.clientId : null,

                    // Encrypt client secret if provided
                    clientSecret: params.authenticationType === 'oauth' && params.clientSecret
                        ? encrypt(params.clientSecret)
                        : null,
                    authorizationUrl: params.authenticationType === 'oauth' ? params.authorizationUrl : null,
                    tokenUrl: params.authenticationType === 'oauth' ? params.tokenUrl : null,
                    scope: params.authenticationType === 'oauth' ? params.scope : null,
                    tokenExchangeMethod: params.authenticationType === 'oauth' ? params.tokenExchangeMethod : null,

                    schemaText: params.schemaText || null,
                    schema: params.schema || null,

                    // Store tools (v1 array OR v2 object with secondary config)
                    ...(finalTools && { tools: finalTools }),
                }

                await prisma.assistantApiConfiguration.create({
                    data: {
                        assistantId: assistant.id,
                        ...apiConfigData
                    }
                })

                console.log(`✅ API configuration created${tools ? ` with ${tools.length} primary tools` : ''}${secondaryTools ? ` + ${secondaryTools.length} secondary tools` : ''}`)
            } catch (apiConfigError) {
                console.error('Error creating API configuration:', apiConfigError)
                // Log the full error for debugging
                if (apiConfigError instanceof Error) {
                    console.error('Error details:', apiConfigError.message, apiConfigError.stack)
                }
            }
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
                userId, // Filter by current user
                assistant: {
                    deletedAt: null // Only include non-deleted assistants
                }
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
    userId: string
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
    type: 'my' | 'purchased' | 'shared' | 'public'
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
                            userId: true,
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
                            assistant: {
                                deletedAt: null,
                                ...searchFilter
                            }
                        },
                        select: {
                            assistant: {
                                select: {
                                    id: true,
                                    userId: true,
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
                            assistant: {
                                deletedAt: null,
                                ...searchFilter
                            }
                        }
                    })
                ])
                break

            case 'shared':
                // Get assistants shared with the user (exclude assistants owned by the user)
                [assistants, total] = await Promise.all([
                    prisma.assistantContact.findMany({
                        where: {
                            userId,
                            assistant: {
                                deletedAt: null,
                                userId: {
                                    not: userId // Exclude assistants owned by the current user
                                },
                                ...searchFilter
                            }
                        },
                        select: {
                            assistant: {
                                select: {
                                    id: true,
                                    userId: true,
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
                                userId: {
                                    not: userId // Exclude assistants owned by the current user
                                },
                                ...searchFilter
                            }
                        }
                    })
                ])
                break

            case 'public':
                // Get all public assistants (marketplace) excluding:
                // 1. User's own assistants
                // 2. Assistants already purchased by the user
                // 3. Assistants already shared with the user

                // First, get IDs of assistants the user has already purchased
                const purchasedAssistantIds = await prisma.assistantPurchase.findMany({
                    where: {
                        buyerId: userId
                    },
                    select: {
                        assistantId: true
                    }
                })

                const purchasedIds: bigint[] = purchasedAssistantIds.map(p => p.assistantId)

                // Get IDs of assistants that have been shared with the user
                const sharedAssistantIds = await prisma.assistantContact.findMany({
                    where: {
                        userId: userId
                    },
                    select: {
                        assistantId: true
                    }
                })

                const sharedIds: bigint[] = sharedAssistantIds.map((p: { assistantId: bigint }) => p.assistantId)

                // Combine purchased and shared IDs to exclude
                const excludedIds: bigint[] = [...purchasedIds, ...sharedIds]

                // Build where clause - exclude user's own, purchased, and shared assistants
                const publicWhere: any = {
                    public: true,
                    deletedAt: null,
                    userId: {
                        not: userId // Exclude user's own assistants
                    },
                    ...(excludedIds.length > 0 && {
                        id: {
                            notIn: excludedIds
                        }
                    })
                }

                // Add search filter if provided
                if (search) {
                    publicWhere.OR = [
                        { name: { contains: search, mode: 'insensitive' as const } },
                        { description: { contains: search, mode: 'insensitive' as const } }
                    ]
                }

                [assistants, total] = await Promise.all([
                    prisma.assistant.findMany({
                        where: publicWhere,
                        select: {
                            id: true,
                            userId: true,
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
                        where: publicWhere
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
                userId: assistant.userId.toString(),
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
 * Get full assistant data for editing (includes knowledge base, API config, shared users)
 */
export async function getAssistantForEdit(assistantId: string) {
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

        // Check if user owns the assistant
        const assistant = await prisma.assistant.findUnique({
            where: {
                id: assistantBigInt,
                deletedAt: null
            },
            include: {
                knowledgebases: {
                    select: {
                        id: true,
                        note: true,
                        url: true,
                        file: true,
                        type: true,
                    }
                },
                apiConfiguration: {
                    select: {
                        authenticationType: true,
                        apiKey: true,
                        authType: true,
                        customHeaderName: true,
                        clientId: true,
                        clientSecret: true,
                        authorizationUrl: true,
                        tokenUrl: true,
                        scope: true,
                        tokenExchangeMethod: true,
                        schemaText: true,
                        schema: true,
                    }
                },
                contacts: {
                    where: {
                        userId: {
                            not: userId // Exclude owner
                        }
                    },
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                            }
                        }
                    }
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

        // Check ownership
        if (assistant.userId !== userId) {
            return {
                success: false,
                error: 'You do not have permission to edit this assistant',
                assistant: null
            }
        }

        // Map category from enum to string
        const categoryMap: Record<string, string> = {
            "EDUCATION": "Education",
            "TRAVEL": "Travelling",
            "PROGRAMMING": "Programming",
            "MARKETING": "Markteting",
            "ANALYSIS": "Analysis",
            "BOOKING": "Booking",
            "OTHER": "Other"
        }

        // Process knowledge base
        const notes: string[] = []
        const urls: string[] = []
        const files: Array<{ url: string; name: string }> = []

        assistant.knowledgebases.forEach((kb: any) => {
            if (kb.type === 'text' && kb.note) {
                notes.push(kb.note)
            } else if (kb.type === 'url' && kb.url) {
                urls.push(kb.url)
            } else if (kb.type === 'file' && kb.file) {
                // Extract filename from URL or use a default name
                const fileName = kb.file.split('/').pop() || `file_${files.length + 1}`
                files.push({ url: kb.file, name: fileName })
            }
        })

        // Process shared users
        const sharedUsers = assistant.contacts.map((contact: any) => {
            const permissions = JSON.parse(contact.permissions as string || '[]')
            return {
                id: contact.user.id.toString(),
                name: contact.user.name || '',
                email: contact.user.email || '',
                permissions: {
                    chat: permissions.includes('chat'),
                    contact: permissions.includes('contacts'),
                    messenger: permissions.includes('messenger'),
                    artifact: permissions.includes('artifacts'),
                    newsFeed: permissions.includes('newsfeed'),
                }
            }
        })

        // Process buyer permissions
        const buyerPermissionsArray = assistant.buyerPermissions
            ? JSON.parse(assistant.buyerPermissions as string || '[]')
            : []
        const buyerPermissions = {
            chat: buyerPermissionsArray.includes('chat'),
            contact: buyerPermissionsArray.includes('contacts'),
            messenger: buyerPermissionsArray.includes('messenger'),
            artifact: buyerPermissionsArray.includes('artifacts'),
            newsFeed: buyerPermissionsArray.includes('newsfeed'),
        }

        return {
            success: true,
            assistant: {
                id: assistant.id.toString(),
                name: assistant.name,
                price: Number(assistant.price).toString(),
                category: categoryMap[assistant.category] || "Other",
                description: assistant.description || "",
                imageURL: assistant.image,
                instructions: assistant.instructions || "",
                permissionLevel: assistant.public ? "public" : "private",
                notes,
                urls,
                files, // File URLs for pre-loading
                sharedUsers,
                buyerPermissions,
                apiConfiguration: (() => {
                    if (!assistant.apiConfiguration) {
                        return {
                            authenticationType: "none",
                            apiKey: "",
                            authType: "basic",
                            customHeaderName: "",
                            clientId: "",
                            clientSecret: "",
                            authorizationUrl: "",
                            tokenUrl: "",
                            scope: "",
                            tokenExchangeMethod: "post",
                            schemaText: "",
                            schema: null,
                        }
                    }

                    const config = assistant.apiConfiguration

                    // Helper function to safely decrypt
                    const safeDecrypt = (encryptedValue: string | null | undefined): string => {
                        if (!encryptedValue) return ""
                        try {
                            return decrypt(encryptedValue)
                        } catch (error) {
                            console.error('Error decrypting value:', error)
                            return ""
                        }
                    }

                    return {
                        authenticationType: config.authenticationType || "none",
                        apiKey: safeDecrypt(config.apiKey),
                        authType: config.authType || "basic",
                        customHeaderName: config.customHeaderName || "",
                        clientId: config.clientId || "",
                        clientSecret: safeDecrypt(config.clientSecret),
                        authorizationUrl: config.authorizationUrl || "",
                        tokenUrl: config.tokenUrl || "",
                        scope: config.scope || "",
                        tokenExchangeMethod: config.tokenExchangeMethod || "post",
                        schemaText: config.schemaText || "",
                        schema: config.schema,
                    }
                })(),
            }
        }
    } catch (error) {
        console.error('Error fetching assistant for edit:', error)
        return {
            success: false,
            error: 'Failed to fetch assistant',
            assistant: null
        }
    }
}

/**
 * Update complete assistant (optimized version)
 */
export async function updateCompleteAssistant(
    assistantId: string,
    params: CreateCompleteAssistantParams
): Promise<AssistantActionResponse> {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return { success: false, error: 'Authentication required' }
        }

        const userId = BigInt(session.user.id)
        const assistantBigInt = BigInt(assistantId)

        // Check ownership
        const existingAssistant = await prisma.assistant.findUnique({
            where: { id: assistantBigInt },
            include: {
                knowledgebases: true // Fetch existing knowledgebase items
            }
        })

        if (!existingAssistant) {
            return { success: false, error: 'Assistant not found' }
        }

        if (existingAssistant.userId !== userId) {
            return { success: false, error: 'You do not have permission to edit this assistant' }
        }

        // Validate price
        const parsedPrice = parseFloat(params.price)
        if (isNaN(parsedPrice) || parsedPrice < 0) {
            return { success: false, error: 'Invalid price format' }
        }

        // Map category
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

        // Handle buyer permissions
        const buyerPermissionArray: string[] = []
        if (isPublic && params.buyerPermissions) {
            if (params.buyerPermissions.chat) buyerPermissionArray.push('chat')
            if (params.buyerPermissions.contact) buyerPermissionArray.push('contacts')
            if (params.buyerPermissions.messenger) buyerPermissionArray.push('messenger')
            if (params.buyerPermissions.newsFeed) buyerPermissionArray.push('newsfeed')
            if (params.buyerPermissions.artifact) buyerPermissionArray.push('artifacts')
        }

        // Update assistant basic info
        await prisma.assistant.update({
            where: { id: assistantBigInt },
            data: {
                name: params.name.trim(),
                price: parsedPrice,
                category: mappedCategory,
                description: params.description.trim(),
                instructions: params.instructions?.trim() || null,
                public: isPublic,
                buyerPermissions: isPublic ? JSON.stringify(buyerPermissionArray) : null,
            }
        })

        // Update image if provided (image is already uploaded to S3)
        if (params.imageURL) {
            try {
                // Image was already uploaded to S3 by the client
                // Just update the assistant record with the URL
                await prisma.assistant.update({
                    where: { id: assistantBigInt },
                    data: { image: params.imageURL }
                })
                console.log(`✅ Image URL updated: ${params.imageURL}`)
            } catch (imageError) {
                console.error('⚠️ Error updating image URL:', imageError)
                // Don't fail the entire update operation
            }
        }

        // ========================================
        // OPTIMIZED KNOWLEDGEBASE UPDATE
        // ========================================

        let vectorStoreId = existingAssistant.vectorStoreId

        // Create vector store if needed
        if ((params.notes.length > 0 || params.urls.length > 0 || params.fileURLs.length > 0) && !vectorStoreId) {
            try {
                const vectorStoreName = `${params.name}_${randomUUID()}`
                vectorStoreId = await createVectorStore(vectorStoreName)

                await prisma.assistant.update({
                    where: { id: assistantBigInt },
                    data: { vectorStoreId }
                })
            } catch (vectorStoreError) {
                console.error('Error creating vector store:', vectorStoreError)
            }
        }

        // Separate existing items by type
        const existingNotes = existingAssistant.knowledgebases.filter((kb: any) => kb.type === 'text')
        const existingUrls = existingAssistant.knowledgebases.filter((kb: any) => kb.type === 'url')
        const existingFiles = existingAssistant.knowledgebases.filter((kb: any) => kb.type === 'file')

        // ========================================
        // NOTES: Differential Update
        // ========================================
        const newNoteSet = new Set(params.notes.map(n => n.trim()).filter(Boolean))
        const existingNoteSet = new Set(existingNotes.map(n => n.note || ''))

        // Delete removed notes
        const notesToDelete = existingNotes.filter(n => !newNoteSet.has(n.note || ''))
        for (const note of notesToDelete) {
            if (note.vectorFileId && vectorStoreId) {
                try {
                    await deleteFileFromVectorStore(vectorStoreId, note.vectorFileId)
                } catch (err) {
                    console.error('Error deleting note from vector store:', err)
                }
            }
            await prisma.assistantKnowledgebase.delete({ where: { id: note.id } })
        }

        // Add new notes
        const notesToAdd = Array.from(newNoteSet).filter(n => !existingNoteSet.has(n))
        if (vectorStoreId) {
            for (const note of notesToAdd) {
                try {
                    const noteIndex = params.notes.indexOf(note)
                    const noteName = `note_${noteIndex + 1}_${Date.now()}`

                    const vectorFileId = await addNoteToVectorStore(
                        vectorStoreId,
                        note,
                        noteName
                    )

                    await prisma.assistantKnowledgebase.create({
                        data: {
                            assistantId: assistantBigInt,
                            note: note,
                            vectorFileId: vectorFileId,
                            type: 'text',
                        }
                    })
                } catch (err) {
                    console.error('Error adding note:', err)
                }
            }
        }

        // ========================================
        // URLS: Differential Update (with scraping)
        // ========================================
        const newUrlSet = new Set(params.urls.map(u => u.trim()).filter(Boolean))
        const existingUrlSet = new Set(existingUrls.map(u => u.url || ''))

        // Delete removed URLs
        const urlsToDelete = existingUrls.filter(u => !newUrlSet.has(u.url || ''))
        for (const urlItem of urlsToDelete) {
            // Only delete from vector store if it was successfully crawled
            if (urlItem.vectorFileId && vectorStoreId) {
                try {
                    await deleteFileFromVectorStore(vectorStoreId, urlItem.vectorFileId)
                } catch (err) {
                    console.error('Error deleting URL from vector store:', err)
                }
            }
            await prisma.assistantKnowledgebase.delete({ where: { id: urlItem.id } })
        }

        // Add new URLs and trigger scraping
        const urlsToAdd = Array.from(newUrlSet).filter(u => !existingUrlSet.has(u))
        if (vectorStoreId) {
            for (const url of urlsToAdd) {
                try {
                    // First create the knowledgebase entry with isCrawled: false
                    const kbEntry = await prisma.assistantKnowledgebase.create({
                        data: {
                            assistantId: assistantBigInt,
                            url: url,
                            isCrawled: false,
                            type: 'url',
                        }
                    })

                    // Trigger web scraping asynchronously
                    // The scraper will update vectorFileId and isCrawled when done
                    triggerWebScraping({
                        url: url,
                        vectorStoreId: vectorStoreId,
                        maxPages: 20,
                    })
                        .then(async (result) => {
                            if (result.success && result.vectorFileId) {
                                // Update the entry with vectorFileId once scraping completes
                                await prisma.assistantKnowledgebase.update({
                                    where: { id: kbEntry.id },
                                    data: {
                                        vectorFileId: result.vectorFileId,
                                        isCrawled: true,
                                        updatedAt: new Date()
                                    }
                                })
                                console.log(`✅ Successfully scraped and stored: ${url}`)
                            }
                        })
                        .catch((err) => {
                            console.error(`❌ Error triggering scraping for ${url}:`, err)
                        })
                } catch (err) {
                    console.error('Error adding URL:', err)
                }
            }
        }

        // ========================================
        // FILES: Differential Update (using pre-uploaded S3 URLs)
        // ========================================
        const newFileUrlSet = new Set(params.fileURLs.map(f => f.url).filter(Boolean))
        const existingFileUrls = new Set(existingFiles.map(f => f.file).filter(Boolean))

        // Delete removed files
        const filesToDelete = existingFiles.filter(f => !newFileUrlSet.has(f.file || ''))
        for (const fileItem of filesToDelete) {
            // Delete from OpenAI vector store
            if (fileItem.vectorFileId && vectorStoreId) {
                try {
                    await deleteFileFromVectorStore(vectorStoreId, fileItem.vectorFileId)
                    console.log(`✅ File deleted from vector store: ${fileItem.file}`)
                } catch (err) {
                    console.error('Error deleting file from vector store:', err)
                }
            }

            // Delete from database
            await prisma.assistantKnowledgebase.delete({ where: { id: fileItem.id } })
            console.log(`✅ File removed from database: ${fileItem.file}`)
        }

        // Add new files
        if (params.fileURLs.length > 0 && vectorStoreId) {
            for (const fileData of params.fileURLs) {
                try {
                    // Check if file with same URL already exists
                    if (existingFileUrls.has(fileData.url)) {
                        console.log(`File ${fileData.fileName} already exists, skipping`)
                        continue
                    }

                    // Files are already uploaded to S3, fetch and add to OpenAI vector store
                    const response = await fetch(fileData.url)
                    if (!response.ok) {
                        throw new Error(`Failed to fetch file from S3: ${response.statusText}`)
                    }

                    const arrayBuffer = await response.arrayBuffer()
                    const buffer = Buffer.from(arrayBuffer)

                    // Upload to OpenAI vector store
                    const vectorFileId = await uploadAndAddToVectorStore(
                        vectorStoreId,
                        buffer,
                        fileData.fileName
                    )

                    // Save to database with S3 URL
                    await prisma.assistantKnowledgebase.create({
                        data: {
                            assistantId: assistantBigInt,
                            file: fileData.url, // S3 URL (already uploaded)
                            vectorFileId: vectorFileId,
                            type: 'file',
                        }
                    })

                    console.log(`✅ File added to knowledge base: ${fileData.fileName} (S3: ${fileData.url})`)
                } catch (err) {
                    console.error(`❌ Error processing file ${fileData.fileName}:`, err)
                }
            }
        }

        // ========================================
        // API Configuration Update
        // ========================================

        // Create/update API configuration if schema exists OR authentication type is not 'none'
        if (params.schema || (params.authenticationType && params.authenticationType !== 'none')) {
            try {
                const existingApiConfig = await prisma.assistantApiConfiguration.findUnique({
                    where: { assistantId: assistantBigInt }
                })

                // Build auth config for tool generation (only if schema exists)
                const authConfigForTools: AuthConfig | undefined = params.schema ? {
                    type: params.authenticationType,
                    apiKey: params.apiKey,
                    authType: params.authType,
                    customHeaderName: params.customHeaderName,
                    clientId: params.clientId,
                    clientSecret: params.clientSecret,
                    tokenUrl: params.tokenUrl,
                } : undefined

                // Generate tools from schema (only if schema exists)
                let tools = null
                if (params.schema && authConfigForTools) {
                    try {
                        const parsedSchema = parseOpenAPISchema(params.schema)
                        const openAITools = convertToOpenAITools(parsedSchema, authConfigForTools)

                        // Store tools in format: { openaiTool: {...}, metadata: {...} }
                        tools = openAITools.map(tool => ({
                            type: tool.openaiTool.type,
                            name: tool.openaiTool.name,
                            description: tool.openaiTool.description,
                            parameters: tool.openaiTool.parameters,
                            metadata: {
                                method: tool.metadata.method,
                                path: tool.metadata.path,
                                baseUrl: tool.metadata.baseUrl,
                                operationId: tool.metadata.operationId,
                                // Store parameter definitions for executor reconstruction
                                parameterDefinitions: tool.metadata.parameterDefinitions || []
                            }
                        }))

                        console.log(`✅ Generated ${tools.length} tools from schema`)
                    } catch (toolError) {
                        console.error('Error generating tools from schema:', toolError)
                        // Continue without tools - user can fix schema later
                    }
                }

                // Check if secondary API config was provided
                const secondaryConfig = params.apiConfigs?.[1]
                let secondaryTools: any[] | null = null

                if (secondaryConfig?.schema) {
                    try {
                        const secAuthConfig: AuthConfig = {
                            type: secondaryConfig.authenticationType,
                            apiKey: secondaryConfig.apiKey,
                            authType: secondaryConfig.authType,
                            customHeaderName: secondaryConfig.customHeaderName,
                            clientId: secondaryConfig.clientId,
                            clientSecret: secondaryConfig.clientSecret,
                            tokenUrl: secondaryConfig.tokenUrl,
                        }
                        const parsedSecSchema = parseOpenAPISchema(secondaryConfig.schema)
                        const secOpenAITools = convertToOpenAITools(parsedSecSchema, secAuthConfig)
                        secondaryTools = secOpenAITools.map(tool => ({
                            type: tool.openaiTool.type,
                            name: tool.openaiTool.name,
                            description: tool.openaiTool.description,
                            parameters: tool.openaiTool.parameters,
                            metadata: {
                                method: tool.metadata.method,
                                path: tool.metadata.path,
                                baseUrl: tool.metadata.baseUrl,
                                operationId: tool.metadata.operationId,
                                parameterDefinitions: tool.metadata.parameterDefinitions || []
                            }
                        }))
                        console.log(`✅ Generated ${secondaryTools.length} tools from secondary API schema`)
                    } catch (secToolError) {
                        console.error('Error generating tools from secondary API schema:', secToolError)
                    }
                }

                // Compose final tools value - v2 format if secondary config present
                const hasSecondary = secondaryConfig && (
                    (secondaryConfig.authenticationType && secondaryConfig.authenticationType !== 'none') ||
                    secondaryConfig.schema
                )
                const finalTools: any = hasSecondary ? {
                    version: 2,
                    primary: { tools: tools || [] },
                    secondary: {
                        authenticationType: secondaryConfig!.authenticationType,
                        apiKey: secondaryConfig!.authenticationType === 'api_key' && secondaryConfig!.apiKey ? encrypt(secondaryConfig!.apiKey) : null,
                        authType: secondaryConfig!.authenticationType === 'api_key' ? (secondaryConfig!.authType || null) : null,
                        customHeaderName: secondaryConfig!.authenticationType === 'api_key' ? (secondaryConfig!.customHeaderName || null) : null,
                        clientId: secondaryConfig!.authenticationType === 'oauth' ? (secondaryConfig!.clientId || null) : null,
                        clientSecret: secondaryConfig!.authenticationType === 'oauth' && secondaryConfig!.clientSecret ? encrypt(secondaryConfig!.clientSecret) : null,
                        tokenUrl: secondaryConfig!.authenticationType === 'oauth' ? (secondaryConfig!.tokenUrl || null) : null,
                        scope: secondaryConfig!.authenticationType === 'oauth' ? (secondaryConfig!.scope || null) : null,
                        tokenExchangeMethod: secondaryConfig!.authenticationType === 'oauth' ? (secondaryConfig!.tokenExchangeMethod || null) : null,
                        schemaText: secondaryConfig!.schemaText || null,
                        tools: secondaryTools || [],
                    }
                } : tools

                // Build API config data with encryption
                const apiConfigData = {
                    authenticationType: params.authenticationType,

                    // Encrypt API key if provided
                    apiKey: params.authenticationType === 'api_key' && params.apiKey
                        ? encrypt(params.apiKey)
                        : null,
                    authType: params.authenticationType === 'api_key' ? params.authType : null,
                    customHeaderName: params.authenticationType === 'api_key' ? params.customHeaderName : null,
                    customQueryParamName: params.authenticationType === 'api_key' && params.authType === 'query'
                        ? (params.customQueryParamName || null)
                        : null,

                    clientId: params.authenticationType === 'oauth' ? params.clientId : null,

                    // Encrypt client secret if provided
                    clientSecret: params.authenticationType === 'oauth' && params.clientSecret
                        ? encrypt(params.clientSecret)
                        : null,
                    authorizationUrl: params.authenticationType === 'oauth' ? params.authorizationUrl : null,
                    tokenUrl: params.authenticationType === 'oauth' ? params.tokenUrl : null,
                    scope: params.authenticationType === 'oauth' ? params.scope : null,
                    tokenExchangeMethod: params.authenticationType === 'oauth' ? params.tokenExchangeMethod : null,

                    schemaText: params.schemaText || null,
                    schema: params.schema || null,

                    // Store tools (v1 array OR v2 object with secondary config)
                    ...(finalTools && { tools: finalTools }),
                }

                if (existingApiConfig) {
                    await prisma.assistantApiConfiguration.update({
                        where: { assistantId: assistantBigInt },
                        data: apiConfigData
                    })
                } else {
                    await prisma.assistantApiConfiguration.create({
                        data: {
                            assistantId: assistantBigInt,
                            ...apiConfigData
                        }
                    })
                }

                console.log(`✅ API configuration updated${tools ? ` with ${tools.length} primary tools` : ''}${secondaryTools ? ` + ${secondaryTools.length} secondary tools` : ''}`)
            } catch (apiConfigError) {
                console.error('Error updating API configuration:', apiConfigError)
                // Log the full error for debugging
                if (apiConfigError instanceof Error) {
                    console.error('Error details:', apiConfigError.message, apiConfigError.stack)
                }
            }
        }

        // ========================================
        // OPTIMIZED SHARED USERS UPDATE
        // ========================================

        const existingSharedUsers = await prisma.assistantContact.findMany({
            where: {
                assistantId: assistantBigInt,
                userId: { not: userId }
            }
        })

        const existingUserIds = new Set(existingSharedUsers.map(u => u.userId.toString()))
        const newUserIds = new Set(params.sharedUsers.map(u => u.id))

        // Delete removed users
        const usersToDelete = existingSharedUsers.filter(u => !newUserIds.has(u.userId.toString()))
        for (const user of usersToDelete) {
            await prisma.assistantContact.delete({ where: { id: user.id } })
        }

        // Add or update shared users
        for (const sharedUser of params.sharedUsers) {
            const sharedUserId = BigInt(sharedUser.id)

            if (sharedUserId === userId) continue

            const permissionArray: string[] = []
            if (sharedUser.permissions.chat) permissionArray.push('chat')
            if (sharedUser.permissions.contact) permissionArray.push('contacts')
            if (sharedUser.permissions.messenger) permissionArray.push('messenger')
            if (sharedUser.permissions.newsFeed) permissionArray.push('newsfeed')
            if (sharedUser.permissions.artifact) permissionArray.push('artifacts')

            const existingUser = existingSharedUsers.find(u => u.userId === sharedUserId)

            if (existingUser) {
                // Update existing - check if permissions actually changed
                const oldPermissions = existingUser.permissions as string
                const newPermissions = JSON.stringify(permissionArray)

                if (oldPermissions !== newPermissions) {
                    await prisma.assistantContact.update({
                        where: { id: existingUser.id },
                        data: {
                            permissions: newPermissions,
                        }
                    })
                }
            } else {
                // Create new
                await prisma.assistantContact.create({
                    data: {
                        assistantId: assistantBigInt,
                        userId: sharedUserId,
                        access: 'user',
                        permissions: JSON.stringify(permissionArray),
                    }
                })
            }
        }

        revalidatePath('/assistants')
        revalidatePath(`/assistants/${assistantId}`)

        return {
            success: true,
            assistantId
        }
    } catch (error) {
        console.error('Error updating assistant:', error)
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to update assistant'
        }
    }
}

export async function purchaseAssistant(assistantId: string) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return {
                success: false,
                error: "You must be logged in to purchase an assistant",
                url: undefined,
            }
        }
        const userId = BigInt(session.user.id)
        const assistantIdBigInt = BigInt(assistantId)
        // Get the assistant with owner info
        const assistant = await prisma.assistant.findUnique({
            where: {
                id: assistantIdBigInt,
                deletedAt: null,
            },
            include: {
                owner: true, // Include owner to check Connect status
            },
        })
        if (!assistant) {
            return {
                success: false,
                error: "Assistant not found",
                url: undefined,
            }
        }
        // Check if assistant is public
        if (!assistant.public) {
            return {
                success: false,
                error: "This assistant is not available for purchase",
                url: undefined,
            }
        }
        // ✅ CHECK CREATOR'S STRIPE CONNECT STATUS
        if (!assistant.owner.stripeConnectAccountId || !assistant.owner.stripeConnectPayoutsEnabled) {
            return {
                success: false,
                error: "The creator has not completed Stripe Connect setup yet. Please try again later.",
                url: undefined,
            }
        }
        // Check if user already purchased this assistant
        const existingPurchase = await prisma.assistantPurchase.findFirst({
            where: {
                buyerId: userId,
                assistantId: assistantIdBigInt,
                deletedAt: null, // Only check non-deleted purchases
            },
            include: {
                paymentRecord: true
            }
        })
        if (existingPurchase) {
            // If a purchase record exists, check the payment status
            if (existingPurchase.paymentRecord?.status === "completed") {
                return {
                    success: false,
                    error: "You have already purchased this assistant",
                    url: undefined,
                }
            }
            // If payment is pending or failed, delete the old purchase and create a new one
            if (existingPurchase.paymentRecord?.status === "pending" || existingPurchase.paymentRecord?.status === "failed") {
                console.log(`[Purchase] Found existing ${existingPurchase.paymentRecord.status} purchase ${existingPurchase.id}, deleting it`)
                await prisma.assistantPurchase.delete({
                    where: { id: existingPurchase.id }
                })
            } else if (!existingPurchase.paymentRecord) {
                return {
                    success: false,
                    error: "You have already purchased this assistant",
                    url: undefined,
                }
            }
        }
        // Check if user is trying to purchase their own assistant
        if (assistant.userId === userId) {
            return {
                success: false,
                error: "You cannot purchase your own assistant",
                url: undefined,
            }
        }
        // Check if assistant has already been shared with this user
        const existingContact = await prisma.assistantContact.findFirst({
            where: {
                assistantId: assistantIdBigInt,
                userId: userId,
            },
        })
        if (existingContact) {
            return {
                success: false,
                error: "This assistant has already been shared with you. You can access it from your assistants list.",
                url: undefined,
            }
        }
        // Get or create Stripe customer
        const user = await prisma.user.findUnique({
            where: { id: userId },
        })
        if (!user) {
            return {
                success: false,
                error: "User not found",
                url: undefined,
            }
        }
        let stripeCustomerId = user.stripeCustomerId
        if (!stripeCustomerId) {
            const customer = await stripe.customers.create({
                email: user.email,
                name: user.name || undefined,
                metadata: {
                    userId: userId.toString(),
                },
            })
            await prisma.user.update({
                where: { id: userId },
                data: { stripeCustomerId: customer.id },
            })
            stripeCustomerId = customer.id
        }
        // Strip non-ASCII chars that can sneak into copy-pasted .env values and
        // cause Stripe to reject success_url / cancel_url with url_invalid.
        const rawBaseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "http://localhost:3000"
        const baseUrl = rawBaseUrl.replace(/[^\x20-\x7E]/g, "").replace(/\s+/g, "").trim() || "http://localhost:3000"
        // ✅ CALCULATE PLATFORM FEE (15%)
        const amount = Number(assistant.price)
        const platformFeePercentage = 0.15 // 15%
        const platformFee = amount * platformFeePercentage
        const netAmount = amount - platformFee
        // Convert to cents
        const amountInCents = Math.round(amount * 100)
        const platformFeeInCents = Math.round(platformFee * 100)
        // ✅ CREATE STRIPE CHECKOUT WITH CONNECT
        const checkoutSession = await stripe.checkout.sessions.create({
            customer: stripeCustomerId,
            payment_method_types: ["card"],
            line_items: [
                {
                    price_data: {
                        currency: assistant.currency.toLowerCase() || "chf",
                        product_data: {
                            name: assistant.name,
                            description: assistant.description || undefined,
                            images: assistant.image ? [assistant.image] : undefined,
                        },
                        unit_amount: amountInCents,
                    },
                    quantity: 1,
                },
            ],
            mode: "payment", // One-time payment
            payment_intent_data: {
                application_fee_amount: platformFeeInCents, // Platform takes 15%
                transfer_data: {
                    destination: assistant.owner.stripeConnectAccountId, // 85% goes to creator
                },
                metadata: {
                    assistantId: assistantId,
                    buyerId: userId.toString(),
                    creatorId: assistant.userId.toString(),
                },
            },
            success_url: `${baseUrl}/store?purchase=success&session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${baseUrl}/store?purchase=cancelled`,
            metadata: {
                userId: userId.toString(),
                assistantId: assistantId,
                type: "assistant_purchase",
            },
        })
        // ✅ CREATE PENDING PAYMENT RECORD WITH PLATFORM FEE
        const paymentRecord = await prisma.paymentRecord.create({
            data: {
                userId: assistant.userId, // Creator receives money
                payerUserId: userId, // Buyer pays
                type: "assistant_purchase",
                amount: amount,
                currency: assistant.currency,
                platformFee: platformFee, // 15% platform fee
                netAmount: netAmount, // 85% to creator
                status: "pending",
                stripeCheckoutSessionId: checkoutSession.id,
                relatedType: "Assistant",
                relatedId: assistantIdBigInt,
                description: `Purchase of assistant: ${assistant.name}`,
            },
        })
        // Create purchase record
        await prisma.assistantPurchase.create({
            data: {
                buyerId: userId,
                assistantId: assistantIdBigInt,
                paymentRecordId: paymentRecord.id,
            },
        })
        return {
            success: true,
            url: checkoutSession.url || undefined,
        }
    } catch (error: any) {
        console.error("Error creating purchase checkout session:", error)
        return {
            success: false,
            error: error.message || "Failed to create checkout session",
            url: undefined,
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

// ================================================================
// ASSISTANT DELETION
// ================================================================

interface DeleteAssistantResponse {
    success: boolean
    error?: string
}

/**
 * Hard delete an assistant and all related data
 * Only the owner can delete their assistant
 */
export async function hardDeleteAssistant(
    assistantId: string
): Promise<DeleteAssistantResponse> {
    try {
        // 🔐 Auth check
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return { success: false, error: "Authentication required" }
        }

        const userId = BigInt(session.user.id)
        const assistantBigInt = BigInt(assistantId)

        // 🔎 Fetch assistant + ownership check
        const assistant = await prisma.assistant.findUnique({
            where: { id: assistantBigInt },
            include: {
                knowledgebases: {
                    select: { vectorFileId: true },
                },
            },
        })

        if (!assistant) {
            return { success: false, error: "Assistant not found" }
        }

        if (assistant.userId !== userId) {
            return {
                success: false,
                error: "You do not have permission to delete this assistant",
            }
        }

        // 🧠 OpenAI Vector Store Cleanup (outside transaction)
        if (assistant.vectorStoreId) {
            for (const kb of assistant.knowledgebases) {
                if (kb.vectorFileId) {
                    try {
                        await deleteFileFromVectorStore(
                            assistant.vectorStoreId,
                            kb.vectorFileId
                        )
                    } catch (err) {
                        console.error(
                            `Failed to delete vector file ${kb.vectorFileId}`,
                            err
                        )
                    }
                }
            }

            try {
                await deleteVectorStore(assistant.vectorStoreId)
            } catch (err) {
                console.error(
                    `Failed to delete vector store ${assistant.vectorStoreId}`,
                    err
                )
            }
        }

        // 🧨 DATABASE HARD DELETE (ORDER MATTERS)
        await prisma.$transaction([
            // Chat systems
            prisma.assistantUserChatMessage.deleteMany({
                where: { assistantId: assistantBigInt },
            }),
            prisma.assistantUserChat.deleteMany({
                where: { assistantId: assistantBigInt },
            }),
            prisma.assistantChatMessage.deleteMany({
                where: { assistantId: assistantBigInt },
            }),
            prisma.assistantChat.deleteMany({
                where: { assistantId: assistantBigInt },
            }),

            // Knowledge base
            prisma.assistantKnowledgebase.deleteMany({
                where: { assistantId: assistantBigInt },
            }),

            // Artifacts
            prisma.artifactPermission.deleteMany({
                where: { assistantId: assistantBigInt },
            }),
            prisma.artifactVersion.deleteMany({
                where: {
                    artifact: { assistantId: assistantBigInt },
                },
            }),
            prisma.assistantArtifact.deleteMany({
                where: { assistantId: assistantBigInt },
            }),

            // Social
            prisma.assistantNewsFeedLike.deleteMany({
                where: {
                    newsFeed: { assistantId: assistantBigInt },
                },
            }),
            prisma.assistantNewsFeedComment.deleteMany({
                where: {
                    newsFeed: { assistantId: assistantBigInt },
                },
            }),
            prisma.newsFeedPermission.deleteMany({
                where: {
                    newsFeed: { assistantId: assistantBigInt },
                },
            }),
            prisma.assistantNewsFeed.deleteMany({
                where: { assistantId: assistantBigInt },
            }),

            // Marketplace & usage
            prisma.assistantPurchase.deleteMany({
                where: { assistantId: assistantBigInt },
            }),
            prisma.usageMetric.deleteMany({
                where: { assistantId: assistantBigInt },
            }),

            // Permissions & pins
            prisma.assistantContact.deleteMany({
                where: { assistantId: assistantBigInt },
            }),
            prisma.assistantPin.deleteMany({
                where: { assistantId: assistantBigInt },
            }),

            // API Config
            prisma.assistantApiConfiguration.deleteMany({
                where: { assistantId: assistantBigInt },
            }),

            // Connector integrations
            prisma.connectorChatUsage.deleteMany({
                where: {
                    chat: { assistantId: assistantBigInt },
                },
            }),
            prisma.connector.deleteMany({
                where: { assistantId: assistantBigInt },
            }),

            // 🔥 Finally delete assistant
            prisma.assistant.delete({
                where: { id: assistantBigInt },
            }),
        ])

        // 🔄 Revalidate UI
        revalidatePath("/assistants")
        revalidatePath("/dashboard")
        revalidatePath("/store")

        return { success: true }
    } catch (error) {
        console.error("Hard delete assistant failed:", error)
        return {
            success: false,
            error: "Failed to permanently delete assistant",
        }
    }
}

// ============================================================
// DELETE EXCESS ASSISTANTS ON DOWNGRADE
// ============================================================

interface DeleteExcessAssistantsResult {
    success: boolean
    error?: string
    deletedCount?: number
    deletedAssistants?: Array<{
        id: string
        name: string
    }>
    affectedBuyers?: number
}

/**
 * Delete excess assistants when user downgrades to a plan with lower assistant limit
 * This is called automatically by the webhook when a subscription is updated
 * 
 * @param userId - The user ID whose assistants to delete
 * @param newLimit - The new assistant limit from the downgraded plan
 * @returns Result with deleted assistant details
 */
export async function deleteExcessAssistants(
    userId: bigint,
    newLimit: number
): Promise<DeleteExcessAssistantsResult> {
    try {
        console.log(`[DeleteExcess] Starting deletion for user ${userId}, new limit: ${newLimit}`)

        // Count current active assistants
        const currentCount = await prisma.assistant.count({
            where: {
                userId,
                isDeleted: false,
                deletedAt: null,
            },
        })

        console.log(`[DeleteExcess] Current assistant count: ${currentCount}`)

        // If within limit, no deletion needed
        if (currentCount <= newLimit) {
            console.log(`[DeleteExcess] No deletion needed (${currentCount} <= ${newLimit})`)
            return {
                success: true,
                deletedCount: 0,
                deletedAssistants: [],
                affectedBuyers: 0,
            }
        }

        const toDelete = currentCount - newLimit
        console.log(`[DeleteExcess] Need to delete ${toDelete} assistants`)

        // Get assistants to delete (newest first - FIFO deletion)
        const assistantsToDelete = await prisma.assistant.findMany({
            where: {
                userId,
                isDeleted: false,
                deletedAt: null,
            },
            orderBy: {
                createdAt: 'desc', // Delete newest first
            },
            take: toDelete,
            select: {
                id: true,
                name: true,
            },
        })

        const assistantIds = assistantsToDelete.map(a => a.id)
        const now = new Date()

        console.log(`[DeleteExcess] Deleting assistants:`, assistantsToDelete.map(a => a.name))

        let affectedBuyersCount = 0

        // Perform cascading deletion in transaction
        await prisma.$transaction(async (tx) => {
            // ============================================================
            // STEP 0: Handle buyers who purchased these assistants
            // ============================================================
            const affectedPurchases = await tx.assistantPurchase.findMany({
                where: {
                    assistantId: { in: assistantIds }
                },
                include: {
                    buyer: {
                        select: {
                            id: true,
                            email: true,
                            name: true,
                        },
                    },
                    assistant: {
                        select: {
                            id: true,
                            name: true,
                            price: true,
                        },
                    },
                },
            })

            affectedBuyersCount = affectedPurchases.length
            console.log(`[DeleteExcess] Found ${affectedBuyersCount} affected purchases`)

            if (affectedPurchases.length > 0) {
                // Soft-delete purchases
                await tx.assistantPurchase.updateMany({
                    where: {
                        id: { in: affectedPurchases.map(p => p.id) },
                    },
                    data: {
                        deletedAt: now,
                    },
                })

                // Create notifications for buyers
                const notifications = affectedPurchases.map(purchase => ({
                    userId: purchase.buyerId,
                    title: 'Assistant No Longer Available',
                    message: `The assistant "${purchase.assistant.name}" that you purchased is no longer available. The owner has downgraded their subscription.`,
                    type: 'assistant_deleted',
                    relatedId: Number(purchase.assistant.id),
                    relatedType: 'assistant',
                    isRead: false,
                    createdAt: now,
                    updatedAt: now,
                }))

                await tx.notification.createMany({
                    data: notifications,
                })

                console.log(`[DeleteExcess] Created ${notifications.length} buyer notifications`)
            }

            // ============================================================
            // CASCADE 1: Delete Artifacts and their related data
            // ============================================================
            const artifacts = await tx.assistantArtifact.findMany({
                where: { assistantId: { in: assistantIds }, deletedAt: null },
                select: { id: true },
            })
            const artifactIds = artifacts.map(a => a.id)

            if (artifactIds.length > 0) {
                await tx.artifactVersion.updateMany({
                    where: { artifactId: { in: artifactIds } },
                    data: { deletedAt: now },
                })
                await tx.artifactPermission.deleteMany({
                    where: { artifactId: { in: artifactIds } },
                })
                await tx.artifactGenerationJob.deleteMany({
                    where: { artifactId: { in: artifactIds } },
                })
                await tx.assistantArtifact.updateMany({
                    where: { id: { in: artifactIds } },
                    data: { deletedAt: now },
                })
                console.log(`[DeleteExcess] Deleted ${artifactIds.length} artifacts`)
            }

            // CASCADE 2: Delete User Chats and Messages
            const userChats = await tx.assistantUserChat.findMany({
                where: { assistantId: { in: assistantIds }, deletedAt: null },
                select: { id: true },
            })
            const chatIds = userChats.map(c => c.id)

            if (chatIds.length > 0) {
                await tx.assistantUserChatMessage.deleteMany({
                    where: { assistantUserChatId: { in: chatIds } },
                })
                await tx.connectorChatUsage.deleteMany({
                    where: { assistantUserChatId: { in: chatIds } },
                })
                await tx.assistantUserChat.updateMany({
                    where: { id: { in: chatIds } },
                    data: { deletedAt: now },
                })
                console.log(`[DeleteExcess] Deleted ${chatIds.length} user chats`)
            }

            // CASCADE 3: Delete Assistant Chats (Messenger)
            const assistantChats = await tx.assistantChat.findMany({
                where: { assistantId: { in: assistantIds }, deletedAt: null },
                select: { id: true },
            })
            const assistantChatIds = assistantChats.map(c => c.id)

            if (assistantChatIds.length > 0) {
                await tx.assistantChatMessage.updateMany({
                    where: { assistantChatId: { in: assistantChatIds } },
                    data: { deletedAt: now },
                })
                await tx.assistantChat.updateMany({
                    where: { id: { in: assistantChatIds } },
                    data: { deletedAt: now },
                })
                console.log(`[DeleteExcess] Deleted ${assistantChatIds.length} assistant chats`)
            }

            // CASCADE 4: Delete Pins
            await tx.assistantPin.deleteMany({
                where: { assistantId: { in: assistantIds } },
            })

            // CASCADE 5: Delete Contacts
            await tx.assistantContact.deleteMany({
                where: { assistantId: { in: assistantIds } },
            })

            // CASCADE 6: Delete News Feeds
            const newsFeeds = await tx.assistantNewsFeed.findMany({
                where: { assistantId: { in: assistantIds } },
                select: { id: true },
            })
            const newsFeedIds = newsFeeds.map(n => n.id)

            if (newsFeedIds.length > 0) {
                await tx.assistantNewsFeedLike.deleteMany({
                    where: { newsFeedId: { in: newsFeedIds } },
                })
                await tx.assistantNewsFeedComment.deleteMany({
                    where: { newsFeedId: { in: newsFeedIds } },
                })
                await tx.newsFeedPermission.deleteMany({
                    where: { newsFeedId: { in: newsFeedIds } },
                })
                await tx.assistantNewsFeed.deleteMany({
                    where: { id: { in: newsFeedIds } },
                })
                console.log(`[DeleteExcess] Deleted ${newsFeedIds.length} news feeds`)
            }

            // CASCADE 7: Delete Knowledge Base
            await tx.assistantKnowledgebase.deleteMany({
                where: { assistantId: { in: assistantIds } },
            })

            // CASCADE 8: Delete API Configuration
            await tx.assistantApiConfiguration.deleteMany({
                where: { assistantId: { in: assistantIds } },
            })

            // CASCADE 9: Delete Connectors
            await tx.connector.updateMany({
                where: { assistantId: { in: assistantIds } },
                data: { deletedAt: now },
            })

            // CASCADE 10: Delete Usage Metrics
            await tx.usageMetric.deleteMany({
                where: { assistantId: { in: assistantIds } },
            })

            // FINALLY: Soft delete the assistants themselves
            await tx.assistant.updateMany({
                where: {
                    id: { in: assistantIds },
                },
                data: {
                    isDeleted: true,
                    deletedAt: now,
                },
            })

            console.log(`[DeleteExcess] ✅ Successfully deleted ${assistantIds.length} assistants`)
        })

        return {
            success: true,
            deletedCount: assistantsToDelete.length,
            deletedAssistants: assistantsToDelete.map(a => ({
                id: a.id.toString(),
                name: a.name,
            })),
            affectedBuyers: affectedBuyersCount,
        }
    } catch (error) {
        console.error('[DeleteExcess] Error deleting excess assistants:', error)
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to delete excess assistants',
        }
    }
}

// ============================================
// LEAVE SHARED ASSISTANT
// ============================================

/**
 * Allows a non-owner user to leave (unsubscribe from) a shared assistant.
 * Removes the user's AssistantContact record and any pin for that assistant.
 */
export async function leaveAssistant(assistantId: string): Promise<{ success: boolean; error?: string }> {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return { success: false, error: 'Authentication required' }
        }

        const userId = BigInt(session.user.id)
        const assistantBigInt = BigInt(assistantId)

        // Ensure the user is NOT the owner before allowing them to leave
        const assistant = await prisma.assistant.findFirst({
            where: { id: assistantBigInt, deletedAt: null }
        })

        if (!assistant) {
            return { success: false, error: 'Assistant not found' }
        }

        if (assistant.userId === userId) {
            return { success: false, error: 'Owners cannot leave their own assistant. Delete it instead.' }
        }

        // Remove from contacts
        await prisma.assistantContact.deleteMany({
            where: { assistantId: assistantBigInt, userId }
        })

        // Remove any pin the user may have
        await prisma.assistantPin.deleteMany({
            where: { assistantId: assistantBigInt, userId }
        })

        revalidatePath('/assistants')

        return { success: true }
    } catch (error) {
        console.error('[LeaveAssistant] Error:', error)
        return { success: false, error: error instanceof Error ? error.message : 'Failed to leave assistant' }
    }
}

// ============================================
// DUPLICATE ASSISTANT
// ============================================

/**
 * Duplicates an assistant owned by the current user.
 * Creates a new assistant with the same configuration, named "Copy of <name>".
 * Knowledge base files, notes, and URLs are copied. Shared users are NOT copied.
 */
export async function duplicateAssistant(assistantId: string): Promise<{ success: boolean; error?: string; newAssistantId?: string }> {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return { success: false, error: 'Authentication required' }
        }

        // Fetch original assistant data
        const editResult = await getAssistantForEdit(assistantId)
        if (!editResult.success || !editResult.assistant) {
            return { success: false, error: editResult.error || 'Assistant not found' }
        }

        const src = editResult.assistant

        // Build the params for createCompleteAssistant
        const params: CreateCompleteAssistantParams = {
            name: `Copy of ${src.name}`,
            price: src.price,
            category: src.category as AssistantCategory,
            description: src.description,
            imageURL: src.imageURL ?? null,
            instructions: src.instructions,
            notes: src.notes,
            urls: src.urls,
            // Map files array to the expected fileURLs format
            fileURLs: src.files.map((f: { url: string; name: string }) => ({
                url: f.url,
                fileName: f.name,
                fileSize: 0, // Size not stored, use 0 as placeholder
            })),
            // API configuration
            authenticationType: src.apiConfiguration?.authenticationType ?? 'none',
            apiKey: src.apiConfiguration?.apiKey ?? '',
            authType: src.apiConfiguration?.authType ?? 'basic',
            customHeaderName: src.apiConfiguration?.customHeaderName ?? '',
            clientId: src.apiConfiguration?.clientId ?? '',
            clientSecret: src.apiConfiguration?.clientSecret ?? '',
            authorizationUrl: src.apiConfiguration?.authorizationUrl ?? '',
            tokenUrl: src.apiConfiguration?.tokenUrl ?? '',
            scope: src.apiConfiguration?.scope ?? '',
            tokenExchangeMethod: src.apiConfiguration?.tokenExchangeMethod ?? 'post',
            schemaText: src.apiConfiguration?.schemaText ?? '',
            schema: src.apiConfiguration?.schema ?? null,
            // Sharing — private with no shared users for the duplicate
            permissionLevel: 'private',
            sharedUsers: [],
            buyerPermissions: {
                chat: false,
                contact: false,
                messenger: false,
                artifact: false,
                newsFeed: false,
                library: false,
            },
        }

        const result = await createCompleteAssistant(params)

        if (!result.success) {
            return { success: false, error: result.error }
        }

        revalidatePath('/assistants')

        return { success: true, newAssistantId: result.assistantId }
    } catch (error) {
        console.error('[DuplicateAssistant] Error:', error)
        return { success: false, error: error instanceof Error ? error.message : 'Failed to duplicate assistant' }
    }
}
