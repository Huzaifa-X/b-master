"use client"

import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Lightbulb } from "lucide-react"

interface ArtifactPromptInputSectionProps {
    prompt: string
    onPromptChange: (value: string) => void
}

export function ArtifactPromptInputSection({
    prompt,
    onPromptChange,
}: ArtifactPromptInputSectionProps) {
    return (
        <div className="space-y-3">
            <div>
                <Label htmlFor="artifact-prompt" className="text-base font-semibold">
                    What artifact do you want to create?
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                    Describe the artifact in detail, including its purpose, features, and functionality
                </p>
            </div>

            <Textarea
                id="artifact-prompt"
                placeholder="Example: Create an interactive expense tracker that allows users to add expenses with categories, dates, and amounts. Include a summary section showing total expenses by category with a pie chart visualization. Add filters for date ranges and export functionality to CSV."
                value={prompt}
                onChange={(e) => onPromptChange(e.target.value)}
                className="min-h-[150px] resize-none"
                rows={8}
            />

            {/* Tip Section */}
            <div className="flex gap-2 p-3 rounded-lg bg-muted/50 border border-muted">
                <Lightbulb className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <div className="text-sm text-muted-foreground">
                    <span className="font-semibold text-foreground">Tip:</span> Be specific about what you want to create. Include details about the type of artifact, data sources, visualizations, or functionality you need.
                </div>
            </div>
        </div>
    )
}

