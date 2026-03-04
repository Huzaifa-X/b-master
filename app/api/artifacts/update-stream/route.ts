// app/api/artifacts/update-stream/route.ts
import { NextRequest } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { openai } from "@/lib/openai"
import { getArtifactUpdateCodingPrompt } from "@/utils/prompts"
import { createArtifactVersion } from "@/app/actions/update-artifact.action"
import { getChatMessages } from "@/app/actions/chat.action"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const ARTIFACT_UPDATE_PROMPT = await getArtifactUpdateCodingPrompt()

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

    // Get artifact and verify permissions - include active version
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
        },
        activeVersion: {
          select: {
            id: true,
            versionNumber: true,
            code: true,
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

    // Get the active version's code (not the latest version)
    const activeVersionCode = artifact.activeVersion?.code || ""

    if (!activeVersionCode?.trim()) {
      console.error("[Artifact Update Stream API] No active version code found for artifact:", artifactIdInt)
      return new Response(JSON.stringify({ error: "No active version found to update from. Please generate the artifact first." }), { status: 400 })
    }

    console.log("[Artifact Update Stream API] Artifact found:", artifact.name)
    console.log("[Artifact Update Stream API] Using active version code - Version:", artifact.activeVersion?.versionNumber || 'N/A', "Length:", activeVersionCode.length, "characters")

    // Build conversation context from request chatHistory
    let conversationContext = buildConversationContext(chatHistory || [])

    // Check if there's a selected chat stored in the artifact for additional context
    let artifactChatContext = ""
    if (artifact.tools && typeof artifact.tools === 'object') {
      const toolsData = artifact.tools as any
      if (toolsData.selectedChatId) {
        console.log("[Artifact Update Stream] Found selectedChatId, fetching chat messages:", toolsData.selectedChatId)
        try {
          const chatMessagesResult = await getChatMessages(toolsData.selectedChatId, 20)
          if (chatMessagesResult.success && chatMessagesResult.messages && chatMessagesResult.messages.length > 0) {
            artifactChatContext = "\n\n=== ARTIFACT CHAT CONTEXT (from selected chat) ===\n"
            chatMessagesResult.messages.forEach((msg: any) => {
              const role = msg.role === 'user' ? 'User' : 'Assistant'
              const content = msg.message || msg.content || ''
              artifactChatContext += `${role}: ${content}\n\n`
            })
            artifactChatContext += "=== END ARTIFACT CHAT CONTEXT ===\n"
            console.log("[Artifact Update Stream] Artifact chat context added, messages count:", chatMessagesResult.messages.length)
          } else {
            console.log("[Artifact Update Stream] No chat messages found or failed to fetch for artifact")
          }
        } catch (chatError) {
          console.error("[Artifact Update Stream] Error fetching artifact chat messages:", chatError)
          // Continue without artifact chat context if there's an error
        }
      }
    }

    // Build file context from ONLY the files uploaded in THIS request.
    // Previously ALL stored (historical) files were injected on every call —
    // with multiple large documents this quickly exceeds the model's context
    // window, causing crashes, timeouts, and hallucinated content.
    // Stored files are still persisted to the DB for reference; they just
    // aren't blindly re-sent to the AI on every subsequent request.
    let fileContext = ""

    const allFiles: UploadedFile[] = uploadedFiles && uploadedFiles.length > 0
      ? (uploadedFiles as UploadedFile[])
      : []

    // Build context from all available files
    if (allFiles.length > 0) {
      fileContext = "\n\n=== AVAILABLE FILES CONTEXT ===\n"

      allFiles.forEach((file, index) => {
        fileContext += `\n--- File ${index + 1}: ${file.name} ---\n`

        // Add image URLs
        if (file.preview) {
          fileContext += `Image URL: ${file.preview}\n`
          fileContext += `CRITICAL: This is an image. You MUST visually analyse its content thoroughly. Read all text, numbers, labels, charts, or visual elements present. Use the image meaningfully in the artifact by embedding it with an <img> tag using this URL and incorporating what you observe from it into the design or content.\n`
        }

        // Add extracted document content (truncate large docs to avoid token-limit failures)
        if (file.extractedContent) {
          const MAX_DOC_CHARS = 12_000
          const rawText = file.extractedContent.text
          const truncatedText = rawText.length > MAX_DOC_CHARS
            ? rawText.slice(0, MAX_DOC_CHARS) + `\n...[truncated – ${rawText.length - MAX_DOC_CHARS} additional characters omitted to stay within context limits]`
            : rawText
          fileContext += `\nExtracted Text:\n${truncatedText}\n`

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

      fileContext += "\n=== END AVAILABLE FILES CONTEXT ===\n"

      console.log("[Artifact Update Stream] Using files from current request:", allFiles.length)
    }

    // Prepare input for AI using the active version's code
    // NOTE: send the code exactly once — no duplicate injection
    const aiInput = [
      conversationContext,
      artifactChatContext,
      `=== CURRENT ARTIFACT (v${artifact.activeVersion?.versionNumber || 'N/A'}) ===`,
      activeVersionCode,
      `=== END ARTIFACT ===`,
      fileContext,
      `=== USER REQUEST ===`,
      userPrompt || "Update the artifact using the available files.",
      `=== END REQUEST ===`,
    ].filter(Boolean).join("\n")

    const vectorStoreId = artifact.assistant?.vectorStoreId

    // ── Unified system prompt — single call, no pre-flight classification roundtrip ──
    const _now = new Date()
    const _dateBlock = `## Current Date & Time\n- Date: ${_now.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}\n- Time (UTC): ${_now.toUTCString()}`

    const unifiedSystemPrompt = [
      _dateBlock,
      "",
      ARTIFACT_UPDATE_PROMPT,
      "",
      "## RESPONSE FORMAT — CRITICAL, FOLLOW EXACTLY",
      "Your response MUST start with one of these two prefixes as the very first characters (no leading whitespace):",
      "",
      "  [QA]     — user is asking a question, wants explanation, help understanding, or is chatting.",
      "              After [QA] write a clear concise markdown answer. Do NOT include full HTML.",
      "",
      "  [UPDATE] — user wants to change, add, remove, fix, redesign, or update ANYTHING in the artifact.",
      "              After [UPDATE] output ONLY the complete updated HTML starting with <!DOCTYPE html>.",
      "              No explanations, no markdown, no backticks — just raw HTML.",
      "",
      allFiles.length > 0
        ? "FILES: Embed images with <img src=\"URL\">. Use extracted document text/HTML to enhance content."
        : "",
    ].filter(Boolean).join("\n")

    // Create streaming response — streams immediately without any pre-flight classification call
    const stream = new ReadableStream({
      async start(controller) {
        try {
          console.log("[Artifact Update Stream] Starting unified stream for artifact:", artifactId)
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "connected" })}\n\n`))

          let fullText = ""
          let buffer = ""
          let detectedMode: "qa" | "modify" | null = null
          let prefixBuffer = ""
          const CHUNK_SIZE = 1024

          let streamResponse: Awaited<ReturnType<typeof openai.responses.create>> | null = null
          try {
            streamResponse = await openai.responses.create({
              model: "gpt-4.1",
              instructions: unifiedSystemPrompt,
              input: aiInput,
              stream: true,
              max_output_tokens: 2000,
              ...(vectorStoreId && {
                tools: [{ type: "file_search", vector_store_ids: [vectorStoreId] }],
              }),
            })
          } catch (err: any) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "error", error: "Failed to start AI stream. Please try again." })}\n\n`))
            controller.close()
            return
          }

          const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("Streaming timeout after 5 minutes")), 5 * 60 * 1000)
          )

          await Promise.race([
            (async () => {
              for await (const event of streamResponse!) {
                if (event.type === "response.output_text.delta" && event.delta) {
                  fullText += event.delta

                  // ── Detect mode from prefix tokens ─────────────────────────
                  if (detectedMode === null) {
                    prefixBuffer += event.delta
                    if (prefixBuffer.length < 8) continue

                    const trimmed = prefixBuffer.trimStart()
                    if (trimmed.startsWith("[QA]")) {
                      detectedMode = "qa"
                      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "mode", mode: "qa" })}\n\n`))
                      buffer = trimmed.replace(/^\[QA\]\s*/i, "")
                    } else if (trimmed.startsWith("[UPDATE]")) {
                      detectedMode = "modify"
                      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "mode", mode: "modify" })}\n\n`))
                      buffer = trimmed.replace(/^\[UPDATE\]\s*/i, "")
                    } else if (prefixBuffer.length >= 30) {
                      // No recognised prefix — default to modify
                      detectedMode = "modify"
                      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "mode", mode: "modify" })}\n\n`))
                      buffer = prefixBuffer
                    } else {
                      continue
                    }
                    prefixBuffer = ""
                  } else {
                    buffer += event.delta
                  }

                  // ── Stream by mode ─────────────────────────────────────────
                  if (detectedMode === "qa") {
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "qa_response", content: buffer })}\n\n`))
                    buffer = ""
                  } else if (detectedMode === "modify" && buffer.length >= CHUNK_SIZE) {
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "code", content: Buffer.from(buffer).toString("base64") })}\n\n`))
                    buffer = ""
                  }

                } else if (event.type === "response.completed") {
                  // Flush remaining buffer
                  if (buffer.length > 0) {
                    if (detectedMode === "qa") {
                      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "qa_response", content: buffer })}\n\n`))
                    } else {
                      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "code", content: Buffer.from(buffer).toString("base64") })}\n\n`))
                    }
                    buffer = ""
                  }
                }
              }
            })(),
            timeoutPromise,
          ])

          // ── Q&A complete — no artifact update ─────────────────────────────
          if (detectedMode === "qa") {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "qa_done" })}\n\n`))
            controller.close()
            return
          }

          // ── Modify complete — clean, save, notify ──────────────────────────
          let generatedCode = fullText
            .replace(/^\s*\[UPDATE\]\s*/i, "")
            .replace(/^```html\n?/i, "")
            .replace(/^```\n?/i, "")
            .replace(/\n?```$/i, "")
            .trim()

          if (!generatedCode) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "error", error: "AI returned empty code. Please try again." })}\n\n`))
            controller.close()
            return
          }

          // Persist new uploaded files
          if (uploadedFiles && uploadedFiles.length > 0) {
            const existingFiles = (artifact.files as unknown as UploadedFile[]) || []
            const existingUrls = new Set(existingFiles.map((f: UploadedFile) => f.url))
            const merged = [...existingFiles, ...uploadedFiles.filter((f: UploadedFile) => !existingUrls.has(f.url))]
            await prisma.assistantArtifact.update({ where: { id: artifactIdInt }, data: { files: merged as any, updatedAt: new Date() } })
          }

          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "artifact_updating" })}\n\n`))

          const versionResult = await createArtifactVersion({
            artifactId: artifactIdInt,
            userId,
            code: generatedCode,
            description: `AI update: ${userPrompt?.substring(0, 100) || "Updated with files"}`,
            changeType: "ai",
            setAsActive: true,
          })

          if (!versionResult.success) throw new Error(versionResult.error || "Failed to create artifact version")

          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: "done",
            code: generatedCode,
            message: `I've updated "${artifact.name}". Version ${versionResult.version?.versionNumber || ""} is now active.`,
          })}\n\n`))
          controller.close()

        } catch (error) {
          console.error("[Artifact Update Stream] Error:", error)
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "error", error: error instanceof Error ? error.message : "Unknown error" })}\n\n`))
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    })

  } catch (error) {
    console.error("[Artifact Update Stream] Setup error:", error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    )
  }
}

