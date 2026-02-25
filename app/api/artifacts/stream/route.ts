// app/api/artifacts/stream/route.ts
// QUEUE-BASED ARTIFACT GENERATION
// This endpoint creates a background job and redirects to the stream endpoint
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { enqueueArtifactGeneration } from "@/lib/queues/artifact-generation.queue"
import { processArtifactGeneration } from "@/lib/services/artifact-generation.service"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * POST /api/artifacts/stream
 * Creates a background generation job and returns job info
 * Frontend should then connect to /api/artifacts/jobs/[jobId]/stream
 */
export async function POST(req: NextRequest) {
  try {
    console.log("[Artifact Stream API] Request received")

    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      console.error("[Artifact Stream API] Unauthorized - no session")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = session.user.id
    console.log("[Artifact Stream API] User authenticated:", userId)

    const body = await req.json()
    const { artifactId } = body

    if (!artifactId) {
      return NextResponse.json({ error: "artifactId is required" }, { status: 400 })
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
      return NextResponse.json({ error: "Artifact not found" }, { status: 404 })
    }

    console.log("[Artifact Stream API] Artifact found:", artifact.name)

    // Check permissions - user must be the owner or have permissions
    const userIdBigInt = BigInt(userId)
    const isOwner = artifact.userId === userIdBigInt

    let hasPermission = false
    if (!isOwner) {
      // Check if user has artifact permissions
      const permission = await prisma.artifactPermission.findFirst({
        where: {
          userId: userIdBigInt,
          artifactId: artifactIdInt,
          assistantId: artifact.assistantId
        }
      })
      hasPermission = !!permission
    }

    if (!isOwner && !hasPermission) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    // Extract selectedChatId if exists
    let selectedChatId: number | undefined
    if (artifact.tools && typeof artifact.tools === 'object') {
      const toolsData = artifact.tools as any
      selectedChatId = toolsData.selectedChatId
    }

    // Check if there's already a pending or processing job for this artifact
    const existingJob = await prisma.artifactGenerationJob.findFirst({
      where: {
        artifactId: artifactIdInt,
        status: {
          in: ['pending', 'processing']
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    if (existingJob) {
      console.log('[Artifact Stream API] Found existing job:', existingJob.id)
      return NextResponse.json({
        useQueue: true,
        jobId: existingJob.id,
        artifactId: artifactIdInt,
        status: existingJob.status,
        streamUrl: `/api/artifacts/jobs/${existingJob.id}/stream`,
      })
    }

    // Enqueue the generation job (this creates the database record)
    const jobId = await enqueueArtifactGeneration({
      artifactId: artifactIdInt,
      userId: userId,
      assistantId: artifact.assistantId.toString(),
      instructions: artifact.instructions || '',
      selectedChatId: selectedChatId,
    })

    console.log('[Artifact Stream API] ✅ Job enqueued successfully:', jobId)

    // Fire-and-forget: start processing inline so generation works even when
    // the standalone worker process is not running.  The service is idempotent —
    // it will skip jobs already being processed by the worker.
    void processArtifactGeneration(jobId, artifactIdInt).catch((err) => {
      console.error('[Artifact Stream API] Inline generation error:', err)
    })

    // Return job info for frontend to connect to stream
    return NextResponse.json({
      useQueue: true,
      jobId: jobId,
      artifactId: artifactIdInt,
      status: 'pending',
      streamUrl: `/api/artifacts/jobs/${jobId}/stream`,
    })

  } catch (error: any) {
    console.error("[Artifact Stream API] Error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to start artifact generation" },
      { status: 500 }
    )
  }
}
