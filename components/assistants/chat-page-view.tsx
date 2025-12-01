// components/assistants/chat-page-view.tsx
"use client"

import { useCustomChat } from "@/hooks/useCustomChat"
import { ScrollArea } from "@/components/ui/scroll-area"
import { UserMessage } from "@/components/assistants/message-components/user-message"
import { AssistantMessage } from "@/components/assistants/message-components/assistant-message"
import { ChatInput } from "@/components/assistants/chat-input"
import { ArtifactPanel } from "@/components/assistants/artifact-panel"
import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { StopCircle, Loader2, ChevronDown } from "lucide-react"
import Image from "next/image"
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable"
import { useArtifactStore } from "@/lib/stores/artifact-store"
import { useIsMobile } from "@/hooks/use-mobile"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"

interface ChatPageViewProps {
  chatId: string
  mode: "ask-b" | "assistant"
  assistantId?: string
}

export function ChatPageView({ chatId, mode, assistantId }: ChatPageViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isAtBottom, setIsAtBottom] = useState(false) // Start as false, will be updated when viewport is found
  const viewportRef = useRef<HTMLElement | null>(null)
  const { setArtifact, isPanelOpen, closePanel } = useArtifactStore()
  const isMobile = useIsMobile()

  // Close artifact panel when switching to a new chat
  useEffect(() => {
    closePanel()
  }, [chatId, closePanel])

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

  // Find viewport element and set up scroll listener
  useEffect(() => {
    if (!isReady) return

    const findViewport = (): HTMLElement | null => {
      // Try multiple strategies to find the viewport

      // Strategy 1: The containerRef div itself is now scrollable (has overflow-auto)
      if (containerRef.current) {
        if (containerRef.current.scrollHeight > containerRef.current.clientHeight) {
          return containerRef.current
        }
      }

      // Strategy 2: Find ScrollArea root and then viewport (fallback for other layouts)
      const scrollArea = document.querySelector('[data-slot="scroll-area"]')
      if (scrollArea) {
        const viewport = scrollArea.querySelector('[data-slot="scroll-area-viewport"]') as HTMLElement
        if (viewport) return viewport
      }

      // Strategy 3: Find any element with the viewport class/attribute near our container
      if (containerRef.current) {
        const parent = containerRef.current.parentElement
        if (parent) {
          const viewport = parent.querySelector('[data-slot="scroll-area-viewport"]') as HTMLElement
          if (viewport) return viewport
        }
      }

      return null
    }

    let timeoutId: NodeJS.Timeout | null = null
    let viewport: HTMLElement | null = null
    let rafId: number | null = null
    let cleanupFn: (() => void) | null = null

    const checkScrollPosition = () => {
      if (!viewport) return

      const { scrollTop, scrollHeight, clientHeight } = viewport
      const threshold = 150 // Consider "at bottom" if within 150px
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight
      const atBottom = distanceFromBottom < threshold
      setIsAtBottom(atBottom)
    }

    const setupScrollListener = () => {
      viewport = findViewport()
      if (!viewport) {
        // Retry after a short delay if viewport not found (max 10 retries)
        let retries = 0
        const maxRetries = 10
        const retry = () => {
          if (retries < maxRetries) {
            retries++
            timeoutId = setTimeout(() => {
              viewport = findViewport()
              if (viewport) {
                setupListeners()
              } else {
                retry()
              }
            }, 100)
          }
        }
        retry()
        return
      }

      setupListeners()
    }

    const setupListeners = () => {
      if (!viewport) return

      viewportRef.current = viewport

      // Initial check
      checkScrollPosition()

      // Use requestAnimationFrame for smooth scroll detection
      const handleScroll = () => {
        if (rafId) {
          cancelAnimationFrame(rafId)
        }
        rafId = requestAnimationFrame(checkScrollPosition)
      }

      // Add scroll listener
      viewport.addEventListener('scroll', handleScroll, { passive: true })
      
      // Also check on resize and content changes
      const handleResize = () => {
        checkScrollPosition()
      }
      window.addEventListener('resize', handleResize)

      // MutationObserver to detect content changes
      const observer = new MutationObserver(() => {
        // Small delay to ensure scrollHeight is updated
        setTimeout(checkScrollPosition, 50)
      })
      observer.observe(viewport, { childList: true, subtree: true })
      
      // Also check after a short delay to ensure initial render is complete
      setTimeout(checkScrollPosition, 100)

      // Cleanup function
      cleanupFn = () => {
        viewport?.removeEventListener('scroll', handleScroll)
        window.removeEventListener('resize', handleResize)
        observer.disconnect()
        if (rafId) {
          cancelAnimationFrame(rafId)
        }
      }
    }

    setupScrollListener()

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
      if (cleanupFn) {
        cleanupFn()
      }
    }
  }, [messages.length, isReady]) // Re-run when messages change or component is ready

  // Auto-scroll to bottom when new messages arrive (only if already at bottom)
  useEffect(() => {
    if (isAtBottom && viewportRef.current) {
      // Use setTimeout to ensure DOM is updated
      setTimeout(() => {
        if (viewportRef.current) {
          viewportRef.current.scrollTo({
            top: viewportRef.current.scrollHeight,
            behavior: 'smooth'
          })
        }
      }, 0)
    }
  }, [messages, isAtBottom])

  // Initial scroll to bottom when component mounts or messages load
  useEffect(() => {
    if (viewportRef.current && messages.length > 0) {
      // Scroll to bottom on initial render with smooth animation
      setTimeout(() => {
        if (viewportRef.current) {
          viewportRef.current.scrollTo({
            top: viewportRef.current.scrollHeight,
            behavior: 'smooth'
          })
          setIsAtBottom(true)
        }
      }, 100)
    }
  }, [isReady, messages.length > 0])

  // Listen for code preview events
  useEffect(() => {
    const handler = (e: CustomEvent) => {
      const { content, language, type } = e.detail
      setArtifact({
        type: type || "code",
        language: language || "text",
        content: content,
        title: `Code Preview (${language || "text"})`
      })
      // On mobile, the Sheet will be controlled by isPanelOpen state
    }

    window.addEventListener("open-code-preview", handler as EventListener)
    return () => {
      window.removeEventListener("open-code-preview", handler as EventListener)
    }
  }, [setArtifact])

  const scrollToBottom = () => {
    if (viewportRef.current) {
      viewportRef.current.scrollTo({
        top: viewportRef.current.scrollHeight,
        behavior: 'smooth'
      })
      // Update state immediately
      setIsAtBottom(true)
    }
  }

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

  const chatContent = (
    <div className="flex h-full flex-col bg-background relative overflow-x-auto">
      {/* Messages */}
      <div ref={containerRef} className="flex-1 relative overflow-auto">
        <div className="min-h-full">
        <div className="mx-auto w-full max-w-[44rem] px-4 py-4 overflow-x-auto sm:max-w-[44rem] max-w-none">
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
        </div>
      </div>

      {/* Scroll to Bottom Button */}
      {!isAtBottom && messages.length > 0 && (
        <div className="absolute bottom-32 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
          <div className="pointer-events-auto animate-in fade-in slide-in-from-bottom-2 duration-200">
            <Button
              size="icon"
              className="h-10 w-10 rounded-full shadow-lg bg-primary hover:bg-primary/90 text-primary-foreground mb-2"
              onClick={scrollToBottom}
              title="Scroll to bottom"
            >
              <ChevronDown className="h-5 w-5" />
            </Button>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="sticky bottom-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-4">
        <div className="mx-auto w-full max-w-[44rem]">
          {/* {isStreaming && (
            <div className="mb-2 flex items-center justify-center">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancel}
                className="gap-2 mb-2"
              >
                <StopCircle className="h-4 w-4" />
              </Button>
            </div>
          )} */}
          
          <ChatInput
            onSubmit={handleSend}
            isLoading={isStreaming}
            disabled={isStreaming}
            placeholder="Send a message..."
            className="border-primary/50 shadow-lg"
            mode={mode}
          />
        </div>
      </div>
    </div>
  )

  // Mobile: Use Sheet from bottom
  if (isMobile) {
    return (
      <>
        {chatContent}
        <Sheet open={isPanelOpen} onOpenChange={(open) => !open && closePanel()}>
          <SheetContent
            side="bottom"
            className="h-[80vh] p-0 [&>button]:hidden"
          >
            <SheetHeader className="sr-only">
              <SheetTitle>Code Preview</SheetTitle>
            </SheetHeader>
            <ArtifactPanel onClose={closePanel} />
          </SheetContent>
        </Sheet>
      </>
    )
  }

  // Desktop: Use Resizable Panel
  if (!isPanelOpen) {
    return chatContent
  }

  return (
    <ResizablePanelGroup direction="horizontal" className="h-full">
      {/* Main Chat Area */}
      <ResizablePanel defaultSize={70} minSize={20}>
        {chatContent}
      </ResizablePanel>

      {/* Resizable Handle - More responsive with wider hit area */}
      <ResizableHandle 
        withHandle
      />

      {/* Artifact Panel */}
      <ResizablePanel defaultSize={30} minSize={20} maxSize={50}>
        <ArtifactPanel onClose={closePanel} />
      </ResizablePanel>
    </ResizablePanelGroup>
  )
}