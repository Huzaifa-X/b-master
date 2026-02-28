// app/api/artifacts/jobs/active/route.ts
// Returns all active (pending + processing) and recently completed artifact
// generation jobs for the current authenticated user.

import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userIdBigInt = BigInt(session.user.id)

    // Get all jobs for artifacts owned by this user:
    // - pending / processing  (currently running)
    // - completed / failed within the last 5 minutes  (for transient "done" badges)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)

    const jobs = await prisma.artifactGenerationJob.findMany({
      where: {
        artifact: { userId: userIdBigInt },
        OR: [
          { status: { in: ["pending", "processing"] } },
          {
            status: { in: ["completed", "failed"] },
            completedAt: { gte: fiveMinutesAgo },
          },
        ],
      },
      include: {
        artifact: {
          select: {
            id: true,
            name: true,
            assistantId: true,
            category: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json({
      jobs: jobs.map((job: typeof jobs[number]) => ({
        id: job.id,
        artifactId: job.artifactId,
        artifactName: job.artifact.name,
        assistantId: job.artifact.assistantId.toString(),
        category: job.artifact.category,
        status: job.status,
        progress: job.progress,
        error: job.error,
        createdAt: job.createdAt,
        startedAt: job.startedAt,
        completedAt: job.completedAt,
      })),
    })
  } catch (error: any) {
    console.error("[Active Jobs API] Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
