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
import { getArtifactInstructionsGeneratorPrompt } from "@/utils/prompts"
import pusher from "@/lib/pusher"
import notificationService from "@/lib/services/notifactionService"

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
        const model = 'gpt-5-mini'

        const response = await openai.responses.create({
            model: model,
            reasoning: { effort: "low" },
            instructions: await getArtifactInstructionsGeneratorPrompt(),
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

        // Fetch all contacts for this assistant who have 'artifacts' permission
        // Exclude the current user (creator) as they get automatic ADMIN access
        const contacts = await prisma.assistantContact.findMany({
            where: {
                assistantId: assistantIdBigInt,
                userId: {
                    not: userId // Exclude the current user (creator)
                },
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


// One-click save of a chat code block as a private artifact
export async function saveCodeAsArtifact(data: {
    assistantId: string
    code: string
    language: string
    chatId?: string | null
    name?: string          // user-provided name; falls back to auto-derived
}): Promise<{ success: boolean; artifactId?: string; error?: string }> {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return { success: false, error: 'Authentication required' }
        }

        const { code, language, assistantId, chatId } = data

        // Use the caller-supplied name, or derive one from the first code line
        const firstLine = code.split('\n').find(l => l.trim().length > 0) ?? ''
        const rawName = firstLine.replace(/[<>{}[\]/\\|"'`]/g, '').trim().slice(0, 48)
        const artifactName = data.name?.trim()
            || (rawName ? `${rawName} (${language})` : `${language.charAt(0).toUpperCase() + language.slice(1)} Snippet`)

        // HTML → render directly; other languages → wrap in a clean styled viewer
        const isHtml = language === 'html' || language === 'htm'
        const escaped = code
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
        const templateHtml = isHtml
            ? code
            : `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>${artifactName}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{background:#fff;font-family:ui-monospace,'Cascadia Code','Source Code Pro',Menlo,Consolas,monospace;padding:2rem}
  .header{display:flex;align-items:center;gap:.6rem;margin-bottom:1.25rem}
  .lang-badge{background:#f3f4f6;border:1px solid #e5e7eb;border-radius:6px;padding:2px 10px;font-size:.75rem;font-weight:600;color:#374151;text-transform:uppercase;letter-spacing:.05em}
  .name{font-size:.9rem;color:#6b7280;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  pre{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:1.25rem 1.5rem;overflow-x:auto;font-size:.85rem;line-height:1.65;color:#1e293b;white-space:pre}
</style>
</head>
<body>
  <div class="header">
    <span class="lang-badge">${language}</span>
    <span class="name">${artifactName}</span>
  </div>
  <pre><code>${escaped}</code></pre>
</body>
</html>`

        const result = await createArtifact({
            assistantId,
            name: artifactName,
            instructions: `Code saved from chat. Language: ${language}.\n\n\`\`\`${language}\n${code}\n\`\`\``,
            category: 'others',
            permissions: 'private',
            selectedUsers: [],
            apiConfigs: [],
            selectedChatId: chatId ?? null,
            templateHtml,
        })

        if (!result.success) {
            return { success: false, error: result.error }
        }

        return { success: true, artifactId: (result as any).artifact?.id?.toString() }
    } catch (error) {
        console.error('[saveCodeAsArtifact] Error:', error)
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
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
    selectedChatId?: string | null
    templateHtml?: string
    bookingConfig?: any
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

        // Check if user can create artifacts (only owners and contacts with artifacts permission)
        const { canCreateArtifacts } = await import('@/lib/permissions/assistant-permissions')
        const canCreate = await canCreateArtifacts(assistantIdBigInt, userId)

        if (!canCreate) {
            return {
                success: false,
                error: 'You do not have permission to create artifacts for this assistant'
            }
        }

        // Use the original instructions without embedding content
        // The worker will fetch and use the extracted content from the files JSON field
        const enhancedInstructions = data.instructions

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
        } else if (data.templateHtml) {
            // If templateHtml is provided (from template selection), use it as the base
            generatedCode = data.templateHtml
        } else {
            // For HTML artifacts without template, start with empty code - will be streamed on the page
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

        // Store selectedChatId and bookingConfig in tools JSON field
        // For booking artifacts, provide default config if not specified
        let bookingConfig = data.bookingConfig;
        if (data.category === 'booking' && !bookingConfig) {
            // Default booking configuration for booking artifacts
            bookingConfig = {
                duration: 30,
                bufferTime: 5,
                eventTitle: data.name,
                eventDescription: "Book a time slot",
                availability: {
                    timezone: "America/New_York",
                    schedule: {
                        Monday: [{ start: "09:00", end: "17:00" }],
                        Tuesday: [{ start: "09:00", end: "17:00" }],
                        Wednesday: [{ start: "09:00", end: "17:00" }],
                        Thursday: [{ start: "09:00", end: "17:00" }],
                        Friday: [{ start: "09:00", end: "17:00" }],
                        Saturday: [],
                        Sunday: []
                    }
                }
            };
        }

        const toolsJson = {
            ...(data.selectedChatId ? { selectedChatId: data.selectedChatId } : {}),
            ...(bookingConfig ? { bookingConfig: bookingConfig } : {})
        }
        const finalToolsJson = Object.keys(toolsJson).length > 0 ? toolsJson : undefined

        // Determine if artifact is public
        const isPublic = data.permissions === 'public'

        // Create artifact with ADMIN permission for creator and EDITOR permissions for selected users
        const artifact = await prisma.$transaction(async (tx) => {
            // Create the artifact (creator is automatically OWNER)
            const newArtifact = await tx.assistantArtifact.create({
                data: {
                    assistantId: assistantIdBigInt,
                    userId: userId,
                    name: data.name,
                    instructions: enhancedInstructions,
                    category: data.category,
                    tools: finalToolsJson ? (finalToolsJson as any) : undefined,
                    apiKeys: apiKeysJson || undefined,
                    files: data.uploadedFiles ? (data.uploadedFiles as any) : undefined,
                    images: data.uploadedImages ? (data.uploadedImages as any) : undefined,
                    videoUrl: videoUrl || undefined,
                    thumbnailUrl: thumbnailUrl || undefined,
                    videoMetadata: videoMetadata ? (videoMetadata as any) : undefined,
                    isPublic: isPublic,
                    activeVersionId: null // Will be set after creating first version for video artifacts
                }
            })

            // For video artifacts, create the first version immediately
            let firstVersionId: number | null = null
            if (data.category === "video_generation" && generatedCode) {
                console.log("[Artifact] Creating first version for video artifact...")

                const firstVersion = await tx.artifactVersion.create({
                    data: {
                        artifactId: newArtifact.id,
                        userId: userId,
                        versionNumber: 1,
                        versionName: "Version 1",
                        code: generatedCode,
                        description: "Initial video generation",
                        changeType: "ai",
                        isSnapshot: false
                    }
                })

                firstVersionId = firstVersion.id
                console.log(`[Artifact] First version created: ${firstVersionId}`)

                // Update artifact with active version
                await tx.assistantArtifact.update({
                    where: { id: newArtifact.id },
                    data: { activeVersionId: firstVersionId }
                })

                console.log("[Artifact] Active version set for video artifact")
            }

            // Always create ADMIN permission for the creator
            console.log('[Artifact Creation] Creating ADMIN permission for creator:', userId.toString())
            await tx.artifactPermission.create({
                data: {
                    userId: userId,
                    assistantId: assistantIdBigInt,
                    artifactId: newArtifact.id,
                    access: 'ADMIN' // Creator always gets ADMIN access
                }
            })
            console.log('[Artifact Creation] ✅ ADMIN permission created for creator')

            // Create EDITOR permissions for selected users (if permissions is 'team')
            console.log('[Artifact Creation] Permissions check:', {
                permissionsType: data.permissions,
                selectedUsersCount: data.selectedUsers.length,
                willCreatePermissions: data.permissions === 'team' && data.selectedUsers.length > 0
            })

            if (data.permissions === 'team' && data.selectedUsers.length > 0) {
                console.log('[Artifact Creation] Creating EDITOR permissions for users:', data.selectedUsers.map(u => u.email))
                await tx.artifactPermission.createMany({
                    data: data.selectedUsers.map(user => ({
                        userId: BigInt(user.id),
                        assistantId: assistantIdBigInt,
                        artifactId: newArtifact.id,
                        access: 'EDITOR' // All shared users get EDITOR access
                    }))
                })
                console.log('[Artifact Creation] ✅ EDITOR permissions created successfully')
            } else {
                console.log('[Artifact Creation] ⚠️ No additional permissions created - permissions:', data.permissions, 'users:', data.selectedUsers.length)
            }

            return newArtifact
        })

        // Get all users to notify (owner + selected EDITORs)
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
                        { access: 'admin' },
                        {
                            AND: [
                                { permissions: { not: null } },
                                {
                                    permissions: {
                                        contains: '"artifacts"'
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

            // Add contact user IDs
            for (const contact of contactsWithArtifactPermission) {
                const userIdStr = contact.userId.toString()
                if (!userIdsToNotify.includes(userIdStr)) {
                    userIdsToNotify.push(userIdStr)
                }
            }

            // If artifact is 'team' and has selected users, add them
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

        // ── Create initial version for template artifacts ─────────────────────
        if (data.templateHtml) {
            try {
                const templateVersion = await prisma.artifactVersion.create({
                    data: {
                        artifactId: artifact.id,
                        userId: userId,
                        versionNumber: 1,
                        versionName: 'Version 1',
                        code: data.templateHtml,
                        description: 'Initial template version',
                        changeType: 'ai',
                        isSnapshot: false,
                    },
                })
                await prisma.assistantArtifact.update({
                    where: { id: artifact.id },
                    data: { activeVersionId: templateVersion.id },
                })
                console.log('[Artifact Action] ✅ Template version created:', templateVersion.id)
            } catch (versionError) {
                console.error('[Artifact Action] Failed to create template version:', versionError)
            }
        }

        // ── Enqueue AI generation immediately so it runs in parallel with the
        //    user navigating to the artifact page (only for AI-generated artifacts)
        if (data.category !== 'video_generation' && !data.templateHtml) {
            try {
                const { enqueueArtifactGeneration } = await import('@/lib/queues/artifact-generation.queue')
                const { processArtifactGeneration } = await import('@/lib/services/artifact-generation.service')

                const jobId = await enqueueArtifactGeneration({
                    artifactId: Number(artifact.id),
                    userId: session.user.id,
                    assistantId: data.assistantId,
                    instructions: data.instructions,
                    selectedChatId: data.selectedChatId ? parseInt(data.selectedChatId) : undefined,
                })

                console.log('[Artifact Action] ✅ Generation job enqueued:', jobId)

                // Fire-and-forget: process inline so generation works even when
                // the standalone worker process is not running
                void processArtifactGeneration(jobId, Number(artifact.id)).catch(err => {
                    console.error('[Artifact Action] Inline generation error:', err)
                })
            } catch (queueError) {
                console.error('[Artifact Action] Failed to enqueue generation job:', queueError)
                // Don't fail the artifact creation; user can still trigger generation from the page
            }
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

        const isAssistantOwner = await prisma.assistant.findFirst({
            where: { id: assistantIdBigInt, userId: userId }
        })

        const hasAssistantAccess = isAssistantOwner || await prisma.assistant.findFirst({
            where: {
                id: assistantIdBigInt,
                OR: [
                    {
                        purchases: {
                            some: {
                                buyerId: userId,
                                paymentRecord: {
                                    status: 'completed'
                                }
                            }
                        }
                    },
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

        if (hasAssistantAccess) {
            console.log(`[Get Artifacts] User ${userId} has assistant access - granting VIEWER access to all artifacts in assistant ${assistantIdBigInt}`)
        }

        // Build OR conditions dynamically
        const orConditions: any[] = [
            { userId: userId }, // User is OWNER of the artifact (includes buyer's own copies)
            {
                permissions: {
                    some: {
                        userId: userId // User has explicit permission (legacy: old purchases with VIEWER grants)
                    }
                }
            },
            { isPublic: true } // Public artifacts
        ]

        // ONLY the assistant owner sees all artifacts in the assistant.
        // Buyers see only their own copies (userId = userId above) plus any
        // explicit permissions, keeping creator originals private from buyers.
        if (isAssistantOwner) {
            orConditions.push({ id: { gt: 0 } }) // Match all artifacts in the assistant
        }

        console.log(`[Get Artifacts] Query conditions - hasAssistantAccess: ${!!hasAssistantAccess}, OR conditions count: ${orConditions.length}`)

        // Fetch artifacts where:
        // 1. User is the creator (OWNER)
        // 2. User has explicit permission (EDITOR/VIEWER)
        // 3. User has access to the assistant (gets VIEWER access to all artifacts)
        // 4. Artifact is public
        const artifacts = await prisma.assistantArtifact.findMany({
            where: {
                assistantId: assistantIdBigInt,
                deletedAt: null,
                OR: orConditions
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

        console.log(`[Get Artifacts] Found ${artifacts.length} artifacts for assistant ${assistantIdBigInt}`)

        const formattedArtifacts = artifacts.map(artifact => {
            const isOwner = artifact.userId === userId
            const hasExplicitPermission = artifact.permissions.length > 0

            // Determine access level:
            // 1. Owner gets ADMIN
            // 2. Explicit permission takes precedence
            // 3. Assistant access grants VIEWER
            const accessLevel = isOwner
                ? 'ADMIN'
                : hasExplicitPermission
                    ? artifact.permissions[0].access
                    : 'VIEWER' // Granted via assistant access

            return {
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
                isOwner,
                access: accessLevel,
                isPublic: artifact.isPublic
            }
        })

        console.log(`[Get Artifacts] Returning ${formattedArtifacts.length} formatted artifacts to client`)

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

        // First, get the artifact to find its assistantId
        const artifactLookup = await prisma.assistantArtifact.findUnique({
            where: { id: artifactIdInt },
            select: { assistantId: true, deletedAt: true }
        })

        if (!artifactLookup || artifactLookup.deletedAt) {
            return {
                success: false,
                error: 'Artifact not found',
                artifact: null
            }
        }

        // Check if user is the assistant owner
        const isAssistantOwner = await prisma.assistant.findFirst({
            where: { id: artifactLookup.assistantId, userId: userId }
        })

        // Check if user has any access to the assistant (for logging/audit)
        const hasAssistantAccess = isAssistantOwner || await prisma.assistant.findFirst({
            where: {
                id: artifactLookup.assistantId,
                OR: [
                    {
                        purchases: {
                            some: {
                                buyerId: userId,
                                paymentRecord: {
                                    status: 'completed'
                                }
                            }
                        }
                    },
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

        // Build OR conditions dynamically
        const orConditions: any[] = [
            { userId: userId }, // OWNER of the artifact (includes buyer's own copies)
            {
                permissions: {
                    some: {
                        userId: userId // Has explicit permission (legacy VIEWER grants)
                    }
                }
            },
            { isPublic: true } // Public
        ]

        // Only the assistant owner can see all artifacts (including creator originals).
        // Buyers see only their own copies or artifacts with explicit permissions.
        if (isAssistantOwner) {
            orConditions.push({ id: { gt: 0 } }) // Match all artifacts in the assistant
        }

        console.log(`[Get Artifact By ID] Artifact ${artifactIdInt} - hasAssistantAccess: ${!!hasAssistantAccess}, OR conditions: ${orConditions.length}`)

        // Fetch artifact with permission check
        const artifact = await prisma.assistantArtifact.findFirst({
            where: {
                id: artifactIdInt,
                deletedAt: null,
                OR: orConditions
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

        const isOwner = artifact.userId === userId
        const hasExplicitPermission = artifact.permissions.length > 0

        // Determine access level:
        // 1. Owner gets ADMIN
        // 2. Explicit permission takes precedence
        // 3. Assistant access grants VIEWER
        const accessLevel = isOwner
            ? 'ADMIN'
            : hasExplicitPermission
                ? artifact.permissions[0].access
                : 'VIEWER' // Granted via assistant access

        console.log(`[Get Artifact] User ${userId} accessing artifact ${artifactIdInt} with access level: ${accessLevel} (owner: ${isOwner}, explicit: ${hasExplicitPermission}, assistant access: ${!!hasAssistantAccess})`)

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
                versionsCount: artifact.versions.length,
                hasVersions: artifact.versions.length > 0,
                creator: {
                    id: artifact.user.id.toString(),
                    name: artifact.user.name || 'Unknown User',
                    email: artifact.user.email,
                    image: artifact.user.image
                },
                isOwner,
                access: accessLevel,
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

        // Verify user has access to this artifact
        const artifact = await prisma.assistantArtifact.findFirst({
            where: {
                id: artifactIdInt,
                deletedAt: null,
                OR: [
                    { userId: userId }, // OWNER
                    {
                        permissions: {
                            some: {
                                userId: userId // EDITOR
                            }
                        }
                    },
                    { isPublic: true } // Public
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

        // Fetch all versions
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

        // Verify user has EDITOR or OWNER permission
        const artifact = await prisma.assistantArtifact.findFirst({
            where: {
                id: artifactIdInt,
                deletedAt: null,
                OR: [
                    { userId: userId }, // OWNER
                    {
                        permissions: {
                            some: {
                                userId: userId,
                                access: 'EDITOR' // EDITOR can set active version
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

        // Verify the version exists
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
 * Share artifact with a user (gives them EDITOR access)
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

        // Verify user has permission to share (OWNER or EDITOR)
        const artifact = await prisma.assistantArtifact.findFirst({
            where: {
                id: artifactIdInt,
                OR: [
                    { userId: userId }, // OWNER
                    {
                        permissions: {
                            some: {
                                userId: userId,
                                access: 'EDITOR' // EDITOR can share
                            }
                        }
                    }
                ]
            }
        })

        if (!artifact) {
            return {
                success: false,
                error: 'Artifact not found or you do not have permission to share'
            }
        }

        // Generate shareableId if doesn't exist
        let shareableId: string
        if (artifact.shareableId) {
            shareableId = artifact.shareableId
        } else {
            shareableId = Math.random().toString(36).substring(2, 10)

            await prisma.assistantArtifact.update({
                where: { id: artifactIdInt },
                data: { shareableId }
            })
        }

        // Create artifact permission for recipient (EDITOR access)
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
                access: 'EDITOR' // Always give EDITOR access when sharing
            },
            update: {
                access: 'EDITOR' // Upgrade to EDITOR if they had VIEWER
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

        // Create shareable link (strip any trailing slash from NEXTAUTH_URL)
        const baseUrl = (process.env.NEXTAUTH_URL || 'http://localhost:3000').replace(/\/$/, '')
        const shareableLink = `${baseUrl}/share/${shareableId}`

        // Send message with artifact link — use 'url' type so it renders as a clickable card
        const message = await prisma.assistantChatMessage.create({
            data: {
                assistantChatId: chatId,
                assistantId: assistantIdBigInt,
                senderId: userId,
                message: `🎨 Artifact shared: "${data.artifactName}"`,
                messageType: 'url',
                attachmentUrl: shareableLink,
                attachmentName: data.artifactName,
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

        // Trigger Pusher event
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
            console.log('[Share Artifact] Pusher event triggered')
        } catch (pusherError) {
            console.error('[Share Artifact] Pusher error:', pusherError)
        }

        // Send notification
        try {
            await notificationService.createNotification({
                userId: recipientUserIdBigInt.toString(),
                title: '🎨 Artifact Shared',
                message: `${sender.name || 'Someone'} shared "${data.artifactName}" with you as an EDITOR`,
                type: 'artifact_permission_granted',
                relatedId: artifactIdInt.toString(),
                relatedType: 'artifact',
                data: {
                    artifactId: artifactIdInt.toString(),
                    artifactName: data.artifactName,
                    shareableId,
                    shareableLink,
                    senderId: userId.toString(),
                    senderName: sender.name,
                    access: 'EDITOR'
                }
            })
            console.log('[Share Artifact] Notification sent')
        } catch (notificationError) {
            console.error('[Share Artifact] Notification error:', notificationError)
        }

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

/**
 * Delete artifact with cascade deletion of all related data
 */
export async function deleteArtifact(artifactId: string) {
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

        console.log('[Delete Artifact] Starting deletion for artifact:', artifactId)

        // Verify user has permission to delete (must be owner or admin)
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
                                access: 'ADMIN' // Only admins can delete
                            }
                        }
                    }
                ]
            },
            include: {
                assistant: true,
                permissions: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                                email: true
                            }
                        }
                    }
                }
            }
        })

        if (!artifact) {
            return {
                success: false,
                error: 'Artifact not found or you do not have permission to delete it'
            }
        }

        console.log('[Delete Artifact] Artifact found:', artifact.name)

        // Get all file URLs from artifact before deletion (for S3 cleanup)
        const fileUrls: string[] = []
        const imageUrls: string[] = []

        if (artifact.files) {
            try {
                const filesData = Array.isArray(artifact.files)
                    ? artifact.files
                    : (typeof artifact.files === 'string' ? JSON.parse(artifact.files) : artifact.files)

                if (Array.isArray(filesData)) {
                    filesData.forEach((file: any) => {
                        if (file.url) fileUrls.push(file.url)
                    })
                }
            } catch (error) {
                console.error('[Delete Artifact] Error parsing files:', error)
            }
        }

        if (artifact.images) {
            try {
                const imagesData = Array.isArray(artifact.images)
                    ? artifact.images
                    : (typeof artifact.images === 'string' ? JSON.parse(artifact.images) : artifact.images)

                if (Array.isArray(imagesData)) {
                    imagesData.forEach((image: any) => {
                        if (image.url) imageUrls.push(image.url)
                    })
                }
            } catch (error) {
                console.error('[Delete Artifact] Error parsing images:', error)
            }
        }

        // Perform cascade deletion in a transaction
        await prisma.$transaction(async (tx) => {
            // 1. Delete all artifact permissions
            const deletedPermissions = await tx.artifactPermission.deleteMany({
                where: { artifactId: artifactIdInt }
            })
            console.log('[Delete Artifact] Deleted permissions:', deletedPermissions.count)

            // 2. Delete all artifact versions
            const deletedVersions = await tx.artifactVersion.deleteMany({
                where: { artifactId: artifactIdInt }
            })
            console.log('[Delete Artifact] Deleted versions:', deletedVersions.count)

            // 3. Delete artifact generation jobs (if any)
            const deletedJobs = await tx.artifactGenerationJob.deleteMany({
                where: { artifactId: artifactIdInt }
            })
            console.log('[Delete Artifact] Deleted generation jobs:', deletedJobs.count)

            // 4. Delete the artifact itself (soft delete)
            await tx.assistantArtifact.update({
                where: { id: artifactIdInt },
                data: {
                    deletedAt: new Date()
                }
            })
            console.log('[Delete Artifact] Artifact soft deleted')
        })

        // Clean up S3 files (do this after DB deletion to avoid orphaned DB records)
        console.log('[Delete Artifact] Cleaning up S3 files:', fileUrls.length + imageUrls.length, 'files')

        const allUrls = [...fileUrls, ...imageUrls]
        for (const url of allUrls) {
            try {
                await deleteFromS3(url)
                console.log('[Delete Artifact] Deleted from S3:', url)
            } catch (s3Error) {
                console.error('[Delete Artifact] Failed to delete from S3:', url, s3Error)
                // Don't fail the entire operation if S3 cleanup fails
            }
        }

        // Notify all users who had access to this artifact
        const usersToNotify = artifact.permissions
            .filter(perm => perm.user.id !== userId) // Don't notify the deleter
            .map(perm => perm.user)

        if (usersToNotify.length > 0) {
            console.log('[Delete Artifact] Notifying', usersToNotify.length, 'users about deletion')

            const deleter = await prisma.user.findUnique({
                where: { id: userId },
                select: { name: true, email: true }
            })

            for (const user of usersToNotify) {
                try {
                    await notificationService.createNotification({
                        userId: user.id.toString(),
                        title: '🗑️ Artifact Deleted',
                        message: `${deleter?.name || 'Someone'} deleted "${artifact.name || 'Untitled Artifact'}"`,
                        type: 'artifact_deleted',
                        relatedId: artifact.id.toString(),
                        relatedType: 'artifact',
                        data: {
                            artifactId: artifact.id.toString(),
                            artifactName: artifact.name || 'Untitled Artifact',
                            deleterId: userId.toString(),
                            deleterName: deleter?.name,
                            assistantId: artifact.assistantId.toString()
                        }
                    })
                } catch (notificationError) {
                    console.error('[Delete Artifact] Failed to send notification:', notificationError)
                }
            }

            // Trigger Pusher event for real-time updates
            try {
                await pusher.trigger('global-artifact-updates', 'artifact-deleted', {
                    artifactId: artifact.id.toString(),
                    artifactName: artifact.name || 'Untitled Artifact',
                    deleterId: userId.toString(),
                    deleterName: deleter?.name,
                    assistantId: artifact.assistantId.toString(),
                    timestamp: new Date().toISOString(),
                    notifiedUserIds: usersToNotify.map(u => u.id.toString())
                })
                console.log('[Delete Artifact] Pusher event triggered')
            } catch (pusherError) {
                console.error('[Delete Artifact] Pusher error:', pusherError)
            }
        }

        console.log('[Delete Artifact] ✅ Artifact deleted successfully')

        return {
            success: true,
            message: 'Artifact deleted successfully'
        }

    } catch (error) {
        console.error('[Delete Artifact] Error:', error)
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to delete artifact'
        }
    }
}