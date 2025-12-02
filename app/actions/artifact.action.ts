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
        const model = 'gpt-5'

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

            try {
                // Step 1: Generate video with OpenAI Sora
                const soraResult = await openAISoraService.generateVideo({
                    prompt: data.instructions,
                    model: "sora-2",
                    size: "1280x720",
                    seconds: "8",
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
            // For HTML artifacts, use placeholder code that will be streamed later
            generatedCode = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${data.name}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        }
        .loading {
            text-align: center;
        }
        .spinner {
            border: 4px solid rgba(255,255,255,0.3);
            border-top: 4px solid white;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            animation: spin 1s linear infinite;
            margin: 0 auto 20px;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    </style>
</head>
<body>
    <div class="loading">
        <div class="spinner"></div>
        <h2>Generating ${data.name}...</h2>
        <p>Your artifact is being created with AI. This may take a few moments.</p>
    </div>
</body>
</html>`
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

        // Create artifact in a transaction
        const artifact = await prisma.$transaction(async (tx) => {
            // Create the artifact
            const newArtifact = await tx.assistantArtifact.create({
                data: {
                    assistantId: assistantIdBigInt,
                    userId: userId,
                    name: data.name,
                    instructions: enhancedInstructions, // Store enhanced version
                    category: data.category,
                    code: generatedCode, // AI-generated HTML code
                    tools: undefined,
                    apiKeys: apiKeysJson || undefined,
                    files: data.uploadedFiles ? (data.uploadedFiles as any) : undefined,
                    images: data.uploadedImages ? (data.uploadedImages as any) : undefined,
                    videoUrl: videoUrl || undefined,
                    thumbnailUrl: thumbnailUrl || undefined,
                    videoMetadata: videoMetadata ? (videoMetadata as any) : undefined,
                    isPublic: isPublic
                }
            })

            // Create permissions for selected users (if permissions is 'team')
            if (data.permissions === 'team' && data.selectedUsers.length > 0) {
                await tx.artifactPermission.createMany({
                    data: data.selectedUsers.map(user => ({
                        userId: BigInt(user.id),
                        assistantId: assistantIdBigInt,
                        artifactId: newArtifact.id,
                        access: 'editor' // Default access level
                    }))
                })
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
            htmlContent: artifact.code || '',
            createdAt: artifact.createdAt,
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
                htmlContent: artifact.code || '',
                instructions: artifact.instructions || '',
                createdAt: artifact.createdAt,
                updatedAt: artifact.updatedAt,
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
