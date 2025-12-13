"use server"

import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import pusher from "@/lib/pusher"
import notificationService from "@/lib/services/notifactionService"

// Types
export interface ChatMessage {
    role: 'user' | 'assistant'
    content: string
    timestamp?: Date
}

export interface UpdateArtifactParams {
    artifactId: string
    userPrompt: string
    chatHistory: ChatMessage[]
    currentHtmlCode: string
}

export interface UpdateArtifactResult {
    success: boolean
    error?: string
    artifact?: {
        id: string
        name: string
        updatedCode: string
        updatedAt: Date
        activeVersionId?: string
        currentVersionNumber?: number
        latestVersionNumber?: number
    }
}

/**
 * Build conversation context for AI
 */
function buildConversationContext(chatHistory: ChatMessage[]): string {
    if (!chatHistory || chatHistory.length === 0) {
        return "No previous conversation history."
    }

    let context = "=== CONVERSATION HISTORY ===\n\n"
    
    chatHistory.forEach((message, index) => {
        const timestamp = message.timestamp 
            ? new Date(message.timestamp).toLocaleString() 
            : `Message ${index + 1}`
        
        context += `[${timestamp}] ${message.role.toUpperCase()}:\n${message.content}\n\n`
    })
    
    context += "=== END CONVERSATION HISTORY ===\n"
    
    return context
}

/**
 * Create a new version for an artifact
 */
