// app/api/artifacts/update-stream/route.ts
import { NextRequest } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { openai } from "@/lib/openai"
import { getArtifactCodingPrompt } from "@/utils/prompts"
import { createArtifactVersion } from "@/app/actions/update-artifact.action"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const ARTIFACT_UPDATE_PROMPT = getArtifactCodingPrompt()

interface UploadedFile {
  name: string
  url: string
  type: string
  size: number
  preview?: string
  extractedContent?: {
    text: string
    html: string
    tables?: Array<{ base64: string; page: number }>
    metadata?: { pages: number; model: string }
  }
}

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
    
    // Remove event handlers
    sanitized = sanitized.replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
    
    // Remove dangerous meta tags
    sanitized = sanitized.replace(/<meta[^>]*http-equiv\s*=\s*["']refresh["'][^>]*>/gi, '')
    
    return sanitized
}

/**
 * Build conversation context for AI
 */
function buildConversationContext(chatHistory: Array<{ role: 'user' | 'assistant'; content: string; timestamp?: Date }>): string {
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
 * Stream artifact update using Server-Sent Events
 */
export async function POST(req: NextRequest) {
  const encoder = new TextEncoder()

  try {
    console.log("[Artifact Update Stream API] Request received")

    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      console.error("[Artifact Update Stream API] Unauthorized - no session")
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })
    }

    console.log("[Artifact Update Stream API] User authenticated:", session.user.id)

    const body = await req.json()
    const { artifactId, userPrompt, chatHistory, currentHtmlCode, uploadedFiles } = body

    if (!artifactId) {
      return new Response(JSON.stringify({ error: "artifactId is required" }), { status: 400 })
    }

    if (!userPrompt?.trim() && (!uploadedFiles || uploadedFiles.length === 0)) {
      return new Response(JSON.stringify({ error: "userPrompt or uploadedFiles is required" }), { status: 400 })
    }

    if (!currentHtmlCode?.trim()) {
      return new Response(JSON.stringify({ error: "currentHtmlCode is required" }), { status: 400 })
    }

    const artifactIdInt = parseInt(artifactId)
    const userId = BigInt(session.user.id)

    console.log("[Artifact Update Stream API] Fetching artifact:", artifactIdInt)

    // Get artifact and verify permissions
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
                  in: ['EDITOR', 'ADMIN'] // Only editors and admins can update
                }
              }
            }
          }
        ]
      },
      include: {
        assistant: {
          select: {
            id: true,
            name: true,
            vectorStoreId: true,
          }
        }
      }
    })

    if (!artifact) {
      console.error("[Artifact Update Stream API] Artifact not found or no permissions:", artifactIdInt)
      return new Response(JSON.stringify({ error: "Artifact not found or you do not have edit permissions" }), { status: 404 })
    }

    // Video generation artifacts cannot be updated
    if (artifact.category === "video_generation") {
      return new Response(JSON.stringify({ error: "Video generation artifacts cannot be updated" }), { status: 400 })
    }

    console.log("[Artifact Update Stream API] Artifact found:", artifact.name)
    console.log("[Artifact Update Stream API] Using active version code - length:", currentHtmlCode.length, "characters")

    // Build conversation context
    const conversationContext = buildConversationContext(chatHistory || [])

    // Build file context if files are uploaded
    let fileContext = ""
    if (uploadedFiles && uploadedFiles.length > 0) {
      fileContext = "\n\n=== UPLOADED FILES CONTEXT ===\n"
      
      const files = uploadedFiles as UploadedFile[]
      
      files.forEach((file, index) => {
        fileContext += `\n--- File ${index + 1}: ${file.name} ---\n`
        
        // Add image URLs
        if (file.preview) {
          fileContext += `Image URL: ${file.preview}\n`
          fileContext += `Note: This is an image that should be embedded in the HTML using an <img> tag with this URL.\n`
        }
        
        // Add extracted document content
        if (file.extractedContent) {
          fileContext += `\nExtracted Text:\n${file.extractedContent.text}\n`
          
          if (file.extractedContent.html) {
            fileContext += `\nExtracted HTML:\n${file.extractedContent.html}\n`
          }
          
          // Add tables as base64 images if available
          if (file.extractedContent.tables && file.extractedContent.tables.length > 0) {
            fileContext += `\nTables (${file.extractedContent.tables.length}):\n`
            file.extractedContent.tables.forEach((table, tableIdx) => {
              fileContext += `Table ${tableIdx + 1} (Page ${table.page}): data:image/png;base64,${table.base64}\n`
            })
          }
          
          if (file.extractedContent.metadata) {
            fileContext += `\nDocument Metadata: ${file.extractedContent.metadata.pages} page(s)\n`
          }
        }
      })
      
      fileContext += "\n=== END UPLOADED FILES CONTEXT ===\n"
    }

    // Prepare input for AI
    const aiInput = `${conversationContext}

=== CURRENT ARTIFACT CODE ===
${currentHtmlCode}
=== END CURRENT CODE ===
${fileContext}
=== USER REQUEST ===
${userPrompt || "Update the artifact using the uploaded files."}
=== END USER REQUEST ===

Please update the artifact code based on the user's request while considering the entire conversation history${uploadedFiles && uploadedFiles.length > 0 ? ' and the uploaded files' : ''}. 

${uploadedFiles && uploadedFiles.length > 0 ? 'IMPORTANT INSTRUCTIONS FOR FILES:\n- If images are provided, embed them in the HTML using <img> tags with the provided URLs.\n- If documents are provided, use the extracted text/html content to enhance the artifact.\n- Make sure all image URLs are properly used in src attributes.\n\n' : ''}Generate the complete updated HTML code starting with <!DOCTYPE html> and ending with </html>. No explanations, no descriptions, no markdown formatting.`

    const vectorStoreId = artifact.assistant?.vectorStoreId

    // Create streaming response
    const stream = new ReadableStream({
      async start(controller) {
        try {
          console.log("[Artifact Update Stream] Starting HTML update generation for artifact:", artifactId)

          // Send initial connection message
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "connected" })}\n\n`)
          )

          let generatedCode = ""
          let buffer = ""
          const model = 'gpt-5.2'
          const CHUNK_SIZE = 1024 // Send chunks of ~1KB

          // Create AI response with streaming
          console.log("[Artifact Update Stream] Creating OpenAI response with streaming enabled")

          try {
            const response = await openai.responses.create({
              model: model,
              instructions: ARTIFACT_UPDATE_PROMPT + "\n\nCRITICAL REMINDER: Your response must be ONLY HTML code starting with <!DOCTYPE html> and ending with </html>. No explanations, no descriptions, no markdown formatting.",
              input: aiInput,
              stream: true,
              ...(vectorStoreId && {
                tools: [
                  {
                    type: "file_search",
                    vector_store_ids: [vectorStoreId],
                  },
                ],
              }),
            })

            console.log("[Artifact Update Stream API] AI response received, starting streaming")

            // Add timeout for streaming response (5 minutes)
            const timeoutPromise = new Promise<never>((_, reject) => {
              setTimeout(() => reject(new Error("Streaming timeout after 5 minutes")), 5 * 60 * 1000)
            })

            await Promise.race([
              (async () => {
                for await (const event of response) {
                  console.log("[Artifact Update Stream] Event type:", event.type)

                  switch (event.type) {
                    case "response.created":
                      console.log("[Artifact Update Stream] Response created")
                      break

                    case "response.output_text.delta":
                      // Text chunk received - buffer it
                      if (event.delta) {
                        generatedCode += event.delta
                        buffer += event.delta

                        // Send buffered chunks when they reach the threshold
                        if (buffer.length >= CHUNK_SIZE) {
                          controller.enqueue(
                            encoder.encode(`data: ${JSON.stringify({
                              type: "code",
                              content: Buffer.from(buffer).toString('base64')
                            })}\n\n`)
                          )
                          buffer = ""
                        }
                      }
                      break

                    case "response.completed":
                      console.log("[Artifact Update Stream] Response completed")
                      // Send any remaining buffered content
                      if (buffer.length > 0) {
                        controller.enqueue(
                          encoder.encode(`data: ${JSON.stringify({
                            type: "code",
                            content: Buffer.from(buffer).toString('base64')
                          })}\n\n`)
                        )
                        buffer = ""
                      }
                      break

                    case "error":
                      console.error("[Artifact Update Stream] Error event:", event)
                      throw new Error("Stream error")
                  }
                }
              })(),
              timeoutPromise
            ])

            console.log("[Artifact Update Stream] Finished streaming, total code length:", generatedCode.length)

          } catch (streamError: any) {
            console.error("[Artifact Update Stream] Streaming failed, trying fallback:", streamError)

            try {
              // Fallback to non-streaming
              const fallbackResponse = await openai.responses.create({
                model: model,
                reasoning: { effort: "medium" },
                instructions: ARTIFACT_UPDATE_PROMPT + "\n\nCRITICAL REMINDER: Your response must be ONLY HTML code starting with <!DOCTYPE html> and ending with </html>. No explanations, no descriptions, no markdown formatting.",
                input: aiInput,
                stream: false,
                ...(vectorStoreId && {
                  tools: [
                    {
                      type: "file_search",
                      vector_store_ids: [vectorStoreId],
                    },
                  ],
                }),
              })

              generatedCode = fallbackResponse.output_text || ""

              // Simulate streaming by sending buffered chunks
              let buffer = ""
              const CHUNK_SIZE = 1024

              for (let i = 0; i < generatedCode.length; i++) {
                buffer += generatedCode[i]

                if (buffer.length >= CHUNK_SIZE || i === generatedCode.length - 1) {
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify({
                      type: "code",
                      content: Buffer.from(buffer).toString('base64')
                    })}\n\n`)
                  )
                  buffer = ""
                  // Small delay to simulate streaming
                  await new Promise(resolve => setTimeout(resolve, 10))
                }
              }

              console.log("[Artifact Update Stream] Fallback completed, code length:", generatedCode.length)
            } catch (fallbackError: any) {
              console.error("[Artifact Update Stream] Fallback also failed:", fallbackError)

              // Send error message to client
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({
                  type: "error",
                  error: "Failed to update artifact. OpenAI API is currently experiencing issues. Please try again later."
                })}\n\n`)
              )
              return
            }
          }

          // Clean up the generated code
          if (generatedCode) {
            generatedCode = generatedCode
              .replace(/^```html\n?/i, "")
              .replace(/^```\n?/i, "")
              .replace(/\n?```$/i, "")
              .trim()

            // Sanitize the generated HTML
            generatedCode = sanitizeHtml(generatedCode)
          }

          // Create a new version with the AI-generated code
          // This will create a new version based on the ACTIVE version's code
          // and set it as the new active version (setAsActive: true)
          const versionResult = await createArtifactVersion({
            artifactId: artifactIdInt,
            userId: userId,
            code: generatedCode,
            description: `AI update: ${userPrompt?.substring(0, 100) || 'Updated with files'}`,
            changeType: 'ai',
            setAsActive: true // ✅ This will update artifact.activeVersionId to this new version
          })

          if (!versionResult.success) {
            throw new Error(versionResult.error || "Failed to create artifact version")
          }

          console.log("[Artifact Update Stream] New artifact version created:", versionResult.version?.versionNumber)

          // Send completion signal
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "done", code: generatedCode })}\n\n`)
          )

          controller.close()

        } catch (error) {
          console.error("[Artifact Update Stream] Streaming error:", error)

          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({
              type: "error",
              error: error instanceof Error ? error.message : "Unknown error"
            })}\n\n`)
          )
          controller.close()
        }
      }
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })

  } catch (error) {
    console.error("[Artifact Update Stream] Setup error:", error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

