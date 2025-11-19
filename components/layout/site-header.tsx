"use client"

import { SidebarTrigger } from "@/components/ui/sidebar"
import { NotificationsDropdown } from "@/components/notifications/notifications-dropdown"
import { useHeaderStore } from "@/lib/stores/header-store"
import { Button } from "@/components/ui/button"
import { Share2, Pin, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { useAssistantStore } from "@/lib/stores/assistant-store"
import { usePathname } from "next/navigation"
import { usePinnedAssistants } from "@/hooks/usePinnedAssistants"
import { useMemo } from "react"

export function SiteHeader() {
  const { title, subtitle, isThreadActive, onShare } = useHeaderStore()
  const assistantStore = useAssistantStore()
  const isMessagesPage = usePathname().includes("/messages")
  const { assistants, togglePin, isToggling } = usePinnedAssistants()

  // Check if current assistant is pinned
  const isPinned = useMemo(() => {
    if (!assistantStore.currentAssistantId) return false
    return assistants.some(a => a.id === assistantStore.currentAssistantId)
  }, [assistants, assistantStore.currentAssistantId])

  const handleShare = () => {
    if (onShare) {
      onShare()
    } else {
      // Default share behavior
      toast.success("Share link copied to clipboard!")
    }
  }

  const handleTogglePin = async () => {
    if (!assistantStore.currentAssistantId) return
    await togglePin(assistantStore.currentAssistantId)
  }

  return (
    <header className={`bg-background sticky top-0 z-50 flex w-full items-center ${isMessagesPage ? "border-b" : ""}`}>
      <div className="flex h-16 w-full items-center gap-2 px-4">
        {/* Mobile sidebar trigger - only visible on mobile */}
        <div className="flex md:hidden">
          <SidebarTrigger className="-ml-1" />
        </div>

        {assistantStore.isAssistantMode && (
          <div className="flex-1 flex items-center gap-2 min-w-0 px-4">
            <h1 className="text-base font-medium truncate">
              {isThreadActive && title
                ? `${assistantStore.assistantName || 'Assistant'} / ${title}`
                : assistantStore.assistantName || 'Assistant'}
            </h1>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleTogglePin}
              disabled={isToggling || !assistantStore.currentAssistantId}
              className="shrink-0 h-8 w-8 p-0 hover:bg-transparent hover:text-primary"
              title={isPinned ? "Unpin from sidebar" : "Pin to sidebar"}
            >
              {isToggling ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Pin className={`h-4 w-4 ${isPinned ? 'fill-current text-primary' : ''}`} />
              )}
            </Button>
          </div>
        )}

        {/* Thread name on the left (ONLY when thread is active) */}
        {!assistantStore.isAssistantMode && isThreadActive && title && (
          <div className="flex-1 flex flex-col justify-center min-w-0 px-4">
            <h1 className="text-lg font-medium truncate">Title</h1>
          </div>
        )}

        {/* Spacer when no thread */}
        {!isThreadActive && <div className="flex-1" />}

        {/* Right side actions - ONLY show when thread is active */}
        {isThreadActive ? (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleShare}
              className="flex items-center gap-2 bg-transparent hover:bg-transparent hover:text-primary"
            >
              <Share2 className="h-4 w-4" />
              <span className="hidden sm:inline">Share</span>
            </Button>
          </div>
        ) :
          (<div className="flex items-center gap-2">
            <NotificationsDropdown />
          </div>
          )}
      </div>
    </header>
  )
}
