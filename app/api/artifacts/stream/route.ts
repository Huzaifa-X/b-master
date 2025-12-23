// app/api/artifacts/stream/route.ts
import { NextRequest } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { openai } from "@/lib/openai"
import upstageService from "@/lib/services/upstageService"
import { getArtifactCodingPrompt } from "@/utils/prompts"
import { createArtifactVersion } from "@/app/actions/update-artifact.action"
import { getChatMessages } from "@/app/actions/chat.action"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const ARTIFACT_GENERATION_PROMPT = await getArtifactCodingPrompt()

/**
 * Basic HTML sanitization to prevent dangerous patterns
 * Note: This is a basic layer - artifacts are AI-generated with controlled prompts
 */
function sanitizeHtml(html: string): string {
    let sanitized = html

    // Remove external script sources (only allow inline scripts)
    sanitized = sanitized.replace(/<script[^>]*src\s*=\s*["']https?:\/\/[^"']*["'][^>]*>/gi, '')

    // Remove javascript: protocol URLs
    sanitized = sanitized.replace(/javascript:/gi, 'blocked:')

    // Remove data: URLs in script contexts (but allow in images)
    sanitized = sanitized.replace(/<script[^>]*src\s*=\s*["']data:[^"']*["'][^>]*>/gi, '')

    // Remove event handlers
    sanitized = sanitized.replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')

    // Remove dangerous meta tags
    sanitized = sanitized.replace(/<meta[^>]*http-equiv\s*=\s*["']refresh["'][^>]*>/gi, '')

    return sanitized
}

/**
 * Stream artifact HTML generation using Server-Sent Events
 */
export async function POST(req: NextRequest) {
  const encoder = new TextEncoder()

  try {
    console.log("[Artifact Stream API] Request received")

    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      console.error("[Artifact Stream API] Unauthorized - no session")
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })
    }

    console.log("[Artifact Stream API] User authenticated:", session.user.id)

    const body = await req.json()
    const { artifactId } = body

    if (!artifactId) {
      return new Response(JSON.stringify({ error: "artifactId is required" }), { status: 400 })
    }

    const artifactIdInt = parseInt(artifactId)

    console.log("[Artifact Stream API] Fetching artifact:", artifactIdInt)

    // Get artifact with all necessary data
    const artifact = await prisma.assistantArtifact.findUnique({
      where: { id: artifactIdInt },
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
      console.error("[Artifact Stream API] Artifact not found:", artifactIdInt)
      return new Response(JSON.stringify({ error: "Artifact not found" }), { status: 404 })
    }

    console.log("[Artifact Stream API] Artifact found:", artifact.name)

    // Check permissions - user must be the owner or have permissions
    const userId = BigInt(session.user.id)
    const isOwner = artifact.userId === userId

    let hasPermission = false
    if (!isOwner) {
      // Check if user has artifact permissions
      const permission = await prisma.artifactPermission.findFirst({
        where: {
          userId: userId,
          artifactId: artifactIdInt,
          assistantId: artifact.assistantId
        }
      })
      hasPermission = !!permission
    }

    if (!isOwner && !hasPermission) {
      return new Response(JSON.stringify({ error: "Access denied" }), { status: 403 })
    }

    // Extract content from uploaded files if any
    let extractedContent = ""
    if (artifact.files && Array.isArray(artifact.files)) {
      const extractedTexts: string[] = []
      for (const file of artifact.files as any[]) {
        if (file.extractedContent?.text) {
          extractedTexts.push(`\n\n--- Content from ${file.name} ---\n${file.extractedContent.text}\n--- End of ${file.name} ---\n`)
        }
      }
      if (extractedTexts.length > 0) {
        extractedContent = extractedTexts.join("\n\n")
      }
    }

    // Build enhanced instructions
    let enhancedInstructions = artifact.instructions || ""

    // Add document content
    if (extractedContent && extractedContent.trim()) {
      enhancedInstructions += "\n\n=== EXTRACTED DOCUMENT CONTENT ===\n" + extractedContent + "\n=== END DOCUMENT CONTENT ===\n"
    }

    // Add image URLs
    if (artifact.images && Array.isArray(artifact.images)) {
      enhancedInstructions += "\n\n=== IMAGES TO EMBED ===\n"
      ;(artifact.images as any[]).forEach((img, idx) => {
        enhancedInstructions += `Image ${idx + 1}: ${img.url} (${img.name})\n`
      })
      enhancedInstructions += "=== END IMAGES ===\n"
    }

    // Check if there's a selected chat for context
    let chatContext = ""
    if (artifact.tools && typeof artifact.tools === 'object') {
      const toolsData = artifact.tools as any
      if (toolsData.selectedChatId) {
        console.log("[Artifact Stream] Found selectedChatId, fetching chat messages:", toolsData.selectedChatId)
        try {
          const chatMessagesResult = await getChatMessages(toolsData.selectedChatId, 20)
          if (chatMessagesResult.success && chatMessagesResult.messages && chatMessagesResult.messages.length > 0) {
            chatContext = "\n\n=== CHAT CONTEXT (for reference) ===\n"
            chatMessagesResult.messages.forEach((msg: any) => {
              const role = msg.role === 'user' ? 'User' : 'Assistant'
              const content = msg.message || msg.content || ''
              chatContext += `${role}: ${content}\n\n`
            })
            chatContext += "=== END CHAT CONTEXT ===\n"
            console.log("[Artifact Stream] Chat context added, messages count:", chatMessagesResult.messages.length)
          } else {
            console.log("[Artifact Stream] No chat messages found or failed to fetch")
          }
        } catch (chatError) {
          console.error("[Artifact Stream] Error fetching chat messages:", chatError)
          // Continue without chat context if there's an error
        }
      }
    }

    // Prepare input for AI generation
    const input = `Create a complete HTML artifact.

Name: ${artifact.name}
Category: ${artifact.category}

${enhancedInstructions}${chatContext}

CRITICAL: Output ONLY the complete HTML code starting with <!DOCTYPE html> and ending with </html>. Do not include any explanations, descriptions, or additional text. Do not use markdown formatting.`

    const vectorStoreId = artifact.assistant?.vectorStoreId

    // Create streaming response
    const stream = new ReadableStream({
      async start(controller) {
        try {
          console.log("[Artifact Stream] Starting HTML generation for artifact:", artifactId)

          // Send initial connection message
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "connected" })}\n\n`)
          )

          let generatedCode = ""
          let buffer = ""
          const model = 'gpt-5.2' // Use a stable model instead of gpt-5.1-Codex-Max
          const CHUNK_SIZE = 1024 // Send chunks of ~1KB instead of character-by-character

          // Create AI response with streaming
          console.log("[Artifact Stream] Creating OpenAI response with streaming enabled")

          console.log("[Artifact Stream API] Starting AI generation")

          try {
            const response = await openai.responses.create({
              model: model,
              instructions: ARTIFACT_GENERATION_PROMPT + "\n\nCRITICAL REMINDER: Your response must be ONLY HTML code starting with <!DOCTYPE html> and ending with </html>. No explanations, no descriptions, no markdown formatting.",
              input: input,
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

            console.log("[Artifact Stream API] AI response received, starting streaming")

            console.log("[Artifact Stream] Response is async iterable, starting buffered streaming...")

            // Add timeout for streaming response (5 minutes)
            const timeoutPromise = new Promise<never>((_, reject) => {
              setTimeout(() => reject(new Error("Streaming timeout after 5 minutes")), 5 * 60 * 1000)
            })

            await Promise.race([
              (async () => {
                for await (const event of response) {
              console.log("[Artifact Stream] Event type:", event.type)

              switch (event.type) {
                case "response.created":
                  console.log("[Artifact Stream] Response created")
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
                  console.log("[Artifact Stream] Response completed")
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
                  console.error("[Artifact Stream] Error event:", event)
                  throw new Error("Stream error")
              }
                }
              })(),
              timeoutPromise
            ])

            console.log("[Artifact Stream] Finished streaming, total code length:", generatedCode.length)

          } catch (streamError: any) {
            console.error("[Artifact Stream] Streaming failed, trying fallback:", streamError)

            try {
              // Fallback to non-streaming
              const fallbackResponse = await openai.responses.create({
                model: model,
                instructions: ARTIFACT_GENERATION_PROMPT + "\n\nCRITICAL REMINDER: Your response must be ONLY HTML code starting with <!DOCTYPE html> and ending with </html>. No explanations, no descriptions, no markdown formatting.",
                input: input,
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

              console.log("[Artifact Stream] Fallback completed, code length:", generatedCode.length)
            } catch (fallbackError: any) {
              console.error("[Artifact Stream] Fallback also failed:", fallbackError)

              // Send error message to client
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({
                  type: "error",
                  error: "Failed to generate artifact. OpenAI API is currently experiencing issues. Please try again later."
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

          // Create a new version with the generated code and set it as active
          const versionResult = await createArtifactVersion({
            artifactId: artifactIdInt,
            userId: userId,
            code: generatedCode,
            description: 'Initial AI-generated artifact',
            changeType: 'ai',
            setAsActive: true
          })

          if (!versionResult.success) {
            throw new Error(versionResult.error || "Failed to create artifact version")
          }

          console.log("[Artifact Stream] Artifact version created:", versionResult.version?.versionNumber)

          // Send completion signal
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "done", code: generatedCode })}\n\n`)
          )

          controller.close()

        } catch (error) {
          console.error("[Artifact Stream] Streaming error:", error)

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
    console.error("[Artifact Stream] Setup error:", error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
