"use client"

import { Button } from "@/components/ui/button"
import { Cpu, Send } from "lucide-react"

interface ActionButtonsProps {
  isLoading: boolean
  hasInstructions: boolean
  canGenerate: boolean
  onStopGeneration: () => void
  onGenerate: () => void
  onInsert: () => void
}

export function ActionButtons({
  isLoading,
  hasInstructions,
  canGenerate,
  onStopGeneration,
  onGenerate,
  onInsert
}: ActionButtonsProps) {
  return (
    <div className="flex gap-2">
      {isLoading ? (
        <Button variant="destructive" onClick={onStopGeneration}>
          Stop Generation
        </Button>
      ) : (
        <Button
          onClick={onGenerate}
          disabled={!canGenerate}
          className="gap-2"
        >
          <Cpu className="w-4 h-4" />
          Generate
        </Button>
      )}

      <Button
        onClick={onInsert}
        disabled={!hasInstructions || isLoading}
        className="gap-2"
      >
        <Send className="w-4 h-4" />
        Insert
      </Button>
    </div>
  )
}

