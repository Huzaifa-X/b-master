"use client"

import { use, useEffect, useState, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import { ArtifactChatbot } from "@/components/artifacts/artifact-chatbot"
import { ArtifactPanel } from "@/components/assistants/artifact-panel"
import { useArtifactById } from "@/hooks/useArtifact"
import { useArtifactStore } from "@/lib/stores/artifact-store"
import { useIsMobile } from "@/hooks/use-mobile"
import { useSetAssistantMode } from "@/hooks/useAssistant"
import { toast } from "sonner"

interface PageProps {
  params: Promise<{
    id: string
    artifactId: string
  }>
}

export default function ArtifactPage({ params }: PageProps) {
  const { id: assistantId, artifactId } = use(params)
  const router = useRouter()
  const isMobile = useIsMobile()
  const [isPanelOpen, setIsPanelOpen] = useState(true)
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingContent, setStreamingContent] = useState<string>("")
  const eventSourceRef = useRef<EventSource | null>(null)
  const streamingInitiatedRef = useRef(false)
  const lastUpdateRef = useRef<number>(0)
  const accumulatedCodeRef = useRef<string>("")
  const updateThrottleMs = 100 // Update UI every 100ms instead of every chunk

  // Use React Query hook to fetch artifact
  const { artifact, isLoading, isError, error, refetch } = useArtifactById(artifactId, {
    enabled: !!artifactId
  })

  // Get artifact store methods
  const { setArtifact, setPreviewMode, clearArtifact, closePanel } = useArtifactStore()

  // Function to start streaming artifact generation
  const startStreaming = useCallback(async () => {
    if (isStreaming || eventSourceRef.current) return

    setIsStreaming(true)
    setStreamingContent("")
    accumulatedCodeRef.current = ""
    lastUpdateRef.current = Date.now()

    try {
      console.log("[Artifact] Starting streaming request for artifact:", artifactId)
      // Add timeout to the fetch request (6 minutes total)
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 6 * 60 * 1000)

      const response = await fetch('/api/artifacts/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ artifactId }),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorText = await response.text()
        console.error("[Artifact] Streaming request failed:", response.status, errorText)
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`)
      }

      console.log("[Artifact] Streaming response received, starting to read...")

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (reader) {
        const updateUI = () => {
          const now = Date.now()
          if (now - lastUpdateRef.current >= updateThrottleMs) {
            setStreamingContent(accumulatedCodeRef.current)
            lastUpdateRef.current = now
          }
        }

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value, { stream: true })
          const lines = chunk.split('\n')

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const jsonStr = line.slice(6).trim()
                if (!jsonStr) continue // Skip empty lines

                const data = JSON.parse(jsonStr)

                if (data.type === 'code' && data.content) {
                  try {
                    // Decode base64 content to handle special characters safely
                    const decodedContent = Buffer.from(data.content, 'base64').toString('utf-8')
                    accumulatedCodeRef.current += decodedContent
                    updateUI() // Throttled UI update
                  } catch (decodeError) {
                    console.error("[Artifact] Base64 decode error:", decodeError)
                    // Try using content as-is if base64 decode fails (fallback for old format)
                    accumulatedCodeRef.current += data.content
                    updateUI()
                  }
                } else if (data.type === 'done') {
                  console.log("[Artifact] Streaming completed, total code length:", accumulatedCodeRef.current.length)
                  setIsStreaming(false)

                  // Final update with complete code
                  setStreamingContent(accumulatedCodeRef.current)
                  setArtifact({
                    type: "code",
                    language: "html",
                    content: accumulatedCodeRef.current,
                    title: artifact?.name || "Generated",
                  })

                  // Refetch artifact data to get the final version
                  await refetch()

                  toast.success("Artifact generated successfully!")
                  break
                } else if (data.type === 'error') {
                  console.error("[Artifact] Streaming error:", data.error)
                  setIsStreaming(false)
                  toast.error(data.error || "Failed to generate artifact")
                  break
                } else if (data.type === 'connected') {
                  console.log("[Artifact] Streaming connected successfully")
                }
              } catch (parseError) {
                console.error("[Artifact] JSON parse error:", parseError, "Raw line:", line.slice(0, 200))
                // Continue processing other lines even if one fails
              }
            }
          }
        }
      }
    } catch (error: any) {
      console.error("[Artifact] Streaming error:", error)
      setIsStreaming(false)

      // Handle different types of errors with specific messages
      if (error.name === 'AbortError') {
        toast.error("Request timed out. The generation is taking too long.")
      } else if (error.message?.includes('HTTP error')) {
        toast.error("Server error occurred. Please try again later.")
      } else if (error.message?.includes('Failed to fetch') || error.message?.includes('NetworkError')) {
        toast.error("Network error. Please check your connection and try again.")
      } else if (error.message?.includes('JSON')) {
        toast.error("Data processing error. Please try again.")
      } else {
        toast.error("Failed to generate artifact. Please try again.")
      }
    }
  }, [artifactId, setArtifact, refetch, artifact?.name])

  // Set assistant mode in header (automatically handles fetching and cleanup)
  useSetAssistantMode(assistantId)

  // Set artifact content in store when artifact is loaded
  useEffect(() => {
    if (artifact?.htmlContent) {
      // Check if this is placeholder content (indicating generation in progress)
      const isPlaceholder = artifact.htmlContent.includes("Generating") && artifact.htmlContent.includes("spinner")

      // Only auto-start streaming for very recently created artifacts (within last 30 seconds)
      // to prevent unwanted streaming on page refresh/navigation
      const isRecentArtifact = artifact.createdAt && (Date.now() - new Date(artifact.createdAt).getTime()) < 30000

      if (isPlaceholder && !streamingInitiatedRef.current && isRecentArtifact) {
        // Start streaming for newly created artifacts (only once and only for recent artifacts)
        console.log("[Artifact] Detected placeholder content on recent artifact, starting streaming...")
        streamingInitiatedRef.current = true
        startStreaming()
      } else if (!isPlaceholder && !isStreaming) {
        // Show completed artifact (only when not streaming)
        setArtifact({
          type: "code",
          language: "html",
          content: artifact.htmlContent,
          title: artifact.name,
        })
        // Default to preview mode for HTML artifacts
        setPreviewMode(true)
      } else if (isPlaceholder && !isRecentArtifact) {
        // Handle old placeholder artifacts that weren't completed
        console.log("[Artifact] Found old placeholder artifact, skipping auto-streaming")
      }
    }

    // Cleanup on unmount - close panel and clear artifact
    return () => {
      closePanel()
      clearArtifact()
      // Close any active streaming
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
        eventSourceRef.current = null
      }
      setIsStreaming(false)
      streamingInitiatedRef.current = false
      setStreamingContent("")
    }
  }, [artifact, setArtifact, setPreviewMode, clearArtifact, closePanel, startStreaming, isStreaming])

  const handleBack = () => {
    // Close panel in store before navigating
    closePanel()
    clearArtifact()
    router.push(`/assistants/${assistantId}/artifacts`)
  }
  
  const handleClosePanel = () => {
    if (isMobile) {
      setIsPanelOpen(false)
      // Navigate back after a short delay to allow sheet animation
      setTimeout(() => {
        handleBack()
      }, 300)
    } else {
      // Navigate back when closing the panel
      handleBack()
    }
  }

  if (isLoading) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-background overflow-hidden">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Loading artifact...</p>
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-background overflow-hidden">
        <div className="text-center space-y-4 px-4">
          <div className="rounded-lg border bg-card p-8 shadow-sm max-w-md mx-auto">
            <h2 className="text-xl font-semibold mb-2">Error Loading Artifact</h2>
            <p className="text-sm text-muted-foreground mb-4">
              {error?.message || "Failed to load the artifact. Please try again."}
            </p>
            <div className="flex gap-2 justify-center">
              <Button variant="outline" onClick={() => refetch()}>
                Try Again
              </Button>
              <Button onClick={handleBack}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Artifacts
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!isLoading && !artifact) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-background overflow-hidden">
        <div className="text-center space-y-4 px-4">
          <div className="rounded-lg border bg-card p-8 shadow-sm max-w-md mx-auto">
            <h2 className="text-xl font-semibold mb-2">Artifact Not Found</h2>
            <p className="text-sm text-muted-foreground mb-4">
              The artifact you're looking for doesn't exist or you don't have permission to view it.
            </p>
            <Button onClick={handleBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Artifacts
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (!artifact) {
    return null // This shouldn't happen due to error handling above, but TypeScript needs it
  }

  return (
    <div className="h-full w-full relative" style={{ height: '100%', maxHeight: '100%' }}>
      {/* Desktop View: Resizable Panels */}
      {!isMobile ? (
        <div className="h-full w-full flex flex-col bg-background overflow-hidden">
          <ResizablePanelGroup
            direction="horizontal"
            className="flex-1 min-h-0 h-full"
          >
            {/* Left Side: Chatbot */}
            <ResizablePanel
              defaultSize={30}
              minSize={20}
              maxSize={50}
              className="min-w-0 md:min-w-[300px] min-h-0"
            >
              <ArtifactChatbot
                artifactId={artifact.id}
                artifactName={artifact.name}
                disabled={isStreaming}
                isGenerating={isStreaming}
              />
            </ResizablePanel>

            {/* Resize Handle */}
            <ResizableHandle withHandle className="bg-border hover:bg-primary/20 transition-colors" />

            {/* Right Side: Artifact Panel */}
            <ResizablePanel defaultSize={70} minSize={50} className="min-w-0 min-h-0">
              <ArtifactPanel
                onClose={handleClosePanel}
                streamingContent={isStreaming ? streamingContent : undefined}
                isStreaming={isStreaming}
              />
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
      ) : (
        <>
          {/* Mobile View: Always show Chatbot */}
          <div className="h-full w-full flex flex-col bg-background overflow-hidden">
            <ArtifactChatbot
              artifactId={artifact.id}
              artifactName={artifact.name}
              disabled={isStreaming}
              isGenerating={isStreaming}
            />
          </div>
          
          {/* Mobile View: Overlay Sheet for Artifact Panel */}
          <Sheet open={isPanelOpen} onOpenChange={(open) => !open && handleClosePanel()}>
            <SheetContent 
              side="bottom" 
              className="h-[90vh] p-0 [&>button]:hidden"
            >
              <SheetTitle className="sr-only">Artifact Preview</SheetTitle>
              <ArtifactPanel
                onClose={handleClosePanel}
                streamingContent={isStreaming ? streamingContent : undefined}
                isStreaming={isStreaming}
              />
            </SheetContent>
          </Sheet>
        </>
      )}
    </div>
  )
}

