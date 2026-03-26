"use client"

import { useState } from "react"
import { Wand2, X, Loader2, CheckCircle2, MousePointer2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export interface SelectedElement {
    tag: string
    id: string | null
    classes: string
    text: string
    component: string | null
    outerHTML: string
}

interface VisualEditPanelProps {
    element: SelectedElement | null
    isLoading: boolean
    lastExplanation: string | null
    onApply: (changeRequest: string) => Promise<void>
    onClose: () => void
}

export function VisualEditPanel({
    element,
    isLoading,
    lastExplanation,
    onApply,
    onClose,
}: VisualEditPanelProps) {
    const [changeRequest, setChangeRequest] = useState("")

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!changeRequest.trim() || isLoading || !element) return
        await onApply(changeRequest.trim())
        setChangeRequest("")
    }

    const elementLabel = element ? (element.component || element.tag) : "element"
    const firstClass = element?.classes?.trim().split(/\s+/)[0] ?? ""
    const chipLabel = elementLabel + (firstClass ? "." + firstClass : "")

    return (
        <div className="absolute bottom-0 left-0 right-0 z-30 border-t border-violet-200 dark:border-violet-800/60 bg-background/98 backdrop-blur-sm shadow-2xl">
            <div className="px-3 pt-2.5 pb-3 space-y-2.5">

                {/* Header row */}
                <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                        <div className="h-1.5 w-1.5 bg-violet-500 rounded-full animate-pulse shrink-0" />
                        <span className="text-[10px] font-bold text-violet-600 dark:text-violet-400 uppercase tracking-widest shrink-0">
                            Visual Edit
                        </span>
                        {element ? (
                            <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-violet-50 dark:bg-violet-950/40 border border-violet-200/60 dark:border-violet-800/40 min-w-0">
                                <Wand2 className="h-2.5 w-2.5 text-violet-500 shrink-0" />
                                <span className="text-[10px] font-mono text-violet-700 dark:text-violet-300 truncate max-w-[200px]">
                                    {chipLabel}
                                </span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/70">
                                <MousePointer2 className="h-3 w-3" />
                                Hover and click any element
                            </div>
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 rounded-lg hover:bg-violet-100 dark:hover:bg-violet-900/30 transition-colors shrink-0"
                        aria-label="Exit Visual Edit"
                    >
                        <X className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                </div>

                {/* Last explanation (shown after a successful edit) */}
                {lastExplanation && !isLoading && (
                    <div className="flex items-start gap-1.5 text-[11px] text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-2.5 py-1.5 rounded-lg border border-emerald-200/60 dark:border-emerald-800/40">
                        <CheckCircle2 className="h-3 w-3 shrink-0 mt-0.5" />
                        {lastExplanation}
                    </div>
                )}

                {/* Change input */}
                <form onSubmit={handleSubmit} className="flex items-center gap-2">
                    <input
                        type="text"
                        value={changeRequest}
                        onChange={e => setChangeRequest(e.target.value)}
                        placeholder={element
                            ? `What would you like to change about this ${elementLabel}?`
                            : "Click an element above to select it..."}
                        className={cn(
                            "flex-1 h-8 px-3 text-xs rounded-lg border bg-background",
                            "focus:outline-none focus:ring-2 focus:ring-violet-400/60 dark:focus:ring-violet-600/60",
                            "placeholder:text-muted-foreground/50",
                            "border-violet-200 dark:border-violet-800/50",
                            "transition-all"
                        )}
                        disabled={isLoading || !element}
                        autoFocus={!!element}
                    />
                    <Button
                        type="submit"
                        size="sm"
                        disabled={!changeRequest.trim() || isLoading || !element}
                        className="h-8 px-3 text-xs gap-1.5 bg-violet-600 hover:bg-violet-700 text-white shrink-0 shadow-sm"
                    >
                        {isLoading ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                            <Wand2 className="h-3.5 w-3.5" />
                        )}
                        {isLoading ? "Applying..." : "Apply"}
                    </Button>
                </form>

                {/* Hint */}
                <p className="text-[9px] text-muted-foreground/40 leading-tight">
                    Changes go directly to source code. Vite hot-reloads the preview instantly.
                </p>
            </div>
        </div>
    )
}
