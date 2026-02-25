"use client"

import { useEffect, useRef, useState } from "react"
import { useParams } from "next/navigation"
import { MessageSquare, ArrowLeft, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { AIInput, PendingAttachment } from "@/components/ui/ai-input"
import { PresignedAvatarImage } from "@/components/ui/presigned-avatar-image"
import { MessageBubble } from "./message-bubble"
import { useChatMessages, useSendMessage, useMarkAsRead, useMessageSubscription, useUserChats } from "@/hooks/use-assistant-chat"
import { useSession } from "next-auth/react"
import { useUploadFileToS3 } from "@/hooks/useUpload"
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

  // Use the existing upload hook
  const { uploadFileAsync, isUploading } = useUploadFileToS3()
  const [showScrollButton, setShowScrollButton] = useState(false)
  const hasScrolledToBottomRef = useRef(false)
  const userScrolledUpRef = useRef(false)
  const previousMessageCountRef = useRef(0)

  const allMessages = messagesData?.pages.flatMap(page => page.messages || []) || []

  // Check if user is near bottom of scroll
  const checkScrollPosition = () => {
    if (!containerRef.current) return

    const { scrollTop, scrollHeight, clientHeight } = containerRef.current
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight
    const isNearBottom = distanceFromBottom < 100 // 100px threshold

    setShowScrollButton(!isNearBottom)

    // Track if user has scrolled up manually
    if (hasScrolledToBottomRef.current && distanceFromBottom > 150) {
      userScrolledUpRef.current = true
    } else if (isNearBottom) {
      userScrolledUpRef.current = false
    }
  }

  // Scroll to bottom function with multiple attempts for reliability
  const scrollToBottom = (behavior: 'instant' | 'smooth' = 'smooth') => {
    if (!containerRef.current) return

    const scrollContainer = containerRef.current

    if (behavior === 'instant') {
      // Force instant scroll with multiple attempts
      const performScroll = () => {
        scrollContainer.scrollTop = scrollContainer.scrollHeight
      }

      performScroll()
      requestAnimationFrame(() => {
        performScroll()
        setTimeout(performScroll, 50)
        setTimeout(performScroll, 100)
      })
    } else {
      // Smooth scroll using scrollIntoView
      messagesEndRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "end"
      })
    }

    // Reset user scrolled flag and hide button
    userScrolledUpRef.current = false
    setTimeout(checkScrollPosition, 300)
  }

  // Reset scroll flag when conversation changes
  useEffect(() => {
    hasScrolledToBottomRef.current = false
    userScrolledUpRef.current = false
    setShowScrollButton(false)
    previousMessageCountRef.current = 0
  }, [conversationId])

  // Scroll to bottom on initial load
  useEffect(() => {
    if (!conversationId || messagesLoading || allMessages.length === 0) return

    // Only auto-scroll on first load
    if (!hasScrolledToBottomRef.current) {
      const scrollTimer = setTimeout(() => {
        scrollToBottom('instant')
        hasScrolledToBottomRef.current = true

        // Double-check after render
        setTimeout(() => {
          if (containerRef.current) {
            const { scrollTop, scrollHeight, clientHeight } = containerRef.current
            const distanceFromBottom = scrollHeight - scrollTop - clientHeight
            if (distanceFromBottom > 50) {
              scrollToBottom('instant')
            }
          }
          checkScrollPosition()
        }, 150)
      }, 100)

      return () => clearTimeout(scrollTimer)
    }
  }, [conversationId, messagesLoading, allMessages.length])

  // Handle new messages - only auto-scroll if user hasn't scrolled up
  useEffect(() => {
    if (!hasScrolledToBottomRef.current || !conversationId || messagesLoading) return

    const currentMessageCount = allMessages.length
    const hasNewMessages = currentMessageCount > previousMessageCountRef.current

    if (hasNewMessages) {
      previousMessageCountRef.current = currentMessageCount

      // Only auto-scroll if user is near bottom or hasn't manually scrolled up
      if (!userScrolledUpRef.current) {
        requestAnimationFrame(() => {
          setTimeout(() => {
            scrollToBottom('smooth')
          }, 100)
        })
      } else {
        // Just update the button visibility
        checkScrollPosition()
      }
    }
  }, [allMessages.length, conversationId, messagesLoading])

  // Scroll to bottom when sending a message
  useEffect(() => {
    if (isSending && hasScrolledToBottomRef.current) {
      userScrolledUpRef.current = false // User is sending, they want to see their message
      requestAnimationFrame(() => {
        setTimeout(() => {
          scrollToBottom('smooth')
        }, 100)
      })
    }
  }, [isSending])

  // Handle scroll events
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleScroll = () => {
      if (container.scrollTop === 0 && hasNextPage) {
        fetchNextPage()
      }
      checkScrollPosition()
    }

    container.addEventListener('scroll', handleScroll, { passive: true })

    return () => {
      container.removeEventListener('scroll', handleScroll)
    }
  }, [conversationId, hasNextPage, fetchNextPage])

  // Mark messages as read when opening chat
  useEffect(() => {
    if (conversationId && currentChat?.unreadCount && currentChat.unreadCount > 0) {
      markAsRead({
        assistantId,
        chatId: conversationId
      })
    }
  }, [conversationId, currentChat?.unreadCount, markAsRead, assistantId])

  const isImageFile = (fileName: string, contentType?: string): boolean => {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.ico']
    const imageMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'image/bmp']
    const extension = fileName.toLowerCase().substring(fileName.lastIndexOf('.'))
    return imageExtensions.includes(extension) || (contentType ? imageMimeTypes.includes(contentType) : false)
  }

  const handleSend = async (message: string, attachment?: PendingAttachment) => {
    if (!conversationId || (!message.trim() && !attachment)) return

    if (attachment?.type === "file" && attachment.file) {
      if (attachment.file.size > 10 * 1024 * 1024) {
        toast.error("File size must be less than 10MB")
        return
      }
      try {
        const formData = new FormData()
        formData.append("file", attachment.file)
        formData.append("folder", "attachments")
        const uploadResult = await uploadFileAsync(formData)
        const isImage = isImageFile(attachment.file.name, attachment.file.type)
        sendMessage({
          assistantId,
          chatId: conversationId,
          message: message.trim() || (isImage ? "" : `[File: ${attachment.file.name}]`),
          messageType: isImage ? "image" : "file",
          attachmentUrl: uploadResult.url,
          attachmentName: uploadResult.fileName,
          attachmentSize: uploadResult.fileSize
        })
      } catch (error) {
        console.error("File upload error:", error)
        toast.error("Failed to upload file")
      }
    } else if (attachment?.type === "url" && attachment.url) {
      sendMessage({
        assistantId,
        chatId: conversationId,
        message: message.trim(),
        messageType: "url",
        attachmentUrl: attachment.url,
        attachmentName: attachment.url
      })
    } else {
      sendMessage({
        assistantId,
        chatId: conversationId,
        message: message.trim(),
        messageType: "text"
      })
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
        className="flex-1 overflow-y-auto p-4 space-y-4 chat-scrollbar relative"
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
              const currentUserId = session?.user?.id
              const isOwn = currentUserId
                ? (message.senderId === currentUserId ||
                  message.senderId === 'temp-own-message' ||
                  (message as any)._isOptimistic === true)
                : false

              return (
                <div
                  key={message.id}
                  className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
                >
                  <MessageBubble
                    message={message.message}
                    messageType={message.messageType}
                    attachmentUrl={message.attachmentUrl}
                    attachmentName={message.attachmentName}
                    createdAt={message.createdAt}
                    isOwn={isOwn}
                  />
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
          placeholder={isSending || isUploading ? "Sending..." : "Type a message..."}
          onSubmit={handleSend}
          minHeight={52}
          maxHeight={200}
        />
      </div>
    </div>
  )
}