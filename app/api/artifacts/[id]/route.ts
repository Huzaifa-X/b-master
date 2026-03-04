import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { deleteFromS3 } from "@/lib/aws-s3"
import pusher from "@/lib/pusher"
import notificationService from "@/lib/services/notifactionService"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * DELETE /api/artifacts/[id]
 * Deletes an artifact with cascade cleanup (permissions, versions, jobs, S3 files)
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const userId = BigInt(session.user.id)
    const artifactIdInt = parseInt(params.id)

    if (isNaN(artifactIdInt)) {
      return NextResponse.json({ error: "Invalid artifact ID" }, { status: 400 })
    }

    console.log("[DELETE Artifact API] Starting deletion for artifact:", artifactIdInt)

    // Verify user has permission to delete (must be owner or admin)
    const artifact = await prisma.assistantArtifact.findFirst({
      where: {
        id: artifactIdInt,
        deletedAt: null,
        OR: [
          { userId: userId },
          {
            permissions: {
              some: {
                userId: userId,
                access: "ADMIN",
              },
            },
          },
        ],
      },
      include: {
        assistant: true,
        permissions: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    })

    if (!artifact) {
      return NextResponse.json(
        { error: "Artifact not found or you do not have permission to delete it" },
        { status: 404 }
      )
    }

    console.log("[DELETE Artifact API] Artifact found:", artifact.name)

    // Collect S3 URLs before deletion
    const fileUrls: string[] = []
    const imageUrls: string[] = []

    if (artifact.files) {
      try {
        const filesData = Array.isArray(artifact.files)
          ? artifact.files
          : typeof artifact.files === "string"
          ? JSON.parse(artifact.files)
          : artifact.files
        if (Array.isArray(filesData)) {
          filesData.forEach((file: any) => {
            if (file.url) fileUrls.push(file.url)
          })
        }
      } catch {}
    }

    if (artifact.images) {
      try {
        const imagesData = Array.isArray(artifact.images)
          ? artifact.images
          : typeof artifact.images === "string"
          ? JSON.parse(artifact.images)
          : artifact.images
        if (Array.isArray(imagesData)) {
          imagesData.forEach((image: any) => {
            if (image.url) imageUrls.push(image.url)
          })
        }
      } catch {}
    }

    // Cascade delete inside a transaction
    await prisma.$transaction(async (tx) => {
      await tx.artifactPermission.deleteMany({ where: { artifactId: artifactIdInt } })
      await tx.artifactVersion.deleteMany({ where: { artifactId: artifactIdInt } })
      await tx.artifactGenerationJob.deleteMany({ where: { artifactId: artifactIdInt } })
      await tx.assistantArtifact.update({
        where: { id: artifactIdInt },
        data: { deletedAt: new Date() },
      })
    })

    console.log("[DELETE Artifact API] DB cascade delete complete")

    // Clean up S3 files
    for (const url of [...fileUrls, ...imageUrls]) {
      try {
        await deleteFromS3(url)
      } catch (s3Error) {
        console.error("[DELETE Artifact API] Failed to delete from S3:", url, s3Error)
      }
    }

    // Notify shared users
    const usersToNotify = artifact.permissions
      .filter((perm) => perm.user.id !== userId)
      .map((perm) => perm.user)

    if (usersToNotify.length > 0) {
      const deleter = await prisma.user.findUnique({
        where: { id: userId },
        select: { name: true, email: true },
      })

      for (const user of usersToNotify) {
        try {
          await notificationService.createNotification({
            userId: user.id.toString(),
            title: "🗑️ Artifact Deleted",
            message: `${deleter?.name || "Someone"} deleted "${artifact.name || "Untitled Artifact"}"`,
            type: "artifact_deleted",
            relatedId: artifact.id.toString(),
            relatedType: "artifact",
            data: {
              artifactId: artifact.id.toString(),
              artifactName: artifact.name || "Untitled Artifact",
              deleterId: userId.toString(),
              deleterName: deleter?.name,
              assistantId: artifact.assistantId.toString(),
            },
          })
        } catch (notificationError) {
          console.error("[DELETE Artifact API] Notification error:", notificationError)
        }
      }

      try {
        await pusher.trigger("global-artifact-updates", "artifact-deleted", {
          artifactId: artifact.id.toString(),
          artifactName: artifact.name || "Untitled Artifact",
          deleterId: userId.toString(),
          deleterName: deleter?.name,
          assistantId: artifact.assistantId.toString(),
          timestamp: new Date().toISOString(),
          notifiedUserIds: usersToNotify.map((u) => u.id.toString()),
        })
      } catch (pusherError) {
        console.error("[DELETE Artifact API] Pusher error:", pusherError)
      }
    }

    console.log("[DELETE Artifact API] ✅ Artifact deleted successfully")

    return NextResponse.json({ success: true, message: "Artifact deleted successfully" })
  } catch (error) {
    console.error("[DELETE Artifact API] Error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete artifact" },
      { status: 500 }
    )
  }
}
