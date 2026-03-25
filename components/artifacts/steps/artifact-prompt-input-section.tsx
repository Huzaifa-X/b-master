"use client"

import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Lightbulb } from "lucide-react"

interface ArtifactPromptInputSectionProps {
    prompt: string
    onPromptChange: (value: string) => void
}

import { useLocale } from "@/lib/i18n"

export function ArtifactPromptInputSection({
    prompt,
    onPromptChange,
}: ArtifactPromptInputSectionProps) {
    const { t } = useLocale()

    return (
        <div className="space-y-3">
            <div>
                <Label htmlFor="artifact-prompt" className="text-base font-semibold">
                    {t("artifacts.promptQuestion")}
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                    {t("artifacts.promptDescription")}
                </p>
            </div>

            <Textarea
                id="artifact-prompt"
                placeholder={t("artifacts.placeholders.promptExample")}
                value={prompt}
                onChange={(e) => onPromptChange(e.target.value)}
                className="min-h-[150px] resize-none"
                rows={8}
            />

            {/* Tip Section */}
            <div className="flex gap-2 p-3 rounded-lg bg-muted/50 border border-muted">
                <Lightbulb className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <div className="text-sm text-muted-foreground">
                    <span className="font-semibold text-foreground">{t("common.tip")}:</span> {t("artifacts.promptTip")}
                </div>
            </div>
        </div>
    )
}

