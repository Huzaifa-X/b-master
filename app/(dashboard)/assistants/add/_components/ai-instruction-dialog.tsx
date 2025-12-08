"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Cpu, AlertCircle } from "lucide-react"
import { AIInstructionDialogProps } from "@/types/ai-instruction"
import { generateAssistantInstructions } from "@/app/actions/assistant.action"
import { PromptInputSection } from "./prompt-input-section"
import { GenerationResultSection } from "./generation-result-section"
import { ActionButtons } from "./action-buttons"

export function AIInstructionDialog({ open, onOpenChange, onInsert }: AIInstructionDialogProps) {
    const [prompt, setPrompt] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [generatedInstructions, setGeneratedInstructions] = useState("")
    const [copied, setCopied] = useState(false)
    const [feedbackSent, setFeedbackSent] = useState(false)
    const [showTemplates, setShowTemplates] = useState(false)

    const handleGenerate = async () => {
        if (!prompt.trim()) return

        setIsLoading(true)
        setError(null)
        setGeneratedInstructions("")

        try {
            const result = await generateAssistantInstructions({
                prompt
            })

            if (result.success && result.instructions) {
                setGeneratedInstructions(result.instructions)
            } else {
                setError(result.error || 'Failed to generate instructions')
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to generate instructions')
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


    const useTemplatePrompt = (templatePrompt: string) => {
        setPrompt(templatePrompt)
        setShowTemplates(false)
    }

    const sendFeedback = (isPositive: boolean) => {
        // Here you could implement API call to send feedback
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
                            <DialogTitle>AI Assistant Instructions Generator</DialogTitle>
                            <DialogDescription>
                                Describe the type of assistant you want to create and let AI generate detailed instructions
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto space-y-4">
                    <PromptInputSection
                        prompt={prompt}
                        onPromptChange={setPrompt}
                        showTemplates={showTemplates}
                        onToggleTemplates={() => setShowTemplates(!showTemplates)}
                        onUseTemplate={(templatePrompt) => {
                            setPrompt(templatePrompt)
                            setShowTemplates(false)
                        }}
                    />

                    {/* Error display */}
                    {error && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    {(generatedInstructions || isLoading) && (
                        <GenerationResultSection
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
                        Cancel
                    </Button>

                    <ActionButtons
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
