/**
 * lib/services/artifact-generation.service.ts
 *
 * Core artifact-generation logic shared by:
 *   - The background worker  (lib/workers/artifact-generation.worker.ts)
 *   - The stream API route   (app/api/artifacts/stream/route.ts)
 *   - The createArtifact action (app/actions/artifact.action.ts)
 *
 * Having the logic here means generation always works even when the
 * standalone worker process is not running.
 */

import { openai } from "@/lib/openai"
import prisma from "@/lib/prisma"
import { getArtifactCodingPrompt } from "@/utils/prompts"
import { createArtifactVersion } from "@/app/actions/update-artifact.action"
import {
  markJobAsProcessing,
  updateJobProgress,
  updateJobProgressWithResult,
  markJobAsCompleted,
  markJobAsFailed,
} from "@/lib/queues/artifact-generation.queue"
import { sendNotification } from "@/lib/pusher"

// ─── Generation parameters ───────────────────────────────────────────────────
const GENERATION_TEMPERATURE = 0.3
const GENERATION_MAX_TOKENS   = 2000
const GENERATION_MODEL        = "gpt-5.2"

// ─── Core processor ──────────────────────────────────────────────────────────

/**
 * Process a single artifact-generation job end-to-end.
 * Safe to call from any context (worker, API route, server action).
 * All DB state is managed via the queue helpers so multiple callers
 * remain idempotent (markJobAsProcessing is idempotent by status check).
 */
