"use server"

import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { openai } from "@/lib/openai"
import prisma from "@/lib/prisma"
import { deleteFromS3 } from "@/lib/aws-s3"
import openAISoraService from "@/lib/services/openai-sora.service"
import s3VideoUploadService from "@/lib/services/s3-video-upload.service"
import { generateVideoArtifactHtml } from "@/lib/templates/video-artifact.template"
import {
    GenerateArtifactInstructionsParams,
    GenerateArtifactInstructionsResult
} from "@/types/artifact-ai-instruction"
import { getArtifactInstructionsGeneratorPrompt, getArtifactCodingPrompt } from "@/utils/prompts"
import pusher from "@/lib/pusher"
import notificationService from "@/lib/services/notifactionService"

const ARTIFACT_INSTRUCTION_GENERATION_PROMPT = getArtifactInstructionsGeneratorPrompt()

export async function generateArtifactInstructions({
    prompt,
}: GenerateArtifactInstructionsParams): Promise<GenerateArtifactInstructionsResult> {
    try {
        // Get authenticated user
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return {
                success: false,
                error: 'Authentication required'
            }
        }

        if (!prompt?.trim()) {
            return {
                success: false,
                error: 'Prompt cannot be empty'
            }
        }

        // Generate instructions using OpenAI Responses API
        const model = 'gpt-5.2'

        const response = await openai.responses.create({
            model: model,
            reasoning: { effort: "low" },
            instructions: ARTIFACT_INSTRUCTION_GENERATION_PROMPT,
            input: `Generate detailed instructions for creating the following artifact:\n\n${prompt}`,
        })

        const instructions = response.output_text

        if (!instructions) {
            return {
                success: false,
                error: 'Failed to generate instructions'
            }
        }

        return {
            success: true,
            instructions: instructions.trim()
        }

    } catch (error) {
        console.error('Error generating artifact instructions:', error)

        if (error instanceof Error) {
            return {
                success: false,
                error: error.message
            }
        }

        return {
            success: false,
            error: 'An unexpected error occurred while generating instructions'
        }
    }
}

// Get assistant contacts for artifact sharing
export async function getAssistantContacts(assistantId: string) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return {
                success: false,
                error: 'Authentication required',
                contacts: []
            }
        }

        const userId = BigInt(session.user.id)
        const assistantIdBigInt = BigInt(assistantId)

        // Verify user owns or has access to this assistant
        const assistant = await prisma.assistant.findFirst({
            where: {
                id: assistantIdBigInt,
                OR: [
                    { userId: userId },
                    {
                        contacts: {
                            some: {
                                userId: userId
                            }
                        }
                    }
                ]
            }
        })

        if (!assistant) {
            return {
                success: false,
                error: 'Assistant not found or access denied',
                contacts: []
            }
        }

        // Fetch all contacts for this assistant (including owner - owner is now in AssistantContact)
        const contacts = await prisma.assistantContact.findMany({
            where: {
                assistantId: assistantIdBigInt,
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        image: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        })

        const formattedContacts = contacts.map(contact => ({
            id: contact.user.id.toString(),
            name: contact.user.name || 'Unknown User',
            email: contact.user.email,
            image: contact.user.image
        }))

        return {
            success: true,
            contacts: formattedContacts
        }

    } catch (error) {
        console.error('Error fetching assistant contacts:', error)
        return {
            success: false,
            error: 'Failed to fetch contacts',
            contacts: []
        }
    }
}


