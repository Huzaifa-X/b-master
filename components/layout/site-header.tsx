"use client"

import { SidebarTrigger } from "@/components/ui/sidebar"
import { NotificationsDropdown } from "@/components/notifications-dropdown"
import { useHeaderStore } from "@/lib/stores/header-store"
import { Button } from "@/components/ui/button"
import { Share2 } from "lucide-react"
import { toast } from "sonner"
import { useAssistantStore } from "@/lib/stores/assistant-store"

export function SiteHeader() {
  const { title, subtitle, isThreadActive, onShare } = useHeaderStore()
  const assistantStore = useAssistantStore()

  const handleShare = () => {
    if (onShare) {
      onShare()
    } else {
      // Default share behavior
      toast.success("Share link copied to clipboard!")
    }
  }

  return (
    <header className="bg-background sticky top-0 z-50 flex w-full items-center">
      <div className="flex h-16 w-full items-center gap-2 px-4">
        {/* Mobile sidebar trigger - only visible on mobile */}
        <div className="flex md:hidden">
          <SidebarTrigger className="-ml-1" />
        </div>

        {assistantStore.isAssistantMode && (
          <div className="flex-1 flex flex-col justify-center min-w-0 px-4">
            <h1 className="text-base font-medium truncate">{isThreadActive && title ? `${assistantStore.assistantName} / Title` : assistantStore.assistantName}</h1>
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
