"use client"

import { useState } from "react"
import { Bug, Wrench, X, Loader2, CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface BugAlertCardProps {
    errorSummary?: string
    errorOutput: string
    status: 'pending' | 'fixing' | 'fixed' | 'dismissed'
    onFix: () => void
    onDismiss: () => void
}

export function BugAlertCard({ errorSummary, errorOutput, status, onFix, onDismiss }: BugAlertCardProps) {
    const [showDetails, setShowDetails] = useState(false)

    if (status === 'dismissed') return null

    const isFixed = status === 'fixed'
    const isFixing = status === 'fixing'

    return (
        <div className={cn(
            "rounded-xl border overflow-hidden transition-colors",
            isFixed
                ? "border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/40 dark:bg-emerald-950/20"
                : "border-red-200 dark:border-red-800/60 bg-red-50/40 dark:bg-red-950/20"
        )}>
            {/* Header */}
            <div className="flex items-center gap-2 px-3 py-2.5">
                {isFixed ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                ) : isFixing ? (
                    <Loader2 className="h-4 w-4 animate-spin text-red-500 shrink-0" />
                ) : (
                    <Bug className="h-4 w-4 text-red-500 shrink-0" />
                )}
                <span className={cn(
                    "text-xs font-semibold flex-1 truncate",
                    isFixed ? "text-emerald-700 dark:text-emerald-300" : "text-red-700 dark:text-red-300"
                )}>
                    {isFixed
                        ? "Bug fixed!"
                        : isFixing
                            ? `Fixing: ${errorSummary || 'Applying fix...'}`
                            : `I spotted a bug: ${errorSummary || 'Can I fix it?'}`}
                </span>
                {status === 'pending' && (
                    <button
                        onClick={onDismiss}
                        className="p-0.5 rounded hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors shrink-0"
                        aria-label="Dismiss"
                    >
                        <X className="h-3.5 w-3.5 text-red-400" />
                    </button>
                )}
            </div>

            {/* Actions */}
            {status === 'pending' && (
                <div className="px-3 pb-3 space-y-2">
                    {errorOutput && (
                        <button
                            onClick={() => setShowDetails(v => !v)}
                            className="text-[10px] text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 underline underline-offset-2"
                        >
                            {showDetails ? 'Hide error details' : 'Show error details'}
                        </button>
                    )}
                    {showDetails && (
                        <pre className="text-[10px] bg-red-950/10 dark:bg-red-950/40 p-2 rounded-lg overflow-x-auto text-red-700 dark:text-red-300 max-h-28 whitespace-pre-wrap break-all leading-relaxed">
                            {errorOutput.slice(0, 600)}
                        </pre>
                    )}
                    <div className="flex items-center gap-2 pt-0.5">
                        <Button
                            size="sm"
                            className="h-7 text-xs bg-red-500 hover:bg-red-600 text-white gap-1.5"
                            onClick={onFix}
                        >
                            <Wrench className="h-3 w-3" />
                            Fix it for me
                        </Button>
                        <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs text-red-500 hover:text-red-600 dark:text-red-400"
                            onClick={onDismiss}
                        >
                            Not now
                        </Button>
                    </div>
                </div>
            )}
        </div>
    )
}