// Create artifact with AI-generated code
export async function createArtifact(data: {
    assistantId: string
    name: string
    instructions: string
    category: string
    permissions: 'private' | 'team' | 'public'
    selectedUsers: Array<{ id: string; name: string; email: string }>
    apiConfigs: Array<{ key: string; value: string }>
    uploadedFiles?: Array<{
        url: string
        name: string
        type: string
        size: number
        uploadedAt: string
        extractedContent?: {
            text: string
            html: string
            tables?: Array<{
                base64: string
                page: number
            }>
            metadata?: {
                pages: number
                model: string
            }
        }
        extractedImages?: Array<{
            id: string
            page: number
            coordinates?: any
        }>
        extractionError?: string
    }>
    uploadedImages?: Array<{
        url: string
        name: string
        type: string
        size: number
        uploadedAt: string
    }>
    videoDuration?: "4" | "8" | "12"
}) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return {
                success: false,
                error: 'Authentication required'
            }
        }

        const userId = BigInt(session.user.id)
        const assistantIdBigInt = BigInt(data.assistantId)

        // Check if user can create artifacts (only owners can create artifacts)
        const { canCreateArtifacts } = await import('@/lib/permissions/assistant-permissions')
        const canCreate = await canCreateArtifacts(assistantIdBigInt, userId)

        if (!canCreate) {
            return {
                success: false,
                error: 'Assistant not found or access denied'
            }
        }

        // Build enhanced instructions with extracted content
        let enhancedInstructions = data.instructions

        // Add document content
        if (data.uploadedFiles && data.uploadedFiles.length > 0) {
            enhancedInstructions += "\n\n=== EXTRACTED DOCUMENT CONTENT ===\n"

            data.uploadedFiles.forEach((file, idx) => {
                enhancedInstructions += `\n--- Document ${idx + 1}: ${file.name} ---\n`

                if (file.extractedContent) {
                    enhancedInstructions += `\nPages: ${file.extractedContent.metadata?.pages || "Unknown"}\n`
                    enhancedInstructions += `\nExtracted Text:\n${file.extractedContent.text}\n`

                    // Add tables as base64 images
                    if (file.extractedContent.tables && file.extractedContent.tables.length > 0) {
                        enhancedInstructions += `\nTables (${file.extractedContent.tables.length}):\n`
                        file.extractedContent.tables.forEach((table, tableIdx) => {
                            enhancedInstructions += `Table ${tableIdx + 1} (Page ${table.page}): data:image/png;base64,${table.base64}\n`
                        })
                    }
                } else if (file.extractionError) {
                    enhancedInstructions += `\n[Content extraction failed for this document]\n`
                }
            })

            enhancedInstructions += "\n=== END DOCUMENT CONTENT ===\n"
        }

        // Add image URLs
        if (data.uploadedImages && data.uploadedImages.length > 0) {
            enhancedInstructions += "\n\n=== IMAGES TO EMBED ===\n"
            data.uploadedImages.forEach((img, idx) => {
                enhancedInstructions += `Image ${idx + 1}: ${img.url} (${img.name})\n`
            })
            enhancedInstructions += "=== END IMAGES ===\n"
        }

        // For video generation, generate immediately (no streaming needed)
        let generatedCode: string
        let videoUrl: string | null = null
        let thumbnailUrl: string | null = null
        let videoMetadata: any = null

        // Check if this is a video generation artifact
        if (data.category === "video_generation") {
            console.log("[Artifact] Creating video generation artifact...")

            // Validate OPENAI_API_KEY is provided
            const openAIApiKey = data.apiConfigs.find(
                (config) => config.key === "OPENAI_API_KEY" && config.value.trim() !== ""
            )?.value

            if (!openAIApiKey) {
                return {
                    success: false,
                    error: "OPENAI_API_KEY is required for video generation. Please add it in the API Configuration section."
                }
            }

            // Validate video duration
            const videoDuration = data.videoDuration || "8"
            if (videoDuration !== "4" && videoDuration !== "8" && videoDuration !== "12") {
                return {
                    success: false,
                    error: "Invalid video duration. Must be 4, 8, or 12 seconds."
                }
            }

            try {
                // Step 1: Generate video with OpenAI Sora using custom API key
                const soraResult = await openAISoraService.generateVideo({
                    prompt: data.instructions,
                    model: "sora-2",
                    size: "1280x720",
                    seconds: videoDuration,
                    apiKey: openAIApiKey,
                })

                console.log(`[Artifact] Video generated: ${soraResult.videoId}`)

                // Step 2: Upload to S3
                const s3Result = await s3VideoUploadService.uploadVideo(
                    soraResult.videoBuffer,
                    soraResult.thumbnailBuffer,
                    assistantIdBigInt,
                    data.name
                )

                videoUrl = s3Result.videoUrl
                thumbnailUrl = s3Result.thumbnailUrl
                videoMetadata = soraResult.metadata

                console.log(`[Artifact] Video uploaded to S3: ${videoUrl}`)

                // Step 3: Generate HTML with video player
                generatedCode = generateVideoArtifactHtml(
                    videoUrl,
                    thumbnailUrl,
                    data.name
                )

                console.log("[Artifact] Video artifact HTML generated successfully")
            } catch (videoError) {
                console.error("[Artifact] Video generation error:", videoError)
                return {
                    success: false,
                    error: videoError instanceof Error ? videoError.message : 'Failed to generate video with Sora'
                }
            }
        } else {
            // For HTML artifacts, start with empty code - will be streamed on the page
            generatedCode = ''
        }

        // Prepare API keys JSON
        const apiKeysJson = data.apiConfigs.length > 0
            ? data.apiConfigs.reduce((acc, config) => {
                if (config.key && config.value) {
                    acc[config.key] = config.value
                }
                return acc
            }, {} as Record<string, string>)
            : null

        // Determine if artifact is public
        const isPublic = data.permissions === 'public'

        // Create artifact without any initial version (version will be created during streaming)
        const artifact = await prisma.$transaction(async (tx) => {
            // Create the artifact (without code and without version initially)
            const newArtifact = await tx.assistantArtifact.create({
                data: {
                    assistantId: assistantIdBigInt,
                    userId: userId,
                    name: data.name,
                    instructions: enhancedInstructions, // Store enhanced version
                    category: data.category,
                    tools: undefined,
                    apiKeys: apiKeysJson || undefined,
                    files: data.uploadedFiles ? (data.uploadedFiles as any) : undefined,
                    images: data.uploadedImages ? (data.uploadedImages as any) : undefined,
                    videoUrl: videoUrl || undefined,
                    thumbnailUrl: thumbnailUrl || undefined,
                    videoMetadata: videoMetadata ? (videoMetadata as any) : undefined,
                    isPublic: isPublic,
                    activeVersionId: null // No version yet - will be set during streaming
                }
            })

            // Create permissions for selected users (if permissions is 'team')
            console.log('[Artifact Creation] Permissions check:', {
                permissionsType: data.permissions,
                selectedUsersCount: data.selectedUsers.length,
                willCreatePermissions: data.permissions === 'team' && data.selectedUsers.length > 0
            })
            
            if (data.permissions === 'team' && data.selectedUsers.length > 0) {
                console.log('[Artifact Creation] Creating artifact permissions for users:', data.selectedUsers.map(u => u.email))
                await tx.artifactPermission.createMany({
                    data: data.selectedUsers.map(user => ({
                        userId: BigInt(user.id),
                        assistantId: assistantIdBigInt,
                        artifactId: newArtifact.id,
                        access: 'editor' // Default access level
                    }))
                })
                console.log('[Artifact Creation] ✅ Artifact permissions created successfully')
            } else {
                console.log('[Artifact Creation] ⚠️ No artifact permissions created - permissions:', data.permissions, 'users:', data.selectedUsers.length)
            }

            return newArtifact
        })

        // Get all users with artifact permissions to notify
        const userIdsToNotify: string[] = []

        try {
            // Get assistant owner (always has artifact permissions)
            const assistant = await prisma.assistant.findUnique({
                where: { id: assistantIdBigInt },
                select: { userId: true }
            })

            if (assistant) {
                userIdsToNotify.push(assistant.userId.toString())
            }

            // Get all contacts with artifact permissions
            const contactsWithArtifactPermission = await prisma.assistantContact.findMany({
                where: {
                    assistantId: assistantIdBigInt,
                    OR: [
                        { access: 'admin' }, // Admins have all permissions
                        {
                            AND: [
                                { permissions: { not: null } },
                                {
                                    permissions: {
                                        contains: '"artifacts"' // Check for "artifacts" in JSON array
                                    }
                                }
                            ]
                        }
                    ]
                },
                select: {
                    userId: true,
                    permissions: true
                }
            })

            // Add contact user IDs to the list
            for (const contact of contactsWithArtifactPermission) {
                const userIdStr = contact.userId.toString()
                if (!userIdsToNotify.includes(userIdStr)) {
                    userIdsToNotify.push(userIdStr)
                }
            }

            // If artifact is 'team' and has selected users, add them too
            if (data.permissions === 'team' && data.selectedUsers.length > 0) {
                for (const user of data.selectedUsers) {
                    if (!userIdsToNotify.includes(user.id)) {
                        userIdsToNotify.push(user.id)
                    }
                }
            }

            // Send notifications
            const notificationService = (await import('@/lib/services/notifactionService')).default
            await notificationService.notifyArtifactCreated(
                artifact.id.toString(),
                data.assistantId,
                session.user.id,
                userIdsToNotify
            )
        } catch (notificationError) {
            console.error('Error sending artifact creation notifications:', notificationError)
            // Don't fail the operation if notification fails
        }

        return {
            success: true,
            artifact: {
                id: artifact.id,
                name: artifact.name,
                category: artifact.category
            }
        }

    } catch (error) {
        console.error('Error creating artifact:', error)

        if (error instanceof Error) {
            return {
                success: false,
                error: error.message
            }
        }

        return {
            success: false,
            error: 'Failed to create artifact'
        }
    }
}

