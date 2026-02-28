"use client"

/**
 * hooks/useArtifactJobs.ts
 *
 * Tracks all in-progress artifact generation jobs for the current user across
 * the entire app � multiple hooks share a single poll loop.
 *
 * Features:
 * - Polls /api/artifacts/jobs/active every 2 s (running) / 15 s (idle)
 * - Listens for Pusher `artifact-job-update` for instant server-push
 * - Shows a toast on completion / failure
 * - Invalidates React-Query artifact caches so lists auto-refresh
 * - `triggerArtifactJobsRefresh()` � exported bare function; call it right
 *   after creating an artifact so the tray appears immediately
 */

import { useEffect, useRef, useCallback, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { usePusher } from "@/hooks/usePusher"
import { useSession } from "next-auth/react"

// -- Types ---------------------------------------------------------------------

export interface ArtifactJob {
  id: string
  artifactId: number
  artifactName: string | null
  assistantId: string
  category: string | null
  status: "pending" | "processing" | "completed" | "failed"
  progress: number
  error: string | null
  createdAt: string
  startedAt: string | null
  completedAt: string | null
}

// -- Module-level shared state -------------------------------------------------

type Subscriber = (jobs: ArtifactJob[]) => void

let _jobs: ArtifactJob[] = []
const _subscribers = new Set<Subscriber>()
let _pollTimer: ReturnType<typeof setTimeout> | null = null
let _pollActive = false

function broadcast() {
  const snapshot = [..._jobs]
  _subscribers.forEach((cb) => cb(snapshot))
}

function setGlobalJobs(next: ArtifactJob[]) {
  _jobs = next
  broadcast()
}

// -- Fetch helper --------------------------------------------------------------

async function fetchActiveJobs(): Promise<ArtifactJob[]> {
  try {
    const res = await fetch("/api/artifacts/jobs/active", { cache: "no-store" })
    if (!res.ok) return _jobs
    const data = await res.json()
    return (data.jobs ?? []) as ArtifactJob[]
  } catch {
    return _jobs
  }
}

// -- Module-level poll ---------------------------------------------------------

async function runPoll() {
  if (_pollActive) return
  _pollActive = true
  try {
    const fetched = await fetchActiveJobs()
    setGlobalJobs(fetched)
  } catch {
    // ignore � keep polling
  } finally {
    _pollActive = false
  }

  const hasRunning = _jobs.some(
    (j) => j.status === "pending" || j.status === "processing"
  )
  _pollTimer = setTimeout(runPoll, hasRunning ? 2000 : 15000)
}

function ensurePolling() {
  if (_pollTimer === null && !_pollActive) {
    runPoll()
  }
}

// -- Public standalone refresh -------------------------------------------------

/**
 * Call this anywhere after creating / enqueuing an artifact to force an
 * immediate poll so the jobs tray appears without waiting up to 15 seconds.
 */
export async function triggerArtifactJobsRefresh() {
  if (_pollTimer) {
    clearTimeout(_pollTimer)
    _pollTimer = null
  }
  await runPoll()
}

// -- Main hook -----------------------------------------------------------------

export function useArtifactJobs() {
  const queryClient = useQueryClient()
  const pusherClient = usePusher()
  const { data: session } = useSession()
  const userId = session?.user?.id

  const [jobs, setLocalJobs] = useState<ArtifactJob[]>([..._jobs])

  // Subscribe to global state for React re-renders
  useEffect(() => {
    const onUpdate: Subscriber = (next) => setLocalJobs(next)
    _subscribers.add(onUpdate)
    setLocalJobs([..._jobs])
    ensurePolling()
    return () => { _subscribers.delete(onUpdate) }
  }, [])

  // Track status transitions to show toasts exactly once per change
  const prevStatusRef = useRef<Map<string, string>>(new Map())

  const handleStatusTransitions = useCallback(
    (updatedJobs: ArtifactJob[]) => {
      updatedJobs.forEach((job) => {
        const prev = prevStatusRef.current.get(job.id)
        if (prev && prev !== job.status) {
          if (job.status === "completed") {
            toast.success(`"${job.artifactName ?? "Artifact"}" is ready!`, {
              description: "Your artifact finished generating.",
              action: {
                label: "View",
                onClick: () =>
                  queryClient.invalidateQueries({
                    queryKey: ["artifacts", job.assistantId],
                  }),
              },
              duration: 8000,
            })
            queryClient.invalidateQueries({ queryKey: ["artifacts", job.assistantId] })
            queryClient.invalidateQueries({
              queryKey: ["artifact", job.artifactId.toString()],
            })
          } else if (job.status === "failed") {
            toast.error(`"${job.artifactName ?? "Artifact"}" failed to generate`, {
              description: job.error ?? "An unexpected error occurred.",
              duration: 10000,
            })
          }
        }
        prevStatusRef.current.set(job.id, job.status)
      })
    },
    [queryClient]
  )

  // Second subscriber for toasts (separate from setLocalJobs to avoid closure staleness)
  useEffect(() => {
    const onUpdate: Subscriber = (next) => handleStatusTransitions(next)
    _subscribers.add(onUpdate)
    return () => { _subscribers.delete(onUpdate) }
  }, [handleStatusTransitions])

  // Pusher real-time push ? immediate re-poll
  useEffect(() => {
    if (!pusherClient || !userId) return

    const channelName = `private-user-${userId}`
    let ch = pusherClient.channel(channelName)
    if (!ch) ch = pusherClient.subscribe(channelName)

    const onJobUpdate = async () => {
      if (_pollTimer) { clearTimeout(_pollTimer); _pollTimer = null }
      await runPoll()
    }

    ch.bind("artifact-job-update", onJobUpdate)
    return () => { ch.unbind("artifact-job-update", onJobUpdate) }
  }, [pusherClient, userId])

  const activeJobs = jobs.filter((j) => j.status === "pending" || j.status === "processing")
  const recentlyCompleted = jobs.filter((j) => j.status === "completed" || j.status === "failed")

  return {
    activeJobs,
    recentlyCompleted,
    allJobs: jobs,
    refreshNow: triggerArtifactJobsRefresh,
  }
}