export async function processArtifactGeneration(
  jobId: string,
  artifactId: number
): Promise<{ success: boolean; code?: string; versionNumber?: number }> {
  console.log(
    `[ArtifactGenService] 🔄 Processing job ${jobId} for artifact ${artifactId}`
  )

  try {
    // ── Guard: skip if already being processed or completed ──────────────
    const currentJob = await prisma.artifactGenerationJob.findUnique({
      where: { id: jobId },
      select: { status: true },
    })

    if (!currentJob) throw new Error(`Job ${jobId} not found in database`)

    if (currentJob.status === "processing" || currentJob.status === "completed") {
      console.log(
        `[ArtifactGenService] ⏭️  Skipping job ${jobId} — already ${currentJob.status}`
      )
      return { success: true }
    }

    await markJobAsProcessing(jobId)
    await updateJobProgress(jobId, 10)

    // ── 1. Load artifact ──────────────────────────────────────────────────
    const artifact = await prisma.assistantArtifact.findUnique({
      where: { id: artifactId },
      include: {
        assistant: {
          select: { id: true, name: true, vectorStoreId: true },
        },
      },
    })

    if (!artifact) throw new Error(`Artifact ${artifactId} not found`)

    await updateJobProgress(jobId, 20)

    // ── 2. Build extracted-file context ──────────────────────────────────
    let extractedContent = ""
    if (artifact.files && Array.isArray(artifact.files)) {
      const texts: string[] = []
      for (const file of artifact.files as any[]) {
        if (file.extractedContent?.text) {
          texts.push(
            `\n\n--- Content from ${file.name} ---\n${file.extractedContent.text}\n--- End of ${file.name} ---\n`
          )
        }
      }
      if (texts.length) extractedContent = texts.join("\n\n")
    }

    // ── 3. Build enhanced instructions ───────────────────────────────────
    let enhancedInstructions = artifact.instructions || ""

    if (extractedContent.trim()) {
      enhancedInstructions +=
        "\n\n=== EXTRACTED DOCUMENT CONTENT ===\n" +
        extractedContent +
        "\n=== END DOCUMENT CONTENT ===\n"
    }

    if (artifact.images && Array.isArray(artifact.images)) {
      enhancedInstructions += "\n\n=== IMAGES TO EMBED ===\n"
      ;(artifact.images as any[]).forEach((img, idx) => {
        enhancedInstructions += `Image ${idx + 1}: ${img.url} (${img.name})\n`
      })
      enhancedInstructions += "=== END IMAGES ===\n"
    }

    await updateJobProgress(jobId, 30)

    // ── 4. Optional chat context ──────────────────────────────────────────
    let chatContext = ""
    const jobRecord = await prisma.artifactGenerationJob.findUnique({
      where: { id: jobId },
    })

    if (jobRecord?.metadata && typeof jobRecord.metadata === "object") {
      const meta = jobRecord.metadata as any
      if (meta.selectedChatId) {
        console.log(
          "[ArtifactGenService] Found selectedChatId, fetching messages:",
          meta.selectedChatId
        )
        try {
          const chatMessages = await prisma.assistantUserChatMessage.findMany({
            where: { assistantUserChatId: parseInt(meta.selectedChatId) },
            orderBy: { createdAt: "asc" },
            take: 20,
            select: { role: true, message: true },
          })
          if (chatMessages.length) {
            chatContext = "\n\n=== CHAT CONTEXT (for reference) ===\n"
            chatMessages.forEach((msg) => {
              chatContext += `${msg.role === "user" ? "User" : "Assistant"}: ${msg.message || ""}\n\n`
            })
            chatContext += "=== END CHAT CONTEXT ===\n"
          }
        } catch (e) {
          console.error("[ArtifactGenService] Error fetching chat messages:", e)
        }
      }
    }

    await updateJobProgress(jobId, 40)

    // ── 5. Build AI input ─────────────────────────────────────────────────
    const ARTIFACT_GENERATION_PROMPT = await getArtifactCodingPrompt()

    const systemInstructions =
      ARTIFACT_GENERATION_PROMPT +
      "\n\nCRITICAL REMINDER: Your response must be ONLY HTML code starting with <!DOCTYPE html> and ending with </html>. No explanations, no descriptions, no markdown formatting."

    const input = `Create a complete HTML artifact.

Name: ${artifact.name}
Category: ${artifact.category}

${enhancedInstructions}${chatContext}

CRITICAL: Output ONLY the complete HTML code starting with <!DOCTYPE html> and ending with </html>. Do not include any explanations, descriptions, or additional text. Do not use markdown formatting.`

    const vectorStoreId = artifact.assistant?.vectorStoreId

    await updateJobProgress(jobId, 50)
    console.log("[ArtifactGenService] Starting OpenAI generation")

    // ── 6. Generate HTML ──────────────────────────────────────────────────
    let generatedCode = ""

    try {
      const response = await openai.responses.create({
        model: GENERATION_MODEL,
        instructions: systemInstructions,
        input,
        stream: true,
        temperature: GENERATION_TEMPERATURE,
        max_output_tokens: GENERATION_MAX_TOKENS,
        ...(vectorStoreId && {
          tools: [{ type: "file_search", vector_store_ids: [vectorStoreId] }],
        }),
      } as any)

      let progressPct = 50
      let chunkCount = 0

      for await (const event of response as any) {
        switch (event.type) {
          case "response.output_text.delta":
            if (event.delta) {
              generatedCode += event.delta
              chunkCount++
              progressPct = Math.min(80, progressPct + 0.3)

              if (chunkCount % 10 === 0) {
                await updateJobProgressWithResult(
                  jobId,
                  Math.floor(progressPct),
                  generatedCode
                )
              }
            }
            break

          case "response.completed":
            console.log("[ArtifactGenService] Generation stream completed")
            break

          case "error":
            throw new Error("OpenAI stream error")
        }
      }

      console.log(
        "[ArtifactGenService] Finished streaming, total chars:",
        generatedCode.length
      )
    } catch (streamError: any) {
      console.error(
        "[ArtifactGenService] Streaming failed, trying non-streaming fallback:",
        streamError
      )

      const fallback = await (openai.responses.create as any)({
        model: GENERATION_MODEL,
        instructions: systemInstructions,
        input,
        stream: false,
        temperature: GENERATION_TEMPERATURE,
        max_output_tokens: GENERATION_MAX_TOKENS,
        ...(vectorStoreId && {
          tools: [{ type: "file_search", vector_store_ids: [vectorStoreId] }],
        }),
      })

      generatedCode = fallback.output_text || ""
      console.log("[ArtifactGenService] Fallback completed, chars:", generatedCode.length)
    }

    await updateJobProgress(jobId, 85)

    // ── 7. Clean up markdown fences if any ───────────────────────────────
    if (generatedCode) {
      generatedCode = generatedCode
        .replace(/^```html\n?/i, "")
        .replace(/^```\n?/i, "")
        .replace(/\n?```$/i, "")
        .trim()
    }

    await updateJobProgress(jobId, 90)

    // ── 8. Persist version ────────────────────────────────────────────────
    const userId =
      jobRecord?.metadata && typeof jobRecord.metadata === "object"
        ? (jobRecord.metadata as any).userId
        : null

    if (!userId) throw new Error("User ID not found in job metadata")

    const versionResult = await createArtifactVersion({
      artifactId,
      userId: BigInt(userId),
      code: generatedCode,
      description: "AI-generated artifact via background job",
      changeType: "ai",
      setAsActive: true,
    })

    if (!versionResult.success) {
      throw new Error(versionResult.error || "Failed to create artifact version")
    }

    console.log(
      "[ArtifactGenService] Artifact version created:",
      versionResult.version?.versionNumber
    )

    await updateJobProgress(jobId, 95)
    await markJobAsCompleted(jobId, generatedCode)
    await updateJobProgress(jobId, 100)

    console.log(`[ArtifactGenService] ✅ Completed job ${jobId}`)

    // Notify the user via Pusher so the jobs tray and artifact list can refresh
    if (userId) {
      try {
        await sendNotification(userId, "artifact-job-update", {
          jobId,
          artifactId,
          artifactName: artifact.name,
          status: "completed",
          versionNumber: versionResult.version?.versionNumber,
        })
      } catch (pusherErr) {
        console.warn("[ArtifactGenService] Pusher notification failed (non-fatal):", pusherErr)
      }
    }

    return {
      success: true,
      code: generatedCode,
      versionNumber: versionResult.version?.versionNumber,
    }
  } catch (error: any) {
    console.error(`[ArtifactGenService] ❌ Failed job ${jobId}:`, error)
    await markJobAsFailed(jobId, error.message || "Unknown error")

    // Notify failure so the tray can show the error state
    try {
      const failJobRecord = await prisma.artifactGenerationJob.findUnique({
        where: { id: jobId },
        select: { metadata: true, artifact: { select: { name: true } } },
      })
      const failUserId =
        failJobRecord?.metadata && typeof failJobRecord.metadata === "object"
          ? (failJobRecord.metadata as any).userId
          : null
      if (failUserId) {
        await sendNotification(failUserId, "artifact-job-update", {
          jobId,
          artifactId,
          artifactName: failJobRecord?.artifact?.name ?? "Artifact",
          status: "failed",
          error: error.message || "Unknown error",
        })
      }
    } catch {
      // ignore secondary errors
    }

    throw error
  }
}
