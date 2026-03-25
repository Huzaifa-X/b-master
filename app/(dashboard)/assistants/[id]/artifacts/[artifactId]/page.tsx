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

import { useLocale } from "@/lib/i18n"

export default function ArtifactPage({ params }: PageProps) {
  const { id: assistantId, artifactId } = use(params)
  const router = useRouter()
  const isMobile = useIsMobile()
  const [isPanelOpen, setIsPanelOpen] = useState(true)
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingContent, setStreamingContent] = useState<string>("")
  const [selectedVersionCode, setSelectedVersionCode] = useState<string | null>(null)
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null)
  const [currentJobId, setCurrentJobId] = useState<string | null>(null)
  const [generationProgress, setGenerationProgress] = useState<number>(0)
  const eventSourceRef = useRef<EventSource | null>(null)
  const streamingInitiatedRef = useRef(false)
  const artifactContentSetRef = useRef<string | null>(null) // Track which content we've already set
  const { t } = useLocale()

  // Use React Query hook to fetch artifact
  const { artifact, isLoading, isError, error, refetch } = useArtifactById(artifactId, {
    enabled: !!artifactId
  })

  // Get artifact store methods
  const { setArtifact, setPreviewMode, clearArtifact, closePanel } = useArtifactStore()

  // Function to start streaming artifact generation using queue system
  const startStreaming = useCallback(async () => {
    if (isStreaming || eventSourceRef.current) return

    setIsStreaming(true)
    setStreamingContent("")
    setGenerationProgress(0)

    try {
      console.log("[Artifact] Creating generation job for artifact:", artifactId)

      // Step 1: Create a generation job
      const response = await fetch('/api/artifacts/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ artifactId }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error("[Artifact] Job creation failed:", response.status, errorText)
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`)
      }

      const jobData = await response.json()
      console.log("[Artifact] Job created:", jobData)

      if (!jobData.useQueue || !jobData.jobId || !jobData.streamUrl) {
        throw new Error("Invalid job response")
      }

      setCurrentJobId(jobData.jobId)

      // Step 2: Connect to the job stream using EventSource
      console.log("[Artifact] Connecting to job stream:", jobData.streamUrl)
      const eventSource = new EventSource(jobData.streamUrl)
      eventSourceRef.current = eventSource

      eventSource.onopen = () => {
        console.log("[Artifact] EventSource connection opened")
      }

      eventSource.onmessage = async (event) => {
        try {
          const data = JSON.parse(event.data)
          console.log("[Artifact] Received event:", data.type, data)

          switch (data.type) {
            case 'connected':
              console.log("[Artifact] Connected to job stream")
              break

            case 'status':
            case 'progress':
              // Update progress
              if (typeof data.progress === 'number') {
                setGenerationProgress(data.progress)
                console.log(`[Artifact] Progress: ${data.progress}%`)
              }

              // Update streaming content if partial result is available
              if (data.partialResult) {
                setStreamingContent(data.partialResult)
                console.log(`[Artifact] Streaming code: ${data.partialResult.length} characters`)
              }
              break

            case 'completed':
              console.log("[Artifact] Generation completed!")
              setIsStreaming(false)
              setGenerationProgress(100)

              // Set the generated artifact content
              if (data.result) {
                setStreamingContent(data.result)
                setArtifact({
                  type: "code",
                  language: "html",
                  content: data.result,
                  title: artifact?.name || t("artifacts.generated"),
                })
              }

              // Refetch artifact data to get the final version from database
              await refetch()

              toast.success(t("artifacts.toasts.generatedSuccess"))

              // Close the EventSource
              eventSource.close()
              eventSourceRef.current = null
              break

            case 'error':
              console.error("[Artifact] Job error:", data.error)
              setIsStreaming(false)
              toast.error(data.error || t("artifacts.errors.generateFailed"))

              // Close the EventSource
              eventSource.close()
              eventSourceRef.current = null
              break
          }
        } catch (parseError) {
          console.error("[Artifact] Error parsing event data:", parseError)
        }
      }

      eventSource.onerror = (error) => {
        console.error("[Artifact] EventSource error:", error)
        setIsStreaming(false)
        toast.error(t("artifacts.errors.connectionLost"))

        eventSource.close()
        eventSourceRef.current = null
      }

    } catch (error: any) {
      console.error("[Artifact] Streaming error:", error)
      setIsStreaming(false)

      // Handle different types of errors with specific messages
      if (error.message?.includes('HTTP error')) {
        toast.error(t("artifacts.errors.serverError"))
      } else if (error.message?.includes('Failed to fetch') || error.message?.includes('NetworkError')) {
        toast.error(t("artifacts.errors.networkError"))
      } else if (error.message?.includes('Invalid job response')) {
        toast.error(t("artifacts.errors.invalidResponse"))
      } else {
        toast.error(t("artifacts.errors.generateFailed"))
      }
    }
  }, [artifactId, setArtifact, refetch, artifact?.name, isStreaming, t])

  // Set assistant mode in header (automatically handles fetching and cleanup)
  useSetAssistantMode(assistantId)

  // Handle version selection from version history dialog
  const handleVersionSelect = (versionCode: string, versionId: string) => {
    setSelectedVersionCode(versionCode)
    setSelectedVersionId(versionId)

    // Update the ref to prevent the main effect from overwriting
    artifactContentSetRef.current = versionCode

    // Update the artifact store with the selected version
    setArtifact({
      type: "code",
      language: "html",
      content: versionCode,
      title: artifact?.name || t("artifacts.artifactTitleShort"),
    })

    toast.success(t("artifacts.toasts.versionLoaded"))
  }

  // Set artifact content in store when artifact is loaded
  useEffect(() => {
    // Don't override if user has selected a specific version
    if (selectedVersionCode) {
      console.log("[Artifact] Skipping - selectedVersionCode exists")
      return
    }

    // Ensure artifact is loaded
    if (!artifact) {
      console.log("[Artifact] Skipping - no artifact data yet")
      return
    }

    console.log("[Artifact] State check:", {
      versionsCount: artifact.versionsCount,
      hasVersions: artifact.hasVersions,
      hasHtmlContent: !!artifact.htmlContent,
      htmlContentLength: artifact.htmlContent?.length ?? 0,
      createdAt: artifact.createdAt,
      ageSeconds: artifact.createdAt ? Math.floor((Date.now() - new Date(artifact.createdAt).getTime()) / 1000) : 'N/A',
      streamingInitiated: streamingInitiatedRef.current,
      isStreaming
    })

    // Check if this is a brand new artifact (no versions created yet)
    const hasNoVersions = artifact.versionsCount === 0
    const hasEmptyContent = !artifact.htmlContent || artifact.htmlContent.trim() === ''
    const isRecentArtifact = artifact.createdAt && (Date.now() - new Date(artifact.createdAt).getTime()) < 300000 // 5 minutes

    // Start streaming for brand new artifacts with no versions
    if (hasNoVersions && hasEmptyContent && isRecentArtifact && !streamingInitiatedRef.current) {
      console.log("[Artifact] ✅ Conditions met! Starting initial streaming for new artifact...")
      console.log("[Artifact] - No versions exist (versionsCount:", artifact.versionsCount, ")")
      console.log("[Artifact] - Empty content (htmlContent:", artifact.htmlContent, ")")
      console.log("[Artifact] - Recent artifact (age:", Math.floor((Date.now() - new Date(artifact.createdAt).getTime()) / 1000), "seconds)")
      streamingInitiatedRef.current = true
      startStreaming()
      return
    }

    // Show completed artifact content - only if we haven't already set this exact content
    if (artifact.htmlContent && artifact.htmlContent.trim() !== '' && !isStreaming) {
      // Prevent infinite loop by checking if we've already set this content
      if (artifactContentSetRef.current === artifact.htmlContent) {
        console.log("[Artifact] Skipping - content already set")
        return
      }

      console.log("[Artifact] Displaying existing artifact content (", artifact.htmlContent.length, "characters)")
      artifactContentSetRef.current = artifact.htmlContent
      setArtifact({
        type: "code",
        language: "html",
        content: artifact.htmlContent,
        title: artifact.name,
      })
      // Default to preview mode for HTML artifacts
      setPreviewMode(true)
      return
    }

    console.log("[Artifact] No action taken - waiting for conditions to be met")

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
      // Don't reset streamingInitiatedRef here to prevent double streaming
      // in React 18 Strict Mode (development) which causes effects to run twice
      setStreamingContent("")
      setSelectedVersionCode(null)
      setSelectedVersionId(null)
      artifactContentSetRef.current = null
    }
  }, [artifact, setArtifact, setPreviewMode, clearArtifact, closePanel, startStreaming, isStreaming, selectedVersionCode])

  const handleBack = () => {
    // Close panel in store before navigating
    closePanel()
    clearArtifact()
    router.push(`/assistants/${assistantId}/artifacts`)
  }

  if (isLoading) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-background overflow-hidden">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">{t("artifacts.loadingArtifact")}</p>
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-background overflow-hidden">
        <div className="text-center space-y-4 px-4">
          <div className="rounded-lg border bg-card p-8 shadow-sm max-w-md mx-auto">
            <h2 className="text-xl font-semibold mb-2">{t("artifacts.errors.loadArtifactTitle")}</h2>
            <p className="text-sm text-muted-foreground mb-4">
              {error?.message || t("artifacts.errors.loadArtifactDescription")}
            </p>
            <div className="flex gap-2 justify-center">
              <Button variant="outline" onClick={() => refetch()}>
                {t("common.tryAgain")}
              </Button>
              <Button onClick={handleBack}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                {t("artifacts.backToArtifacts")}
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
            <h2 className="text-xl font-semibold mb-2">{t("artifacts.errors.artifactNotFound")}</h2>
            <p className="text-sm text-muted-foreground mb-4">
              {t("artifacts.errors.artifactNotFoundDescription")}
            </p>
            <Button onClick={handleBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t("artifacts.backToArtifacts")}
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
                assistantId={assistantId}
                disabled={isStreaming}
                isGenerating={isStreaming}
                isPanelOpen={isPanelOpen}
                onTogglePanel={() => setIsPanelOpen(!isPanelOpen)}
                onclose={handleBack}
              />
            </ResizablePanel>

            {/* Resize Handle - Only show when panel is open */}
            {isPanelOpen && (
              <ResizableHandle withHandle className="bg-border hover:bg-primary/20 transition-colors" />
            )}

            {/* Right Side: Artifact Panel - Only show when panel is open */}
            {isPanelOpen && (
              <ResizablePanel defaultSize={70} minSize={50} className="min-w-0 min-h-0">
                <ArtifactPanel
                  onClose={() => setIsPanelOpen(false)}
                  streamingContent={isStreaming ? streamingContent : undefined}
                  isStreaming={isStreaming}
                  generationProgress={generationProgress}
                  artifactId={artifactId}
                  onVersionSelect={handleVersionSelect}
                />
              </ResizablePanel>
            )}
          </ResizablePanelGroup>
        </div>
      ) : (
        <>
          {/* Mobile View: Always show Chatbot */}
          <div className="h-full w-full flex flex-col bg-background overflow-hidden">
            <ArtifactChatbot
              artifactId={artifact.id}
              artifactName={artifact.name}
              assistantId={assistantId}
              disabled={isStreaming}
              isGenerating={isStreaming}
              isPanelOpen={isPanelOpen}
              onTogglePanel={() => setIsPanelOpen(!isPanelOpen)}
            />
          </div>
          
          {/* Mobile View: Overlay Sheet for Artifact Panel */}
          <Sheet open={isPanelOpen} onOpenChange={(open) => !open && setIsPanelOpen(!isPanelOpen)}>
            <SheetContent 
              side="bottom" 
              className="h-[90vh] p-0 [&>button]:hidden"
            >
              <SheetTitle className="sr-only">{t("artifacts.preview")}</SheetTitle>
              <ArtifactPanel
                onClose={() => setIsPanelOpen(false)}
                streamingContent={isStreaming ? streamingContent : undefined}
                isStreaming={isStreaming}
                generationProgress={generationProgress}
                artifactId={artifactId}
                onVersionSelect={handleVersionSelect}
              />
            </SheetContent>
          </Sheet>
        </>
      )}
    </div>
  )
}

