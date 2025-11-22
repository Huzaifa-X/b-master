"use client"

import { useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Check, Copy, RotateCcw, Edit } from "lucide-react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { LoadingSpinner } from "./loading-spinner"
import { FeedbackSection } from "./feedback-section"

interface GenerationResultSectionProps {
  generatedInstructions: string
  isLoading: boolean
  copied: boolean
  feedbackSent: boolean
  onCopyToClipboard: () => void
  onRegenerate: () => void
  onEditPrompt: (instructions: string) => void
  onFeedback: (isPositive: boolean) => void
}

export function GenerationResultSection({
  generatedInstructions,
  isLoading,
  copied,
  feedbackSent,
  onCopyToClipboard,
  onRegenerate,
  onEditPrompt,
  onFeedback
}: GenerationResultSectionProps) {
  const contentRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom of generated content
  useEffect(() => {
    if (contentRef.current && generatedInstructions) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight
    }
  }, [generatedInstructions])

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Generated Instructions</h3>

        {generatedInstructions && !isLoading && (
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={onCopyToClipboard}
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
              onClick={onRegenerate}
              className="h-8 w-8 p-0"
              title="Regenerate"
            >
              <RotateCcw className="w-4 h-4" />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEditPrompt(generatedInstructions)}
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
        {isLoading && !generatedInstructions && <LoadingSpinner />}

        {generatedInstructions && (
          <>
            <div className="prose prose-sm max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {generatedInstructions}
              </ReactMarkdown>
            </div>

            {!isLoading && (
              <FeedbackSection
                onFeedback={onFeedback}
                feedbackSent={feedbackSent}
              />
            )}
          </>
        )}
      </div>
    </div>
  )
}
