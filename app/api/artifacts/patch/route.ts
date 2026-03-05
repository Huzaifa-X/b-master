// app/api/artifacts/patch/route.ts
// Surgical element patch — regenerates ONLY the clicked element, not the whole artifact.
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { openai } from "@/lib/openai"
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
    const { artifactId, elementOuterHtml, userPrompt, currentHtmlCode } = body

    if (!artifactId || !elementOuterHtml || !userPrompt?.trim() || !currentHtmlCode?.trim()) {
      return NextResponse.json({ error: "artifactId, elementOuterHtml, userPrompt, and currentHtmlCode are required" }, { status: 400 })
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
      select: { id: true, name: true, activeVersion: { select: { id: true, versionNumber: true } } },
    })

    if (!artifact) {
      return NextResponse.json({ error: "Artifact not found or insufficient permissions" }, { status: 404 })
    }

    // Ask the model to return ONLY the replacement HTML for the element
    const systemPrompt = [
      "You are a precise HTML surgeon. The user wants to modify a specific HTML element.",
      "You will be given:",
      "  1. The CURRENT outerHTML of the element they clicked",
      "  2. Their modification request",
      "  3. The full HTML document (for context only — do NOT return it)",
      "",
      "Your job: return ONLY the new outerHTML for that single element.",
      "Rules:",
      "  - Return raw HTML only — no markdown, no backticks, no explanations, no DOCTYPE, no <html>/<body> tags",
      "  - Preserve the element's tag type unless the user explicitly asks to change it",
      "  - Keep all existing attributes not specifically mentioned in the request",
      "  - The replacement must be a single complete HTML element or fragment that can drop-in replace the original",
      "  - If the user's request is unclear, make the most reasonable interpretation",
    ].join("\n")

    const userInput = [
      "=== ELEMENT TO REPLACE ===",
      elementOuterHtml,
      "=== END ELEMENT ===",
      "",
      "=== MODIFICATION REQUEST ===",
      userPrompt,
      "=== END REQUEST ===",
      "",
      "=== FULL DOCUMENT (for context only) ===",
      currentHtmlCode.slice(0, 8000), // Truncate to avoid token limits
      "=== END DOCUMENT ===",
      "",
      "Return ONLY the replacement outerHTML for the element above. Nothing else.",
    ].join("\n")

    const response = await openai.responses.create({
      model: "gpt-4.1",
      instructions: systemPrompt,
      input: userInput,
      stream: false,
    })

    const patchedHtml = (response.output_text ?? "").trim()

    if (!patchedHtml) {
      return NextResponse.json({ error: "AI returned empty patch" }, { status: 500 })
    }

    // Apply the patch: replace the element's outerHTML in the full document
    // We do a plain string replace — the outerHTML from the browser is canonical
    let newFullHtml = currentHtmlCode

    // Try exact replace first
    if (currentHtmlCode.includes(elementOuterHtml)) {
      newFullHtml = currentHtmlCode.replace(elementOuterHtml, patchedHtml)
    } else {
      // Fallback: normalise whitespace and try again
      const normalise = (s: string) => s.replace(/\s+/g, " ").trim()
      const normCurrent = normalise(currentHtmlCode)
      const normElement = normalise(elementOuterHtml)
      if (normCurrent.includes(normElement)) {
        newFullHtml = normCurrent.replace(normElement, normalise(patchedHtml))
        // Use non-normalised base with targeted replacement for cleaner output
        // (fallback already applied above is acceptable)
      } else {
        // If we still can't match, return the AI patch alone and let the client decide
        return NextResponse.json({
          patchedHtml,
          newFullHtml: null,
          warning: "Could not locate element in document — returning patch only",
        })
      }
    }

    // Save the new version
    const versionResult = await createArtifactVersion({
      artifactId: artifactIdInt,
      userId,
      code: newFullHtml,
      description: `Visual edit: ${userPrompt.substring(0, 80)}`,
      changeType: "ai",
      setAsActive: true,
    })

    if (!versionResult.success) {
      console.error("[Patch] Version save failed:", versionResult.error)
      // Still return the patched HTML so the UI updates even if save failed
    }

    return NextResponse.json({
      patchedHtml,
      newFullHtml,
      versionNumber: versionResult.version?.versionNumber ?? null,
    })
  } catch (error) {
    console.error("[Artifact Patch] Error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}
