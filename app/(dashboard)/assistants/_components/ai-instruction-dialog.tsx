"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Spinner } from "@/components/ui/spinner"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Cpu, X, Send, Check, Copy, RotateCcw, Edit, Bookmark, ThumbsUp, ThumbsDown, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { PromptTemplate, AIInstructionDialogProps, GenerationMode } from "@/types/ai-instruction"
import { generateInstructions } from "@/actions/generate-instructions"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

const PROMPT_TEMPLATES: PromptTemplate[] = [
    {
        title: "Customer Service Bot",
        prompt: "Create instructions for a customer service assistant that helps with product inquiries, order tracking, and returns."
    },
    {
        title: "Knowledge Base Assistant",
        prompt: "Create instructions for an assistant that acts as a knowledge base for our company, answering FAQ and providing information about our products."
    },
    {
        title: "Sales Assistant",
        prompt: "Create instructions for a sales assistant that helps qualify leads, answer product questions, and guide users through the purchase process."
    },
    {
        title: "Technical Support",
        prompt: "Create instructions for a technical support assistant that troubleshoots common issues, provides step-by-step solutions, and escalates complex problems."
    },
    {
        title: "Coding Helper",
        prompt: "Create instructions for an assistant that helps developers with code snippets, debugging, and explaining programming concepts."
    }
]

export function AIInstructionDialog({ open, onOpenChange, onInsert }: AIInstructionDialogProps) {
    const [prompt, setPrompt] = useState("")
    const [generationMode, setGenerationMode] = useState<GenerationMode>('detailed')
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [generatedInstructions, setGeneratedInstructions] = useState("")
    const [copied, setCopied] = useState(false)
    const [feedbackSent, setFeedbackSent] = useState(false)
    const [showTemplates, setShowTemplates] = useState(false)

    const contentRef = useRef<HTMLDivElement>(null)



    // Auto-scroll to bottom of generated content
    useEffect(() => {
        if (contentRef.current && generatedInstructions) {
            contentRef.current.scrollTop = contentRef.current.scrollHeight
        }
    }, [generatedInstructions])

    const handleGenerate = async () => {
        if (!prompt.trim()) return

        setIsLoading(true)
        setError(null)
        setGeneratedInstructions("")

        try {
            const result = await generateInstructions({
                prompt,
                mode: generationMode
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
        setGenerationMode('detailed')
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
                    {/* Prompt section */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <label className="text-sm font-medium">
                                What type of assistant do you want to create?
                            </label>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowTemplates(!showTemplates)}
                                className="h-8"
                            >
                                <Bookmark className="w-4 h-4 mr-1" />
                                Templates
                            </Button>
                        </div>

                        {showTemplates && (
                            <div className="p-3 bg-muted/50 rounded-lg border max-h-40 overflow-y-auto">
                                <p className="text-sm font-medium mb-2">Choose a template:</p>
                                <div className="flex flex-wrap gap-2">
                                    {PROMPT_TEMPLATES.map((template, index) => (
                                        <Badge
                                            key={index}
                                            variant="outline"
                                            className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                                            onClick={() => useTemplatePrompt(template.prompt)}
                                        >
                                            {template.title}
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="relative">
                            <Textarea
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                placeholder="Describe the assistant you want to create..."
                                rows={10}
                                style={{ height: '150px' }}
                                className="resize-none overflow-y-auto"
                            />
                        </div>
                    </div>

                    {/* Error display */}
                    {error && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    {/* Generated content section */}
                    {(generatedInstructions || isLoading) && (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-medium">Generated Instructions</h3>

                                {generatedInstructions && !isLoading && (
                                    <div className="flex gap-1">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={copyToClipboard}
                                            className={cn(
                                                "h-8 w-8 p-0",
                                                copied && "bg-green-100 text-green-700 hover:bg-green-100"
                                            )}
                                            title={copied ? "Copied!" : "Copy to clipboard"}
                                        >
                                            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                        </Button>

                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={handleGenerate}
                                            className="h-8 w-8 p-0"
                                            title="Regenerate"
                                        >
                                            <RotateCcw className="w-4 h-4" />
                                        </Button>

                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setPrompt(generatedInstructions)}
                                            className="h-8 w-8 p-0"
                                            title="Edit in prompt"
                                        >
                                            <Edit className="w-4 h-4" />
                                        </Button>
                                    </div>
                                )}
                            </div>

                            <div
                                ref={contentRef}
                                className="border rounded-lg p-4 bg-muted/30 max-h-80 overflow-y-auto"
                            >
                                {isLoading && !generatedInstructions && (
                                    <div className="flex flex-col items-center justify-center py-8">
                                        <Spinner className="w-12 h-12 mb-4 text-primary" />
                                        <p className="text-sm text-muted-foreground font-medium">
                                            Generating instructions...
                                        </p>
                                    </div>
                                )}

                                {generatedInstructions && (
                                    <>
                                        <div className="prose prose-sm max-w-none">
                                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                {generatedInstructions}
                                            </ReactMarkdown>
                                        </div>

                                        {!isLoading && (
                                            <div className="mt-4 pt-4 border-t flex items-center justify-center gap-4">
                                                <span className="text-sm text-muted-foreground">Was this helpful?</span>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => sendFeedback(true)}
                                                    disabled={feedbackSent}
                                                    className="h-8 w-8 p-0"
                                                    title="This was helpful"
                                                >
                                                    <ThumbsUp className="w-4 h-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => sendFeedback(false)}
                                                    disabled={feedbackSent}
                                                    className="h-8 w-8 p-0"
                                                    title="This was not helpful"
                                                >
                                                    <ThumbsDown className="w-4 h-4" />
                                                </Button>
                                                {feedbackSent && (
                                                    <Badge variant="secondary" className="text-xs">
                                                        Thank you for your feedback
                                                    </Badge>
                                                )}
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter className="flex-shrink-0">
                    <Button variant="outline" onClick={handleClear}>
                        Cancel
                    </Button>

                    <div className="flex gap-2">
                        {isLoading ? (
                            <Button variant="destructive" onClick={handleStopGeneration}>
                                Stop Generation
                            </Button>
                        ) : (
                            <Button
                                onClick={handleGenerate}
                                disabled={!prompt.trim()}
                                className="gap-2"
                            >
                                <Cpu className="w-4 h-4" />
                                Generate
                            </Button>
                        )}

                        <Button
                            onClick={handleInsert}
                            disabled={!generatedInstructions || isLoading}
                            className="gap-2"
                        >
                            <Send className="w-4 h-4" />
                            Insert
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
