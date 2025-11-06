"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ThumbsUp, ThumbsDown } from "lucide-react"

interface FeedbackSectionProps {
  onFeedback: (isPositive: boolean) => void
  feedbackSent: boolean
}

export function FeedbackSection({ onFeedback, feedbackSent }: FeedbackSectionProps) {
  return (
    <div className="mt-4 pt-4 border-t flex items-center justify-center gap-4">
      <span className="text-sm text-muted-foreground">Was this helpful?</span>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onFeedback(true)}
        disabled={feedbackSent}
        className="h-8 w-8 p-0"
        title="This was helpful"
      >
        <ThumbsUp className="w-4 h-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onFeedback(false)}
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
  )
}
