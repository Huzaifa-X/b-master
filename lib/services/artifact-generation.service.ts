/**
 * lib/services/artifact-generation.service.ts
 *
 * Core artifact-generation logic shared by:
 *   - The background worker  (lib/workers/artifact-generation.worker.ts)
 *   - The stream API route   (app/api/artifacts/stream/route.ts)
 *   - The createArtifact action (app/actions/artifact.action.ts)
 *
 * Now delegates to the agentic orchestrator:
 *   RequirementAgent → ProcessAgent → HTML Generator (streaming)
 */

import prisma from "@/lib/prisma"
import { createArtifactVersion } from "@/app/actions/update-artifact.action"
import {
  markJobAsProcessing,
  updateJobProgress,
  updateJobProgressWithResult,
  markJobAsCompleted,
  markJobAsFailed,
} from "@/lib/queues/artifact-generation.queue"
import { sendNotification } from "@/lib/pusher"
import { orchestrateGeneration } from "@/lib/services/artifact-orchestrator.service"
import type { ArtifactAgentContext } from "@/lib/agents/types"

// ─── Core processor ──────────────────────────────────────────────────────────

/**
 * Process a single artifact-generation job end-to-end using the agentic pipeline:
 *   RequirementAgent → ProcessAgent → HTML Generator (streaming)
 *
 * Safe to call from any context (worker, API route, server action).
 */
export async function processArtifactGeneration(
  jobId: string,
  artifactId: number
): Promise<{ success: boolean; code?: string; versionNumber?: number }> {
  console.log(`[ArtifactGenService] 🔄 Processing job ${jobId} for artifact ${artifactId}`)

  try {
    // ── Guard: skip if already being processed or completed ──────────────
    const currentJob = await prisma.artifactGenerationJob.findUnique({
      where: { id: jobId },
      select: { status: true },
    })
    if (!currentJob) throw new Error(`Job ${jobId} not found in database`)
    if (currentJob.status === "processing" || currentJob.status === "completed") {
      console.log(`[ArtifactGenService] ⏭️  Skipping job ${jobId} — already ${currentJob.status}`)
      return { success: true }
    }

    await markJobAsProcessing(jobId)
    await updateJobProgress(jobId, 5)

    // ── 1. Load artifact + job metadata ──────────────────────────────────
    const [artifact, jobRecord] = await Promise.all([
      prisma.assistantArtifact.findUnique({
        where: { id: artifactId },
        include: { assistant: { select: { id: true, name: true, vectorStoreId: true } } },
      }),
      prisma.artifactGenerationJob.findUnique({ where: { id: jobId } }),
    ])

    if (!artifact) throw new Error(`Artifact ${artifactId} not found`)
    if (!jobRecord) throw new Error(`Job record ${jobId} not found`)

    const meta = (jobRecord.metadata && typeof jobRecord.metadata === "object")
      ? (jobRecord.metadata as Record<string, any>)
      : {}
    const userId = meta.userId as string | undefined
    if (!userId) throw new Error("User ID not found in job metadata")

    // ── 2. Build ArtifactAgentContext ────────────────────────────────────
    const files: ArtifactAgentContext["files"] = []
    if (artifact.files && Array.isArray(artifact.files)) {
      for (const f of artifact.files as any[]) {
        files.push({
          name: f.name ?? "file",
          extractedText: f.extractedContent?.text,
          extractedHtml: f.extractedContent?.html,
          url: f.url,
        })
      }
    }

    const images: ArtifactAgentContext["images"] = []
    if (artifact.images && Array.isArray(artifact.images)) {
      for (const img of artifact.images as any[]) {
        images.push({ name: img.name ?? "image", url: img.url })
      }
    }

    // Optional: load chat history for context
    const chatHistory: ArtifactAgentContext["chatHistory"] = []
    if (meta.selectedChatId) {
      try {
        const msgs = await prisma.assistantUserChatMessage.findMany({
          where: { assistantUserChatId: parseInt(meta.selectedChatId) },
          orderBy: { createdAt: "asc" },
          take: 20,
          select: { role: true, message: true },
        })
        msgs.forEach(m => chatHistory.push({ role: m.role as "user" | "assistant", content: m.message || "" }))
      } catch (e) {
        console.warn("[ArtifactGenService] Could not load chat history:", e)
      }
    }

    const ctx: ArtifactAgentContext = {
      name: artifact.name ?? "",
      category: artifact.category ?? "",
      instructions: artifact.instructions || "",
      files,
      images,
      chatHistory,
      vectorStoreId: artifact.assistant?.vectorStoreId ?? undefined,
    }

    await updateJobProgress(jobId, 10)

    // ── 3. Run orchestrator ───────────────────────────────────────────────
    let chunkCount = 0
    let generatedCode = ""

    const generatedHtml = await orchestrateGeneration(ctx, {
      onProgress: async (pct, message, agent) => {
        const scaledPct = Math.floor(10 + pct * 0.8) // map 0-100 → 10-90
        await updateJobProgressWithResult(jobId, scaledPct, generatedCode)
        if (message) console.log(`[ArtifactGenService][${agent ?? "?"}] ${message}`)
      },
      onChunk: async (chunk) => {
        generatedCode += chunk
        chunkCount++
        if (chunkCount % 15 === 0) {
          await updateJobProgressWithResult(jobId, Math.min(88, 40 + chunkCount * 0.05), generatedCode)
        }
      },
    })

    generatedCode = generatedHtml

    await updateJobProgress(jobId, 90)

    // ── 4. Persist version ────────────────────────────────────────────────
    const versionResult = await createArtifactVersion({
      artifactId,
      userId: BigInt(userId),
      code: generatedCode,
      description: "AI-generated artifact (agentic pipeline)",
      changeType: "ai",
      setAsActive: true,
    })

    if (!versionResult.success) {
      throw new Error(versionResult.error || "Failed to create artifact version")
    }

    console.log(`[ArtifactGenService] Artifact version created: v${versionResult.version?.versionNumber}`)

    await markJobAsCompleted(jobId, generatedCode)
    await updateJobProgress(jobId, 100)

    console.log(`[ArtifactGenService] ✅ Completed job ${jobId}`)

    // Notify via Pusher
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

    return {
      success: true,
      code: generatedCode,
      versionNumber: versionResult.version?.versionNumber,
    }

  } catch (error: any) {
    console.error(`[ArtifactGenService] ❌ Failed job ${jobId}:`, error)
    await markJobAsFailed(jobId, error.message || "Unknown error")

    // Notify failure
    try {
      const failJobRecord = await prisma.artifactGenerationJob.findUnique({
        where: { id: jobId },
        select: { metadata: true, artifact: { select: { name: true } } },
      })
      const failUserId = failJobRecord?.metadata && typeof failJobRecord.metadata === "object"
        ? (failJobRecord.metadata as any).userId
        : null
      if (failUserId) {
        await sendNotification(failUserId, "artifact-job-update", {
          jobId, artifactId,
          artifactName: failJobRecord?.artifact?.name ?? "Artifact",
          status: "failed",
          error: error.message || "Unknown error",
        })
      }
    } catch { /* ignore secondary errors */ }

    throw error
  }
}
