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

import { useLocale } from "@/lib/i18n"

export function ArtifactActionButtons({
    isLoading,
    hasInstructions,
    canGenerate,
    onStopGeneration,
    onGenerate,
    onInsert,
}: ArtifactActionButtonsProps) {
    const { t } = useLocale()

    if (isLoading) {
        return (
            <Button
                variant="destructive"
                onClick={onStopGeneration}
                className="gap-2"
            >
                <StopCircle className="h-4 w-4" />
                {t("artifacts.stopGeneration")}
            </Button>
        )
    }

    if (hasInstructions) {
        return (
            <Button onClick={onInsert} className="gap-2">
                <Sparkles className="h-4 w-4" />
                {t("artifacts.insertInstructions")}
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
            {t("artifacts.generateInstructionsAction")}
        </Button>
    )
}

