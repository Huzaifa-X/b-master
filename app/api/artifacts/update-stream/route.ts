// app/api/artifacts/update-stream/route.ts
// AGENTIC UPDATE PIPELINE
// Routes user requests through: RequirementAgent → ProcessAgent → EditAgent (surgical)
// Falls back to full regeneration if surgical edits cannot be applied.

import { NextRequest } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { createArtifactVersion } from "@/app/actions/update-artifact.action"
import { getChatMessages } from "@/app/actions/chat.action"
import { orchestrateUpdate, encodeSSE } from "@/lib/services/artifact-orchestrator.service"
import type { ArtifactAgentContext } from "@/lib/agents/types"
import pusher from "@/lib/pusher"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

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

export async function POST(req: NextRequest) {
  const encoder = new TextEncoder()

  try {
    // ── Auth ──────────────────────────────────────────────────────────────
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })
    }

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

    // ── Load artifact + permission check ──────────────────────────────────
    const artifact = await prisma.assistantArtifact.findFirst({
      where: {
        id: artifactIdInt,
        OR: [
          { userId },
          { permissions: { some: { userId, access: { in: ["EDITOR", "ADMIN"] } } } },
        ],
      },
      include: {
        assistant: { select: { id: true, name: true, vectorStoreId: true } },
        activeVersion: { select: { id: true, versionNumber: true, code: true } },
      },
    })

    if (!artifact) {
      return new Response(JSON.stringify({ error: "Artifact not found or insufficient permissions" }), { status: 404 })
    }
    if (artifact.category === "video_generation") {
      return new Response(JSON.stringify({ error: "Video generation artifacts cannot be updated" }), { status: 400 })
    }

    const activeVersionCode = artifact.activeVersion?.code || ""

    // ── Build ArtifactAgentContext ────────────────────────────────────────
    const files: ArtifactAgentContext["files"] = []
    if (uploadedFiles && Array.isArray(uploadedFiles)) {
      for (const f of uploadedFiles as UploadedFile[]) {
        files.push({
          name: f.name,
          extractedText: f.extractedContent?.text,
          extractedHtml: f.extractedContent?.html,
          url: f.preview || f.url,
        })
      }
    }

    const images: ArtifactAgentContext["images"] = []
    if (artifact.images && Array.isArray(artifact.images)) {
      for (const img of artifact.images as any[]) {
        if (img.url) images.push({ name: img.name || "image", url: img.url })
      }
    }

    // Build chat history (from request + optional stored chat)
    const history: ArtifactAgentContext["chatHistory"] = []
    if (chatHistory && Array.isArray(chatHistory)) {
      chatHistory.slice(-10).forEach((m: any) => {
        history.push({ role: m.role === "user" ? "user" : "assistant", content: m.content || "" })
      })
    }

    // Optional: add stored chat context
    const toolsData = artifact.tools && typeof artifact.tools === "object" ? (artifact.tools as any) : {}
    if (toolsData.selectedChatId) {
      try {
        const chatResult = await getChatMessages(toolsData.selectedChatId, 15)
        if (chatResult.success && chatResult.messages) {
          chatResult.messages.forEach((msg: any) => {
            history.push({ role: msg.role === "user" ? "user" : "assistant", content: msg.message || msg.content || "" })
          })
        }
      } catch { /* non-fatal */ }
    }

    const ctx: ArtifactAgentContext = {
      name: artifact.name ?? "",
      category: artifact.category ?? "",
      instructions: artifact.instructions || "",
      files,
      images,
      chatHistory: history,
      vectorStoreId: artifact.assistant?.vectorStoreId ?? undefined,
      currentHtml: activeVersionCode,
    }

    // ── Stream ────────────────────────────────────────────────────────────
    const stream = new ReadableStream({
      async start(controller) {
        const enqueue = (event: any) => {
          try { controller.enqueue(encodeSSE(event)) } catch { /* ignore if closed */ }
        }

        let finalCode: string | null = null
        let explanation = ""

        try {
          for await (const event of orchestrateUpdate(userPrompt, ctx, activeVersionCode || currentHtmlCode)) {

            // Intercept the done event — we need to save the version first
            if (event.type === "done") {
              finalCode = event.code
              explanation = event.explanation

              // Signal the UI that we're saving
              enqueue({ type: "artifact_updating" })

              // Persist uploaded files to artifact record
              if (uploadedFiles && uploadedFiles.length > 0) {
                try {
                  const existingFiles = (artifact.files as unknown as UploadedFile[]) || []
                  const existingUrls = new Set(existingFiles.map((f: UploadedFile) => f.url))
                  const merged = [...existingFiles, ...(uploadedFiles as UploadedFile[]).filter((f: UploadedFile) => !existingUrls.has(f.url))]
                  await prisma.assistantArtifact.update({
                    where: { id: artifactIdInt },
                    data: { files: merged as any, updatedAt: new Date() },
                  })
                } catch { /* non-fatal */ }
              }

              // Save the new version
              const versionResult = await createArtifactVersion({
                artifactId: artifactIdInt,
                userId,
                code: finalCode,
                description: `AI update (agentic): ${(userPrompt || "update").substring(0, 120)}`,
                changeType: "ai",
                setAsActive: true,
              })

              if (!versionResult.success) {
                enqueue({ type: "error", error: versionResult.error || "Failed to save version" })
                controller.close()
                return
              }

              const versionNumber = versionResult.version?.versionNumber

              // Notify shared users via Pusher
              try {
                const sharedPerms = await prisma.artifactPermission.findMany({
                  where: { artifactId: artifactIdInt },
                  select: { userId: true },
                })
                for (const perm of sharedPerms) {
                  const permUserId = perm.userId.toString()
                  if (permUserId !== session.user.id) {
                    await pusher.trigger(`user-${permUserId}`, "artifact-updated", {
                      artifactId: artifactIdInt,
                      artifactName: artifact.name,
                      updatedBy: session.user.name || "A collaborator",
                      versionNumber,
                    }).catch(() => { /* non-fatal */ })
                  }
                }
              } catch { /* non-fatal */ }

              // Send enriched done event
              enqueue({
                type: "done",
                code: finalCode,
                explanation,
                versionNumber,
                message: explanation,
              })

              controller.close()
              return
            }

            // Forward all other events directly
            enqueue(event)
          }
        } catch (err: any) {
          enqueue({ type: "error", error: err.message || "Unknown error" })
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

  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    )
  }
}
