"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useArtifacts } from "@/hooks/useArtifact"
import { Loader2, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

interface SelectArtifactDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  assistantId: string
  onSelect: (artifact: { id: string; name: string; instructions: string; htmlContent: string }) => void
}

export function SelectArtifactDialog({
  open,
  onOpenChange,
  assistantId,
  onSelect,
}: SelectArtifactDialogProps) {
  const { artifacts, isLoading, isError } = useArtifacts(assistantId, {
    enabled: open && !!assistantId,
  })

  const handleSelect = (artifact: {
    id: string
    name: string
    instructions: string
    htmlContent: string
  }) => {
    onSelect(artifact)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Select an Artifact
          </DialogTitle>
          <DialogDescription>
            Choose an artifact to share in the chat. You can only see artifacts you have permission to access.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
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
                No artifacts available. Create an artifact first to use this feature.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {artifacts.map((artifact) => (
                <button
                  key={artifact.id}
                  onClick={() => {
                    handleSelect({
                      id: artifact.id,
                      name: artifact.name,
                      instructions: artifact.instructions || "",
                      htmlContent: artifact.htmlContent || "",
                    })
                  }}
                  className={cn(
                    "w-full text-left p-4 rounded-lg border transition-colors",
                    "hover:bg-muted hover:border-muted/50",
                    "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                  )}    
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-sm mb-1 truncate">
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
                    <Sparkles className="h-4 w-4 text-primary flex-shrink-0 mt-1" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}

