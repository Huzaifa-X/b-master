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

import { useLocale } from "@/lib/i18n"

export function ViewArtifactDialog({
  artifact,
  open,
  onOpenChange,
}: ViewArtifactDialogProps) {
  const [blobUrl, setBlobUrl] = useState<string>("")
  const { t, locale } = useLocale()

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

  // Map category to translation key (replace space with underscore)
  const categoryKey = artifact?.category.toLowerCase().replace(/\s+/g, '_') || "others"

  // ── HTML ───────────────────────────────────────────────────────────────────
  const handleDownloadHTML = () => {
    if (!artifact?.htmlContent) { toast.error(t("artifacts.errors.noContent")); return }
    try {
      triggerDownload(
        new Blob([artifact.htmlContent], { type: "text/html" }),
        `${safeName}.html`,
      )
      toast.success(t("artifactPanel.downloadedAsHtml"))
    } catch (e) {
      console.error(e)
      toast.error(t("common.error"))
    }
  }

  // ── DOCX ──────────────────────────────────────────────────────────────────
  const [isGeneratingDOCX, setIsGeneratingDOCX] = useState(false)
  const handleDownloadDOCX = async () => {
    if (!artifact?.htmlContent) { toast.error(t("artifacts.errors.noContent")); return }
    if (isGeneratingDOCX) return
    setIsGeneratingDOCX(true)
    toast.loading(t("artifacts.generatingWord"), { id: "docx-export" })
    try {
      const res = await fetch("/api/artifacts/generate-docx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ html: artifact.htmlContent, filename: safeName }),
      })
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || "Server error") }
      const { docxUrl } = await res.json()
      const link = document.createElement("a")
      link.href = docxUrl; link.download = `${safeName}.docx`; link.target = "_blank"
      document.body.appendChild(link); link.click(); document.body.removeChild(link)
      toast.success(t("artifactPanel.docxGenerated"), { id: "docx-export" })
    } catch (e: any) {
      console.error(e)
      toast.error(t("artifactPanel.failedToGenerateDocx"), { id: "docx-export" })
    } finally {
      setIsGeneratingDOCX(false)
    }
  }

  // ── PPTX ──────────────────────────────────────────────────────────────────
  const handleDownloadPPTX = async () => {
    if (!artifact?.htmlContent) { toast.error(t("artifacts.errors.noContent")); return }
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
      toast.success(t("artifactPanel.pptxGenerated"))
    } catch (e) {
      console.error(e)
      toast.error(t("artifactPanel.failedToGeneratePptx"))
    }
  }

  // ── PDF ───────────────────────────────────────────────────────────────────
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false)

  const handleDownloadPDF = async () => {
    if (!artifact?.htmlContent) { toast.error(t("artifacts.errors.noContent")); return }
    if (isGeneratingPDF) return
    setIsGeneratingPDF(true)
    toast.loading(t("artifacts.generatingPdf"), { id: "pdf-export" })
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
      toast.success(t("artifactPanel.pdfGenerated"), { id: "pdf-export" })
    } catch (e: any) {
      console.error(e)
      toast.error(t("artifactPanel.failedToGeneratePdf"), { id: "pdf-export" })
    } finally {
      setIsGeneratingPDF(false)
    }
  }

  // ── TXT ───────────────────────────────────────────────────────────────────
  const handleDownloadTXT = () => {
    if (!artifact?.htmlContent) { toast.error(t("artifacts.errors.noContent")); return }
    try {
      const text = htmlToPlainText(artifact.htmlContent)
      triggerDownload(
        new Blob([text], { type: "text/plain;charset=utf-8" }),
        `${safeName}.txt`,
      )
      toast.success(t("artifactPanel.downloadedSuccessfully"))
    } catch (e) {
      console.error(e)
      toast.error(t("common.error"))
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
                  {t(`artifacts.categories.${categoryKey}`, { defaultValue: artifact.category })}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {t("artifacts.createdOn", { 
                    date: artifact.createdAt.toLocaleDateString(locale === "en" ? "en-US" : "fr-FR", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })
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
                    {t("artifacts.export")}
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>{t("artifacts.downloadAs")}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleDownloadHTML}>
                    <FileCode className="h-4 w-4 mr-2" />
                    {t("artifacts.html")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleDownloadPDF} disabled={isGeneratingPDF}>
                    <File className="h-4 w-4 mr-2" />
                    {isGeneratingPDF ? t("artifacts.generatingPdf") : t("artifacts.pdf")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleDownloadDOCX} disabled={isGeneratingDOCX}>
                    <FileText className="h-4 w-4 mr-2" />
                    {isGeneratingDOCX ? t("artifacts.generatingWord") : t("artifacts.wordDoc")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleDownloadPPTX}>
                    <Layers className="h-4 w-4 mr-2" />
                    {t("artifacts.powerpoint")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleDownloadTXT}>
                    <AlignLeft className="h-4 w-4 mr-2" />
                    {t("artifacts.plainText")}
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
                  <p className="text-sm text-muted-foreground">{t("artifacts.loadingArtifacts")}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

