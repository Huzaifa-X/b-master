"use client"

import { useEffect, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Download, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import type { Artifact } from "./artifact-card"

interface ViewArtifactDialogProps {
  artifact: Artifact | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

const getCategoryColor = (category: string) => {
  const colors: Record<string, string> = {
    accounting: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    invoice: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    payment: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
    documentation: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
    analytics: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400",
    presentation: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
    booking: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
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

  // Handle download artifact as HTML file
  const handleDownload = () => {
    if (!artifact?.htmlContent) {
      toast.error("No content to download")
      return
    }

    try {
      const blob = new Blob([artifact.htmlContent], { type: "text/html" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `${artifact.name.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.html`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      toast.success("Artifact downloaded successfully")
    } catch (error) {
      console.error("Download error:", error)
      toast.error("Failed to download artifact")
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
              {/* Download Button */}
              <Button
                onClick={handleDownload}
                variant="outline"
                size="icon"
                className="flex-shrink-0"
              >
                <Download className="h-4 w-4" />
              </Button>

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
                sandbox="allow-scripts allow-forms allow-popups allow-same-origin"
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