// Get artifacts for an assistant with permission checks
export async function getArtifacts(assistantId: string) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return {
                success: false,
                error: 'Authentication required',
                artifacts: []
            }
        }

        const userId = BigInt(session.user.id)
        const assistantIdBigInt = BigInt(assistantId)

        // Fetch artifacts where:
        // 1. User is the creator (userId matches)
        // 2. User has permission (in ArtifactPermission table)
        // 3. Artifact is public (isPublic = true)
        const artifacts = await prisma.assistantArtifact.findMany({
            where: {
                assistantId: assistantIdBigInt,
                deletedAt: null, // Exclude soft-deleted artifacts
                OR: [
                    { userId: userId }, // User is the creator
                    {
                        permissions: {
                            some: {
                                userId: userId // User has explicit permission
                            }
                        }
                    },
                    { isPublic: true } // Artifact is public
                ]
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        image: true
                    }
                },
                permissions: {
                    where: {
                        userId: userId
                    },
                    select: {
                        access: true
                    }
                },
                activeVersion: {
                    select: {
                        id: true,
                        versionNumber: true,
                        code: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        })

        const formattedArtifacts = artifacts.map(artifact => ({
            id: artifact.id.toString(),
            name: artifact.name || 'Untitled Artifact',
            category: artifact.category || 'others',
            htmlContent: artifact.activeVersion?.code || '',
            instructions: artifact.instructions || '',
            createdAt: artifact.createdAt,
            activeVersionId: artifact.activeVersionId?.toString(),
            activeVersionNumber: artifact.activeVersion?.versionNumber,
            creator: {
                id: artifact.user.id.toString(),
                name: artifact.user.name || 'Unknown User',
                email: artifact.user.email,
                image: artifact.user.image
            },
            isOwner: artifact.userId === userId,
            access: artifact.userId === userId
                ? 'admin'
                : artifact.permissions[0]?.access || 'viewer',
            isPublic: artifact.isPublic
        }))

        return {
            success: true,
            artifacts: formattedArtifacts
        }

    } catch (error) {
        console.error('Error fetching artifacts:', error)
        return {
            success: false,
            error: 'Failed to fetch artifacts',
            artifacts: []
        }
    }
}

