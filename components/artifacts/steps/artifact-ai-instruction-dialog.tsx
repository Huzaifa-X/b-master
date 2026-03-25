"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Cpu, AlertCircle } from "lucide-react"
import { ArtifactAIInstructionDialogProps } from "@/types/artifact-ai-instruction"
import { generateArtifactInstructions } from "@/app/actions/artifact.action"
import { ArtifactPromptInputSection } from "./artifact-prompt-input-section"
import { ArtifactGenerationResultSection } from "./artifact-generation-result-section"
import { ArtifactActionButtons } from "./artifact-action-buttons"

import { useLocale } from "@/lib/i18n"

export function ArtifactAIInstructionDialog({ open, onOpenChange, onInsert }: ArtifactAIInstructionDialogProps) {
    const [prompt, setPrompt] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [generatedInstructions, setGeneratedInstructions] = useState("")
    const [copied, setCopied] = useState(false)
    const [feedbackSent, setFeedbackSent] = useState(false)
    const { t } = useLocale()

    const handleGenerate = async () => {
        if (!prompt.trim()) return

        setIsLoading(true)
        setError(null)
        setGeneratedInstructions("")

        try {
            const result = await generateArtifactInstructions({
                prompt
            })

            if (result.success && result.instructions) {
                setGeneratedInstructions(result.instructions)
            } else {
                setError(result.error || t("artifacts.errors.failedToGenerateInstructions"))
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : t("artifacts.errors.failedToGenerateInstructions"))
        } finally {
            setIsLoading(false)
        }
    }

    const handleInsert = () => {
        if (generatedInstructions) {
            onInsert(generatedInstructions)
            handleClear()
        }
    }

    const handleClear = () => {
        setPrompt("")
        setGeneratedInstructions("")
        setError(null)
        setCopied(false)
        setFeedbackSent(false)
        onOpenChange(false)
    }

    const handleStopGeneration = () => {
        setIsLoading(false)
    }

    const copyToClipboard = async () => {
        if (generatedInstructions) {
            try {
                await navigator.clipboard.writeText(generatedInstructions)
                setCopied(true)
                setTimeout(() => setCopied(false), 2000)
            } catch (err) {
                console.error('Failed to copy to clipboard:', err)
            }
        }
    }

    const sendFeedback = (isPositive: boolean) => {
        console.log(`Feedback sent: ${isPositive ? 'positive' : 'negative'}`)
        setFeedbackSent(true)
        setTimeout(() => setFeedbackSent(false), 2000)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
                <DialogHeader className="flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center">
                            <Cpu className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <DialogTitle>{t("artifacts.aiGeneratorTitle")}</DialogTitle>
                            <DialogDescription>
                                {t("artifacts.aiGeneratorDescription")}
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto space-y-4">
                    <ArtifactPromptInputSection
                        prompt={prompt}
                        onPromptChange={setPrompt}
                    />

                    {/* Error display */}
                    {error && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    {(generatedInstructions || isLoading) && (
                        <ArtifactGenerationResultSection
                            generatedInstructions={generatedInstructions}
                            isLoading={isLoading}
                            copied={copied}
                            feedbackSent={feedbackSent}
                            onCopyToClipboard={copyToClipboard}
                            onRegenerate={handleGenerate}
                            onEditPrompt={setPrompt}
                            onFeedback={sendFeedback}
                        />
                    )}
                </div>

                <DialogFooter className="flex-shrink-0">
                    <Button variant="outline" onClick={handleClear}>
                        {t("common.cancel")}
                    </Button>

                    <ArtifactActionButtons
                        isLoading={isLoading}
                        hasInstructions={!!generatedInstructions}
                        canGenerate={!!prompt.trim()}
                        onStopGeneration={handleStopGeneration}
                        onGenerate={handleGenerate}
                        onInsert={handleInsert}
                    />
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

