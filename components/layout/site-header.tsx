"use client"

import { SidebarTrigger } from "@/components/ui/sidebar"
import { NotificationsDropdown } from "@/components/notifications/notifications-dropdown"
import { ShareDialog } from "@/components/assistants/share-dialog"
import { Button } from "@/components/ui/button"
import { Share2, Pin, Loader2, Users } from "lucide-react"
import { toast } from "sonner"
import { useAssistantStore } from "@/lib/stores/assistant-store"
import { usePathname } from "next/navigation"
import { usePinnedAssistants } from "@/hooks/usePinnedAssistants"
import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { getSpecificChat } from "@/app/actions/chat.action"
import { Skeleton } from "../ui/skeleton"

export function SiteHeader() {
  const assistantStore = useAssistantStore()
  const pathname = usePathname()
  const isMessagesPage = pathname.includes("/messages")
  const { assistants, togglePin, isToggling } = usePinnedAssistants()

  // Extract chat ID and assistant ID from pathname
  const { chatId, assistantIdFromPath, isChatPage } = useMemo(() => {
    // For ask-b: /ask-b/[id]
    if (pathname.startsWith("/ask-b/")) {
      const parts = pathname.split("/ask-b/")
      return { 
        chatId: parts[1] || null, 
        assistantIdFromPath: null,
        isChatPage: !!parts[1]
      }
    }
    // For assistant: /assistants/[assistantId]/[chatId]
    // Only treat as chat if the third segment is not a known non-chat route
    if (pathname.startsWith("/assistants/")) {
      const parts = pathname.split("/")
      const nonChatRoutes = ["contacts", "messages", "news", "artifacts", "add", "profile"]
      const thirdSegment = parts.length >= 4 ? parts[3] : null
      const isChat = thirdSegment && !nonChatRoutes.includes(thirdSegment)
      
      return {
        chatId: isChat ? thirdSegment : null,
        assistantIdFromPath: parts.length >= 3 ? parts[2] : null,
        isChatPage: isChat
      }
    }
    return { chatId: null, assistantIdFromPath: null, isChatPage: false }
  }, [pathname])

  // Determine if we're in ask-b mode or assistant mode
  const isAskBMode = pathname.startsWith("/ask-b")
  const isAssistantMode = pathname.startsWith("/assistants/")
  const isAssistantAddPage = pathname.startsWith("/assistants/add") || pathname.startsWith("/assistants/new") || (pathname.startsWith("/assistants/") && pathname.includes("/edit"))

  // Fetch chat data if chat ID exists
  const { data: chatData } = useQuery({
    queryKey: ["chat-header", chatId],
    queryFn: async () => {
      if (!chatId || chatId.trim() === '') return null
      const result = await getSpecificChat(chatId)
      return result.success ? result.chat : null
    },
    enabled: !!chatId && chatId.trim() !== '',
    staleTime: 1000 * 5, // 5 seconds - update more frequently for topic changes
    refetchInterval: 1000 * 10, // Refetch every 10 seconds to catch topic updates
  })

  // Get assistant name - prioritize from chatData, then store, then fallback
  const assistantName = useMemo(() => {
    if (chatData?.assistantName) return chatData.assistantName
    if (assistantStore.assistantName) return assistantStore.assistantName
    return "Assistant"
  }, [chatData?.assistantName, assistantStore.assistantName])

  // Check if topic is valid (not "New Chat" and not a full message - topics should be short)
  const isValidTopic = useMemo(() => {
    if (!chatData?.topic) return false
    if (chatData.topic === "New Chat") return false
    // Topics should be short (max 50 chars typically), if it's longer it might be a message
    if (chatData.topic.length > 60) return false
    return true
  }, [chatData?.topic])

  // Check if current assistant is pinned
  const isPinned = useMemo(() => {
    if (!assistantStore.currentAssistantId) return false
    return assistants.some(a => a.id === assistantStore.currentAssistantId)
  }, [assistants, assistantStore.currentAssistantId])

  const handleTogglePin = async () => {
    if (!assistantStore.currentAssistantId) return
    togglePin(assistantStore.currentAssistantId)
  }

  const handleShareRegistration = async () => {
    const registrationUrl = `${window.location.origin}/signup`
    try {
      await navigator.clipboard.writeText(registrationUrl)
      toast.success("Registration link copied to clipboard!")
    } catch (error) {
      console.error("Failed to copy registration link:", error)
      toast.error("Failed to copy link")
    }
  }

  return (
    <header className={`bg-background sticky top-0 z-50 flex w-full items-center ${isMessagesPage ? "border-b" : ""}`}>
      <div className="flex h-16 w-full items-center gap-2 px-4">
        {/* Mobile sidebar trigger - only visible on mobile */}
        <div className="flex md:hidden">
          <SidebarTrigger className="-ml-1" />
        </div>

        {/* Assistant Mode: Show assistant name when assistant is open, show chat topic when specific chat is open */}
        {isAssistantMode && !isAssistantAddPage && (
          <div className="flex-1 flex items-center gap-2 min-w-0 px-4">
            <h1 className="text-base font-medium truncate">
              {chatId && isValidTopic && chatData
                ? `${assistantName} / ${chatData.topic}`
                : assistantName === "Assistant Name" || assistantName === "Assistant" ? <Skeleton className="h-4 w-24" /> : assistantName}
            </h1>
            {
              assistantName === "Assistant Name" || assistantName === "Assistant" ? <Skeleton className="h-4 w-24" /> :
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleTogglePin}
                  disabled={isToggling || !(assistantIdFromPath || assistantStore.currentAssistantId)}
                  className="shrink-0 h-8 w-8 p-0 hover:bg-transparent hover:text-primary"
                  title={isPinned ? "Unpin from sidebar" : "Pin to sidebar"}
                >
                  {isToggling ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Pin className={`h-4 w-4 ${isPinned ? 'fill-current text-primary' : ''}`} />
                  )}
                </Button>
            }
          </div>
        )}

        {/* Ask-B Mode: Show chat topic when chat is open */}
        {isAskBMode && chatId && isValidTopic && chatData && (
          <div className="flex-1 flex flex-col justify-center min-w-0 px-4">
            <h1 className="text-base font-medium truncate">{chatData.topic}</h1>
          </div>
        )}

        {/* Spacer when no content to show */}
        {(!isAssistantMode || isAssistantAddPage) && !isAskBMode && <div className="flex-1" />}
        {isAskBMode && !chatId && <div className="flex-1" />}

        {/* Empty skeleton spacer to maintain consistent layout */}
        {(isAssistantMode && !isAssistantAddPage && !chatId) || (isAskBMode && chatId && (!isValidTopic || !chatData)) ? (
          <div className="flex-1 flex items-center gap-2 min-w-0 px-4">
            <Skeleton className="h-4 w-32" />
          </div>
        ) : null}

        {/* Right side actions */}
        <div className="flex items-center gap-2">
          {/* Share registration page button - only on home page */}
          {pathname === "/home" && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 hover:bg-muted hover:text-primary"
              title="Share registration page"
              onClick={() => {
                const registrationUrl = `${window.location.origin}/signup`
                navigator.clipboard.writeText(registrationUrl)
                toast.success("Registration page link copied to clipboard!")
              }}
            >
              <Share2 className="h-4 w-4 text-primary" />
            </Button>
          )}

          {/* Show chat share button when chat is open, otherwise notifications */}
          {isChatPage && chatId && !isAssistantAddPage ? (
            <ShareDialog
              shareableId={chatData?.shareableId || ""}
              chatTopic={chatData?.topic}
              trigger={
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  title="Share conversation"
                >
                  <Share2 className="h-4 w-4" />
                </Button>
              }
            />
          ) : (
            <NotificationsDropdown />
          )}
        </div>
      </div>
    </header>
  )
}
