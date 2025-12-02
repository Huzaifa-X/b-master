"use server"

import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { openai } from "@/lib/openai"
import prisma from "@/lib/prisma"
import openAISoraService from "@/lib/services/openai-sora.service"
import s3VideoUploadService from "@/lib/services/s3-video-upload.service"
import { generateVideoArtifactHtml } from "@/lib/templates/video-artifact.template"
import { deleteFromS3 } from "@/lib/aws-s3"
import { getArtifactCodingPrompt } from "@/utils/prompts"

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

// AI Prompt for iterative artifact updates
const ARTIFACT_UPDATE_PROMPT = getArtifactCodingPrompt()

/**
 * Basic HTML sanitization to prevent dangerous patterns
 */
function sanitizeHtml(html: string): string {
    let sanitized = html

    // Remove external script sources (only allow inline scripts)
    sanitized = sanitized.replace(/<script[^>]*src\s*=\s*["']https?:\/\/[^"']*["'][^>]*>/gi, '')
    
    // Remove javascript: protocol URLs
    sanitized = sanitized.replace(/javascript:/gi, 'blocked:')
    
    // Remove data: URLs in script contexts
    sanitized = sanitized.replace(/<script[^>]*src\s*=\s*["']data:[^"']*["'][^>]*>/gi, '')
    
    // Log if any sanitization occurred
    if (sanitized !== html) {
        console.warn('HTML sanitization applied during update')
    }
    
    return sanitized
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

        // Check if this is a video generation artifact
        let updatedCode: string
        let videoUrl: string | null = null
        let thumbnailUrl: string | null = null
        let videoMetadata: any = null

        if (artifact.category === "video_generation") {
            console.log("[Artifact Update] Remixing video artifact...")
            
            try {
                // Check if user wants to remix the video (generate new video with new prompt)
                // For video artifacts, the userPrompt is treated as a new video generation prompt
                const originalVideoId = artifact.videoMetadata && typeof artifact.videoMetadata === 'object' && 'videoId' in artifact.videoMetadata
                    ? (artifact.videoMetadata as any).videoId
                    : null

                // Generate new video with Sora (remix if original video ID exists, otherwise new generation)
                let soraResult
                if (originalVideoId && userPrompt.toLowerCase().includes('remix') || userPrompt.toLowerCase().includes('modify')) {
                    // Use remix if explicitly requested
                    soraResult = await openAISoraService.remixVideo(originalVideoId, userPrompt, {
                        model: "sora-2",
                        size: (artifact.videoMetadata as any)?.size || "1280x720",
                        seconds: (artifact.videoMetadata as any)?.duration?.toString() || "8"
                    })
                } else {
                    // Generate new video with the prompt
                    soraResult = await openAISoraService.generateVideo({
                        prompt: userPrompt,
                        model: "sora-2",
                        size: (artifact.videoMetadata as any)?.size || "1280x720",
                        seconds: (artifact.videoMetadata as any)?.duration?.toString() || "8"
                    })
                }

                console.log(`[Artifact Update] Video generated: ${soraResult.videoId}`)

                // Delete old video from S3 if it exists
                if (artifact.videoUrl) {
                    try {
                        await deleteFromS3(artifact.videoUrl)
                        console.log(`[Artifact Update] Deleted old video from S3`)
                    } catch (deleteError) {
                        console.warn(`[Artifact Update] Failed to delete old video:`, deleteError)
                    }
                }
                if (artifact.thumbnailUrl) {
                    try {
                        await deleteFromS3(artifact.thumbnailUrl)
                        console.log(`[Artifact Update] Deleted old thumbnail from S3`)
                    } catch (deleteError) {
                        console.warn(`[Artifact Update] Failed to delete old thumbnail:`, deleteError)
                    }
                }

                // Upload new video to S3
                const s3Result = await s3VideoUploadService.uploadVideo(
                    soraResult.videoBuffer,
                    soraResult.thumbnailBuffer,
                    artifact.assistantId,
                    artifact.name || "updated-video"
                )

                videoUrl = s3Result.videoUrl
                thumbnailUrl = s3Result.thumbnailUrl
                videoMetadata = {
                    ...soraResult.metadata,
                    videoId: soraResult.videoId
                }

                console.log(`[Artifact Update] New video uploaded to S3: ${videoUrl}`)

                // Generate new HTML with updated video
                updatedCode = generateVideoArtifactHtml(
                    videoUrl,
                    thumbnailUrl,
                    artifact.name || "Video Artifact"
                )

                console.log("[Artifact Update] Video artifact HTML regenerated successfully")
            } catch (videoError) {
                console.error("[Artifact Update] Video remix error:", videoError)
                return {
                    success: false,
                    error: videoError instanceof Error ? videoError.message : 'Failed to remix video with Sora'
                }
            }
        } else {
            // Existing logic for other artifact types
            // Build conversation context
            const conversationContext = buildConversationContext(chatHistory)

            // Prepare input for AI
            const aiInput = `${conversationContext}

=== CURRENT ARTIFACT CODE ===
${currentHtmlCode}
=== END CURRENT CODE ===

=== USER REQUEST ===
${userPrompt}
=== END USER REQUEST ===

Please update the artifact code based on the user's request while considering the entire conversation history. Generate the complete updated HTML code.`

            // Generate updated code using OpenAI
            const model = 'gpt-5'
            
            try {
                console.log('Generating updated artifact code with AI...')
                
                const response = await openai.responses.create({
                    model: model,
                    reasoning: { effort: "low" },
                    instructions: ARTIFACT_UPDATE_PROMPT,
                    input: aiInput,
                })

                updatedCode = response.output_text

                if (!updatedCode) {
                    return {
                        success: false,
                        error: 'Failed to generate updated artifact code'
                    }
                }

                // Clean up any markdown formatting that might have been added
                updatedCode = updatedCode
                    .replace(/^```html\n?/i, '')
                    .replace(/^```\n?/i, '')
                    .replace(/\n?```$/i, '')
                    .trim()

                // Sanitize the generated HTML
                updatedCode = sanitizeHtml(updatedCode)

                console.log('AI code generation successful')

            } catch (aiError) {
                console.error('AI generation error:', aiError)
                return {
                    success: false,
                    error: 'Failed to generate updated code with AI. Please try again.'
                }
            }
        }

        // Update artifact in database
        const updateData: any = {
            code: updatedCode,
            updatedAt: new Date()
        }

        // Update video URLs and metadata if this is a video artifact
        if (artifact.category === "video_generation") {
            if (videoUrl) updateData.videoUrl = videoUrl
            if (thumbnailUrl) updateData.thumbnailUrl = thumbnailUrl
            if (videoMetadata) updateData.videoMetadata = videoMetadata
        }

        const updatedArtifact = await prisma.assistantArtifact.update({
            where: {
                id: artifactIdInt
            },
            data: updateData,
            select: {
                id: true,
                name: true,
                code: true,
                updatedAt: true
            }
        })

        console.log(`Artifact ${artifactIdInt} updated successfully`)

        return {
            success: true,
            artifact: {
                id: updatedArtifact.id.toString(),
                name: updatedArtifact.name || 'Untitled Artifact',
                updatedCode: updatedArtifact.code || '',
                updatedAt: updatedArtifact.updatedAt
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