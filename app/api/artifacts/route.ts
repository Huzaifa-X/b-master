import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * GET /api/artifacts?assistantId=xxx
 * Returns all artifacts for an assistant visible to the current user
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Authentication required", artifacts: [] }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const assistantId = searchParams.get("assistantId")

    if (!assistantId) {
      return NextResponse.json({ error: "assistantId is required", artifacts: [] }, { status: 400 })
    }

    const userId = BigInt(session.user.id)
    const assistantIdBigInt = BigInt(assistantId)

    const isAssistantOwner = await prisma.assistant.findFirst({
      where: { id: assistantIdBigInt, userId: userId },
    })

    const hasAssistantAccess =
      isAssistantOwner ||
      (await prisma.assistant.findFirst({
        where: {
          id: assistantIdBigInt,
          OR: [
            { purchases: { some: { buyerId: userId, paymentRecord: { status: "completed" } } } },
            { contacts: { some: { userId: userId } } },
          ],
        },
      }))

    const orConditions: any[] = [
      { userId: userId },
      { permissions: { some: { userId: userId } } },
      { isPublic: true },
    ]
    if (isAssistantOwner) orConditions.push({ id: { gt: 0 } })

    const artifacts = await prisma.assistantArtifact.findMany({
      where: {
        assistantId: assistantIdBigInt,
        deletedAt: null,
        OR: orConditions,
      },
      include: {
        user: { select: { id: true, name: true, email: true, image: true } },
        permissions: { where: { userId: userId }, select: { access: true } },
        activeVersion: { select: { id: true, versionNumber: true, code: true } },
      },
      orderBy: { createdAt: "desc" },
    })

    const formattedArtifacts = artifacts.map((artifact) => {
      const isOwner = artifact.userId === userId
      const hasExplicitPermission = artifact.permissions.length > 0
      const accessLevel = isOwner ? "ADMIN" : hasExplicitPermission ? artifact.permissions[0].access : "VIEWER"

      return {
        id: artifact.id.toString(),
        name: artifact.name || "Untitled Artifact",
        category: artifact.category || "others",
        htmlContent: artifact.activeVersion?.code || "",
        instructions: artifact.instructions || "",
        createdAt: artifact.createdAt,
        activeVersionId: artifact.activeVersionId?.toString(),
        activeVersionNumber: artifact.activeVersion?.versionNumber,
        creator: {
          id: artifact.user.id.toString(),
          name: artifact.user.name || "Unknown User",
          email: artifact.user.email,
          image: artifact.user.image,
        },
        isOwner,
        access: accessLevel,
        isPublic: artifact.isPublic,
      }
    })

    return NextResponse.json({ success: true, artifacts: formattedArtifacts })
  } catch (error) {
    console.error("[GET Artifacts API] Error:", error)
    return NextResponse.json({ error: "Failed to fetch artifacts", artifacts: [] }, { status: 500 })
  }
}
