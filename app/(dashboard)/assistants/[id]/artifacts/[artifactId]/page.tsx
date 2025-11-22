"use client"

import { use, useEffect, useState } from "react"
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
  
  // Use React Query hook to fetch artifact
  const { artifact, isLoading, isError, error } = useArtifactById(artifactId)
  
  // Get artifact store methods
  const { setArtifact, setPreviewMode, clearArtifact, closePanel } = useArtifactStore()
  
  // Set assistant mode in header (automatically handles fetching and cleanup)
  useSetAssistantMode(assistantId)

  // Set artifact content in store when artifact is loaded
  useEffect(() => {
    if (artifact?.htmlContent) {
      setArtifact({
        type: "code",
        language: "html",
        content: artifact.htmlContent,
        title: artifact.name,
      })
      // Default to preview mode for HTML artifacts
      setPreviewMode(true)
    }

    // Cleanup on unmount - close panel and clear artifact
    return () => {
      closePanel()
      clearArtifact()
    }
  }, [artifact, setArtifact, setPreviewMode, clearArtifact, closePanel])

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

  if (isError || !artifact) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-background overflow-hidden">
        <div className="text-center space-y-4 px-4">
          <div className="rounded-lg border bg-card p-8 shadow-sm max-w-md mx-auto">
            <h2 className="text-xl font-semibold mb-2">Artifact Not Found</h2>
            <p className="text-sm text-muted-foreground mb-4">
              {error?.message || "The artifact you're looking for doesn't exist or you don't have permission to view it."}
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
              <ArtifactChatbot artifactId={artifact.id} artifactName={artifact.name} />
            </ResizablePanel>

            {/* Resize Handle */}
            <ResizableHandle withHandle className="bg-border hover:bg-primary/20 transition-colors" />

            {/* Right Side: Artifact Panel */}
            <ResizablePanel defaultSize={70} minSize={50} className="min-w-0 min-h-0">
              <ArtifactPanel onClose={handleClosePanel} />
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
      ) : (
        <>
          {/* Mobile View: Always show Chatbot */}
          <div className="h-full w-full flex flex-col bg-background overflow-hidden">
            <ArtifactChatbot artifactId={artifact.id} artifactName={artifact.name} />
          </div>
          
          {/* Mobile View: Overlay Sheet for Artifact Panel */}
          <Sheet open={isPanelOpen} onOpenChange={(open) => !open && handleClosePanel()}>
            <SheetContent 
              side="bottom" 
              className="h-[90vh] p-0 [&>button]:hidden"
            >
              <SheetTitle className="sr-only">Artifact Preview</SheetTitle>
              <ArtifactPanel onClose={handleClosePanel} />
            </SheetContent>
          </Sheet>
        </>
      )}
    </div>
  )
}

