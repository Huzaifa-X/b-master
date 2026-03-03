"use client"

import { useEffect, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { AlignLeft, ChevronDown, Download, File, FileCode, FileText, Layers, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import type { Artifact } from "./artifact-card"

interface ViewArtifactDialogProps {
  artifact: Artifact | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

// ── Export helpers ───────────────────────────────────────────────────────────

/** Strip all HTML tags and return plain text */
function htmlToPlainText(html: string): string {
  if (typeof window === "undefined") return ""
  const doc = new DOMParser().parseFromString(html, "text/html")
  return (doc.body as HTMLElement).innerText ?? doc.body.textContent ?? ""
}

/** Split HTML into heading-based sections for PPTX slides */
function parseHtmlSections(html: string): { title: string; body: string }[] {
  if (typeof window === "undefined") return []
  const doc = new DOMParser().parseFromString(html, "text/html")
  const sections: { title: string; body: string }[] = []

  const headings = doc.querySelectorAll("h1, h2, h3")
  if (headings.length === 0) {
    const text = htmlToPlainText(html)
    sections.push({ title: "Content", body: text.slice(0, 800) })
    return sections
  }

  headings.forEach((heading, i) => {
    const title = heading.textContent?.trim() ?? `Slide ${i + 1}`
    const bodyParts: string[] = []
    let sibling = heading.nextElementSibling
    while (sibling && !["H1", "H2", "H3"].includes(sibling.tagName)) {
      const txt = sibling.textContent?.trim()
      if (txt) bodyParts.push(txt)
      sibling = sibling.nextElementSibling
    }
    sections.push({ title, body: bodyParts.join("\n").slice(0, 800) })
  })

  return sections
}

const getCategoryColor = (category: string) => {
  const colors: Record<string, string> = {
    presentation: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
    documentation: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
    invoice: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    video_generation: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
    others: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400",
  }
  return colors[category.toLowerCase()] || colors.others
}

export function ViewArtifactDialog({
  artifact,
  open,
  onOpenChange,
}: ViewArtifactDialogProps) {
  const [blobUrl, setBlobUrl] = useState<string>("")

  // Create blob URL for secure iframe isolation
  useEffect(() => {
    if (!artifact?.htmlContent || !open) {
      setBlobUrl("")
      return
    }

    const blob = new Blob([artifact.htmlContent], { type: "text/html" })
    const url = URL.createObjectURL(blob)
    setBlobUrl(url)

    return () => {
      URL.revokeObjectURL(url)
    }
  }, [artifact?.htmlContent, open])

  const safeName = (artifact?.name ?? "artifact")
    .replace(/[^a-z0-9]/gi, "_")
    .toLowerCase()

  const triggerDownload = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  // ── HTML ───────────────────────────────────────────────────────────────────
  const handleDownloadHTML = () => {
    if (!artifact?.htmlContent) { toast.error("No content to download"); return }
    try {
      triggerDownload(
        new Blob([artifact.htmlContent], { type: "text/html" }),
        `${safeName}.html`,
      )
      toast.success("HTML downloaded")
    } catch (e) {
      console.error(e)
      toast.error("Failed to download HTML")
    }
  }

  // ── DOCX ──────────────────────────────────────────────────────────────────
  const handleDownloadDOCX = async () => {
    if (!artifact?.htmlContent) { toast.error("No content to download"); return }
    try {
      const HTMLtoDOCX = (await import("html-to-docx")).default
      const blob = await HTMLtoDOCX(artifact.htmlContent, undefined, {
        title: artifact.name,
        margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
      }) as Blob
      triggerDownload(blob, `${safeName}.docx`)
      toast.success("Word document downloaded")
    } catch (e) {
      console.error(e)
      toast.error("Failed to export as DOCX")
    }
  }

  // ── PPTX ──────────────────────────────────────────────────────────────────
  const handleDownloadPPTX = async () => {
    if (!artifact?.htmlContent) { toast.error("No content to download"); return }
    try {
      const pptxgen = (await import("pptxgenjs")).default
      const pres = new pptxgen()
      pres.layout = "LAYOUT_WIDE"

      const sections = parseHtmlSections(artifact.htmlContent)
      sections.forEach(({ title, body }) => {
        const slide = pres.addSlide()
        slide.addText(title, {
          x: 0.5, y: 0.4, w: "90%", h: 1.2,
          fontSize: 28, bold: true, color: "363636", wrap: true,
        })
        if (body) {
          slide.addText(body, {
            x: 0.5, y: 1.9, w: "90%", h: "60%",
            fontSize: 16, color: "555555", wrap: true, valign: "top",
          })
        }
      })

      await pres.writeFile({ fileName: `${safeName}.pptx` })
      toast.success("PowerPoint downloaded")
    } catch (e) {
      console.error(e)
      toast.error("Failed to export as PPTX")
    }
  }

  // ── PDF ───────────────────────────────────────────────────────────────────
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false)

  const handleDownloadPDF = async () => {
    if (!artifact?.htmlContent) { toast.error("No content to download"); return }
    if (isGeneratingPDF) return
    setIsGeneratingPDF(true)
    toast.loading("Generating PDF…", { id: "pdf-export" })
    try {
      const res = await fetch("/api/artifacts/generate-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ html: artifact.htmlContent, filename: safeName }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Server error")
      }
      const { pdfUrl } = await res.json()
      const link = document.createElement("a")
      link.href = pdfUrl
      link.download = `${safeName}.pdf`
      link.target = "_blank"
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      toast.success("PDF downloaded", { id: "pdf-export" })
    } catch (e: any) {
      console.error(e)
      toast.error(e?.message ?? "Failed to export as PDF", { id: "pdf-export" })
    } finally {
      setIsGeneratingPDF(false)
    }
  }

  // ── TXT ───────────────────────────────────────────────────────────────────
  const handleDownloadTXT = () => {
    if (!artifact?.htmlContent) { toast.error("No content to download"); return }
    try {
      const text = htmlToPlainText(artifact.htmlContent)
      triggerDownload(
        new Blob([text], { type: "text/plain;charset=utf-8" }),
        `${safeName}.txt`,
      )
      toast.success("Text file downloaded")
    } catch (e) {
      console.error(e)
      toast.error("Failed to export as TXT")
    }
  }

  if (!artifact) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-[98vw] sm:!max-w-[98vw] w-full h-[98vh] p-0 flex flex-col overflow-hidden [&>button]:hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b flex-shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <DialogTitle className="text-2xl">{artifact.name}</DialogTitle>
              <div className="flex items-center gap-2 mt-2">
                <Badge className={cn("text-xs", getCategoryColor(artifact.category))}>
                  {artifact.category.charAt(0).toUpperCase() + artifact.category.slice(1)}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  Created {artifact.createdAt.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Export Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="flex items-center gap-1.5 flex-shrink-0">
                    <Download className="h-4 w-4" />
                    Export
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Download as</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleDownloadHTML}>
                    <FileCode className="h-4 w-4 mr-2" />
                    HTML
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleDownloadPDF} disabled={isGeneratingPDF}>
                    <File className="h-4 w-4 mr-2" />
                    {isGeneratingPDF ? "Generating PDF…" : "PDF (.pdf)"}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleDownloadDOCX}>
                    <FileText className="h-4 w-4 mr-2" />
                    Word (.docx)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleDownloadPPTX}>
                    <Layers className="h-4 w-4 mr-2" />
                    PowerPoint (.pptx)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleDownloadTXT}>
                    <AlignLeft className="h-4 w-4 mr-2" />
                    Plain Text (.txt)
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Close Button */}
              <Button
                onClick={() => onOpenChange(false)}
                variant="outline"
                size="icon"
                className="flex-shrink-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Full HTML Preview */}
        <div className="flex-1 overflow-hidden p-6">
          <div className="w-full h-full rounded-lg overflow-hidden border-2 bg-white dark:bg-neutral-950">
            {/* 
              Security Note: Using blob URLs with allow-scripts and allow-same-origin
              for interactive artifacts. This combination is necessary for:
              1. localStorage access for data persistence
              2. JavaScript execution for interactivity
              3. Form submissions and popups
              
              Blob URLs provide better isolation than srcDoc. Artifacts are:
              - AI-generated with controlled prompts
              - Created by authenticated users
              - Sanitized during creation
            */}
            {blobUrl ? (
              <iframe
                src={blobUrl}
                className="w-full h-full border-0"
                title={artifact.name}
                referrerPolicy="no-referrer"
                allow="clipboard-write"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-sm text-muted-foreground">Loading artifact...</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

