// hooks/useCustomChat.ts
"use client"

import { useState, useCallback, useRef, useEffect, useMemo } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { 
  getSpecificChat,
  getChatMessages,
  sendChatMessage,
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
      const result = await getChatMessages(chatId)
      
      if (!result.success) {
        console.error("[useCustomChat] Error loading messages:", result.error)
        return []
      }
      
      return result.messages
    },
    enabled: !!chatId,
    staleTime: 1000 * 10,
    // Poll more frequently when waiting for background response (every 2s instead of 30s)
    refetchInterval: (query) => {
      if (isStreaming) return false
      // Check if last message is from user and no assistant response yet
      const msgs = query.state.data || []
      const lastMsg = msgs[msgs.length - 1]
      if (lastMsg && lastMsg.role === "user") {
        // Check if there's an assistant response after this user message
        const hasResponse = msgs.some((msg: Message) => 
          msg.role === "assistant" && 
          new Date(msg.createdAt) > new Date(lastMsg.createdAt)
        )
        return hasResponse ? 30000 : 2000 // Poll every 2s if waiting, 30s otherwise
      }
      return 30000
    },
  })

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
    }
  }, [dbMessageIds, currentMessageIds, isStreaming, dbMessages])

  // Send message with streaming
  const sendMessage = useCallback(async (content: string) => {
    if (!context || !content.trim() || isStreaming) {
      console.warn("[useCustomChat] Cannot send message:", { 
        hasContext: !!context, 
        hasContent: !!content.trim(), 
        isStreaming 
      })
      return
    }

    console.log("[useCustomChat] Sending message:", { 
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
    }

    setMessages(prev => [...prev, userMessage])
    setIsStreaming(false) // Not streaming, waiting for background response
    setStreamingMessage("")

    try {
      console.log("[useCustomChat] Sending message via server action")

      // Call server action to save message and trigger background response
      const result = await sendChatMessage({
        chatId: context.chatId,
        content: content.trim(),
        assistantId: context.assistantId,
        chatType: context.chatType
      })

      if (!result.success) {
        throw new Error(result.error || "Failed to send message")
      }

      console.log("[useCustomChat] Message sent, waiting for background response")

      // Replace temp message with real one from DB
      await refetchMessages()

      // Invalidate chat list to update sidebar
      queryClient.invalidateQueries({
        queryKey: ["chat-history", mode, assistantId]
      })

      toast.success("Message sent")

      // The background response will appear automatically when:
      // 1. The server action completes (runs in background)
      // 2. The existing refetchInterval in useQuery picks it up (every 30s when not streaming)
      // 3. Or when user manually refetches

    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log("[useCustomChat] Request cancelled")
        toast.info("Message cancelled")
      } else {
        console.error("[useCustomChat] Error sending message:", error)
        toast.error("Failed to send message")
        
        setMessages(prev => prev.filter(msg => msg.id !== userMessage.id))
      }
    } finally {
      setIsStreaming(false)
      setStreamingMessage("")
      abortControllerRef.current = null
    }
  }, [context, messages, isStreaming, refetchMessages, queryClient, mode, assistantId])

  // Cancel streaming
  const cancelStreaming = useCallback(() => {
    if (abortControllerRef.current) {
      console.log("[useCustomChat] Cancelling stream")
      abortControllerRef.current.abort()
    }
  }, [])

  // Get display messages
  const displayMessages: Message[] = isStreaming && streamingMessage
    ? [
        ...messages,
        {
          id: `streaming-${Date.now()}`,
          role: "assistant" as const,
          content: streamingMessage,
          createdAt: new Date(),
          isStreaming: true
        }
      ]
    : messages

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