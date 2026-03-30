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

// ─── Void elements (no closing tag) ──────────────────────────────────────────
const VOID_ELEMENTS = new Set([
  "area", "base", "br", "col", "embed", "hr", "img", "input",
  "link", "meta", "param", "source", "track", "wbr",
])

function findElementEnd(html: string, startIdx: number, tagName: string): number {
  const tn = tagName.toLowerCase()
  if (VOID_ELEMENTS.has(tn)) {
    const closeAngle = html.indexOf(">", startIdx)
    return closeAngle === -1 ? -1 : closeAngle + 1
  }
  const openStr = `<${tn}`
  const closeStr = `</${tn}>`
  let depth = 0
  let i = startIdx
  while (i < html.length) {
    if (html[i] !== "<") { i++; continue }
    const slice = html.slice(i, i + openStr.length + 1).toLowerCase()
    if (slice.startsWith(openStr)) {
      const nextChar = slice[openStr.length]
      if (nextChar === " " || nextChar === ">" || nextChar === "/" || nextChar === "\n" || nextChar === "\t") {
        depth++
        const gt = html.indexOf(">", i)
        if (gt === -1) break
        if (html[gt - 1] === "/") depth--
        i = gt + 1
        continue
      }
    }
    if (html.slice(i, i + closeStr.length).toLowerCase() === closeStr) {
      depth--
      if (depth === 0) return i + closeStr.length
      i += closeStr.length
      continue
    }
    i++
  }
  return -1
}

function walkBackToTagStart(source: string, anchorIdx: number): number {
  let i = anchorIdx
  while (i > 0 && source[i] !== "<") i--
  return source[i] === "<" ? i : -1
}

