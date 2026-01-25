// hooks/useAIChat.ts
"use client"

import { useState, useCallback, useRef, useEffect, useMemo } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport, type UIMessage } from "ai"
import {
    getSpecificChat,
    getChatMessages,
    sendChatMessage,
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
export type AIChatMessage = UIMessage

export function useAIChat(options: UseAIChatOptions) {
    const { mode, assistantId, chatId } = options
    const queryClient = useQueryClient()

    const [context, setContext] = useState<ChatContext | null>(null)
    const [isInitializing, setIsInitializing] = useState(true)

    // OAuth state
    const [oauthPrompt, setOAuthPrompt] = useState<{
        show: boolean
        authUrl: string
        assistantId: string
        message: string
    } | null>(null)

    // Track if initial cleanup has run
    const hasRunInitialCleanup = useRef(false)
    const hasStartedAutoStream = useRef(false)

    // Pending message options (for auto-stream)
    const pendingMessageOptionsRef = useRef<any>(null)

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

    // Load messages for the chat
    const {
        data: dbMessages = [],
        isLoading: isLoadingMessages,
        refetch: refetchMessages
    } = useQuery({
        queryKey: ["chat-messages", chatId],
        queryFn: async () => {
            console.log("[useAIChat] Loading messages for chat:", chatId)

            // Only run cleanup on INITIAL load
            if (!hasRunInitialCleanup.current) {
                console.log("[useAIChat] Running initial cleanup with 2 minute grace period...")
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
        staleTime: 1000 * 10,
        refetchInterval: (query) => {
            const msgs = query.state.data || []
            if (msgs.length === 0) return 30000

            const userMessages = msgs.filter((msg: Message) => msg.role === "user")
            if (userMessages.length === 0) return 30000

            const lastUserMsg = userMessages[userMessages.length - 1]
            const lastUserMsgTime = new Date(lastUserMsg.createdAt).getTime()

            const assistantMessages = msgs.filter((msg: Message) =>
                msg.role === "assistant" &&
                msg.content &&
                msg.content.trim().length > 0
            )

            const hasResponseAfterLastUser = assistantMessages.some((msg: Message) =>
                new Date(msg.createdAt).getTime() > lastUserMsgTime
            )

            if (!hasResponseAfterLastUser) {
                console.log("[useAIChat] Waiting for assistant response, polling every 2s")
                return 2000
            }

            return 30000
        },
    })

    // Convert DB messages to AI SDK format
    const convertedMessages = useMemo<AIChatMessage[]>(() => {
        return dbMessages.map((msg) => {
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

            const parts: any[] = [
                {
                    type: "text" as const,
                    text: content
                }
            ]

            if (reasoning) {
                parts.push({
                    type: "reasoning" as const,
                    text: reasoning
                })
            }

            return {
                id: msg.id.toString(),
                role: (msg.role === "system" ? "assistant" : msg.role) as "user" | "assistant" | "system",
                parts
            }
        })
    }, [dbMessages]);

    // Initialize AI SDK useChat
    const {
        messages: aiMessages,
        sendMessage: aiSendMessage,
        status,
        stop: aiStop,
        setMessages: setAIMessages,
    } = useChat<AIChatMessage>({
        transport: new DefaultChatTransport({
            api: '/api/chat',

            async fetch(input: string | URL | Request, init?: RequestInit) {
                const options = pendingMessageOptionsRef.current || {}

                // Inject metadata into the request body
                let body = {}
                try {
                    body = JSON.parse(init?.body as string || '{}')
                } catch (e) {
                    console.error("[useAIChat] Error parsing request body:", e)
                }

                const customBody = {
                    ...body,
                    chatId,
                    assistantId,
                    chatType: context?.chatType || (mode === "ask-b" ? "ASK_B" : "ASSISTANT"),
                    webSearch: options.webSearch || false,
                    research: options.research || false,
                    chatWithAPI: options.chatWithAPI || false,
                    dropbox: options.dropbox || false,
                    attachments: options.attachments || [],
                    artifact: options.artifact || null,
                    mentionedUsers: options.mentionedUsers || [],
                }

                const response = await fetch(input, {
                    ...init,
                    body: JSON.stringify(customBody)
                })

                if (response.ok) {
                    const contentType = response.headers.get('content-type')

                    // Check for OAuth requirement in JSON response
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
                                // Return an empty stream response to avoid parsing errors
                                return new Response(null, { status: 200 })
                            }
                        } catch (e) {
                            console.error("[useAIChat] Error parsing JSON response:", e)
                        }
                    }
                }

                return response
            }
        }),

        experimental_throttle: 50,
        // @ts-ignore - experimental property
        experimental_activeReasoning: true,

        onFinish: async () => {
            console.log("[useAIChat] Stream finished")

            // Refetch messages from DB
            await refetchMessages()

            // Invalidate queries
            const chatMode = context?.chatType === "ASK_B" ? "ask-b" : "assistant"
            queryClient.invalidateQueries({
                queryKey: ["chat-history", chatMode, context?.assistantId || undefined]
            })
            queryClient.invalidateQueries({
                queryKey: ["chat-header", chatId]
            })

            // Clear pending options
            pendingMessageOptionsRef.current = null
        },

        onError: (error: Error) => {
            console.error("[useAIChat] Error:", error)
            toast.error(error.message || "Failed to send message")
        }
    });

    // Reset cleanup flag when chatId changes
    useEffect(() => {
        hasRunInitialCleanup.current = false
        hasStartedAutoStream.current = false
        pendingMessageOptionsRef.current = null
    }, [chatId])

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

    // Sync AI SDK messages with DB messages when not streaming
    useEffect(() => {
        const isStreaming = status === 'streaming' || status === 'submitted'
        if (!isStreaming && convertedMessages.length > 0) {
            const currentIds = aiMessages.map(m => m.id).join(',')
            const dbIds = convertedMessages.map(m => m.id).join(',')

            if (currentIds !== dbIds) {
                console.log("[useAIChat] Syncing messages from DB:", convertedMessages.length)
                setAIMessages(convertedMessages)
            }
        }
    }, [convertedMessages, status, aiMessages, setAIMessages])

    // Auto-start streaming for PENDING messages
    useEffect(() => {
        const isStreaming = status === 'streaming' || status === 'submitted'
        if (!context || isStreaming || isLoadingMessages || !chatData || hasStartedAutoStream.current) {
            return
        }

        const lastMessage = dbMessages[dbMessages.length - 1]
        if (!lastMessage || lastMessage.role !== "user") return

        const dbMessage = dbMessages.find(m => m.id === lastMessage.id)
        console.log("[useAIChat] Last message status:", dbMessage?.status)

        if (!dbMessage || dbMessage.status !== "PENDING") {
            return
        }

        const hasResponse = dbMessages.some(
            (msg, idx) => idx > dbMessages.indexOf(lastMessage) &&
                msg.role === "assistant" &&
                msg.content?.trim()
        )

        if (!hasResponse) {
            console.log("[useAIChat] ✅ Auto-starting streaming for PENDING message")
            hasStartedAutoStream.current = true

            // Extract options from message documents
            let options = {
                webSearch: false,
                research: false,
                chatWithAPI: false,
                dropbox: false,
                artifact: null as any,
                mentionedUsers: [] as Array<{ id: string; name: string; email: string }>,
                attachments: lastMessage.attachments || []
            }

            try {
                if (dbMessage.documents) {
                    const documentsData = JSON.parse(dbMessage.documents)
                    if (documentsData.options) {
                        options = { ...options, ...documentsData.options }
                    }
                    if (documentsData.mentionedUsers) {
                        options.mentionedUsers = documentsData.mentionedUsers
                    }
                }
            } catch (error) {
                console.error("[useAIChat] Error parsing message documents:", error)
            }

            // Store options for the request
            pendingMessageOptionsRef.current = options

            // Trigger AI SDK streaming by sending the message
            aiSendMessage({
                text: lastMessage.content,
            })
        }
    }, [context, dbMessages, status, isLoadingMessages, chatData, aiSendMessage])

    // Monitor for new assistant responses and invalidate queries
    useEffect(() => {
        const isStreaming = status === 'streaming' || status === 'submitted'
        if (isStreaming || !context) return

        const previousAssistantCount = convertedMessages.filter(m => m.role === "assistant").length
        const currentAssistantCount = dbMessages.filter(m => m.role === "assistant").length

        if (currentAssistantCount > previousAssistantCount) {
            console.log("[useAIChat] New assistant response detected, invalidating queries")

            const mode = context.chatType === "ASK_B" ? "ask-b" : "assistant"

            queryClient.invalidateQueries({
                queryKey: ["chat-history", mode, context.assistantId || undefined]
            })
            queryClient.refetchQueries({
                queryKey: ["chat-history", mode, context.assistantId || undefined]
            })

            queryClient.invalidateQueries({
                queryKey: ["chat-header", context.chatId]
            })
            queryClient.refetchQueries({
                queryKey: ["chat-header", context.chatId]
            })
        }
    }, [dbMessages.length, status, context, convertedMessages, queryClient])

    // Send message wrapper
    const sendMessage = useCallback(async (
        content: string,
        attachments?: { name: string; url: string; type: string; size: number }[],
        options?: {
            webSearch?: boolean
            research?: boolean
            chatWithAPI?: boolean
            dropbox?: boolean
            artifact?: { id: string; name: string; instructions: string; htmlContent: string }
            mentionedUsers?: Array<{ id: string; name: string; email: string }>
        }
    ) => {
        const isStreaming = status === 'streaming' || status === 'submitted'
        if (!context || !content.trim() || isStreaming) {
            console.warn("[useAIChat] Cannot send message")
            return
        }

        console.log("[useAIChat] Sending message")

        try {
            // Save user message to database first
            const result = await sendChatMessage({
                chatId: context.chatId,
                content: content.trim(),
                assistantId: context.assistantId,
                chatType: context.chatType,
                attachments,
                webSearch: options?.webSearch,
                research: options?.research,
                chatWithAPI: options?.chatWithAPI,
                dropbox: options?.dropbox,
                artifact: options?.artifact,
                mentionedUsers: options?.mentionedUsers
            })

            if (!result.success) {
                throw new Error(result.error || "Failed to send message")
            }

            // Store options for the AI SDK request
            pendingMessageOptionsRef.current = {
                attachments,
                ...options
            }

            // Trigger AI SDK streaming
            aiSendMessage({
                text: content,
            })

        } catch (error: any) {
            console.error("[useAIChat] Error sending message:", error)
            toast.error(error.message || "Failed to send message")
        }
    }, [context, status, aiSendMessage])

    // Cancel streaming
    const cancelStreaming = useCallback(() => {
        console.log("[useAIChat] Cancelling stream")
        aiStop()
        pendingMessageOptionsRef.current = null
    }, [aiStop])

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
            const reasoning = (reasoningParts.length > 0
                ? reasoningParts.map(p => (p as any).reasoning || (p as any).text || '').join('\n')
                : (msg as any).reasoning) || undefined

            // Filter out system messages for legacy compatibility
            const role = msg.role === 'system' ? 'assistant' : msg.role

            // Correctly identify if THIS message is currently streaming
            const isStreaming = (status === 'streaming' || status === 'submitted') && idx === aiMessages.length - 1 && msg.role === 'assistant'

            return {
                id: msg.id,
                role: role as "user" | "assistant",
                content,
                reasoning,
                parts: msg.parts,
                createdAt: new Date(),
                isStreaming,
                attachments: []
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
        refetchMessages,
        oauthPrompt,
        handleOAuthConnect,
        dismissOAuthPrompt,
    }
}