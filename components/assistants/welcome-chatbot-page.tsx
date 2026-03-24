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
import { useLocale } from "@/lib/i18n"
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
  const { t } = useLocale()
  const [input, setInput] = useState("")
  const [isCreating, setIsCreating] = useState(false)

  // Memoize welcome messages to prevent re-rendering on input changes
  const randomMessage = useMemo(() => {
    const greetingKeys = [
      "chat.welcome.greeting1",
      "chat.welcome.greeting2",
      "chat.welcome.greeting3",
      "chat.welcome.greeting4",
      "chat.welcome.greeting5",
      "chat.welcome.greeting6",
      "chat.welcome.greeting7",
      "chat.welcome.greeting8",
    ]
    const key = greetingKeys[Math.floor(Math.random() * greetingKeys.length)]
    return t(key, { name: session?.user?.name || "User" })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.name]) // Remove 't' from deps - it changes on every render

  // Memoize the words array to prevent TypewriterEffect from restarting on input changes
  const typewriterWords = useMemo(() =>
    randomMessage.split(" ").map((word) => ({
      text: word,
      className: "text-2xl md:text-3xl font-light",
    })),
    [randomMessage]
  )

  const handleSend = async (
    message: string,
    attachments?: { name: string; url: string; type: string; size: number }[],
    options?: { webSearch?: boolean; research?: boolean; chatWithAPI?: boolean; dropbox?: boolean; artifacts?: { id: string; name: string; instructions: string; htmlContent: string }[]; mentionedUsers?: Array<{ id: string; name: string; email: string }>; connectedApiIds?: string[] }
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
        artifacts: options?.artifacts,
        mentionedUsers: options?.mentionedUsers,
        connectedApiIds: options?.connectedApiIds,
      })

      if (!result.success || !result.chatId) {
        throw new Error(result.error || "Failed to create chat")
      }

      console.log("[WelcomePage] Chat created, navigating to:", result.chatId)

      // Note: ChatInput component now handles sessionStorage internally with assistant-scoped keys
      // No need to manually store here - options are passed directly to createChatWithMessage

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
      toast.error(t("chat.errors.failedToStart"))
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
            words={typewriterWords}
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
                ? t("chat.placeholder.askB")
                : t("chat.placeholder.assistant")
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