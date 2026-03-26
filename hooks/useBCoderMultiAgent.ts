"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import type { BCoderPlan } from "@/app/api/b-coder/plan/route"
import { saveChatHistory, loadChatHistory, clearChatHistory } from "@/lib/bcoder-storage"

export type { BCoderPlan }
export type { PlanStep } from "@/app/api/b-coder/plan/route"

export type MultiAgentPhase = 'idle' | 'planning' | 'awaiting_approval' | 'implementing'
export type MultiAgentStatus = 'idle' | 'submitted' | 'streaming' | 'error'

export type DisplayMessage =
    | { kind: 'user'; id: string; text: string; parts?: any[] }
    | { kind: 'plan'; id: string; plan: BCoderPlan; status: 'pending' | 'approved' | 'rejected'; originalText: string; originalParts?: any[] }
    | { kind: 'assistant'; id: string; content: string }
    | { kind: 'explanation'; id: string; content: string }
    | { kind: 'bug_alert'; id: string; errorOutput: string; errorSummary?: string; status: 'pending' | 'fixing' | 'fixed' | 'dismissed' }
    | { kind: 'site_answer'; id: string; content: string }

interface UseBCoderMultiAgentOptions {
    planApi: string
    implementApi: string
    explainApi: string
    bugfixApi: string
    askApi: string
    storageKey?: string
    getExtraBody: () => Record<string, any>
}

