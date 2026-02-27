// hooks/useAIChat.ts
"use client"

/**
 * AI SDK Standard Pattern Implementation
 *
 * This hook follows the official Vercel AI SDK patterns:
 * 1. useChat manages message state via DefaultChatTransport
 * 2. Server saves messages to DB (not client)
 * 3. Custom fetch injects metadata into requests
 * 4. No manual message syncing needed - AI SDK handles state
 */

import { useState, useCallback, useRef, useEffect, useMemo } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport, type UIMessage } from "ai"
import {
    getSpecificChat,
    getChatMessages,
    cleanupChat,
} from "@/app/actions/chat.action"
import { Message, ChatContext, ChatType } from "@/types/chat"
import { toast } from "sonner"

export type ChatMode = "assistant" | "ask-b"

export interface UseAIChatOptions {
    mode: ChatMode
    assistantId?: string
    chatId: string
}

// Define custom message type matching AI SDK structure
export type AIChatMessage = UIMessage & {
    attachments?: { name: string; url: string; type: string; size: number }[]
}

// Message options for each request
interface MessageOptions {
    webSearch?: boolean
    research?: boolean
    chatWithAPI?: boolean
    dropbox?: boolean
    canvas?: boolean
    attachments?: { name: string; url: string; type: string; size: number }[]
    artifacts?: { id: string; name: string; instructions: string; htmlContent: string }[]
    mentionedUsers?: Array<{ id: string; name: string; email: string }>
    connectedApiIds?: string[]
}

