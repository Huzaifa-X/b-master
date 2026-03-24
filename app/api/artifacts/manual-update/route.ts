import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { createArtifactVersion } from "@/app/actions/update-artifact.action"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { artifactId, oldContent, newContent, fullContent, mode } = body

    if (!artifactId || !fullContent) {
      return NextResponse.json({ error: "artifactId and fullContent are required" }, { status: 400 })
    }

    const artifactIdInt = parseInt(artifactId)
    const userId = BigInt(session.user.id)

    // Verify permissions
    const artifact = await prisma.assistantArtifact.findFirst({
      where: {
        id: artifactIdInt,
        OR: [
          { userId },
          {
            permissions: {
              some: {
                userId,
                access: { in: ["EDITOR", "ADMIN"] },
              },
            },
          },
        ],
      },
    })

    if (!artifact) {
      return NextResponse.json({ error: "Artifact not found or insufficient permissions" }, { status: 404 })
    }

    let updatedFullHtml = fullContent

    if (mode === "selection") {
      // Direct text replacement
      if (!oldContent || !newContent) {
        return NextResponse.json({ error: "oldContent and newContent are required for selection mode" }, { status: 400 })
      }
      
      if (fullContent.includes(oldContent)) {
        updatedFullHtml = fullContent.replace(oldContent, newContent)
      } else {
        // Fallback: try normalized whitespace matching
        const normalise = (s: string) => s.replace(/\s+/g, " ").trim()
        const normFull = normalise(fullContent)
        const normOld = normalise(oldContent)
        
        if (normFull.includes(normOld)) {
            // This is risky but we'll try a simpler approach if exact match fails
            // In a real app we'd use a more robust fuzzy replace
            updatedFullHtml = fullContent.replace(oldContent.trim(), newContent)
        } else {
            return NextResponse.json({ error: "Could not find text to replace" }, { status: 400 })
        }
      }
    } else if (mode === "element") {
      // Element replacement (swap outerHTML)
      if (!oldContent || !newContent) {
        return NextResponse.json({ error: "oldContent and newContent are required for element mode" }, { status: 400 })
      }
      
      if (fullContent.includes(oldContent)) {
        updatedFullHtml = fullContent.replace(oldContent, newContent)
      } else {
        return NextResponse.json({ error: "Could not find element to replace" }, { status: 400 })
      }
    }

    // Save the new version
    const versionResult = await createArtifactVersion({
      artifactId: artifactIdInt,
      userId,
      code: updatedFullHtml,
      description: `Manual edit: ${mode === 'selection' ? 'Text' : 'Element'} update`,
      changeType: "manual",
      setAsActive: true,
    })

    if (!versionResult.success) {
      return NextResponse.json({ error: "Failed to save version: " + versionResult.error }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      newFullHtml: updatedFullHtml,
      versionNumber: versionResult.version?.versionNumber,
    })
  } catch (error) {
    console.error("[Artifact Manual Update] Error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}
