"use client"

import { Button } from "@/components/ui/button"
import { Sparkles, StopCircle } from "lucide-react"

interface ArtifactActionButtonsProps {
    isLoading: boolean
    hasInstructions: boolean
    canGenerate: boolean
    onStopGeneration: () => void
    onGenerate: () => void
    onInsert: () => void
}

export function ArtifactActionButtons({
    isLoading,
    hasInstructions,
    canGenerate,
    onStopGeneration,
    onGenerate,
    onInsert,
}: ArtifactActionButtonsProps) {
    if (isLoading) {
        return (
            <Button
                variant="destructive"
                onClick={onStopGeneration}
                className="gap-2"
            >
                <StopCircle className="h-4 w-4" />
                Stop Generation
            </Button>
        )
    }

    if (hasInstructions) {
        return (
            <Button onClick={onInsert} className="gap-2">
                <Sparkles className="h-4 w-4" />
                Insert Instructions
            </Button>
        )
    }

    return (
        <Button
            onClick={onGenerate}
            disabled={!canGenerate}
            className="gap-2"
        >
            <Sparkles className="h-4 w-4" />
            Generate Instructions
        </Button>
    )
}