export async function createArtifactVersion({
    artifactId,
    userId,
    code,
    description,
    changeType = 'manual',
    setAsActive = true
}: {
    artifactId: number
    userId: bigint
    code: string
    description?: string
    changeType?: 'manual' | 'ai' | 'rollback'
    setAsActive?: boolean
}): Promise<{ success: boolean; error?: string; version?: any }> {
    try {
        // Get the latest version number
        const latestVersion = await prisma.artifactVersion.findFirst({
            where: { artifactId },
            orderBy: { versionNumber: 'desc' },
            select: { versionNumber: true, id: true }
        })

        const newVersionNumber = (latestVersion?.versionNumber || 0) + 1

        // Create new version in a transaction
        const result = await prisma.$transaction(async (tx) => {
            const newVersion = await tx.artifactVersion.create({
                data: {
                    artifactId,
                    userId,
                    versionNumber: newVersionNumber,
                    versionName: `Version ${newVersionNumber}`,
                    code,
                    description: description || `Updated to version ${newVersionNumber}`,
                    changeType,
                    changedFrom: latestVersion?.id,
                    isSnapshot: false
                }
            })

            // Set as active version if requested
            if (setAsActive) {
                await tx.assistantArtifact.update({
                    where: { id: artifactId },
                    data: { activeVersionId: newVersion.id }
                })
            }

            return newVersion
        })

        // Send notifications to shared users (only for updates, not first version)
        if (newVersionNumber > 1 && (changeType === 'ai' || changeType === 'manual')) {
            try {
                // Get artifact with permissions
                const artifact = await prisma.assistantArtifact.findUnique({
                    where: { id: artifactId },
                    include: {
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

                if (artifact && artifact.permissions.length > 0) {
                    // Get updater information
                    const updater = await prisma.user.findUnique({
                        where: { id: userId },
                        select: {
                            id: true,
                            name: true,
                            email: true
                        }
                    })

                    if (updater) {
                        // Filter out the current user
                        const usersToNotify = artifact.permissions
                            .filter(perm => perm.user.id !== userId)
                            .map(perm => perm.user)

                        console.log(`[Artifact Version] Sending notifications to ${usersToNotify.length} users...`)

                        // Send notifications to each user
                        for (const user of usersToNotify) {
                            try {
                                await notificationService.createNotification({
                                    userId: user.id.toString(),
                                    title: '🔄 Artifact Updated',
                                    message: `${updater.name || 'Someone'} updated "${artifact.name || 'Untitled Artifact'}" to version ${newVersionNumber}`,
                                    type: 'artifact_updated',
                                    relatedId: artifact.id.toString(),
                                    relatedType: 'artifact',
                                    data: {
                                        artifactId: artifact.id.toString(),
                                        artifactName: artifact.name || 'Untitled Artifact',
                                        versionNumber: newVersionNumber,
                                        updaterId: updater.id.toString(),
                                        updaterName: updater.name,
                                        assistantId: artifact.assistantId.toString(),
                                        changeType
                                    }
                                })
                                console.log(`[Artifact Version] Notification sent to: ${user.email}`)
                            } catch (notificationError) {
                                console.error(`[Artifact Version] Failed to notify ${user.email}:`, notificationError)
                            }
                        }

                        // Trigger Pusher event for real-time updates
                        if (usersToNotify.length > 0) {
                            try {
                                await pusher.trigger('global-artifact-updates', 'artifact-version-created', {
                                    artifactId: artifact.id.toString(),
                                    artifactName: artifact.name || 'Untitled Artifact',
                                    versionNumber: newVersionNumber,
                                    updaterId: updater.id.toString(),
                                    updaterName: updater.name,
                                    assistantId: artifact.assistantId.toString(),
                                    changeType,
                                    timestamp: new Date().toISOString(),
                                    notifiedUserIds: usersToNotify.map(u => u.id.toString())
                                })
                                console.log('[Artifact Version] Pusher event triggered')
                            } catch (pusherError) {
                                console.error('[Artifact Version] Pusher error:', pusherError)
                            }
                        }
                    }
                }
            } catch (notificationError) {
                console.error('[Artifact Version] Error sending notifications:', notificationError)
                // Don't fail the version creation if notifications fail
            }
        }

        return {
            success: true,
            version: {
                id: result.id,
                versionNumber: result.versionNumber,
                versionName: result.versionName,
                code: result.code
            }
        }
    } catch (error) {
        console.error('Error creating artifact version:', error)
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to create version'
        }
    }
}

/**
 * Update artifact with AI assistance
 */
export async function updateArtifactWithAI({
    artifactId,
    userPrompt,
    chatHistory,
    currentHtmlCode
}: UpdateArtifactParams): Promise<UpdateArtifactResult> {
    try {
        // Authentication check
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return {
                success: false,
                error: 'Authentication required'
            }
        }

        // Validate inputs
        if (!artifactId?.trim()) {
            return {
                success: false,
                error: 'Artifact ID is required'
            }
        }

        if (!userPrompt?.trim()) {
            return {
                success: false,
                error: 'User prompt cannot be empty'
            }
        }

        if (!currentHtmlCode?.trim()) {
            return {
                success: false,
                error: 'Current HTML code is required'
            }
        }

        const userId = BigInt(session.user.id)
        const artifactIdInt = parseInt(artifactId)

        if (isNaN(artifactIdInt)) {
            return {
                success: false,
                error: 'Invalid artifact ID format'
            }
        }

        // Fetch artifact and verify permissions
        const artifact = await prisma.assistantArtifact.findFirst({
            where: {
                id: artifactIdInt,
                deletedAt: null, // Exclude soft-deleted artifacts
                OR: [
                    { userId: userId }, // User is the owner
                    {
                        permissions: {
                            some: {
                                userId: userId,
                                access: {
                                    in: ['editor', 'admin'] // Only editors and admins can update
                                }
                            }
                        }
                    }
                ]
            },
            include: {
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
                },
                versions: {
                    select: {
                        versionNumber: true
                    },
                    orderBy: {
                        versionNumber: 'desc'
                    },
                    take: 1
                }
            }
        })

        if (!artifact) {
            return {
                success: false,
                error: 'Artifact not found or you do not have edit permissions'
            }
        }

        // Video generation artifacts cannot be updated
        if (artifact.category === "video_generation") {
            return {
                success: false,
                error: 'Video generation artifacts cannot be updated. Please create a new video artifact instead.'
            }
        }

        // For non-video artifacts, return success to trigger streaming update
        // The client should call /api/artifacts/update-stream endpoint for streaming updates
        return {
            success: true,
            artifact: {
                id: artifact.id.toString(),
                name: artifact.name || 'Untitled Artifact',
                updatedCode: artifact.activeVersion?.code || '',
                updatedAt: artifact.updatedAt || new Date(),
                activeVersionId: artifact.activeVersionId?.toString(),
                currentVersionNumber: artifact.activeVersion?.versionNumber || 1,
                latestVersionNumber: artifact.versions[0]?.versionNumber || 1
            }
        }

    } catch (error) {
        console.error('Error updating artifact:', error)
        
        if (error instanceof Error) {
            return {
                success: false,
                error: error.message
            }
        }

        return {
            success: false,
            error: 'An unexpected error occurred while updating the artifact'
        }
    }
}