export function useBCoderMultiAgent({
    planApi,
    implementApi,
    explainApi,
    bugfixApi,
    askApi,
    storageKey,
    getExtraBody,
}: UseBCoderMultiAgentOptions) {
    const [displayMessages, setDisplayMessages] = useState<DisplayMessage[]>([])
    const [phase, setPhase] = useState<MultiAgentPhase>('idle')
    const [status, setStatus] = useState<MultiAgentStatus>('idle')
    const [error, setError] = useState<Error | null>(null)

    const abortRef = useRef<AbortController | null>(null)
    // Keep a ref to displayMessages so async callbacks always read latest
    const displayMessagesRef = useRef<DisplayMessage[]>([])
    displayMessagesRef.current = displayMessages

    // Track whether we've loaded from storage (avoids overwriting on first save)
    const storageLoadedRef = useRef(false)
    const saveTimerRef = useRef<NodeJS.Timeout | null>(null)

    // ── Persistence: load on mount ──────────────────────────────────────────
    useEffect(() => {
        if (storageLoadedRef.current || !storageKey) return
        storageLoadedRef.current = true
        const saved = loadChatHistory(storageKey)
        if (saved && saved.length > 0) {
            setDisplayMessages(saved as DisplayMessage[])
        }
    }, [storageKey])

    // ── Persistence: save on every messages change (debounced 800ms) ────────
    useEffect(() => {
        if (!storageKey || !storageLoadedRef.current) return
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
        saveTimerRef.current = setTimeout(() => {
            saveChatHistory(storageKey, displayMessages)
        }, 800)
        return () => {
            if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
        }
    }, [storageKey, displayMessages])

    // ── Helpers ──────────────────────────────────────────────────────────────

    /** Convert displayMessages (only user+assistant kinds) → API messages array */
    const toApiMessages = useCallback((msgs: DisplayMessage[]) =>
        msgs
            .filter((m): m is Extract<DisplayMessage, { kind: 'user' | 'assistant' }> =>
                m.kind === 'user' || m.kind === 'assistant'
            )
            .map(m => {
                if (m.kind === 'user') {
                    return m.parts && m.parts.length > 0
                        ? { role: 'user', parts: m.parts, content: m.text }
                        : { role: 'user', content: m.text }
                }
                return { role: 'assistant', content: m.content }
            })
            .filter(m => m.content?.trim())
    , [])

    const updatePlanStatus = useCallback((planId: string, newStatus: 'approved' | 'rejected') => {
        setDisplayMessages(prev =>
            prev.map(m => m.kind === 'plan' && m.id === planId ? { ...m, status: newStatus } : m)
        )
    }, [])

    const updateAssistantContent = useCallback((assistantId: string, content: string) => {
        setDisplayMessages(prev =>
            prev.map(m => m.kind === 'assistant' && m.id === assistantId ? { ...m, content } : m)
        )
    }, [])

    // ── Explanation ───────────────────────────────────────────────────────────
    /** Extract file paths from boltAction tags in accumulated assistant content */
    const extractChangedFiles = (content: string): string[] => {
        const matches = [...content.matchAll(/<boltAction[^>]*type="file"[^>]*filePath="([^"]+)"[^>]*/g)]
        return [...new Set(matches.map(m => m[1]))]
    }

    const runExplanation = useCallback(async (plan: BCoderPlan, assistantId: string): Promise<string | null> => {
        try {
            const msgs = displayMessagesRef.current
            const assistantMsg = msgs.find(m => m.kind === 'assistant' && m.id === assistantId)
            const fileChanges = assistantMsg?.kind === 'assistant'
                ? extractChangedFiles(assistantMsg.content)
                : []

            const res = await fetch(explainApi, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ plan, fileChanges }),
            })
            if (!res.ok) return null
            const data = await res.json()
            return (data.explanation as string) || null
        } catch {
            return null
        }
    }, [explainApi, displayMessagesRef])

    // ── Planner ───────────────────────────────────────────────────────────────

    const runPlanning = useCallback(async (
        allMessages: any[],
    ): Promise<BCoderPlan | null> => {
        try {
            const extraBody = getExtraBody()
            const res = await fetch(planApi, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messages: allMessages, ...extraBody }),
            })
            if (!res.ok) throw new Error(`Plan request failed: ${res.status}`)
            const data = await res.json()
            return data.plan as BCoderPlan
        } catch (err) {
            console.error('[useBCoderMultiAgent] Planning failed:', err)
            return null
        }
    }, [planApi, getExtraBody])

    // ── Implementer ──────────────────────────────────────────────────────────

    const runImplementation = useCallback(async (
        apiMessages: any[],
        plan: BCoderPlan,
        assistantId: string,
        onDelta: (delta: string, accumulated: string) => void,
    ) => {
        if (abortRef.current) abortRef.current.abort()
        const controller = new AbortController()
        abortRef.current = controller

        try {
            const extraBody = getExtraBody()
            setStatus('submitted')

            const res = await fetch(implementApi, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: apiMessages,
                    plan,
                    ...extraBody,
                }),
                signal: controller.signal,
            })

            if (!res.ok) {
                const err = await res.json().catch(() => ({ error: 'Request failed' }))
                throw new Error(err.error || `HTTP ${res.status}`)
            }
            if (!res.body) throw new Error('No response body')

            setStatus('streaming')

            const reader = res.body.getReader()
            const decoder = new TextDecoder()
            let buffer = ''
            let accumulated = ''

            while (true) {
                const { done, value } = await reader.read()
                if (done) break
                buffer += decoder.decode(value, { stream: true })

                const events = buffer.split('\n\n')
                buffer = events.pop() ?? ''

                for (const event of events) {
                    const dataLine = event.split('\n').find(l => l.startsWith('data: '))
                    if (!dataLine) continue
                    const payload = dataLine.slice(6).trim()
                    if (!payload) continue

                    try {
                        const parsed = JSON.parse(payload)
                        if (parsed.type === 'text_delta') {
                            accumulated += parsed.delta
                            onDelta(parsed.delta, accumulated)
                            updateAssistantContent(assistantId, accumulated)
                        } else if (parsed.type === 'done') {
                            setStatus('idle')
                            return
                        } else if (parsed.type === 'error') {
                            throw new Error(parsed.message || 'Stream error')
                        }
                    } catch {
                        // ignore individual parse failures
                    }
                }
            }
            setStatus('idle')
        } catch (err: any) {
            if (err.name === 'AbortError') { setStatus('idle'); return }
            const e = err instanceof Error ? err : new Error(String(err))
            setError(e)
            setStatus('error')
            setDisplayMessages(prev => prev.filter(m => !(m.kind === 'assistant' && m.id === assistantId)))
        }
    }, [implementApi, getExtraBody, updateAssistantContent])

    // ── Site Q&A ─────────────────────────────────────────────────────────────

    const runAskQuery = useCallback(async (
        apiMessages: any[],
        answerId: string,
    ) => {
        if (abortRef.current) abortRef.current.abort()
        const controller = new AbortController()
        abortRef.current = controller

        try {
            const extraBody = getExtraBody()
            setStatus('submitted')

            const res = await fetch(askApi, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messages: apiMessages, ...extraBody }),
                signal: controller.signal,
            })

            if (!res.ok) {
                const err = await res.json().catch(() => ({ error: 'Request failed' }))
                throw new Error(err.error || `HTTP ${res.status}`)
            }
            if (!res.body) throw new Error('No response body')

            setStatus('streaming')

            const reader = res.body.getReader()
            const decoder = new TextDecoder()
            let buffer = ''
            let accumulated = ''

            while (true) {
                const { done, value } = await reader.read()
                if (done) break
                buffer += decoder.decode(value, { stream: true })

                const events = buffer.split('\n\n')
                buffer = events.pop() ?? ''

                for (const event of events) {
                    const dataLine = event.split('\n').find(l => l.startsWith('data: '))
                    if (!dataLine) continue
                    const payload = dataLine.slice(6).trim()
                    if (!payload) continue

                    try {
                        const parsed = JSON.parse(payload)
                        if (parsed.type === 'text_delta') {
                            accumulated += parsed.delta
                            setDisplayMessages(prev =>
                                prev.map(m => m.kind === 'site_answer' && m.id === answerId
                                    ? { ...m, content: accumulated } : m)
                            )
                        } else if (parsed.type === 'done') {
                            setStatus('idle')
                            return
                        } else if (parsed.type === 'error') {
                            throw new Error(parsed.message || 'Stream error')
                        }
                    } catch {
                        // ignore individual parse failures
                    }
                }
            }
            setStatus('idle')
        } catch (err: any) {
            if (err.name === 'AbortError') { setStatus('idle'); return }
            const e = err instanceof Error ? err : new Error(String(err))
            setError(e)
            setStatus('error')
            setDisplayMessages(prev => prev.filter(m => !(m.kind === 'site_answer' && m.id === answerId)))
        }
    }, [askApi, getExtraBody])

    const submitUserMessage = useCallback(async (text: string, parts?: any[]) => {
        if (phase !== 'idle') return
        setError(null)

        const userId = `user-${Date.now()}`
        const userMsg: DisplayMessage = { kind: 'user', id: userId, text, parts }

        setDisplayMessages(prev => [...prev, userMsg])
        setPhase('planning')

        const allMsgs = toApiMessages([...displayMessagesRef.current, userMsg])

        // ── Step 1: Plan ──────────────────────────────────────────────────────
        const plan = await runPlanning(allMsgs)

        if (!plan) {
            setPhase('idle')
            const errId = `assistant-err-${Date.now()}`
            setDisplayMessages(prev => [
                ...prev,
                { kind: 'assistant', id: errId, content: 'Sorry, I had trouble planning your request. Please try again.' },
            ])
            return
        }

        // ── Direct response (greeting / question) — skip plan card ─────────
        if (plan.directResponse && plan.steps.length === 0) {
            setDisplayMessages(prev => [
                ...prev,
                { kind: 'assistant', id: `assistant-${Date.now()}`, content: plan.directResponse! },
            ])
            setPhase('idle')
            return
        }

        // ── Site Q&A — analyze project files and stream an answer, no plan card ──
        if (plan.siteQuestion) {
            const answerId = `site-answer-${Date.now()}`
            setDisplayMessages(prev => [
                ...prev,
                { kind: 'site_answer', id: answerId, content: '' },
            ])
            setPhase('implementing')
            await runAskQuery(allMsgs, answerId)
            setPhase('idle')
            return
        }

        // ── Step 2: Show plan card, wait for user approval ────────────────
        const planMsgId = `plan-${Date.now()}`
        setDisplayMessages(prev => [
            ...prev,
            { kind: 'plan', id: planMsgId, plan, status: 'pending', originalText: text, originalParts: parts },
        ])
        setPhase('awaiting_approval')
    }, [phase, displayMessagesRef, toApiMessages, runPlanning, runAskQuery])

    const approvePlan = useCallback(async (planMessageId: string) => {
        const msgs = displayMessagesRef.current
        const planMsg = msgs.find(
            (m): m is Extract<DisplayMessage, { kind: 'plan' }> =>
                m.kind === 'plan' && m.id === planMessageId
        )
        if (!planMsg) return

        updatePlanStatus(planMessageId, 'approved')
        setPhase('implementing')

        // Add empty assistant placeholder that gets filled by streaming
        const assistantId = `assistant-${Date.now()}`
        setDisplayMessages(prev => [...prev, { kind: 'assistant', id: assistantId, content: '' }])

        // Build API messages (exclude plan cards, exclude empty trailing assistant)
        const apiMessages = toApiMessages(
            displayMessagesRef.current
                .map(m => m.kind === 'plan' && m.id === planMessageId ? { ...m, status: 'approved' as const } : m)
        ).filter(m => m.content?.trim())

        await runImplementation(apiMessages, planMsg.plan, assistantId, () => { })
        setPhase('idle')

        // Run explanation in background (non-blocking)
        void runExplanation(planMsg.plan, assistantId).then(explanation => {
            if (explanation) {
                setDisplayMessages(prev => [
                    ...prev,
                    { kind: 'explanation', id: `expl-${Date.now()}`, content: explanation },
                ])
            }
        })
    }, [displayMessagesRef, toApiMessages, updatePlanStatus, runImplementation, runExplanation])

    const rejectPlan = useCallback((planMessageId: string) => {
        updatePlanStatus(planMessageId, 'rejected')
        setPhase('idle')
    }, [updatePlanStatus])

    const reEditPlan = useCallback(async (planMessageId: string, newText: string) => {
        const msgs = displayMessagesRef.current
        const planMsg = msgs.find(
            (m): m is Extract<DisplayMessage, { kind: 'plan' }> =>
                m.kind === 'plan' && m.id === planMessageId
        )
        if (!planMsg) return

        // Mark old plan as rejected, add a new user edit message, and re-run planning
        updatePlanStatus(planMessageId, 'rejected')
        setPhase('planning')

        const newUserId = `user-edit-${Date.now()}`
        const newUserMsg: DisplayMessage = { kind: 'user', id: newUserId, text: newText }
        setDisplayMessages(prev => [...prev, newUserMsg])

        const allMsgs = toApiMessages([...displayMessagesRef.current, newUserMsg])
        const plan = await runPlanning(allMsgs)

        if (!plan) {
            setPhase('idle')
            return
        }

        if (plan.directResponse && plan.steps.length === 0) {
            setDisplayMessages(prev => [
                ...prev,
                { kind: 'assistant', id: `assistant-${Date.now()}`, content: plan.directResponse! },
            ])
            setPhase('idle')
            return
        }

        const newPlanMsgId = `plan-${Date.now()}`
        setDisplayMessages(prev => [
            ...prev,
            { kind: 'plan', id: newPlanMsgId, plan, status: 'pending', originalText: newText },
        ])
        setPhase('awaiting_approval')
    }, [displayMessagesRef, toApiMessages, updatePlanStatus, runPlanning])

    const stop = useCallback(() => {
        abortRef.current?.abort()
        setStatus('idle')
        if (phase === 'implementing') setPhase('idle')
    }, [phase])

    // ── Bug Fix Agent ─────────────────────────────────────────────────────────

    /** Called by b-coder-chat when WebContainer detects a runtime error */
    const reportBug = useCallback((errorOutput: string) => {
        if (phase !== 'idle') return
        const id = `bug-${Date.now()}`
        setDisplayMessages(prev => [
            ...prev,
            { kind: 'bug_alert', id, errorOutput, status: 'pending' },
        ])
    }, [phase])

    const dismissBugFix = useCallback((bugAlertId: string) => {
        setDisplayMessages(prev =>
            prev.map(m => m.kind === 'bug_alert' && m.id === bugAlertId
                ? { ...m, status: 'dismissed' as const } : m)
        )
    }, [])

    const approveBugFix = useCallback(async (bugAlertId: string) => {
        if (phase !== 'idle') return

        const msgs = displayMessagesRef.current
        const bugAlert = msgs.find(
            (m): m is Extract<DisplayMessage, { kind: 'bug_alert' }> =>
                m.kind === 'bug_alert' && m.id === bugAlertId
        )
        if (!bugAlert) return

        // Mark as fixing, block input
        setDisplayMessages(prev =>
            prev.map(m => m.kind === 'bug_alert' && m.id === bugAlertId
                ? { ...m, status: 'fixing' as const } : m)
        )
        setPhase('implementing')

        try {
            const extraBody = getExtraBody()

            // Analyze the bug and get a fix plan
            const res = await fetch(bugfixApi, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ errorOutput: bugAlert.errorOutput, ...extraBody }),
            })
            if (!res.ok) throw new Error('Bug analysis failed')
            const { errorSummary, plan } = await res.json() as { errorSummary: string; plan: BCoderPlan }

            // Update bug alert header with the actual summary
            setDisplayMessages(prev =>
                prev.map(m => m.kind === 'bug_alert' && m.id === bugAlertId
                    ? { ...m, errorSummary } : m)
            )

            // Add a synthetic user message for context continuity
            const userMsgId = `user-bugfix-${Date.now()}`
            const userMsg: DisplayMessage = { kind: 'user', id: userMsgId, text: `Fix the bug: ${errorSummary}` }
            setDisplayMessages(prev => [...prev, userMsg])

            // Add empty assistant placeholder for streaming
            const assistantId = `assistant-bugfix-${Date.now()}`
            setDisplayMessages(prev => [...prev, { kind: 'assistant', id: assistantId, content: '' }])

            // Build conversation context for implementer
            const apiMessages = toApiMessages(displayMessagesRef.current).filter(m => m.content?.trim())

            // Run implementation (streaming)
            await runImplementation(apiMessages, plan, assistantId, () => { })

            // Mark bug as fixed
            setDisplayMessages(prev =>
                prev.map(m => m.kind === 'bug_alert' && m.id === bugAlertId
                    ? { ...m, status: 'fixed' as const } : m)
            )

            // Run explanation in background
            void runExplanation(plan, assistantId).then(explanation => {
                if (explanation) {
                    setDisplayMessages(prev => [
                        ...prev,
                        { kind: 'explanation', id: `expl-${Date.now()}`, content: explanation },
                    ])
                }
            })
        } catch (err) {
            console.error('[approveBugFix] Failed:', err)
            // Revert to pending so user can try again
            setDisplayMessages(prev =>
                prev.map(m => m.kind === 'bug_alert' && m.id === bugAlertId
                    ? { ...m, status: 'pending' as const } : m)
            )
        } finally {
            setPhase('idle')
        }
    }, [phase, displayMessagesRef, getExtraBody, bugfixApi, toApiMessages, runImplementation, runExplanation])

    // ── Clear history ─────────────────────────────────────────────────────────
    const clearHistory = useCallback(() => {
        abortRef.current?.abort()
        setDisplayMessages([])
        setPhase('idle')
        setStatus('idle')
        setError(null)
        if (storageKey) clearChatHistory(storageKey)
    }, [storageKey])

    return {
        displayMessages,
        phase,
        status,
        error,
        submitUserMessage,
        approvePlan,
        rejectPlan,
        reEditPlan,
        stop,
        reportBug,
        dismissBugFix,
        approveBugFix,
        clearHistory,
    }
}
