"use client"

import { FC } from "react"
import { UserMessage } from "@/components/assistants/message-components/user-message"
import { AssistantMessage } from "@/components/assistants/message-components/assistant-message"
import { ScrollArea } from "@/components/ui/scroll-area"
import { MessageSquare, User, Bot } from "lucide-react"

interface SharedChat {
  id: number
  topic: string
  chatType: string
  createdAt: string
  createdAtFormatted: string
  assistant: {
    name: string
    description?: string
  } | null
  messages: Array<{
    id: string
    role: "user" | "assistant"
    content: string
    createdAt: string
    createdAtFormatted: string
    attachments?: Array<{
      name: string
      url: string
      type: string
      size: number
    }>
  }>
}

interface SharedChatViewProps {
  chat: SharedChat
}

export const SharedChatView: FC<SharedChatViewProps> = ({ chat }) => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="flex h-16 items-center px-4">
          <div className="flex items-center gap-3">
            <div className="flex size-8 items-center justify-center rounded-full bg-primary/10">
              <MessageSquare className="size-4 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-semibold">{chat.topic}</h1>
              <p className="text-sm text-muted-foreground">
                {chat.assistant ? `Conversation with ${chat.assistant.name}` : "Shared Conversation"}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Chat Content */}
      <div className="flex-1">
        <ScrollArea className="h-[calc(100vh-4rem)]">
          <div className="mx-auto w-full max-w-4xl px-4 py-6">
            {/* Chat Info */}
            <div className="mb-8 rounded-lg border bg-card p-6">
              <div className="flex items-start gap-4">
                <div className="flex size-12 items-center justify-center rounded-full bg-primary/10">
                  <MessageSquare className="size-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-semibold mb-2">{chat.topic}</h2>
                  {chat.assistant && (
                    <div className="mb-4">
                      <p className="text-sm text-muted-foreground mb-1">
                        <Bot className="inline size-4 mr-1" />
                        Assistant: {chat.assistant.name}
                      </p>
                      {chat.assistant.description && (
                        <p className="text-sm text-muted-foreground">
                          {chat.assistant.description}
                        </p>
                      )}
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Created on {chat.createdAtFormatted} • {chat.messages.length} messages
                  </p>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="space-y-6">
              {chat.messages.map((message) => (
                <div key={message.id} className="group">
                  {message.role === "user" ? (
                    <div className="flex gap-4">
                      <div className="flex-1">
                        <UserMessage
                          content={message.content}
                          attachments={message.attachments}
                          timestamp={new Date(message.createdAt)}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-4">
                      <div className="flex-1">
                        <AssistantMessage
                          content={message.content}
                          timestamp={new Date(message.createdAt)}
                          isLoading={false}
                          shared={true}
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="mt-12 text-center">
              <p className="text-sm text-muted-foreground">
                This is a shared conversation. You can view it but cannot reply.
              </p>
            </div>
          </div>
        </ScrollArea>
      </div>
    </div>
  )
}
