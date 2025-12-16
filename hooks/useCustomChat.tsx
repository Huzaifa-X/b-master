// hooks/useCustomChat.ts
"use client"

import { useState, useCallback, useRef, useEffect, useMemo } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import {
  getSpecificChat,
  getChatMessages,
  sendChatMessage,
  cleanupChat,
} from "@/app/actions/chat.action"
import { Message, ChatContext, ChatType } from "@/types/chat"
import { toast } from "sonner"

export type ChatMode = "assistant" | "ask-b"

export interface UseCustomChatOptions {
  mode: ChatMode
  assistantId?: string
  chatId: string
}

export function useCustomChat(options: UseCustomChatOptions) {
  const { mode, assistantId, chatId } = options
  const queryClient = useQueryClient()

  const [context, setContext] = useState<ChatContext | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingMessage, setStreamingMessage] = useState("")
  const abortControllerRef = useRef<AbortController | null>(null)

  // 🔥 Track if initial cleanup has run (only run once per chat session)
  const hasRunInitialCleanup = useRef(false)
  // Track if auto-streaming has been started for this chat
  const hasStartedAutoStream = useRef(false)

  // Load specific chat
  const {
    data: chatData,
    isLoading: isInitializing,
    error: initError
  } = useQuery({
    queryKey: ["chat", chatId],
    queryFn: async () => {
      console.log("[useCustomChat] Loading chat:", chatId)
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
      console.log("[useCustomChat] Loading messages for chat:", chatId)

      // 🔥 Only run cleanup on INITIAL load, not on every refetch
      // This prevents deleting messages that are still waiting for streaming to complete
      if (!hasRunInitialCleanup.current) {
        console.log("[useCustomChat] Running initial cleanup with 2 minute grace period...")
        try {
          const cleanupResult = await cleanupChat(chatId, 2) // 2 minute grace period
          if (cleanupResult.success && cleanupResult.deleted > 0) {
            console.log(`[useCustomChat] Cleaned up ${cleanupResult.deleted} orphaned messages`)
          }
        } catch (error) {
          console.error("[useCustomChat] Cleanup error (non-fatal):", error)
          // Continue loading messages even if cleanup fails
        }
        hasRunInitialCleanup.current = true
      }

      // Then load messages
      const result = await getChatMessages(chatId)

      if (!result.success) {
        console.error("[useCustomChat] Error loading messages:", result.error)
        return []
      }

      return result.messages
    },
    enabled: !!chatId,
    staleTime: 1000 * 10,
    // Poll more frequently when waiting for background response
    refetchInterval: (query) => {
      if (isStreaming) return false

      const msgs = query.state.data || []
      if (msgs.length === 0) return false

      // Get the last user message
      const userMessages = msgs.filter((msg: Message) => msg.role === "user")
      if (userMessages.length === 0) return 30000

      const lastUserMsg = userMessages[userMessages.length - 1]
      const lastUserMsgTime = new Date(lastUserMsg.createdAt).getTime()

      // Check if there's an assistant response after the last user message
      const assistantMessages = msgs.filter((msg: Message) =>
        msg.role === "assistant" &&
        msg.content &&
        msg.content.trim().length > 0
      )

      const hasResponseAfterLastUser = assistantMessages.some((msg: Message) =>
        new Date(msg.createdAt).getTime() > lastUserMsgTime
      )

      // Poll every 2s if waiting for response, otherwise 30s
      if (!hasResponseAfterLastUser) {
        console.log("[useCustomChat] Waiting for assistant response, polling every 2s")
        return 2000
      }

      return 30000 // Default polling interval
    },
  })

  // Reset cleanup flag when chatId changes
  useEffect(() => {
    hasRunInitialCleanup.current = false
    hasStartedAutoStream.current = false
  }, [chatId])

  // Set context when chat is ready
  useEffect(() => {
    if (chatData) {
      console.log("[useCustomChat] Chat context set:", chatData)
      setContext({
        chatId: chatData.id,
        chatType: chatData.chatType as ChatType,
        assistantId: chatData.assistantId,
        assistantName: chatData.assistantName || "Assistant",
        assistantInstructions: chatData.assistantInstructions,
      })
    }
  }, [chatData])

  // Auto-start streaming if there's a PENDING user message without response
  useEffect(() => {
    if (!context || isStreaming || isLoadingMessages || !chatData || hasStartedAutoStream.current) return

    // Check if last message is a user message with PENDING status
    const lastMessage = dbMessages[dbMessages.length - 1]
    if (!lastMessage || lastMessage.role !== "user") return

    // Check if message has PENDING status (from DB)
    const dbMessage = dbMessages.find(m => m.id === lastMessage.id)
    console.log("[useCustomChat] Last message status:", dbMessage?.status, "Message:", lastMessage.id)

    if (!dbMessage || dbMessage.status !== "PENDING") {
      console.log("[useCustomChat] Skipping auto-stream - status is not PENDING")
      return
    }

    // Check if there's already an assistant response after this user message
    const hasResponse = dbMessages.some(
      (msg, idx) => idx > dbMessages.indexOf(lastMessage) && msg.role === "assistant" && msg.content.trim()
    )

    if (!hasResponse) {
      console.log("[useCustomChat] ✅ Auto-starting streaming for PENDING message:", lastMessage.id)
      hasStartedAutoStream.current = true

      // Get attachments from the user message
      const attachments = lastMessage.attachments || []

      let options = {
        webSearch: false,
        research: false,
        chatWithAPI: false,
        dropbox: false,
        artifact: null as any
      }

      const SESSION_STORAGE_KEY = "chat_mode"
      const ARTIFACT_STORAGE_KEY = "chat_artifact_data"
      console.log("[useCustomChat] Checking sessionStorage...")
      console.log("[useCustomChat] sessionStorage.getItem:", sessionStorage.getItem(SESSION_STORAGE_KEY))
      console.log("[useCustomChat] All sessionStorage keys:", Object.keys(sessionStorage))

      try {
        const savedMode = sessionStorage.getItem(SESSION_STORAGE_KEY)

        console.log("[useCustomChat] Retrieved mode from sessionStorage:", savedMode)

        if (savedMode === "webSearch") {
          options.webSearch = true
        } else if (savedMode === "research") {
          options.research = true
        } else if (savedMode === "chatWithAPI") {
          options.chatWithAPI = true
        } else if (savedMode === "dropbox") {
          options.dropbox = true
        } else if (savedMode === "artifact") {
          // 🔥 Load artifact data from sessionStorage
          const savedArtifact = sessionStorage.getItem(ARTIFACT_STORAGE_KEY)
          if (savedArtifact) {
            try {
              options.artifact = JSON.parse(savedArtifact)
              console.log("[useCustomChat] Retrieved artifact from sessionStorage:", options.artifact.name)
            } catch (artifactParseError) {
              console.error("[useCustomChat] Error parsing artifact from sessionStorage:", artifactParseError)
            }
          } else {
            console.warn("[useCustomChat] Artifact mode detected but no artifact data found in sessionStorage")
          }
        }

        const savedArtifact = sessionStorage.getItem(ARTIFACT_STORAGE_KEY)
        if (savedArtifact) {
          try {
            options.artifact = JSON.parse(savedArtifact)
            console.log("[useCustomChat] Retrieved artifact from sessionStorage:", options.artifact.name)
          } catch (artifactParseError) {
            console.error("[useCustomChat] Error parsing artifact from sessionStorage:", artifactParseError)
          }
        }

        console.log("[useCustomChat] Auto-stream options:", options)
      } catch (error) {
        console.error("[useCustomChat] Error retrieving options from sessionStorage:", error)
      }

      // Start streaming automatically
      const startAutoStream = async () => {
        try {
          setIsStreaming(true)
          setStreamingMessage("")
          abortControllerRef.current = new AbortController()

          // Create temporary streaming assistant message
          const tempAssistantId = `streaming-${Date.now()}`
          const streamingMessage: Message = {
            id: tempAssistantId,
            role: "assistant",
            content: "",
            createdAt: new Date(),
            isStreaming: true
          }

          setMessages(prev => [...prev, streamingMessage])

          // Start streaming
          const streamResponse = await fetch("/api/chat/stream", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chatId: context.chatId,
              assistantId: context.assistantId,
              chatType: context.chatType,
              webSearch: options.webSearch,      // 🔥 Use retrieved option
              research: options.research,        // 🔥 Use retrieved option
              chatWithAPI: options.chatWithAPI,  // 🔥 Use retrieved option
              dropbox: options.dropbox,          // 🔥 Use retrieved option
              artifact: options.artifact,        // 🔥 Use retrieved option
              attachments: attachments
            }),
            signal: abortControllerRef.current.signal
          })

          if (!streamResponse.ok) {
            throw new Error("Failed to start streaming")
          }

          // Process stream (same logic as sendMessage)
          const reader = streamResponse.body?.getReader()
          const decoder = new TextDecoder()
          if (!reader) throw new Error("No response stream available")

          let buffer = ""
          let assistantContent = ""

          while (true) {
            const { done, value } = await reader.read()
            if (done) break

            buffer += decoder.decode(value, { stream: true })
            const lines = buffer.split("\n\n")
            buffer = lines.pop() || ""

            for (const line of lines) {
              if (!line.trim() || !line.startsWith("data: ")) continue

              try {
                const data = JSON.parse(line.slice(6))
                switch (data.type) {
                  case "text":
                    assistantContent += data.content
                    setStreamingMessage(assistantContent)
                    setMessages(prev =>
                      prev.map(msg =>
                        msg.id === tempAssistantId
                          ? { ...msg, content: assistantContent }
                          : msg
                      )
                    )
                    break
                  case "image":
                    const imageMarkdown = `\n\n![Generated Image](${data.url})`
                    assistantContent += imageMarkdown
                    setStreamingMessage(assistantContent)
                    setMessages(prev =>
                      prev.map(msg =>
                        msg.id === tempAssistantId
                          ? { ...msg, content: assistantContent }
                          : msg
                      )
                    )
                    break
                  case "done":
                    setMessages(prev =>
                      prev.map(msg =>
                        msg.id === tempAssistantId
                          ? { ...msg, isStreaming: false }
                          : msg
                      )
                    )
                    await refetchMessages()
                    break
                  case "error":
                    throw new Error(data.error || "Streaming error")
                }
              } catch (parseError) {
                console.error("[useCustomChat] Error parsing SSE data:", parseError)
              }
            }
          }
        } catch (error: any) {
          console.error("[useCustomChat] Auto-stream error:", error)
          if (error.name !== "AbortError") {
            toast.error("Failed to generate response")
          }
        } finally {
          setIsStreaming(false)
          abortControllerRef.current = null
        }
      }

      startAutoStream()
    }
  }, [context, dbMessages, isStreaming, isLoadingMessages, chatData, refetchMessages])

  // Memoize message IDs for comparison
  const dbMessageIds = useMemo(() =>
    dbMessages.map(m => m.id).join(','),
    [dbMessages]
  )
  const currentMessageIds = useMemo(() =>
    messages.map(m => m.id).join(','),
    [messages]
  )

  useEffect(() => {
    if (!isStreaming && dbMessageIds !== currentMessageIds) {
      console.log("[useCustomChat] Updating messages from DB:", dbMessages.length)
      setMessages(dbMessages)

      // Check if a new assistant response was added
      const previousAssistantCount = messages.filter(m => m.role === "assistant").length
      const currentAssistantCount = dbMessages.filter(m => m.role === "assistant").length

      // If a new assistant message was added, invalidate sidebar and header queries
      if (currentAssistantCount > previousAssistantCount && context) {
        console.log("[useCustomChat] New assistant response detected, invalidating queries")

        // Invalidate chat history (sidebar) and header when new response arrives
        const mode = context.chatType === "ASK_B" ? "ask-b" : "assistant"

        // Invalidate and refetch sidebar (chat history)
        queryClient.invalidateQueries({
          queryKey: ["chat-history", mode, context.assistantId || undefined]
        })
        queryClient.refetchQueries({
          queryKey: ["chat-history", mode, context.assistantId || undefined]
        })

        // Invalidate and refetch header (chat topic and info)
        queryClient.invalidateQueries({
          queryKey: ["chat-header", context.chatId]
        })
        queryClient.refetchQueries({
          queryKey: ["chat-header", context.chatId]
        })

        console.log("[useCustomChat] Queries invalidated and refetched for sidebar and header")
      }
    }
  }, [dbMessageIds, currentMessageIds, isStreaming, dbMessages, messages, context, queryClient])

  // Send message with streaming
  const sendMessage = useCallback(async (content: string, attachments?: { name: string; url: string; type: string; size: number }[], options?: { webSearch?: boolean; research?: boolean; chatWithAPI?: boolean; dropbox?: boolean; artifact?: { id: string; name: string; instructions: string; htmlContent: string }; mentionedUsers?: Array<{ id: string; name: string; email: string }> }) => {
    if (!context || !content.trim() || isStreaming) {
      console.warn("[useCustomChat] Cannot send message:", {
        hasContext: !!context,
        hasContent: !!content.trim(),
        isStreaming
      })
      return
    }

    console.log("[useCustomChat] Sending message with streaming:", {
      content: content.substring(0, 50),
      chatId: context.chatId
    })

    abortControllerRef.current = new AbortController()

    // Add user message optimistically
    const userMessage: Message = {
      id: `temp-user-${Date.now()}`,
      role: "user",
      content: content.trim(),
      createdAt: new Date(),
      attachments: attachments
    }

    setMessages(prev => [...prev, userMessage])
    setIsStreaming(true)
    setStreamingMessage("")

    try {
      // Step 1: Save user message to database via server action (skip background processing)
      console.log("[useCustomChat] Saving user message via server action")
      const result = await sendChatMessage({
        chatId: context.chatId,
        content: content.trim(),
        assistantId: context.assistantId,
        chatType: context.chatType,
        attachments: attachments,
        webSearch: options?.webSearch,
        research: options?.research,
        chatWithAPI: options?.chatWithAPI,
        dropbox: options?.dropbox,
        artifact: options?.artifact,
        mentionedUsers: options?.mentionedUsers,
        skipBackground: true // Skip background processing, we'll use streaming instead
      })

      if (!result.success) {
        throw new Error(result.error || "Failed to send message")
      }

      // Replace temp message with real one from DB
      if (result.message) {
        setMessages(prev =>
          prev.map(msg =>
            msg.id === userMessage.id
              ? {
                ...msg,
                id: result.message!.id,
                createdAt: result.message!.createdAt
              }
              : msg
          )
        )
      }

      // Step 2: Start streaming response
      console.log("[useCustomChat] Starting streaming response")

      const streamResponse = await fetch("/api/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chatId: context.chatId,
          assistantId: context.assistantId,
          chatType: context.chatType,
          webSearch: options?.webSearch,
          research: options?.research,
          chatWithAPI: options?.chatWithAPI,
          dropbox: options?.dropbox,
          artifact: options?.artifact,
          attachments: attachments
        }),
        signal: abortControllerRef.current.signal
      })

      if (!streamResponse.ok) {
        const errorData = await streamResponse.json().catch(() => ({}))
        throw new Error(errorData.error || "Failed to start streaming")
      }

      // Create temporary streaming assistant message
      const tempAssistantId = `streaming-${Date.now()}`
      const streamingMessage: Message = {
        id: tempAssistantId,
        role: "assistant",
        content: "",
        createdAt: new Date(),
        isStreaming: true
      }

      console.log("[useCustomChat] Adding streaming message with ID:", tempAssistantId)
      setMessages(prev => {
        const updated = [...prev, streamingMessage]
        console.log("[useCustomChat] Messages after adding streaming:", updated.length, "messages")
        return updated
      })

      // Process SSE stream
      const reader = streamResponse.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) {
        throw new Error("No response stream available")
      }

      let buffer = ""
      let assistantContent = ""
      let realResponseId: string | null = null

      console.log("[useCustomChat] Starting to read stream...")

      while (true) {
        const { done, value } = await reader.read()

        if (done) {
          console.log("[useCustomChat] Stream reader done, buffer remaining:", buffer.substring(0, 100))
          break
        }

        const chunk = decoder.decode(value, { stream: true })
        console.log("[useCustomChat] Received chunk length:", chunk.length, "First 100 chars:", chunk.substring(0, 100))
        buffer += chunk
        const lines = buffer.split("\n\n")
        buffer = lines.pop() || ""
        console.log("[useCustomChat] Split into", lines.length, "lines")

        for (const line of lines) {
          if (!line.trim() || !line.startsWith("data: ")) {
            console.log("[useCustomChat] Skipping line (not SSE format):", line.substring(0, 50))
            continue
          }

          try {
            const jsonStr = line.slice(6)
            console.log("[useCustomChat] Parsing SSE data:", jsonStr.substring(0, 100))
            const data = JSON.parse(jsonStr)
            console.log("[useCustomChat] Parsed data type:", data.type)

            switch (data.type) {
              case "connected":
                console.log("[useCustomChat] Stream connected successfully")
                break

              case "response_id":
                realResponseId = data.id
                console.log("[useCustomChat] Received response ID:", realResponseId)
                break

              case "text":
                assistantContent += data.content
                setStreamingMessage(assistantContent)
                console.log("[useCustomChat] Received text chunk:", data.content.substring(0, 50), "total length:", assistantContent.length)
                // Update streaming message in real-time
                setMessages(prev => {
                  const updated = prev.map(msg =>
                    msg.id === tempAssistantId
                      ? { ...msg, content: assistantContent }
                      : msg
                  )
                  // Log to verify update
                  const streamingMsg = updated.find(msg => msg.id === tempAssistantId)
                  console.log("[useCustomChat] Updated streaming message, content length:", streamingMsg?.content?.length || 0)
                  return updated
                })
                break

              case "image":
                // Add image markdown to content
                const imageMarkdown = `\n\n![Generated Image](${data.url})`
                assistantContent += imageMarkdown
                setStreamingMessage(assistantContent)
                setMessages(prev =>
                  prev.map(msg =>
                    msg.id === tempAssistantId
                      ? { ...msg, content: assistantContent }
                      : msg
                  )
                )
                break

              case "done":
                // Finalize message - mark as not streaming
                setMessages(prev =>
                  prev.map(msg =>
                    msg.id === tempAssistantId
                      ? { ...msg, isStreaming: false }
                      : msg
                  )
                )
                // Refetch to get the final message from DB
                await refetchMessages()
                break

              case "error":
                throw new Error(data.error || "Streaming error")
            }
          } catch (parseError) {
            console.error("[useCustomChat] Error parsing SSE data:", parseError)
          }
        }
      }

      console.log("[useCustomChat] Stream completed, final content length:", assistantContent.length)
      setIsStreaming(false)
      setStreamingMessage("")

      // Invalidate queries after streaming completes
      const chatMode = context.chatType === "ASK_B" ? "ask-b" : "assistant"
      queryClient.invalidateQueries({
        queryKey: ["chat-history", chatMode, context.assistantId || undefined]
      })
      queryClient.invalidateQueries({
        queryKey: ["chat-header", context.chatId]
      })

      console.log("[useCustomChat] Streaming completed")

    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log("[useCustomChat] Request cancelled")
        toast.info("Message cancelled")
        // Remove streaming message on cancel
        setMessages(prev => prev.filter(msg =>
          msg.id !== userMessage.id && !msg.isStreaming
        ))
      } else {
        console.error("[useCustomChat] Error sending message:", error)
        toast.error(error.message || "Failed to send message")

        // Remove user message and any streaming messages on error
        setMessages(prev => prev.filter(msg =>
          msg.id !== userMessage.id && !msg.isStreaming
        ))
      }
    } finally {
      setIsStreaming(false)
      setStreamingMessage("")
      abortControllerRef.current = null
    }
  }, [context, isStreaming, refetchMessages, queryClient, toast])

  // Cancel streaming
  const cancelStreaming = useCallback(() => {
    if (abortControllerRef.current) {
      console.log("[useCustomChat] Cancelling stream")
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    setIsStreaming(false)
    setStreamingMessage("")
    // Remove any streaming messages
    setMessages(prev => prev.filter(msg => !msg.isStreaming))
  }, [])

  // Get display messages - messages array already contains the streaming message
  // No need to add it again, just use messages directly
  const displayMessages: Message[] = messages

  return {
    context,
    messages: displayMessages,
    isLoadingMessages: isLoadingMessages || isInitializing,
    isStreaming,
    streamingMessage,
    isInitializing,
    initError,
    isReady: !!context && !isInitializing,
    sendMessage,
    cancelStreaming,
    refetchMessages,
  }
}