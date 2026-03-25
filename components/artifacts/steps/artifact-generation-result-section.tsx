"use client"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Copy, RefreshCw, ThumbsUp, ThumbsDown, Check } from "lucide-react"
import { cn } from "@/lib/utils"

interface ArtifactGenerationResultSectionProps {
    generatedInstructions: string
    isLoading: boolean
    copied: boolean
    feedbackSent: boolean
    onCopyToClipboard: () => void
    onRegenerate: () => void
    onEditPrompt: (value: string) => void
    onFeedback: (isPositive: boolean) => void
}

import { useLocale } from "@/lib/i18n"

export function ArtifactGenerationResultSection({
    generatedInstructions,
    isLoading,
    copied,
    feedbackSent,
    onCopyToClipboard,
    onRegenerate,
    onFeedback,
}: ArtifactGenerationResultSectionProps) {
    const { t } = useLocale()

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <Label htmlFor="generated-instructions" className="text-base font-semibold">
                    {t("artifacts.generatedInstructions")}
                </Label>
                <div className="flex items-center gap-2">
                    {generatedInstructions && (
                        <>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={onCopyToClipboard}
                                className="h-8 gap-2"
                            >
                                {copied ? (
                                    <>
                                        <Check className="h-3.5 w-3.5" />
                                        <span className="text-xs">{t("common.copied")}</span>
                                    </>
                                ) : (
                                    <>
                                        <Copy className="h-3.5 w-3.5" />
                                        <span className="text-xs">{t("common.copy")}</span>
                                    </>
                                )}
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={onRegenerate}
                                className="h-8 gap-2"
                            >
                                <RefreshCw className="h-3.5 w-3.5" />
                                <span className="text-xs">{t("common.regenerate")}</span>
                            </Button>
                        </>
                    )}
                </div>
            </div>

            <div className="relative">
                <Textarea
                    id="generated-instructions"
                    value={generatedInstructions}
                    readOnly
                    className={cn(
                        "min-h-[250px] resize-none font-mono text-sm",
                        isLoading && "animate-pulse"
                    )}
                    placeholder={isLoading ? t("artifacts.generatingInstructions") : ""}
                    rows={12}
                />
                {isLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-background/50 rounded-md">
                        <div className="flex flex-col items-center gap-2">
                            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                            <p className="text-sm text-muted-foreground">{t("artifacts.generatingInstructions")}</p>
                        </div>
                    </div>
                )}
            </div>

            {generatedInstructions && !isLoading && (
                <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">{t("artifacts.wasHelpful")}</span>
                        <div className="flex gap-1">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onFeedback(true)}
                                disabled={feedbackSent}
                                className="h-8 w-8 p-0"
                            >
                                <ThumbsUp className={cn(
                                    "h-4 w-4",
                                    feedbackSent && "text-primary"
                                )} />
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onFeedback(false)}
                                disabled={feedbackSent}
                                className="h-8 w-8 p-0"
                            >
                                <ThumbsDown className="h-4 w-4" />
                            </Button>
                        </div>
                        {feedbackSent && (
                            <span className="text-xs text-muted-foreground ml-2">
                                {t("artifacts.feedbackThanks")}
                            </span>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}

