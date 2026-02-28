"use client"

/**
 * components/artifacts/artifact-jobs-tray.tsx
 *
 * Floating bottom-right tray that shows all in-progress and recently-finished
 * artifact generation jobs. Expand / collapse with a single click.
 *
 * Only renders when there is something to show.
 */

import { useState, useEffect } from "react"
import { Loader2, CheckCircle2, XCircle, ChevronDown, ChevronUp, Zap, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { useArtifactJobs, type ArtifactJob } from "@/hooks/useArtifactJobs"

// ── Progress bar ──────────────────────────────────────────────────────────────
function ProgressBar({ value }: { value: number }) {
  return (
    <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
      <div
        className="h-full rounded-full bg-primary transition-all duration-500"
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  )
}

// ── Single Job Row ────────────────────────────────────────────────────────────
function JobRow({ job }: { job: ArtifactJob }) {
  const isRunning = job.status === "pending" || job.status === "processing"
  const isDone    = job.status === "completed"
  const isFailed  = job.status === "failed"

  const statusLabel =
    job.status === "pending"    ? "Queued"
    : job.status === "processing" ? `Generating… ${job.progress}%`
    : job.status === "completed"  ? "Done"
    : "Failed"

  return (
    <div className="flex flex-col gap-1 py-2.5 px-3 border-b last:border-b-0 border-border/50">
      {/* Name + status icon */}
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm font-medium leading-tight line-clamp-1 flex-1">
          {job.artifactName ?? "Artifact"}
        </span>
        {isRunning && (
          <Loader2 className="shrink-0 h-3.5 w-3.5 animate-spin text-primary mt-0.5" />
        )}
        {isDone && (
          <CheckCircle2 className="shrink-0 h-3.5 w-3.5 text-emerald-500 mt-0.5" />
        )}
        {isFailed && (
          <XCircle className="shrink-0 h-3.5 w-3.5 text-destructive mt-0.5" />
        )}
      </div>

      {/* Status text */}
      <p className={cn(
        "text-xs",
        isDone   ? "text-emerald-500"
        : isFailed ? "text-destructive"
        : "text-muted-foreground"
      )}>
        {statusLabel}
      </p>

      {/* Progress bar (only while running) */}
      {isRunning && <ProgressBar value={job.progress} />}

      {/* Error message */}
      {isFailed && job.error && (
        <p className="text-xs text-destructive/80 line-clamp-2 mt-0.5">{job.error}</p>
      )}
    </div>
  )
}

// ── Main tray ─────────────────────────────────────────────────────────────────
export function ArtifactJobsTray() {
  const { activeJobs, recentlyCompleted, allJobs } = useArtifactJobs()
  const [expanded,  setExpanded]  = useState(true)
  const [dismissed, setDismissed] = useState(false)

  const activeCount = activeJobs.length
  const totalCount  = allJobs.length

  // Auto-open when a new job appears
  useEffect(() => {
    if (activeCount > 0) {
      setDismissed(false)
      setExpanded(true)
    }
  }, [activeCount])

  // Nothing to show
  if (totalCount === 0 || dismissed) return null

  const headerLabel =
    activeCount > 0
      ? `${activeCount} artifact${activeCount !== 1 ? "s" : ""} generating…`
      : `${recentlyCompleted.length} artifact${recentlyCompleted.length !== 1 ? "s" : ""} finished`

  return (
    <div
      className={cn(
        "fixed bottom-4 right-4 z-50 w-80 rounded-xl border border-border bg-card shadow-2xl",
        "transition-all duration-200",
        expanded ? "max-h-[28rem]" : "max-h-12 overflow-hidden"
      )}
    >
      {/* Header row */}
      <div
        className="flex items-center justify-between gap-2 px-3 py-2.5 cursor-pointer select-none"
        onClick={() => setExpanded((v) => !v)}
      >
        {/* Left: icon + label */}
        <div className="flex items-center gap-2">
          {activeCount > 0 ? (
            <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />
          ) : (
            <Zap className="h-4 w-4 text-emerald-500 shrink-0" />
          )}
          <span className="text-sm font-semibold leading-none">{headerLabel}</span>

          {/* Active badge */}
          {activeCount > 0 && (
            <span className="inline-flex items-center justify-center rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground leading-none">
              {activeCount}
            </span>
          )}
        </div>

        {/* Right: expand toggle + dismiss */}
        <div className="flex items-center gap-1">
          {expanded
            ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            : <ChevronUp   className="h-3.5 w-3.5 text-muted-foreground" />
          }
          {activeCount === 0 && (
            <button
              onClick={(e) => { e.stopPropagation(); setDismissed(true) }}
              className="ml-1 rounded p-0.5 hover:bg-muted transition-colors"
              title="Dismiss"
            >
              <X className="h-3 w-3 text-muted-foreground" />
            </button>
          )}
        </div>
      </div>

      {/* Job list */}
      {expanded && (
        <div className="overflow-y-auto max-h-[22rem] divide-y divide-border/30">
          {/* Active jobs first */}
          {activeJobs.map((job) => (
            <JobRow key={job.id} job={job} />
          ))}

          {/* Recently completed */}
          {recentlyCompleted.map((job) => (
            <JobRow key={job.id} job={job} />
          ))}
        </div>
      )}
    </div>
  )
}