function locateAndReplace(source: string, outerHtml: string, replacement: string): string | null {
  // Strategy 1: exact match
  if (source.includes(outerHtml)) {
    return source.replace(outerHtml, replacement)
  }

  const norm = (s: string) => s.replace(/\s+/g, " ").trim()

  // Strategy 2: id-attribute anchor
  const idMatch = outerHtml.match(/\bid="([^"]+)"/)
  if (idMatch) {
    const anchorIdx = source.indexOf(`id="${idMatch[1]}"`)
    if (anchorIdx !== -1) {
      const tagStart = walkBackToTagStart(source, anchorIdx)
      if (tagStart !== -1) {
        const tnMatch = source.slice(tagStart).match(/^<(\w+)/)
        if (tnMatch) {
          const endPos = findElementEnd(source, tagStart, tnMatch[1])
          if (endPos !== -1) return source.slice(0, tagStart) + replacement + source.slice(endPos)
        }
      }
    }
  }

  // Strategy 3: data-*, name, or class attribute anchor
  for (const attrRx of [/\bdata-[\w-]+="([^"]+)"/, /\bname="([^"]+)"/, /\bclass="([^"]+)"/]) {
    const m = outerHtml.match(attrRx)
    if (!m) continue
    const anchorIdx = source.indexOf(m[0])
    if (anchorIdx !== -1) {
      const tagStart = walkBackToTagStart(source, anchorIdx)
      if (tagStart !== -1) {
        const tnMatch = source.slice(tagStart).match(/^<(\w+)/)
        if (tnMatch) {
          const endPos = findElementEnd(source, tagStart, tnMatch[1])
          if (endPos !== -1) return source.slice(0, tagStart) + replacement + source.slice(endPos)
        }
      }
    }
  }

  // Strategy 4: normalize opening tag, scan all occurrences of the tag type
  const tnMatch = outerHtml.match(/^<(\w+)/)
  if (tnMatch) {
    const tagName = tnMatch[1]
    const outerOpenEnd = outerHtml.indexOf(">")
    if (outerOpenEnd > 0) {
      const normOuterOpen = norm(outerHtml.slice(0, outerOpenEnd + 1))
      let searchFrom = 0
      while (true) {
        const idx = source.toLowerCase().indexOf(`<${tagName.toLowerCase()}`, searchFrom)
        if (idx === -1) break
        const gt = source.indexOf(">", idx)
        if (gt === -1) break
        if (norm(source.slice(idx, gt + 1)) === normOuterOpen) {
          const endPos = findElementEnd(source, idx, tagName)
          if (endPos !== -1) return source.slice(0, idx) + replacement + source.slice(endPos)
        }
        searchFrom = idx + 1
      }
    }
  }

  return null
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { artifactId, elementOuterHtml, userPrompt, currentHtmlCode, uploadedFiles } = body

    if (!artifactId || !elementOuterHtml || !userPrompt?.trim() || !currentHtmlCode?.trim()) {
      return NextResponse.json({ error: "artifactId, elementOuterHtml, userPrompt, and currentHtmlCode are required" }, { status: 400 })
    }

    const artifactIdInt = parseInt(artifactId)
    const userId = BigInt(session.user.id)

    const artifact = await prisma.assistantArtifact.findFirst({
      where: {
        id: artifactIdInt,
        OR: [
          { userId },
          { permissions: { some: { userId, access: { in: ["EDITOR", "ADMIN"] } } } },
        ],
      },
      select: { id: true, name: true, activeVersion: { select: { id: true, versionNumber: true } } },
    })

    if (!artifact) {
      return NextResponse.json({ error: "Artifact not found or insufficient permissions" }, { status: 404 })
    }

    // Build file context for the AI
    let fileContext = ""
    if (uploadedFiles && Array.isArray(uploadedFiles) && uploadedFiles.length > 0) {
      fileContext = "\n\n=== UPLOADED FILES ===\n"
      for (const f of uploadedFiles as any[]) {
        fileContext += `File: ${f.name} (${f.type})\n`

        // Include extracted text content (PRIMARY USE CASE)
        if (f.extractedContent?.text) {
          fileContext += `Extracted Text Content:\n${f.extractedContent.text.slice(0, 2000)}\n`
        }

        // Include URLs but with strict usage guidelines
        const imageUrl = f.preview || f.url
        if (imageUrl) {
          const isImage = f.type?.startsWith('image/')
          if (isImage) {
            fileContext += `\n⚠️ Image URL available: ${imageUrl}\n`
            fileContext += `CRITICAL: Only use this URL if user explicitly says to "display", "show", "embed", or "add" the image.\n`
            fileContext += `If user just uploaded for analysis, DO NOT embed the URL.\n`
            fileContext += `If embedding: <img src="${imageUrl}" alt="${f.name}">\n`
          } else {
            fileContext += `\nDocument URL: ${imageUrl} (for reference only - use extracted content instead)\n`
          }
        }
        fileContext += "\n"
      }
      fileContext += "=== END FILES ===\n"
    }

    const systemPrompt = [
      "You are a precise HTML surgeon. The user wants to modify a specific HTML element.",
      "Return ONLY the new outerHTML for the clicked element.",
      "Rules:",
      "  - Raw HTML only — no markdown, no backticks, no explanations, no DOCTYPE, no <html>/<body> tags",
      "  - Preserve the element tag type unless user says otherwise",
      "  - Keep existing attributes not mentioned in the request",
      "  - DO NOT embed external file URLs (S3, AWS, storage URLs) unless user explicitly says to 'display', 'show', or 'embed' an image",
      "  - For uploaded documents: Use the EXTRACTED TEXT CONTENT, not file URLs",
      "  - For images: Only embed URLs if user explicitly requests to display/show the image",
      "  - Return a single complete HTML element/fragment that can directly replace the original",
    ].join("\n")

    const userInput = [
      "=== ELEMENT TO REPLACE ===",
      elementOuterHtml,
      "=== END ELEMENT ===",
      "",
      "=== MODIFICATION REQUEST ===",
      userPrompt,
      "=== END REQUEST ===",
      fileContext,
      "=== FULL DOCUMENT (context only — do NOT return it) ===",
      currentHtmlCode.slice(0, 8000),
      "=== END DOCUMENT ===",
      "",
      "Return ONLY the replacement outerHTML for the element above.",
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

    const newFullHtml = locateAndReplace(currentHtmlCode, elementOuterHtml, patchedHtml)

    if (!newFullHtml) {
      return NextResponse.json({
        patchedHtml,
        newFullHtml: null,
        warning: "Could not locate element in document — change not saved",
      })
    }

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
