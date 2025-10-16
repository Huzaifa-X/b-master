"use client";

import { Assistant } from "@/components/assistant-ui/assistant";
import { ArtifactPanel } from "@/components/assistant-ui/artifact-panel";
import { useAssistantRuntime } from "@assistant-ui/react";
import { useEffect } from "react";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import { useArtifactStore } from "@/lib/stores/artifact-store";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sheet, SheetContent } from "@/components/ui/sheet";

export default function AskBPage() {
  const runtime = useAssistantRuntime();
  const isPanelOpen = useArtifactStore((state) => state.isPanelOpen);
  const closePanel = useArtifactStore((state) => state.closePanel);
  const isMobile = useIsMobile();

  useEffect(() => {
    // Always switch to a new thread when this page loads
    runtime.switchToNewThread();
  }, [runtime]);

  const handleClosePanel = () => {
    closePanel();
  };

  return (
    <div className="h-full w-full relative">
      {/* Desktop View: Resizable Panels */}
      {!isMobile && isPanelOpen ? (
        <ResizablePanelGroup direction="horizontal">
          {/* Chat Panel */}
          <ResizablePanel defaultSize={60} minSize={30} maxSize={80}>
            <Assistant />
          </ResizablePanel>

          {/* Resizable Handle */}
          <ResizableHandle withHandle className="bg-border hover:bg-primary/20 transition-colors" />

          {/* Artifact Panel */}
          <ResizablePanel defaultSize={40} minSize={20} maxSize={70}>
            <ArtifactPanel onClose={handleClosePanel} />
          </ResizablePanel>
        </ResizablePanelGroup>
      ) : (
        <>
          {/* Always show Assistant */}
          <Assistant />
          
          {/* Mobile View: Overlay Sheet */}
          {isMobile && isPanelOpen && (
            <Sheet open={isPanelOpen} onOpenChange={(open) => !open && handleClosePanel()}>
              <SheetContent 
                side="bottom" 
                className="h-[90vh] p-0 [&>button]:hidden"
              >
                <ArtifactPanel onClose={handleClosePanel} />
              </SheetContent>
            </Sheet>
          )}
        </>
      )}
    </div>
  );
}