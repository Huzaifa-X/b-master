"use client"

import { useEffect } from "react"
import { ThreadPrimitive } from "@assistant-ui/react"
import { useHeaderStore } from "@/lib/stores/header-store"
import { toast } from "sonner"

export function ThreadHeaderUpdater() {
  const setTitle = useHeaderStore((state) => state.setTitle)
  const setThreadActive = useHeaderStore((state) => state.setThreadActive)
  const reset = useHeaderStore((state) => state.reset)

  return (
    <ThreadPrimitive.If empty={false}>
      <ThreadHeaderUpdaterInner 
        setTitle={setTitle}
        setThreadActive={setThreadActive}
        reset={reset}
      />
    </ThreadPrimitive.If>
  )
}

function ThreadHeaderUpdaterInner({ 
  setTitle, 
  setThreadActive, 
  reset 
}: { 
  setTitle: (title: string) => void
  setThreadActive: (isActive: boolean, onShare?: () => void) => void
  reset: () => void
}) {
  // This will only run when thread is not empty
  useEffect(() => {
    // Get the first message from the thread
    const getThreadTitle = () => {
      const viewport = document.querySelector('[class*="aui-thread-viewport"]')
      if (!viewport) return null
      
      const userMessage = viewport.querySelector('[data-role="user"]')
      if (!userMessage) return null
      
      const textContent = userMessage.textContent?.trim()
      return textContent || null
    }

    const threadTitle = getThreadTitle()
    
    if (threadTitle) {
      // Truncate long titles
      const displayTitle = threadTitle.length > 50 
        ? threadTitle.substring(0, 50) + "..." 
        : threadTitle
      
      // Set the title and mark thread as active
      setTitle(displayTitle)
      setThreadActive(true, () => {
        // Share handler
        toast.success("Share link copied to clipboard!")
        console.log("Sharing thread:", threadTitle)
      })
    }

    // Cleanup when component unmounts (thread becomes empty)
    return () => {
      reset()
    }
  }, [setTitle, setThreadActive, reset])

  return null
}

