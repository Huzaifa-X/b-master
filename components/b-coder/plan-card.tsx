"use client"

import { useState } from "react"
import { CheckCircle2, X, Edit3, Code2, Terminal, Layers, ChevronRight, Loader2 } from "lucide-react"
import type { BCoderPlan, PlanStep } from "@/hooks/useBCoderMultiAgent"

const stepTypeIcon: Record<PlanStep['type'], React.ReactNode> = {
    code: <Code2 className="h-3.5 w-3.5" />,
    shell: <Terminal className="h-3.5 w-3.5" />,
    mixed: <Layers className="h-3.5 w-3.5" />,
}

interface PlanCardProps {
    plan: BCoderPlan
    status: 'pending' | 'approved' | 'rejected'
    isImplementing?: boolean
    onApprove: () => void
    onReject: () => void
    onEdit: (newText: string) => void
}

export function PlanCard({ plan, status, isImplementing, onApprove, onReject, onEdit }: PlanCardProps) {
    const [isEditing, setIsEditing] = useState(false)
    const [editText, setEditText] = useState('')

    const isInteractable = status === 'pending' && !isImplementing

    const handleEdit = () => {
        if (editText.trim()) {
            onEdit(editText.trim())
            setIsEditing(false)
            setEditText('')
        }
    }

    const borderColor =
        status === 'approved' ? 'border-emerald-300 dark:border-emerald-700/60'
        : status === 'rejected' ? 'border-border'
        : 'border-blue-200 dark:border-blue-800/60'

    const bgColor =
        status === 'approved' ? 'bg-emerald-50/50 dark:bg-emerald-950/20'
        : status === 'rejected' ? 'bg-muted/20'
        : 'bg-blue-50/40 dark:bg-blue-950/20'

    const headerBg =
        status === 'approved' ? 'border-emerald-200 dark:border-emerald-800/50 bg-emerald-100/50 dark:bg-emerald-900/20'
        : status === 'rejected' ? 'border-border bg-muted/20'
        : 'border-blue-200 dark:border-blue-800/50 bg-blue-100/40 dark:bg-blue-900/20'

    const headerTextColor =
        status === 'approved' ? 'text-emerald-700 dark:text-emerald-300'
        : status === 'rejected' ? 'text-muted-foreground'
        : 'text-blue-700 dark:text-blue-300'

    const stepIconBg =
        status === 'approved' ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400'
        : status === 'rejected' ? 'bg-muted text-muted-foreground'
        : 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400'

    return (
        <div className={`rounded-2xl border overflow-hidden transition-all ${
            status === 'rejected' ? 'opacity-50' : ''
        } ${borderColor} ${bgColor}`}>

            {/* Header */}
            <div className={`px-4 py-2.5 border-b flex items-center gap-2 ${headerBg}`}>
                <Layers className={`h-4 w-4 shrink-0 ${headerTextColor}`} />
                <span className={`text-sm font-semibold flex-1 min-w-0 truncate ${headerTextColor}`}>
                    {plan.title}
                </span>
                {status === 'approved' && !isImplementing && (
                    <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium shrink-0">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Approved
                    </span>
                )}
                {status === 'approved' && isImplementing && (
                    <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium shrink-0">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Building
                    </span>
                )}
                {status === 'rejected' && (
                    <span className="text-xs text-muted-foreground shrink-0">Cancelled</span>
                )}
            </div>

            {/* Summary */}
            <div className="px-4 pt-3 pb-2">
                <p className="text-xs text-muted-foreground leading-relaxed">{plan.summary}</p>
            </div>

            {/* Steps */}
            {plan.steps.length > 0 && (
                <div className="px-4 pb-3 space-y-2">
                    {plan.steps.map((step) => (
                        <div key={step.id} className="flex items-start gap-2.5">
                            <div className={`mt-0.5 p-1 rounded-md shrink-0 ${stepIconBg}`}>
                                {stepTypeIcon[step.type] ?? stepTypeIcon.code}
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-xs font-medium text-foreground leading-tight">
                                    {step.title}
                                </p>
                                <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                                    {step.description}
                                </p>
                                {step.files && step.files.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-1.5">
                                        {step.files.map(f => (
                                            <span
                                                key={f}
                                                className="font-mono text-[10px] px-1.5 py-0.5 bg-background border border-border rounded text-muted-foreground"
                                            >
                                                {f}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Edit textarea */}
            {isEditing && (
                <div className="px-4 pb-3 pt-1 space-y-2 border-t border-blue-200 dark:border-blue-800/50">
                    <p className="text-xs text-muted-foreground">Describe what you'd like changed:</p>
                    <textarea
                        autoFocus
                        value={editText}
                        onChange={e => setEditText(e.target.value)}
                        placeholder="e.g. Also add a dark mode toggle, use TypeScript instead…"
                        className="w-full text-sm bg-background border border-border rounded-xl px-3 py-2 resize-none outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
                        rows={3}
                        onKeyDown={e => {
                            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleEdit()
                            if (e.key === 'Escape') setIsEditing(false)
                        }}
                    />
                    <div className="flex gap-2">
                        <button
                            onClick={handleEdit}
                            disabled={!editText.trim()}
                            className="flex-1 text-xs font-semibold py-1.5 px-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-lg transition-colors"
                        >
                            Replan
                        </button>
                        <button
                            onClick={() => { setIsEditing(false); setEditText('') }}
                            className="text-xs font-medium py-1.5 px-3 border border-border hover:bg-muted rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {/* Action buttons */}
            {isInteractable && !isEditing && (
                <div className="px-4 pb-4 pt-1 flex gap-2">
                    <button
                        onClick={onApprove}
                        className="flex-1 flex items-center justify-center gap-1.5 text-sm font-semibold py-2 px-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl transition-colors"
                    >
                        <ChevronRight className="h-4 w-4" />
                        Approve &amp; Build
                    </button>
                    <button
                        onClick={() => { setIsEditing(true); setEditText('') }}
                        title="Edit plan"
                        className="flex items-center justify-center gap-1.5 text-sm font-medium py-2 px-3 border border-border hover:bg-muted rounded-xl transition-colors"
                    >
                        <Edit3 className="h-4 w-4" />
                    </button>
                    <button
                        onClick={onReject}
                        title="Cancel"
                        className="flex items-center justify-center py-2 px-3 border border-border hover:bg-muted rounded-xl transition-colors text-muted-foreground hover:text-foreground"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
            )}
        </div>
    )
}
