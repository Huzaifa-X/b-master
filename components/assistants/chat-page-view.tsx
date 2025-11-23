// components/assistants/chat-page-view.tsx
"use client"

import { useCustomChat } from "@/hooks/useCustomChat"
import { ScrollArea } from "@/components/ui/scroll-area"
import { UserMessage } from "@/components/assistants/message-components/user-message"
import { AssistantMessage } from "@/components/assistants/message-components/assistant-message"
import { ChatInput } from "@/components/assistants/chat-input"
import { useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { StopCircle, Loader2 } from "lucide-react"
import Image from "next/image"

interface ChatPageViewProps {
  chatId: string
  mode: "ask-b" | "assistant"
  assistantId?: string
}

export function ChatPageView({ chatId, mode, assistantId }: ChatPageViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  const {
    context,
    messages,
    isLoadingMessages,
    isStreaming,
    sendMessage,
    cancelStreaming,
    isReady
  } = useCustomChat({
    mode,
    assistantId,
    chatId
  })

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleSend = (message: string, attachments?: { name: string; url: string; type: string; size: number }[], options?: { webSearch?: boolean; research?: boolean }) => {
    if (!message.trim() || isStreaming) return
    sendMessage(message.trim(), attachments, options)
  }

  const handleCancel = () => {
    cancelStreaming()
  }

  // Check if we need to show loading indicator
  // Show loading if last message is from user and there's no assistant response yet
  const lastMessage = messages[messages.length - 1]
  const hasUserMessageWithoutResponse = 
    messages.length > 0 && 
    lastMessage?.role === "user" && 
    !isStreaming

  // Loading state
  if (isLoadingMessages || !isReady) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Loading conversation...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Messages */}
      <ScrollArea className="flex-1" ref={scrollRef}>
        <div className="mx-auto w-full max-w-[44rem] px-4 py-4">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full min-h-[400px]">
              <p className="text-muted-foreground text-sm">
                No messages yet. Start the conversation below.
              </p>
            </div>
          ) : (
            <>
              {messages.map((message) => (
                <div key={message.id} className="mb-4">
                  {message.role === "user" ? (
                    <UserMessage
                      content={message.content}
                      attachments={message.attachments}
                      timestamp={message.createdAt}
                    />
                  ) : (
                    <AssistantMessage
                      content={message.content}
                      timestamp={message.createdAt}
                      isLoading={message.isStreaming}
                    />
                  )}
                </div>
              ))}
              
              {/* Loading indicator when waiting for AI response */}
              {hasUserMessageWithoutResponse && (
                <div className="mb-4">
                  <div
                    className="mx-auto w-full max-w-[44rem] animate-in py-4 duration-150 ease-out fade-in slide-in-from-bottom-1"
                    data-role="assistant"
                  >
                    <div className="flex gap-4 px-2">
                      <div className="flex-shrink-0 pt-1">
                        <div className="flex size-8 items-center justify-center rounded-full">
                          <Image
                            src="/bmaster-icon.png"
                            alt="Assistant"
                            width={24}
                            height={24}
                            style={{ width: "auto", height: "24px" }}
                            unoptimized
                          />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="inline-block rounded-2xl px-4 py-2.5 bg-muted">
                          <div className="flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">Thinking...</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="min-h-8" />
            </>
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="sticky bottom-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-4">
        <div className="mx-auto w-full max-w-[44rem]">
          {isStreaming && (
            <div className="mb-2 flex items-center justify-center">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancel}
                className="gap-2"
              >
                <StopCircle className="h-4 w-4" />
              </Button>
            </div>
          )}
          
          <ChatInput
            onSubmit={handleSend}
            isLoading={isStreaming}
            placeholder="Send a message..."
            className="border-primary/50 shadow-lg"
          />
        </div>
      </div>
    </div>
  )
}