// Get single artifact with permission check
export async function getArtifactById(artifactId: string) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return {
                success: false,
                error: 'Authentication required',
                artifact: null
            }
        }

        const userId = BigInt(session.user.id)
        const artifactIdInt = parseInt(artifactId)

        // Fetch artifact with permission check
        const artifact = await prisma.assistantArtifact.findFirst({
            where: {
                id: artifactIdInt,
                deletedAt: null, // Exclude soft-deleted artifacts
                OR: [
                    { userId: userId }, // User is the creator
                    {
                        permissions: {
                            some: {
                                userId: userId // User has explicit permission
                            }
                        }
                    },
                    { isPublic: true } // Artifact is public
                ]
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        image: true
                    }
                },
                permissions: {
                    where: {
                        userId: userId
                    },
                    select: {
                        access: true
                    }
                },
                activeVersion: {
                    select: {
                        id: true,
                        versionNumber: true,
                        code: true,
                        description: true
                    }
                },
                versions: {
                    select: {
                        id: true,
                        versionNumber: true
                    },
                    orderBy: {
                        versionNumber: 'desc'
                    }
                }
            }
        })

        if (!artifact) {
            return {
                success: false,
                error: 'Artifact not found or access denied',
                artifact: null
            }
        }

        return {
            success: true,
            artifact: {
                id: artifact.id.toString(),
                name: artifact.name || 'Untitled Artifact',
                category: artifact.category || 'others',
                htmlContent: artifact.activeVersion?.code || '',
                instructions: artifact.instructions || '',
                createdAt: artifact.createdAt,
                updatedAt: artifact.updatedAt,
                activeVersionId: artifact.activeVersionId?.toString(),
                activeVersionNumber: artifact.activeVersion?.versionNumber,
                versionsCount: artifact.versions.length, // Total number of versions
                hasVersions: artifact.versions.length > 0, // Quick check if versions exist
                creator: {
                    id: artifact.user.id.toString(),
                    name: artifact.user.name || 'Unknown User',
                    email: artifact.user.email,
                    image: artifact.user.image
                },
                isOwner: artifact.userId === userId,
                access: artifact.userId === userId
                    ? 'admin'
                    : artifact.permissions[0]?.access || 'viewer',
                isPublic: artifact.isPublic,
                apiKeys: artifact.apiKeys as Record<string, string> | null
            }
        }

    } catch (error) {
        console.error('Error fetching artifact:', error)
        return {
            success: false,
            error: 'Failed to fetch artifact',
            artifact: null
        }
    }
}

