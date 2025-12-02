"use server"

import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"

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
                updatedCode: artifact.code || '',
                updatedAt: artifact.updatedAt || new Date()
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