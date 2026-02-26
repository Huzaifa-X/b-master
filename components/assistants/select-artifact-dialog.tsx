"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useArtifacts } from "@/hooks/useArtifact"
import { Loader2, Sparkles, Check } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export type ArtifactData = {
  id: string
  name: string
  instructions: string
  htmlContent: string
}

interface SelectArtifactDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  assistantId: string
  /** IDs already attached — pre-checked when the dialog opens */
  initialSelectedIds?: string[]
  onConfirm: (artifacts: ArtifactData[]) => void
}

export function SelectArtifactDialog({
  open,
  onOpenChange,
  assistantId,
  initialSelectedIds = [],
  onConfirm,
}: SelectArtifactDialogProps) {
  const { artifacts, isLoading, isError } = useArtifacts(assistantId, {
    enabled: open && !!assistantId,
  })

  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    new Set(initialSelectedIds)
  )

  // Sync pre-selection whenever the dialog opens
  useEffect(() => {
    if (open) setSelectedIds(new Set(initialSelectedIds))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const toggleArtifact = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleConfirm = () => {
    const selected = artifacts
      .filter((a) => selectedIds.has(a.id))
      .map((a) => ({
        id: a.id,
        name: a.name,
        instructions: a.instructions || "",
        htmlContent: a.htmlContent || "",
      }))
    onConfirm(selected)
    onOpenChange(false)
  }

  const count = selectedIds.size

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Select Artifacts
          </DialogTitle>
          <DialogDescription className="flex items-center gap-2">
            Choose one or more artifacts to include in this chat.
            {count > 0 && (
              <Badge variant="secondary" className="ml-1">
                {count} selected
              </Badge>
            )}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[60vh] pr-4 -mx-4 px-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : isError ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-sm text-muted-foreground">
                Failed to load artifacts. Please try again.
              </p>
            </div>
          ) : artifacts.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-sm text-muted-foreground">
                No artifacts available. Create an artifact first to use this
                feature.
              </p>
            </div>
          ) : (
            <div className="space-y-3 pb-6">
              {artifacts.filter(a => a.category !== "Deployed Project" && a.category !== "video_generation").map((artifact) => {
                const isSelected = selectedIds.has(artifact.id)
                return (
                  <button
                    key={artifact.id}
                    onClick={() => toggleArtifact(artifact.id)}
                    className={cn(
                      "w-full text-left p-4 rounded-lg border transition-colors relative z-10",
                      "hover:bg-muted hover:border-muted/50",
                      isSelected && "border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20",
                      !isSelected && "bg-card shadow-sm"
                    )}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex gap-3 min-w-0 flex-1">
                        <Sparkles className={cn(
                          "h-4 w-4 flex-shrink-0 mt-1",
                          isSelected ? "text-primary" : "text-muted-foreground/60"
                        )} />
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-sm mb-1 truncate flex items-center gap-2">
                            {artifact.name}
                          </h3>
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {artifact.category}
                          </p>
                          {artifact.creator && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Created by {artifact.creator.name}
                            </p>
                          )}
                        </div>
                      </div>
                      <div
                        className={cn(
                          "h-5 w-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all",
                          isSelected
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-muted-foreground/40 bg-background"
                        )}
                      >
                        {isSelected && <Check className="h-3 w-3" />}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </ScrollArea>

        <DialogFooter className="flex-shrink-0 gap-4 sm:gap-2 pt-2 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={count === 0} className="gap-2">
            <Sparkles className="h-4 w-4" />
            Attach {count > 0 ? `${count} ` : ""}Artifact{count !== 1 ? "s" : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

