// components/assistants/welcome-chatbot-page.tsx
"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { useSession } from "next-auth/react"
import { TypewriterEffect } from "@/components/ui/typewriter-effect"
import { ChatInput } from "@/components/assistants/chat-input"
import { createChatWithMessage } from "@/app/actions/chat.action"
import { toast } from "sonner"
import { useQueryClient } from "@tanstack/react-query"

interface WelcomeChatbotPageProps {
  chatType: "ask-b" | "assistant"
  assistantId?: string
}

export function WelcomeChatbotPage({
  chatType,
  assistantId,
}: WelcomeChatbotPageProps) {
  const { data: session } = useSession()
  const router = useRouter()
  const queryClient = useQueryClient()
  const [input, setInput] = useState("")
  const [isCreating, setIsCreating] = useState(false)

  // Memoize welcome messages to prevent re-rendering on input changes
  const randomMessage = useMemo(() => {
    const WELCOME_MESSAGES = [
      `How is it going, ${session?.user?.name || "User"}?`,
      `Time to increase your knowledge, ${session?.user?.name || "User"}`,
      `Ready to explore something new, ${session?.user?.name || "User"}?`,
      `What brings you here today, ${session?.user?.name || "User"}?`,
      `Let's make today productive, ${session?.user?.name || "User"}!`,
      `Great to see you back, ${session?.user?.name || "User"}!`,
      `What can I help you with, ${session?.user?.name || "User"}?`,
      `Let's dive into something interesting, ${session?.user?.name || "User"}!`,
    ]
    return WELCOME_MESSAGES[Math.floor(Math.random() * WELCOME_MESSAGES.length)]
  }, [session?.user?.name])

  const handleSend = async (
    message: string,
    attachments?: { name: string; url: string; type: string; size: number }[],
    options?: { webSearch?: boolean; research?: boolean; chatWithAPI?: boolean; dropbox?: boolean; artifact?: { id: string; name: string; instructions: string; htmlContent: string }; mentionedUsers?: Array<{ id: string; name: string; email: string }> }
  ) => {
    if (!message.trim() || isCreating) return

    setIsCreating(true)

    try {
      // Create chat with first message, attachments, and search options (skip background for streaming)
      const result = await createChatWithMessage({
        mode: chatType,
        assistantId: assistantId,
        firstMessage: message.trim(),
        attachments: attachments,
        webSearch: options?.webSearch,
        research: options?.research,
        chatWithAPI: options?.chatWithAPI,
        dropbox: options?.dropbox,
        artifact: options?.artifact,
        mentionedUsers: options?.mentionedUsers
      })

      if (!result.success || !result.chatId) {
        throw new Error(result.error || "Failed to create chat")
      }

      console.log("[WelcomePage] Chat created, navigating to:", result.chatId)

      const SESSION_STORAGE_KEY = "chat_mode"
      if (options?.webSearch) {
        sessionStorage.setItem(SESSION_STORAGE_KEY, "webSearch")
      } else if (options?.research) {
        sessionStorage.setItem(SESSION_STORAGE_KEY, "research")
      } else if (options?.chatWithAPI) {
        sessionStorage.setItem(SESSION_STORAGE_KEY, "chatWithAPI")
      } else if (options?.dropbox) {
        sessionStorage.setItem(SESSION_STORAGE_KEY, "dropbox")
      } else if (options?.artifact) {
        sessionStorage.setItem(SESSION_STORAGE_KEY, "artifact")
        sessionStorage.setItem("chat_artifact_data", JSON.stringify(options.artifact))
        console.log("[WelcomePage] Stored artifact data:", options.artifact.name)
      } else if (options?.mentionedUsers) {
        sessionStorage.setItem(SESSION_STORAGE_KEY, "mentionedUsers")
        sessionStorage.setItem("chat_mentioned_users", JSON.stringify(options.mentionedUsers))
        console.log("[WelcomePage] Stored mentioned users:", options.mentionedUsers)
      }

      // Navigate to chat page first
      const url = chatType === "ask-b"
        ? `/ask-b/${result.chatId}`
        : `/assistants/${assistantId}/${result.chatId}`

      router.push(url)

      // Invalidate and refetch queries after navigation
      // This ensures sidebar and header update with the new chat
      const mode = chatType === "ask-b" ? "ask-b" : "assistant"

      // Invalidate chat history - use exact match for assistant mode, pattern for ask-b
      if (chatType === "ask-b") {
        queryClient.invalidateQueries({
          queryKey: ["chat-history", "ask-b", undefined]
        })
      } else if (assistantId) {
        queryClient.invalidateQueries({
          queryKey: ["chat-history", "assistant", assistantId]
        })
      }

      // Invalidate chat header query
      queryClient.invalidateQueries({
        queryKey: ["chat-header", result.chatId]
      })

      // Refetch immediately after a short delay to allow navigation
      setTimeout(() => {
        queryClient.refetchQueries({
          queryKey: ["chat-history", mode, assistantId || undefined]
        })
      }, 200)

      // Clear input (will be cleared by ChatInput after successful send)
      setIsCreating(false)

    } catch (error) {
      console.error("[WelcomePage] Error creating chat:", error)
      toast.error("Failed to start conversation")
      setIsCreating(false)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center h-full w-full px-4 py-8">
      <div className="flex flex-col items-center justify-center gap-2 w-full max-w-2xl">
        {/* Logo */}
        <div className="flex flex-col items-center justify-center animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="relative w-32 h-8 md:w-40 md:h-10">
            <Image
              src="/bmaster-logo.svg"
              alt="Bmaster Logo"
              fill
              className="object-contain"
              priority
            />
          </div>
        </div>

        {/* Typewriter Text */}
        <div className="w-full min-h-[80px] md:min-h-[100px] flex items-center justify-center px-4">
          <TypewriterEffect
            words={randomMessage.split(" ").map((word) => ({
              text: word,
              className: "text-2xl md:text-3xl font-light",
            }))}
            cursorClassName="hidden"
          />
        </div>

        {/* Input */}
        <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-500 delay-300">
          <ChatInput
            value={input}
            onValueChange={setInput}
            onSubmit={handleSend}
            isLoading={isCreating}
            disabled={isCreating}
            placeholder={
              chatType === "ask-b"
                ? "Ask me anything..."
                : "Ask this assistant..."
            }
            mode={chatType}
            assistantId={assistantId}
            isAtBottom={false}
            className="border-primary/50 shadow-[0_0_100px_0px_hsl(var(--primary)),0_0_60px_0px_hsl(var(--primary)),0_0_30px_0px_hsl(var(--primary)),0_0_15px_0px_hsl(var(--primary))] dark:border-primary/60 dark:shadow-[0_0_120px_0px_hsl(var(--primary)),0_0_80px_0px_hsl(var(--primary)),0_0_40px_0px_hsl(var(--primary)),0_0_20px_0px_hsl(var(--primary))]"
          />
        </div>
      </div>
    </div>
  )
}