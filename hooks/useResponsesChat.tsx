"use client"

import { useState, useCallback, useRef } from "react"

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ChatMessage {
    id: string
    role: 'user' | 'assistant'
    /** Plain text content for assistant messages */
    content: string
    /** Original parts (image, file, text) for user messages */
    parts?: any[]
}

export type ChatStatus = 'idle' | 'submitted' | 'streaming' | 'error'

interface SendMessageOptions {
    /** Plain text content */
    text?: string
    /** Multimodal parts (text, image, file) */
    parts?: any[]
}

interface UseResponsesChatOptions {
    api: string
    /** Extra body fields included on every request */
    getExtraBody?: () => Record<string, any>
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Replaces @ai-sdk/react's useChat for the Responses API stream format.
 *
 * The backend sends newline-delimited JSON Server-Sent Events:
 *   data: {"type":"text_delta","delta":"Hello"}\n\n
 *   data: {"type":"done"}\n\n
 *   data: {"type":"error","message":"..."}\n\n
 */
export function useResponsesChat({ api, getExtraBody }: UseResponsesChatOptions) {
    const [messages, setMessages] = useState<ChatMessage[]>([])
    const [status, setStatus] = useState<ChatStatus>('idle')
    const [error, setError] = useState<Error | null>(null)

    // Track whether we're still reading so abort works correctly
    const abortRef = useRef<AbortController | null>(null)

    const sendMessage = useCallback(async (options: SendMessageOptions) => {
        const { text, parts } = options

        // Build the user message to append
        const userMessage: ChatMessage = {
            id: `user-${Date.now()}`,
            role: 'user',
            content: text ?? (parts?.find((p: any) => p.type === 'text')?.text ?? ''),
            parts: parts ?? (text ? [{ type: 'text', text }] : []),
        }

        const nextMessages = [...messages, userMessage]
        setMessages(nextMessages)
        setStatus('submitted')
        setError(null)

        // Placeholder assistant message built up incrementally
        const assistantId = `assistant-${Date.now()}`
        const assistantMessage: ChatMessage = {
            id: assistantId,
            role: 'assistant',
            content: '',
        }
        setMessages([...nextMessages, assistantMessage])

        // Abort any previous in-flight request
        if (abortRef.current) abortRef.current.abort()
        const controller = new AbortController()
        abortRef.current = controller

        try {
            const extraBody = getExtraBody?.() ?? {}
            const response = await fetch(api, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: nextMessages,
                    ...extraBody,
                }),
                signal: controller.signal,
            })

            if (!response.ok) {
                const err = await response.json().catch(() => ({ error: 'Request failed' }))
                throw new Error(err.error || `HTTP ${response.status}`)
            }

            if (!response.body) throw new Error('No response body')

            setStatus('streaming')

            const reader = response.body.getReader()
            const decoder = new TextDecoder()
            // SSE spec: events are separated by double newlines (\n\n)
            let buffer = ''
            let accumulated = ''

            while (true) {
                const { done, value } = await reader.read()
                if (done) break

                const textChunk = decoder.decode(value, { stream: true })
                console.log("[useResponsesChat] raw chunk:", textChunk)
                buffer += textChunk

                // Split on SSE event boundaries (double newline)
                let events = buffer.split('\n\n')
                // Keep the last (possibly incomplete) event in the buffer
                buffer = events.pop() ?? ''

                for (const event of events) {
                    console.log("[useResponsesChat] raw event string:", JSON.stringify(event));
                    // An SSE event can have multiple lines; find the data line(s)
                    const dataLine = event
                        .split('\n')
                        .find(line => line.startsWith('data: '))
                    if (!dataLine) continue

                    const payload = dataLine.slice(6).trim()
                    if (!payload) continue

                    try {
                        console.log("[useResponsesChat] trying to parse payload:", payload)
                        const parsed = JSON.parse(payload)
                        console.log("[useResponsesChat] parsed:", parsed)

                        if (parsed.type === 'text_delta') {
                            accumulated += parsed.delta
                            const snap = accumulated
                            setMessages(prev =>
                                prev.map(m =>
                                    m.id === assistantId ? { ...m, content: snap } : m
                                )
                            )
                        } else if (parsed.type === 'done') {
                            setStatus('idle')
                            return
                        } else if (parsed.type === 'error') {
                            throw new Error(parsed.message || 'Stream error')
                        }
                        // Ignore unknown event types (e.g. MCP lifecycle events)
                    } catch (e) {
                        console.error("[useResponsesChat] Error parsing event:", e, payload)
                        // Ignore malformed / non-JSON events
                    }
                }
            }

            setStatus('idle')
        } catch (err: any) {
            if (err.name === 'AbortError') {
                setStatus('idle')
                return
            }
            const e = err instanceof Error ? err : new Error(String(err))
            setError(e)
            setStatus('error')
            // Remove the empty assistant placeholder on error
            setMessages(prev => prev.filter(m => m.id !== assistantId))
        }
    }, [messages, api, getExtraBody])

    const stop = useCallback(() => {
        abortRef.current?.abort()
        setStatus('idle')
    }, [])

    return { messages, sendMessage, status, error, stop }
}
