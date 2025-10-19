"use client"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
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
  if (!artifact) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-[98vw] sm:!max-w-[98vw] w-full h-[98vh] p-0 flex flex-col overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
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
          </div>
        </DialogHeader>

        {/* Full HTML Preview */}
        <div className="flex-1 overflow-hidden p-6">
          <div className="w-full h-full rounded-lg overflow-hidden border-2 bg-white dark:bg-neutral-950">
            <iframe
              srcDoc={artifact.htmlContent}
              className="w-full h-full border-0"
              title={artifact.name}
              sandbox="allow-scripts allow-forms allow-popups allow-same-origin"
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