/**
 * Get all versions for an artifact
 */
export async function getArtifactVersions(artifactId: string) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return {
                success: false,
                error: 'Authentication required',
                versions: []
            }
        }

        const userId = BigInt(session.user.id)
        const artifactIdInt = parseInt(artifactId)

        // First verify user has access to this artifact
        const artifact = await prisma.assistantArtifact.findFirst({
            where: {
                id: artifactIdInt,
                deletedAt: null,
                OR: [
                    { userId: userId }, // User is the creator
                    {
                        permissions: {
                            some: {
                                userId: userId // User has explicit permission
                            }
                        }
                    },
                    { isPublic: true } // Artifact is public
                ]
            }
        })

        if (!artifact) {
            return {
                success: false,
                error: 'Artifact not found or access denied',
                versions: []
            }
        }

        // Fetch all versions for this artifact
        const versions = await prisma.artifactVersion.findMany({
            where: {
                artifactId: artifactIdInt,
                deletedAt: null
            },
            include: {
                creator: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        image: true
                    }
                }
            },
            orderBy: {
                versionNumber: 'desc'
            }
        })

        const formattedVersions = versions.map(version => ({
            id: version.id.toString(),
            versionNumber: version.versionNumber,
            versionName: version.versionName,
            code: version.code,
            description: version.description,
            changeType: version.changeType,
            isSnapshot: version.isSnapshot,
            createdAt: version.createdAt,
            isActive: artifact.activeVersionId === version.id,
            creator: {
                id: version.creator.id.toString(),
                name: version.creator.name || 'Unknown User',
                email: version.creator.email,
                image: version.creator.image
            }
        }))

        return {
            success: true,
            versions: formattedVersions,
            activeVersionId: artifact.activeVersionId?.toString()
        }

    } catch (error) {
        console.error('Error fetching artifact versions:', error)
        return {
            success: false,
            error: 'Failed to fetch versions',
            versions: []
        }
    }
}