export function useAIChat(options: UseAIChatOptions) {
    const { mode, assistantId, chatId } = options
    const queryClient = useQueryClient()

    const [context, setContext] = useState<ChatContext | null>(null)
    const [isInitializing, setIsInitializing] = useState(true)

    // Current message options - stored in ref for access in transport fetch
    const currentOptionsRef = useRef<MessageOptions>({})

    // Track pending attachments with the message content they belong to (for immediate UI display)
    // We use content matching since AI SDK generates message IDs internally
    const pendingAttachmentsRef = useRef<{
        messageContent: string
        attachments: { name: string; url: string; type: string; size: number }[]
    } | null>(null)

    // OAuth state
    const [oauthPrompt, setOAuthPrompt] = useState<{
        show: boolean
        authUrl: string
        assistantId: string
        message: string
    } | null>(null)

    // Track if initial cleanup has run
    const hasRunInitialCleanup = useRef(false)

    // Load specific chat
    const {
        data: chatData,
        isLoading: isLoadingChat,
        error: initError
    } = useQuery({
        queryKey: ["chat", chatId],
        queryFn: async () => {
            console.log("[useAIChat] Loading chat:", chatId)
            const result = await getSpecificChat(chatId)

            if (!result.success || !result.chat) {
                throw new Error(result.error || "Failed to load chat")
            }

            return result.chat
        },
        staleTime: 1000 * 60 * 5,
        retry: 2,
    })

    // Load initial messages from DB (for history on page load)
    const {
        data: initialDbMessages = [],
        isLoading: isLoadingMessages,
        refetch: refetchMessages
    } = useQuery({
        queryKey: ["chat-messages", chatId],
        queryFn: async () => {
            console.log("[useAIChat] Loading messages for chat:", chatId)

            // Only run cleanup on INITIAL load
            if (!hasRunInitialCleanup.current) {
                console.log("[useAIChat] Running initial cleanup...")
                try {
                    const cleanupResult = await cleanupChat(chatId, 2)
                    if (cleanupResult.success && cleanupResult.deleted > 0) {
                        console.log(`[useAIChat] Cleaned up ${cleanupResult.deleted} orphaned messages`)
                    }
                } catch (error) {
                    console.error("[useAIChat] Cleanup error (non-fatal):", error)
                }
                hasRunInitialCleanup.current = true
            }

            const result = await getChatMessages(chatId)

            if (!result.success) {
                console.error("[useAIChat] Error loading messages:", result.error)
                return []
            }

            return result.messages
        },
        enabled: !!chatId,
        staleTime: 1000 * 60 * 5, // Cache for 5 minutes - AI SDK manages live state
    })

    // Convert DB messages to AI SDK format for initial load
    const initialMessages = useMemo<AIChatMessage[]>(() => {
        return initialDbMessages.map((msg) => {
            let content = msg.content || ""

            // Add mentioned users to message context
            if (msg.role === "user" && msg.documents) {
                try {
                    const documentsData = JSON.parse(msg.documents)
                    if (documentsData.mentionedUsers?.length > 0) {
                        const mentionsList = documentsData.mentionedUsers
                            .map((u: { name: string; email: string }) => `${u.name} <${u.email}>`)
                            .join(', ')
                        content = `[This message mentions: ${mentionsList}]\n\n${content}`
                    }
                } catch (e) {
                    // Ignore parse errors
                }
            }

            // Extract reasoning from assistant messages
            let reasoning = ""
            if (msg.role === "assistant" && msg.documents) {
                try {
                    const documentsData = JSON.parse(msg.documents)
                    if (documentsData.reasoning) {
                        reasoning = documentsData.reasoning
                    }
                } catch (e) {
                    // Ignore parse errors
                }
            }

            // Extract attachments from any message
            let attachments: { name: string; url: string; type: string; size: number }[] = []
            if (msg.documents) {
                try {
                    const documentsData = JSON.parse(msg.documents)
                    if (documentsData.attachments) {
                        attachments = documentsData.attachments
                    }
                } catch (e) {
                    // Ignore parse errors
                }
            }

            const parts: any[] = [
                {
                    type: "text" as const,
                    text: content
                }
            ]

            // Add reasoning part if present (before text)
            if (reasoning) {
                parts.unshift({
                    type: "reasoning" as const,
                    text: reasoning
                })
            }

            const roleStr = msg.role as string

            return {
                id: msg.id.toString(),
                role: (roleStr === "system" ? "assistant" : msg.role) as "user" | "assistant",
                parts,
                attachments
            }
        })
    }, [initialDbMessages])

    // Initialize AI SDK useChat with DefaultChatTransport
    const {
        messages: aiMessages,
        sendMessage: aiSendMessage,
        status,
        stop: aiStop,
        setMessages,
    } = useChat<AIChatMessage>({
        transport: new DefaultChatTransport({
            api: '/api/chat',

            // Custom fetch to inject metadata into request body
            async fetch(input: string | URL | Request, init?: RequestInit): Promise<Response> {
                const opts = currentOptionsRef.current

                // Parse existing body
                let body: Record<string, unknown> = {}
                try {
                    body = JSON.parse(init?.body as string || '{}')
                } catch (e) {
                    console.error("[useAIChat] Error parsing request body:", e)
                }

                // Inject metadata
                const customBody = {
                    ...body,
                    chatId,
                    assistantId,
                    chatType: mode === "ask-b" ? "ASK_B" : "ASSISTANT",
                    webSearch: opts.webSearch || false,
                    research: opts.research || false,
                    chatWithAPI: opts.chatWithAPI || false,
                    dropbox: opts.dropbox || false,
                    canvas: opts.canvas || false,
                    attachments: opts.attachments || [],
                    artifacts: opts.artifacts || null,
                    mentionedUsers: opts.mentionedUsers || [],
                    connectedApiIds: opts.connectedApiIds || [],
                }

                const response = await fetch(input, {
                    ...init,
                    body: JSON.stringify(customBody)
                })

                // Check for OAuth requirement in JSON response
                if (response.ok) {
                    const contentType = response.headers.get('content-type')
                    if (contentType?.includes('application/json')) {
                        const clonedResponse = response.clone()
                        try {
                            const data = await clonedResponse.json()
                            if (data.type === 'oauth_required') {
                                console.log("[useAIChat] OAuth required:", data)
                                setOAuthPrompt({
                                    show: true,
                                    authUrl: data.authUrl,
                                    assistantId: data.assistantId,
                                    message: data.message
                                })
                                // Return empty response to avoid parsing errors
                                return new Response(null, { status: 200 })
                            }
                        } catch (e) {
                            // Not JSON or parsing failed, continue normally
                        }
                    }
                }

                return response
            }
        }),

        // Throttle UI updates for performance
        experimental_throttle: 50,

        onFinish: async () => {
            console.log("[useAIChat] Stream finished")

            // Clear current options and pending attachments
            currentOptionsRef.current = {}
            pendingAttachmentsRef.current = null

            // Refetch messages to sync with DB (for persistence)
            await refetchMessages()

            // Invalidate related queries
            const chatMode = mode === "ask-b" ? "ask-b" : "assistant"
            queryClient.invalidateQueries({
                queryKey: ["chat-history", chatMode, assistantId || undefined]
            })
            queryClient.invalidateQueries({
                queryKey: ["chat-header", chatId]
            })
        },

        onError: (error: Error) => {
            console.error("[useAIChat] Error:", error)
            toast.error(error.message || "Failed to send message")
        }
    })

    // Reset cleanup flag when chatId changes
    useEffect(() => {
        hasRunInitialCleanup.current = false
        currentOptionsRef.current = {}
        pendingAttachmentsRef.current = null
    }, [chatId])

    // Cleanup on unmount: stop active stream, clear messages and transient state
    // Uses refs to access latest versions without stale closures
    const aiStopRef = useRef(aiStop)
    const setMessagesRef = useRef(setMessages)
    useEffect(() => {
        aiStopRef.current = aiStop
        setMessagesRef.current = setMessages
    })
    useEffect(() => {
        return () => {
            console.log("[useAIChat] Unmounting - cleaning up session for chat:", chatId)
            aiStopRef.current()
            setMessagesRef.current([])
            currentOptionsRef.current = {}
            pendingAttachmentsRef.current = null
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // Set context when chat is ready
    useEffect(() => {
        if (chatData) {
            console.log("[useAIChat] Chat context set:", chatData)
            setContext({
                chatId: chatData.id,
                chatType: chatData.chatType as ChatType,
                assistantId: chatData.assistantId,
                assistantName: chatData.assistantName || "Assistant",
                assistantInstructions: chatData.assistantInstructions,
            })
            setIsInitializing(false)
        }
    }, [chatData])

    // Sync initial messages to AI SDK when they load
    useEffect(() => {
        if (initialMessages.length > 0 && aiMessages.length === 0 && !isLoadingMessages) {
            console.log("[useAIChat] Setting initial messages:", initialMessages.length)
            setMessages(initialMessages)
        }
    }, [initialMessages, aiMessages.length, isLoadingMessages, setMessages])

    // Auto-reply to orphaned user messages (e.g. from Welcome Page or reload)
    const lastAutoReplyIdRef = useRef<string | null>(null)

    useEffect(() => {
        if (isLoadingMessages || status === 'streaming' || status === 'submitted' || aiMessages.length === 0) return

        const lastMessage = aiMessages[aiMessages.length - 1]

        // If last message is from user, we need to generate a response
        if (lastMessage.role === 'user') {
            // Prevent infinite loops or double triggers
            if (lastAutoReplyIdRef.current === lastMessage.id) return

            console.log("[useAIChat] Found orphaned user message, triggering auto-reply:", lastMessage.id)
            lastAutoReplyIdRef.current = lastMessage.id

            // Try to restore options from the original DB message
            const dbMessage = initialDbMessages.find(m => m.id.toString() === lastMessage.id)
            if (dbMessage && dbMessage.documents) {
                try {
                    const documentsData = JSON.parse(dbMessage.documents)
                    if (documentsData.options) {
                        console.log("[useAIChat] Restoring options for auto-reply:", documentsData.options)
                        currentOptionsRef.current = {
                            ...documentsData.options,
                            attachments: documentsData.attachments,
                            mentionedUsers: documentsData.mentionedUsers,
                            connectedApiIds: documentsData.options.connectedApiIds || [],
                        }
                    }
                } catch (e) {
                    console.error("[useAIChat] Error parsing options for auto-reply:", e)
                }
            }

            // Manual reload implementation since 'reload' is missing from types
            // 1. Remove the orphaned message from UI state
            const newMessages = aiMessages.slice(0, -1)
            setMessages(newMessages)

            // 2. Resend the message content
            // Need to wait a tick for state to update? Usually append handles it, 
            // but since we just setMessages, safe to just append new one.
            const textContent = lastMessage.parts?.filter(p => p.type === 'text').map(p => p.text).join('') || (lastMessage as any).content || ''

            console.log("[useAIChat] Resending message content:", textContent)

            // We use setTimeout to ensure setMessages has processed
            setTimeout(() => {
                aiSendMessage({
                    text: textContent,
                })
            }, 0)
        }
    }, [aiMessages, isLoadingMessages, status, initialDbMessages, aiSendMessage, setMessages])

    // Send message - sets options then calls AI SDK sendMessage
    // Server handles saving user message to DB
    const sendMessage = useCallback(async (
        content: string,
        attachments?: { name: string; url: string; type: string; size: number }[],
        options?: {
            webSearch?: boolean
            research?: boolean
            chatWithAPI?: boolean
            dropbox?: boolean
            canvas?: boolean
            artifacts?: { id: string; name: string; instructions: string; htmlContent: string }[]
            mentionedUsers?: Array<{ id: string; name: string; email: string }>
            connectedApiIds?: string[]
        }
    ) => {
        const isStreaming = status === 'streaming' || status === 'submitted'
        if (!context || !content.trim() || isStreaming) {
            console.warn("[useAIChat] Cannot send message - not ready or already streaming")
            return
        }

        console.log("[useAIChat] Sending message via AI SDK")

        // Set options in ref for transport fetch to access
        currentOptionsRef.current = {
            attachments,
            ...options
        }

        // Store pending attachments with message content for immediate UI display
        // We match by content to correctly associate attachments with the right message
        if (attachments && attachments.length > 0) {
            pendingAttachmentsRef.current = {
                messageContent: content.trim(),
                attachments
            }
            console.log("[useAIChat] Stored pending attachments for UI:", attachments.length)
        } else {
            // Clear pending attachments when sending a message without attachments
            pendingAttachmentsRef.current = null
        }

        // Use AI SDK's sendMessage - server handles DB save
        aiSendMessage({
            text: content.trim(),
        })
    }, [context, status, aiSendMessage])

    // Cancel streaming
    const cancelStreaming = useCallback(() => {
        console.log("[useAIChat] Cancelling stream")
        aiStop()
        currentOptionsRef.current = {}
        pendingAttachmentsRef.current = null
    }, [aiStop])

    // Close chat: abort stream, wipe message state, evict query cache
    const closeChat = useCallback(() => {
        console.log("[useAIChat] Closing chat:", chatId)
        aiStop()
        setMessages([])
        currentOptionsRef.current = {}
        pendingAttachmentsRef.current = null
        // Remove cached data so a fresh load occurs if the chat is re-opened
        queryClient.removeQueries({ queryKey: ["chat", chatId] })
        queryClient.removeQueries({ queryKey: ["chat-messages", chatId] })
    }, [aiStop, setMessages, chatId, queryClient])

    // OAuth handling
    const handleOAuthConnect = useCallback((authUrl: string, lastMessage?: string) => {
        console.log("[useAIChat] Opening OAuth popup:", authUrl)

        const popup = window.open(
            authUrl,
            'oauth',
            'width=600,height=700,scrollbars=yes,location=yes'
        )

        if (!popup) {
            toast.error("Please allow popups for OAuth connection")
            return
        }

        const messageHandler = async (event: MessageEvent) => {
            if (event.data.type === 'oauth_callback') {
                console.log("[useAIChat] OAuth callback received:", event.data)

                if (event.data.error) {
                    toast.error(`OAuth failed: ${event.data.error}`)
                    setOAuthPrompt(null)
                    return
                }

                if (!event.data.code || !event.data.state) {
                    toast.error("Invalid OAuth response")
                    setOAuthPrompt(null)
                    return
                }

                popup.close()

                const exchangeTokens = async () => {
                    try {
                        const configResponse = await fetch(`/api/assistants/${context?.assistantId}/api-config`)
                        if (!configResponse.ok) {
                            throw new Error('Failed to fetch API configuration')
                        }

                        const configData = await configResponse.json()

                        const exchangeResponse = await fetch('/api/oauth/exchange-code', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                code: event.data.code,
                                clientId: configData.clientId,
                                clientSecret: configData.clientSecret,
                                tokenUrl: configData.tokenUrl,
                                redirectUri: `${window.location.origin}/api/oauth/callback`,
                                tokenExchangeMethod: configData.tokenExchangeMethod || 'post'
                            })
                        })

                        const exchangeData = await exchangeResponse.json()

                        if (!exchangeData.success) {
                            throw new Error(exchangeData.error || 'Failed to exchange code for token')
                        }

                        const updateResponse = await fetch(`/api/assistants/${context?.assistantId}/oauth-tokens`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                accessToken: exchangeData.accessToken,
                                refreshToken: exchangeData.refreshToken,
                                expiresIn: exchangeData.expiresIn
                            })
                        })

                        if (!updateResponse.ok) {
                            throw new Error('Failed to store OAuth tokens')
                        }

                        toast.success("Connected successfully!")
                        setOAuthPrompt(null)

                        if (lastMessage && context) {
                            console.log("[useAIChat] Retrying message after OAuth")
                            setTimeout(() => {
                                sendMessage(lastMessage, undefined, { chatWithAPI: true })
                            }, 1000)
                        }

                    } catch (error: any) {
                        console.error('[useAIChat] OAuth token exchange failed:', error)
                        toast.error(error.message || 'Failed to complete OAuth connection')
                        setOAuthPrompt(null)
                    }
                }

                exchangeTokens()
                window.removeEventListener('message', messageHandler)
            }
        }

        window.addEventListener('message', messageHandler)

        const checkPopupClosed = setInterval(() => {
            if (popup.closed) {
                clearInterval(checkPopupClosed)
                window.removeEventListener('message', messageHandler)
            }
        }, 500)
    }, [context, sendMessage])

    const dismissOAuthPrompt = useCallback(() => {
        setOAuthPrompt(null)
    }, [])

    // Convert AI SDK messages back to legacy Message format for compatibility
    const legacyMessages = useMemo<Message[]>(() => {
        return aiMessages.map((msg, idx) => {
            const textParts = msg.parts.filter(p => p.type === 'text')
            const content = textParts.map(p => p.type === 'text' ? p.text : '').join('')

            // Extract reasoning from AI SDK message parts OR the reasoning property
            const reasoningParts = msg.parts?.filter(p => p.type === 'reasoning') || []
            // Handle both standard AI SDK 'text' property and potential 'reasoning' property for reasoning parts
            const reasoning = (reasoningParts.length > 0
                ? reasoningParts.map(p => {
                    const partAny = p as any
                    return partAny.reasoning || partAny.text || ''
                }).join('\n')
                : (msg as any).reasoning) || undefined

            // Filter out system messages for legacy compatibility
            const role = msg.role === 'system' ? 'assistant' : msg.role

            // Correctly identify if THIS message is currently streaming
            // For assistant messages, we consider it streaming if the hook status is streaming
            const isStreaming = (status === 'streaming' || status === 'submitted') &&
                idx === aiMessages.length - 1 &&
                msg.role === 'assistant'

            // For user messages, inject pending attachments if content matches
            // This ensures attachments show immediately in UI before DB sync
            // and prevents attachments from appearing on wrong messages
            let messageAttachments = msg.attachments || []
            if (msg.role === 'user' && pendingAttachmentsRef.current) {
                // Match by content to ensure attachments go to the correct message
                if (content.trim() === pendingAttachmentsRef.current.messageContent) {
                    messageAttachments = pendingAttachmentsRef.current.attachments
                }
            }

            return {
                id: msg.id,
                role: role as "user" | "assistant",
                content,
                reasoning,
                parts: msg.parts,
                createdAt: new Date(),
                isStreaming,
                attachments: messageAttachments
            }
        })
    }, [aiMessages, status])

    return {
        context,
        messages: legacyMessages,
        isLoadingMessages: isLoadingMessages || isLoadingChat,
        isStreaming: status === 'streaming' || status === 'submitted',
        streamingMessage: "", // Not needed with AI SDK
        isInitializing,
        initError,
        isReady: !!context && !isInitializing,
        sendMessage,
        cancelStreaming,
        closeChat,
        refetchMessages,
        oauthPrompt,
        handleOAuthConnect,
        dismissOAuthPrompt,
    }
}