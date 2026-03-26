import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { createArtifactVersion } from "@/app/actions/update-artifact.action"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// Helper: Decode HTML entities for text comparison
function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
}

// Helper: Normalize text for flexible matching
function normalizeForMatching(text: string): string {
  return decodeHtmlEntities(text)
    .replace(/\s+/g, ' ')
    .trim()
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { artifactId, oldContent, newContent, fullContent, mode } = body

    console.log(`[Manual Update] Mode: ${mode}, OldContent length: ${oldContent?.length}, NewContent length: ${newContent?.length}, FullContent length: ${fullContent?.length}`)

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
      
      // Try exact match first
      if (fullContent.includes(oldContent)) {
        console.log("[Manual Update] Selection: Exact match found")
        updatedFullHtml = fullContent.replace(oldContent, newContent)
      } else {
        console.log("[Manual Update] Selection: Exact match failed, trying fallbacks...")
        console.log("[Manual Update] OldContent preview:", oldContent.substring(0, 100))
        
        // Fallback 1: Try with trimmed content
        const trimmedOld = oldContent.trim()
        if (trimmedOld && fullContent.includes(trimmedOld)) {
          console.log("[Manual Update] Selection: Trimmed match found")
          updatedFullHtml = fullContent.replace(trimmedOld, newContent)
        } else {
          // Fallback 2: Try with normalized text (whitespace + HTML entities)
          const normOld = normalizeForMatching(oldContent)
          const normFull = normalizeForMatching(fullContent)
          
          if (normOld && normFull.includes(normOld)) {
            console.log("[Manual Update] Selection: Normalized match found")
            
            // Build a flexible regex that handles both whitespace and HTML entities
            // Escape special regex chars
            let pattern = oldContent.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
            
            // Make whitespace flexible (match any amount of whitespace)
            pattern = pattern.replace(/\s+/g, '\\s+')
            
            // Make common HTML entities optional/flexible
            pattern = pattern
              .replace(/&nbsp;/g, '(&nbsp;|\\s)')
              .replace(/&quot;/g, '(&quot;|")')
              .replace(/&apos;/g, "(&apos;|')")
              .replace(/&lt;/g, '(&lt;|<)')
              .replace(/&gt;/g, '(&gt;|>)')
              .replace(/&amp;/g, '(&amp;|&)')
            
            try {
              const regex = new RegExp(pattern, 'i')
              const match = fullContent.match(regex)
              
              if (match && match.index !== undefined) {
                console.log("[Manual Update] Selection: Regex match found at index", match.index)
                updatedFullHtml = fullContent.substring(0, match.index) + 
                                newContent + 
                                fullContent.substring(match.index + match[0].length)
              } else {
                // Fallback 3: Find partial match by searching for chunks
                console.log("[Manual Update] Selection: Trying chunk-based matching...")
                const chunks = normOld.split(' ').filter(w => w.length > 3)
                if (chunks.length > 0) {
                  const firstChunk = chunks[0]
                  const lastChunk = chunks[chunks.length - 1]
                  
                  // Find positions of first and last significant words
                  const firstIdx = normFull.indexOf(firstChunk)
                  const lastIdx = normFull.indexOf(lastChunk, firstIdx)
                  
                  if (firstIdx >= 0 && lastIdx >= 0) {
                    console.log("[Manual Update] Selection: Chunk match found (approximate)")
                    // This is approximate - find the corresponding position in original text
                    // Count spaces before firstIdx in normalized text
                    const spacesBefore = normFull.substring(0, firstIdx).split(' ').length - 1
                    
                    // Find approximately same position in original
                    let pos = 0
                    let spaceCount = 0
                    for (let i = 0; i < fullContent.length; i++) {
                      if (fullContent[i].match(/\s/)) spaceCount++
                      if (spaceCount >= spacesBefore) {
                        pos = i
                        break
                      }
                    }
                    
                    // Replace from that position forward with a flexible regex
                    const simplePattern = normOld.split(' ').slice(0, 5).join('\\s+')
                    const simpleRegex = new RegExp(simplePattern, 'i')
                    const remainingContent = fullContent.substring(pos)
                    const simpleMatch = remainingContent.match(simpleRegex)
                    
                    if (simpleMatch && simpleMatch.index !== undefined) {
                      const startIdx = pos + simpleMatch.index
                      updatedFullHtml = fullContent.substring(0, startIdx) + 
                                      newContent + 
                                      fullContent.substring(startIdx + simpleMatch[0].length)
                    } else {
                      return NextResponse.json({ 
                        error: "Could not find text to replace. Try selecting less text or using the AI assistant instead." 
                      }, { status: 400 })
                    }
                  } else {
                    return NextResponse.json({ 
                      error: "Could not find text to replace. The selected text may have been modified." 
                    }, { status: 400 })
                  }
                } else {
                  return NextResponse.json({ 
                    error: "Selected text is too short or generic to locate reliably." 
                  }, { status: 400 })
                }
              }
            } catch (regexError) {
              console.error("[Manual Update] Regex error:", regexError)
              return NextResponse.json({ 
                error: "Text matching failed. Try selecting simpler text or use the AI assistant." 
              }, { status: 400 })
            }
          } else {
            console.log("[Manual Update] Selection: No match found even after normalization")
            console.log("[Manual Update] Normalized old substring:", normOld.substring(0, 100))
            return NextResponse.json({ 
              error: "Could not find the selected text in the document. It may have been modified by another update." 
            }, { status: 400 })
          }
        }
      }
    } else if (mode === "element") {
      // Element replacement (swap outerHTML)
      if (!oldContent || !newContent) {
        return NextResponse.json({ error: "oldContent and newContent are required for element mode" }, { status: 400 })
      }
      
      // Try exact match first
      if (fullContent.includes(oldContent)) {
        console.log("[Manual Update] Element: Exact match found")
        updatedFullHtml = fullContent.replace(oldContent, newContent)
      } else {
        console.log("[Manual Update] Element: Exact match failed, trying normalized HTML...")
        // Fallback: Try with normalized whitespace for element HTML
        const normalizeHtml = (html: string) => 
          html.replace(/\s+/g, " ")
              .replace(/>\s+</g, "><")
              .trim()
        
        const normFull = normalizeHtml(fullContent)
        const normOld = normalizeHtml(oldContent)
        
        if (normOld && normFull.includes(normOld)) {
          console.log("[Manual Update] Element: Normalized HTML match found")
          // Use regex with flexible whitespace
          const escapedOld = oldContent.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
          const flexWhitespace = escapedOld.replace(/\s+/g, '\\s*')
          const regex = new RegExp(flexWhitespace)
          
          updatedFullHtml = fullContent.replace(regex, newContent)
        } else {
          console.log("[Manual Update] Element: No match found even after normalization")
          return NextResponse.json({ error: "Could not find element to replace" }, { status: 400 })
        }
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