/**
 * Set active version for an artifact
 */
export async function setActiveArtifactVersion(artifactId: string, versionId: string) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return {
                success: false,
                error: 'Authentication required'
            }
        }

        const userId = BigInt(session.user.id)
        const artifactIdInt = parseInt(artifactId)
        const versionIdInt = parseInt(versionId)

        // Verify user has permission to edit this artifact
        const artifact = await prisma.assistantArtifact.findFirst({
            where: {
                id: artifactIdInt,
                deletedAt: null,
                OR: [
                    { userId: userId }, // User is the owner
                    {
                        permissions: {
                            some: {
                                userId: userId,
                                access: {
                                    in: ['editor', 'admin'] // Only editors and admins can set active version
                                }
                            }
                        }
                    }
                ]
            }
        })

        if (!artifact) {
            return {
                success: false,
                error: 'Artifact not found or you do not have edit permissions'
            }
        }

        // Verify the version exists and belongs to this artifact
        const version = await prisma.artifactVersion.findFirst({
            where: {
                id: versionIdInt,
                artifactId: artifactIdInt,
                deletedAt: null
            }
        })

        if (!version) {
            return {
                success: false,
                error: 'Version not found'
            }
        }

        // Update the active version
        await prisma.assistantArtifact.update({
            where: { id: artifactIdInt },
            data: { activeVersionId: versionIdInt }
        })

        return {
            success: true,
            message: 'Active version updated successfully'
        }

    } catch (error) {
        console.error('Error setting active version:', error)
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to set active version'
        }
    }
}

/**
 * Delete file from S3
 */
export async function deleteArtifactFile(fileUrl: string): Promise<{ success: boolean; error?: string }> {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return {
                success: false,
                error: 'Authentication required'
            }
        }

        await deleteFromS3(fileUrl)
        return { success: true }
    } catch (error) {
        console.error('Error deleting file from S3:', error)
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to delete file'
        }
    }
}

/**
 * Share artifact with a user
 */
