"use client"

import { useEffect, useRef } from "react"
import { useParams } from "next/navigation"
import { MessageSquare, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { AIInput } from "@/components/ui/ai-input"
import { PresignedAvatarImage } from "@/components/ui/presigned-avatar-image"
import { useChatMessages, useSendMessage, useMarkAsRead, useMessageSubscription, useUserChats } from "@/hooks/use-assistant-caht"
import { useSession } from "next-auth/react"
import { format } from "date-fns"
import { useFileUpload } from "@/hooks/use-file-upload"
import { toast } from "sonner"

interface ChatViewProps {
  conversationId: string | null
  onBack?: () => void
}

export function ChatView({ conversationId, onBack }: ChatViewProps) {
  const params = useParams()
  const assistantId = params.id as string
  const { data: session } = useSession()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const {
    data: messagesData,
    isLoading: messagesLoading,
    fetchNextPage,
    hasNextPage
  } = useChatMessages(assistantId, conversationId || "")

  const { data: chatsData } = useUserChats(assistantId)
  const allChats = chatsData?.pages.flatMap(page => page.chats || []) || []
  const currentChat = allChats.find(chat => chat.id === conversationId)

  const { mutate: sendMessage, isPending: isSending } = useSendMessage()
  const { mutate: markAsRead } = useMarkAsRead()
  const { isConnected } = useMessageSubscription(
    assistantId,
    conversationId || "",
    !!conversationId
  )
  const { uploadFile, uploading } = useFileUpload()

  const allMessages = messagesData?.pages.flatMap(page => page.messages || []) || []

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [allMessages.length])

  // Mark messages as read when opening chat
  useEffect(() => {
    if (conversationId && currentChat?.unreadCount && currentChat.unreadCount > 0) {
      markAsRead({
        assistantId,
        chatId: conversationId
      })
    }
  }, [conversationId, currentChat?.unreadCount, markAsRead, assistantId])

  const handleSendMessage = async (message: string) => {
    if (!conversationId || !message.trim()) return

    sendMessage({
      assistantId,
      chatId: conversationId,
      message: message.trim(),
      messageType: "text"
    })
  }

  const handleFileUpload = async (files: FileList) => {
    if (!conversationId || files.length === 0) return

    const file = files[0]
    
    // Check file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size must be less than 10MB")
      return
    }

    try {
      const attachmentUrl = await uploadFile(file)
      
      sendMessage({
        assistantId,
        chatId: conversationId,
        message: `[File: ${file.name}]`,
        messageType: "file",
        attachmentUrl,
        attachmentName: file.name,
        attachmentSize: file.size
      })
    } catch (error) {
      toast.error("Failed to upload file")
    }
  }

  const otherUser = currentChat 
    ? (currentChat.initiatorId === session?.user?.id
        ? currentChat.participant
        : currentChat.initiator)
    : null

  if (!conversationId) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <MessageSquare className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">No conversation selected</h3>
          <p className="text-sm text-muted-foreground">
            Select a conversation from the sidebar or start a new one
          </p>
        </div>
      </div>
    )
  }

  if (!otherUser) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Loading conversation...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      {/* Chat Header */}
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        {onBack && (
          <Button
            size="icon"
            variant="ghost"
            onClick={onBack}
            className="mr-2"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <PresignedAvatarImage 
              src={otherUser.image || ""} 
            />
            <AvatarFallback>
              {otherUser.name?.slice(0, 2).toUpperCase() || "?"}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-semibold text-sm">{otherUser.name || "Unknown User"}</p>
            <p className="text-xs text-muted-foreground">
              {isConnected ? "Online" : "Offline"}
            </p>
          </div>
        </div>
      </header>

      {/* Messages Area */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 chat-scrollbar"
        onScroll={() => {
          if (containerRef.current) {
            const { scrollTop } = containerRef.current
            if (scrollTop === 0 && hasNextPage) {
              fetchNextPage()
            }
          }
        }}
      >
        {messagesLoading && allMessages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : (
          <>
            {hasNextPage && (
              <div className="text-center py-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => fetchNextPage()}
                >
                  Load Previous Messages
                </Button>
              </div>
            )}
            {allMessages.slice().reverse().map((message) => {
              const isOwn = message.senderId === session?.user?.id
              return (
                <div
                  key={message.id}
                  className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                      isOwn
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap break-words">{message.message}</p>
                    {message.attachmentUrl && (
                      <a
                        href={message.attachmentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`mt-2 flex items-center gap-2 text-sm ${
                          isOwn ? "text-primary-foreground/80 hover:text-primary-foreground" : "text-primary hover:text-primary/80"
                        }`}
                      >
                        <span className="underline">{message.attachmentName || "Download File"}</span>
                      </a>
                    )}
                    <p className={`text-xs mt-1 ${
                      isOwn 
                        ? "text-primary-foreground/70" 
                        : "text-muted-foreground"
                    }`}>
                      {format(new Date(message.createdAt), "HH:mm")}
                    </p>
                  </div>
                </div>
              )
            })}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Message Input */}
      <div className="shrink-0 border-t">
        <AIInput
          placeholder={isSending || uploading ? "Sending..." : "Type a message..."}
          onSubmit={handleSendMessage}
          onFileUpload={handleFileUpload}
          minHeight={52}
          maxHeight={200}
        />
      </div>
    </div>
  )
}

