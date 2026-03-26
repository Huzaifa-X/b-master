"use client"

import { Lightbulb } from "lucide-react"

interface ExplanationCardProps {
    content: string
}

export function ExplanationCard({ content }: ExplanationCardProps) {
    return (
        <div className="mt-3 rounded-xl border border-violet-200 dark:border-violet-800/50 bg-violet-50/40 dark:bg-violet-950/20 px-3 py-2.5">
            <div className="flex items-start gap-2">
                <Lightbulb className="h-3.5 w-3.5 text-violet-500 mt-0.5 shrink-0" />
                <p className="text-xs text-violet-700 dark:text-violet-300 leading-relaxed">
                    {content}
                </p>
            </div>
        </div>
    )
}