export async function shareArtifact(data: {
    artifactId: string
    artifactName: string
    assistantId: string
    recipientUserId: string
    recipientName: string
}): Promise<{ success: boolean; error?: string; shareableLink?: string }> {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return {
                success: false,
                error: 'Authentication required'
            }
        }

        const userId = BigInt(session.user.id)
        const artifactIdInt = parseInt(data.artifactId)
        const assistantIdBigInt = BigInt(data.assistantId)
        const recipientUserIdBigInt = BigInt(data.recipientUserId)

        // Generate shareableId if doesn't exist
        let shareableId: string
        const artifact = await prisma.assistantArtifact.findUnique({
            where: { id: artifactIdInt }
        })

        if (!artifact) {
            return {
                success: false,
                error: 'Artifact not found'
            }
        }

        if (artifact.shareableId) {
            shareableId = artifact.shareableId
        } else {
            // Generate unique shareable ID (8 characters)
            shareableId = Math.random().toString(36).substring(2, 10)
            
            // Update artifact with shareableId
            await prisma.assistantArtifact.update({
                where: { id: artifactIdInt },
                data: { shareableId }
            })
        }

        // Create artifact permission for recipient (viewer access)
        await prisma.artifactPermission.upsert({
            where: {
                userId_artifactId: {
                    userId: recipientUserIdBigInt,
                    artifactId: artifactIdInt
                }
            },
            create: {
                userId: recipientUserIdBigInt,
                assistantId: assistantIdBigInt,
                artifactId: artifactIdInt,
                access: 'viewer'
            },
            update: {
                // If permission already exists, keep it (don't downgrade to viewer if they're already editor)
                access: 'viewer'
            }
        })

        // Get or create chat between sender and recipient
        const chat = await prisma.assistantChat.findFirst({
            where: {
                assistantId: assistantIdBigInt,
                OR: [
                    { initiatorId: userId, participantId: recipientUserIdBigInt },
                    { initiatorId: recipientUserIdBigInt, participantId: userId }
                ]
            }
        })

        let chatId: number
        if (chat) {
            chatId = chat.id
        } else {
            // Create new chat
            const newChat = await prisma.assistantChat.create({
                data: {
                    assistantId: assistantIdBigInt,
                    initiatorId: userId,
                    participantId: recipientUserIdBigInt,
                    isActive: true
                }
            })
            chatId = newChat.id
        }

        // Get sender information
        const sender = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                name: true,
                email: true,
                image: true
            }
        })

        if (!sender) {
            return {
                success: false,
                error: 'Sender not found'
            }
        }

        // Create shareable link
        const shareableLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/share/${shareableId}`

        // Send message with artifact link (include sender info)
        const message = await prisma.assistantChatMessage.create({
            data: {
                assistantChatId: chatId,
                assistantId: assistantIdBigInt,
                senderId: userId,
                message: `I shared an artifact with you: "${data.artifactName}"\n\nView it here: ${shareableLink}`,
                messageType: 'text'
            },
            include: {
                sender: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        image: true
                    }
                }
            }
        })

        // Update chat's lastMessageAt and lastMessageId
        await prisma.assistantChat.update({
            where: { id: chatId },
            data: {
                lastMessageAt: new Date(),
                lastMessageId: message.id
            }
        })

        // Trigger Pusher event for real-time message delivery
        try {
            await pusher.trigger('global-assistant-chat', 'new-message', {
                message: {
                    id: message.id.toString(),
                    assistantChatId: message.assistantChatId.toString(),
                    assistantId: message.assistantId.toString(),
                    senderId: message.senderId.toString(),
                    message: message.message,
                    messageType: message.messageType,
                    attachmentUrl: message.attachmentUrl,
                    attachmentName: message.attachmentName,
                    attachmentSize: message.attachmentSize?.toString() || null,
                    isRead: message.isRead,
                    readAt: message.readAt,
                    createdAt: message.createdAt,
                    updatedAt: message.updatedAt,
                    deletedAt: message.deletedAt,
                    sender: {
                        id: message.sender.id.toString(),
                        name: message.sender.name,
                        email: message.sender.email,
                        image: message.sender.image
                    }
                },
                chatId: chatId.toString(),
                assistantId: data.assistantId,
                timestamp: new Date().toISOString()
            })
            console.log('[Share Artifact] Pusher event triggered for message')
        } catch (pusherError) {
            console.error('[Share Artifact] Pusher error:', pusherError)
            // Don't fail the request if Pusher fails
        }

        // Send notification to recipient
        try {
            await notificationService.createNotification({
                userId: recipientUserIdBigInt.toString(),
                title: '🎨 Artifact Shared',
                message: `${sender.name || 'Someone'} shared "${data.artifactName}" with you`,
                type: 'artifact_permission_granted',
                relatedId: artifactIdInt.toString(),
                relatedType: 'artifact',
                data: {
                    artifactId: artifactIdInt.toString(),
                    artifactName: data.artifactName,
                    shareableId,
                    shareableLink,
                    senderId: userId.toString(),
                    senderName: sender.name
                }
            })
            console.log('[Share Artifact] Notification sent to recipient')
        } catch (notificationError) {
            console.error('[Share Artifact] Notification error:', notificationError)
            // Don't fail the request if notification fails
        }

        console.log('[Share Artifact] Artifact shared successfully:', {
            artifactId: artifactIdInt,
            shareableId,
            recipient: data.recipientName,
            messageId: message.id.toString()
        })

        return {
            success: true,
            shareableLink
        }

    } catch (error) {
        console.error('Error sharing artifact:', error)
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to share artifact'
        }
    }
}
