"use client";

import { FC, useEffect, useState, useRef, useCallback } from "react";

import { X, Copy, Code2, FileCode, Eye, Code, Download, Share2, FileText, FileDown, MessageSquare, FileType, Presentation } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import { useArtifactStore } from "@/lib/stores/artifact-store";

import ReactMarkdown from 'react-markdown';

import { toast } from "sonner";

import { VersionHistoryDialog } from "@/components/artifacts/version-history-dialog";
import { ShareArtifactDialog } from "@/components/artifacts/share-artifact-dialog";
import { useParams } from "next/navigation";

interface ArtifactPanelProps {
  onClose?: () => void;
  streamingContent?: string;
  isStreaming?: boolean;
  generationProgress?: number;
  artifactId?: string; // Add artifactId to props
  onVersionSelect?: (versionCode: string, versionId: string) => void;
}

export const ArtifactPanel: FC<ArtifactPanelProps> = ({
  onClose,
  streamingContent,
  isStreaming = false,
  generationProgress = 0,
  artifactId,
  onVersionSelect
}) => {

  const { artifactContent, isPreviewMode, togglePreview, setPrefilledPrompt } = useArtifactStore();
  const params = useParams()
  const assistantId = params?.id as string

  // Use streaming content if available, otherwise use stored content
  const displayContent = streamingContent || artifactContent?.content || "";

  // Show loading state if streaming and no content yet
  const showLoadingState = isStreaming && !displayContent;

  const [blobUrl, setBlobUrl] = useState<string>("");
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isGeneratingDOCX, setIsGeneratingDOCX] = useState(false);
  const [isGeneratingPPTX, setIsGeneratingPPTX] = useState(false);

  // Text selection state for Ask-B popover
  const [selectedText, setSelectedText] = useState<string>("");
  const [selectionPosition, setSelectionPosition] = useState<{ x: number; y: number } | null>(null);
  const [showSelectionPopover, setShowSelectionPopover] = useState(false);
  const codeContainerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Check if the code is HTML
  const isHtmlCode = artifactContent?.language?.toLowerCase() === 'html' ||
    displayContent?.trim().startsWith('<!DOCTYPE') ||
    displayContent?.trim().startsWith('<html');

  const handleCopy = () => {

    if (displayContent) {

      navigator.clipboard.writeText(displayContent);

      toast.success("Code copied to clipboard");

    }

  };

  // Generate filename based on title and language
  const getFileName = () => {
    return artifactContent?.title
      ? `${artifactContent.title.replace(/\s+/g, "-").toLowerCase()}`
      : "artifact";
  };

  const handleDownloadAsHTML = () => {
    if (!displayContent || !isHtmlCode) return;

    // Replace {{ARTIFACT_ID}} placeholder with actual artifact ID
    let processedContent = displayContent;
    if (artifactId) {
      processedContent = displayContent.replace(/\{\{ARTIFACT_ID\}\}/g, artifactId);
    }

    const blob = new Blob([processedContent], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${getFileName()}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Artifact downloaded as HTML");
  };

  const handleDownloadAsPDF = async () => {
    if (!displayContent || !isHtmlCode) return;

    setIsGeneratingPDF(true);
    try {
      // Replace {{ARTIFACT_ID}} placeholder with actual artifact ID
      let processedContent = displayContent;
      if (artifactId) {
        processedContent = displayContent.replace(/\{\{ARTIFACT_ID\}\}/g, artifactId);
      }

      const response = await fetch("/api/artifacts/generate-pdf", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          html: processedContent,
          filename: getFileName(),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to generate PDF");
      }

      const data = await response.json();
      const pdfUrl = data.pdfUrl;

      // Download the PDF
      const a = document.createElement("a");
      a.href = pdfUrl;
      a.download = `${getFileName()}.pdf`;
      a.target = "_blank";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      toast.success("PDF generated and downloaded successfully");
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error(error instanceof Error ? error.message : "Failed to generate PDF");
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleDownloadAsDOCX = async () => {
    if (!displayContent || !isHtmlCode) return;

    setIsGeneratingDOCX(true);
    try {
      let processedContent = displayContent;
      if (artifactId) {
        processedContent = displayContent.replace(/\{\{ARTIFACT_ID\}\}/g, artifactId);
      }

      const response = await fetch("/api/artifacts/generate-docx", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          html: processedContent,
          filename: getFileName(),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to generate DOCX");
      }

      const data = await response.json();
      const docxUrl = data.docxUrl;

      const a = document.createElement("a");
      a.href = docxUrl;
      a.download = `${getFileName()}.docx`;
      a.target = "_blank";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      toast.success("DOCX generated and downloaded successfully");
    } catch (error) {
      console.error("Error generating DOCX:", error);
      toast.error(error instanceof Error ? error.message : "Failed to generate DOCX");
    } finally {
      setIsGeneratingDOCX(false);
    }
  };

  const handleDownloadAsPPTX = async () => {
    if (!displayContent || !isHtmlCode) return;

    setIsGeneratingPPTX(true);
    try {
      let processedContent = displayContent;
      if (artifactId) {
        processedContent = displayContent.replace(/\{\{ARTIFACT_ID\}\}/g, artifactId);
      }

      const response = await fetch("/api/artifacts/generate-pptx", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          html: processedContent,
          filename: getFileName(),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to generate PPTX");
      }

      const data = await response.json();
      const pptxUrl = data.pptxUrl;

      const a = document.createElement("a");
      a.href = pptxUrl;
      a.download = `${getFileName()}.pptx`;
      a.target = "_blank";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      toast.success("PPTX generated and downloaded successfully");
    } catch (error) {
      console.error("Error generating PPTX:", error);
      toast.error(error instanceof Error ? error.message : "Failed to generate PPTX");
    } finally {
      setIsGeneratingPPTX(false);
    }
  };

  const handleDownload = () => {
    if (!displayContent) return;

    const blob = new Blob([displayContent], {
      type: artifactContent?.language === "html" ? "text/html" : "text/plain"
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;

    const fileName = getFileName();
    const extension = artifactContent?.language === "html" ? "html" : "txt";
    a.download = `${fileName}.${extension}`;

    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success("Artifact downloaded successfully");
  };

  const handleClose = () => {

    onClose?.();

  };

  // Handle text selection in code view
  const handleTextSelection = useCallback(() => {
    const selection = window.getSelection();
    const text = selection?.toString().trim();

    if (text && text.length > 0) {
      const range = selection?.getRangeAt(0);
      if (range) {
        const rect = range.getBoundingClientRect();
        setSelectedText(text);
        setSelectionPosition({
          x: rect.left + rect.width / 2,
          y: rect.top - 10
        });
        setShowSelectionPopover(true);
      }
    } else {
      setShowSelectionPopover(false);
      setSelectedText("");
    }
  }, []);

  // Handle Ask-B button click
  const handleAskB = useCallback(() => {
    if (selectedText) {
      // Set the prefilled prompt with the selected text
      const prompt = `Regarding this selected content:\n\n"${selectedText}"\n\nPlease make the following changes: `;
      setPrefilledPrompt(prompt);
      setShowSelectionPopover(false);
      setSelectedText("");
    }
  }, [selectedText, setPrefilledPrompt]);

  // Close popover when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      // Small delay to allow button click to register
      setTimeout(() => {
        const selection = window.getSelection();
        if (!selection?.toString().trim()) {
          setShowSelectionPopover(false);
          setSelectedText("");
        }
      }, 100);
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Listen for messages from iframe for text selection
  useEffect(() => {
    const handleIframeMessage = (event: MessageEvent) => {
      if (event.data?.type === "textSelection") {
        const { text, x, y } = event.data;
        if (text && text.trim()) {
          setSelectedText(text.trim());
          // Adjust position relative to iframe
          const iframe = iframeRef.current;
          if (iframe) {
            const iframeRect = iframe.getBoundingClientRect();
            setSelectionPosition({
              x: iframeRect.left + x,
              y: iframeRect.top + y - 10
            });
            setShowSelectionPopover(true);
          }
        } else {
          setShowSelectionPopover(false);
          setSelectedText("");
        }
      }
    };

    window.addEventListener("message", handleIframeMessage);
    return () => window.removeEventListener("message", handleIframeMessage);
  }, []);

  // Create blob URL for secure iframe isolation

  useEffect(() => {

    if (!displayContent || !isPreviewMode || !isHtmlCode) {

      if (blobUrl) {

        URL.revokeObjectURL(blobUrl);

        setBlobUrl("");

      }

      return;

    }

    // Replace {{ARTIFACT_ID}} placeholder with actual artifact ID
    let processedContent = displayContent;
    if (artifactId) {
      processedContent = displayContent.replace(/\{\{ARTIFACT_ID\}\}/g, artifactId);
    }

    // Inject text selection script for Ask-B feature
    const selectionScript = `
      <script>
        (function() {
          let lastSelection = '';
          document.addEventListener('mouseup', function(e) {
            const selection = window.getSelection();
            const text = selection ? selection.toString().trim() : '';
            if (text && text !== lastSelection) {
              lastSelection = text;
              const range = selection.getRangeAt(0);
              const rect = range.getBoundingClientRect();
              window.parent.postMessage({
                type: 'textSelection',
                text: text,
                x: rect.left + rect.width / 2,
                y: rect.top
              }, '*');
            } else if (!text && lastSelection) {
              lastSelection = '';
              window.parent.postMessage({
                type: 'textSelection',
                text: '',
                x: 0,
                y: 0
              }, '*');
            }
          });
        })();
      </script>
    `;

    // Inject script before closing </body> or at the end
    if (processedContent.includes('</body>')) {
      processedContent = processedContent.replace('</body>', selectionScript + '</body>');
    } else {
      processedContent = processedContent + selectionScript;
    }

    const blob = new Blob([processedContent], { type: "text/html" });

    const url = URL.createObjectURL(blob);

    setBlobUrl(url);

    return () => {

      URL.revokeObjectURL(url);

    };

  }, [displayContent, isPreviewMode, isHtmlCode, artifactId]);

  return (

    <div className="h-full flex flex-col bg-background border-l">

      {/* Header */}

      <div className="flex items-center justify-between border-b px-3 md:px-4 py-2 md:py-3 bg-muted/50">
        {/* Left Section: Icon + Title */}
        <div className="flex items-center gap-2 min-w-0 flex-1 mr-2">
          {artifactContent?.type === "code" ? (
            <FileCode className="h-4 w-4 text-primary flex-shrink-0" />
          ) : (
            <Code2 className="h-4 w-4 text-primary flex-shrink-0" />
          )}
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-sm truncate">
              {artifactContent?.title || "Artifact Preview"}
            </h3>
            <p className="text-xs text-muted-foreground hidden sm:block">
              {artifactContent?.type === "code"
                ? artifactContent.language || "code"
                : "markdown"}
            </p>
          </div>
        </div>

        {/* Right Section: Action Buttons */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {/* Preview/Code Toggle - Always show for HTML */}
          {isHtmlCode && (
            <Button
              variant={isPreviewMode ? "default" : "ghost"}
              size="icon"
              className="h-7 w-7 md:h-8 md:w-8"
              title={isPreviewMode ? "Show code" : "Preview"}
              onClick={togglePreview}
            >
              {isPreviewMode ? <Code className="h-3 w-3 md:h-4 md:w-4" /> : <Eye className="h-3 w-3 md:h-4 md:w-4" />}
            </Button>
          )}

          {/* Download Dropdown - Hide on mobile */}
          {displayContent && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 md:h-8 md:w-8 hidden md:flex"
                  title="Download"
                  disabled={isGeneratingPDF || isGeneratingDOCX || isGeneratingPPTX}
                >
                  {(isGeneratingPDF || isGeneratingDOCX || isGeneratingPPTX) ? (
                    <div className="h-3 w-3 md:h-4 md:w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  ) : (
                    <Download className="h-3 w-3 md:h-4 md:w-4" />
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {isHtmlCode ? (
                  <>
                    <DropdownMenuItem onClick={handleDownloadAsHTML} disabled={isGeneratingPDF || isGeneratingDOCX || isGeneratingPPTX}>
                      <FileText className="h-4 w-4 mr-2" />
                      Download as HTML
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleDownloadAsPDF} disabled={isGeneratingPDF || isGeneratingDOCX || isGeneratingPPTX}>
                      <FileDown className="h-4 w-4 mr-2" />
                      Download as PDF
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleDownloadAsDOCX} disabled={isGeneratingPDF || isGeneratingDOCX || isGeneratingPPTX}>
                      <FileType className="h-4 w-4 mr-2" />
                      Download as DOCX
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleDownloadAsPPTX} disabled={isGeneratingPDF || isGeneratingDOCX || isGeneratingPPTX}>
                      <Presentation className="h-4 w-4 mr-2" />
                      Download as PPTX
                    </DropdownMenuItem>
                  </>
                ) : (
                  <DropdownMenuItem onClick={handleDownload} disabled={isGeneratingPDF || isGeneratingDOCX || isGeneratingPPTX}>
                    <Download className="h-4 w-4 mr-2" />
                    Download as {artifactContent?.language || "txt"}
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Copy - Always show */}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 md:h-8 md:w-8"
            title="Copy code"
            onClick={handleCopy}
          >
            <Copy className="h-3 w-3 md:h-4 md:w-4" />
          </Button>

          {/* Share Button - NEW */}
          {artifactId && assistantId && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 md:h-8 md:w-8"
              title="Share artifact"
              onClick={() => setIsShareDialogOpen(true)}
              disabled={isStreaming}
            >
              <Share2 className="h-3 w-3 md:h-4 md:w-4" />
            </Button>
          )}

          {/* Version History */}
          {artifactId && (
            <VersionHistoryDialog
              artifactId={artifactId}
              onVersionSelect={onVersionSelect}
              disabled={isStreaming}
            />
          )}

          {/* Close Button */}
          {onClose && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 md:h-8 md:w-8"
              onClick={handleClose}
              title="Close panel"
            >
              <X className="h-3 w-3 md:h-4 md:w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Content Area */}

      <div className="flex-1 overflow-auto">

        {showLoadingState ? (

          /* Loading State During Generation */
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-center space-y-6 px-4">
              <div className="rounded-lg border bg-card p-8 shadow-sm max-w-md mx-auto">
                <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary mx-auto mb-6"></div>
                <h3 className="text-xl font-semibold mb-3">Generating Artifact</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  AI is creating your artifact. This may take a minute...
                </p>
                {/* Progress Bar */}
                <div className="w-full bg-muted rounded-full h-2.5 mb-2">
                  <div
                    className="bg-primary h-2.5 rounded-full transition-all duration-300"
                    style={{ width: `${generationProgress}%` }}
                  ></div>
                </div>
                <p className="text-xs text-muted-foreground">{generationProgress}% complete</p>
              </div>
            </div>
          </div>

        ) : (displayContent || isStreaming) ? (

          <div className="h-full">

            {/* HTML Preview Mode */}

            {isPreviewMode && isHtmlCode ? (

              blobUrl ? (

                <iframe
                  ref={iframeRef}
                  src={blobUrl}

                  className="w-full h-full border-0"

                  referrerPolicy="no-referrer"

                  allow="clipboard-write"

                  title="HTML Preview"

                />

              ) : (

                <div className="w-full h-full flex items-center justify-center">

                  <div className="text-center">

                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>

                    <p className="text-sm text-muted-foreground">Loading preview...</p>

                  </div>

                </div>

              )

            ) : (

              /* Code Display Mode */

              <div
                ref={codeContainerRef}
                className="h-full overflow-auto"
                onMouseUp={handleTextSelection}
              >

                {artifactContent?.type === "code" || isStreaming ? (

                  <pre className="m-0 p-6 text-sm font-mono whitespace-pre-wrap break-all overflow-wrap-anywhere bg-muted rounded-lg relative">

                    <code className="block">
                      {displayContent}
                      {isStreaming && displayContent && (
                        <span className="inline-block w-2 h-4 bg-primary ml-1 animate-pulse"></span>
                      )}
                    </code>

                  </pre>

                ) : (

                  <div className="p-6 prose prose-sm dark:prose-invert max-w-none break-words overflow-wrap-anywhere">

                    <ReactMarkdown>{displayContent}</ReactMarkdown>

                  </div>

                )}

              </div>

            )}

          </div>

        ) : (

          <div className="flex items-center justify-center h-full">

            <div className="text-center space-y-4">

              <div className="rounded-lg border bg-card p-8 shadow-sm">

                <Code2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />

                <h2 className="text-xl font-semibold mb-2">No Artifact Selected</h2>

                <p className="text-sm text-muted-foreground max-w-sm">

                  When you generate code or interactive content, it will appear here in a live preview.

                </p>

              </div>

            </div>

          </div>

        )}

      </div>

      {/* Share Artifact Dialog */}
      {artifactId && assistantId && artifactContent?.title && (
        <ShareArtifactDialog
          open={isShareDialogOpen}
          onOpenChange={setIsShareDialogOpen}
          artifactId={artifactId}
          artifactName={artifactContent.title}
          assistantId={assistantId}
        />
      )}

      {/* Text Selection Popover for Ask-B */}
      {showSelectionPopover && selectionPosition && selectedText && (
        <div
          className="fixed z-50 animate-in fade-in-0 zoom-in-95 duration-150"
          style={{
            left: selectionPosition.x,
            top: selectionPosition.y,
            transform: "translate(-50%, -100%)",
          }}
        >
          <Button
            size="sm"
            onClick={handleAskB}
            className="gap-2 shadow-lg"
          >
            <MessageSquare className="h-4 w-4" />
            Ask-B
          </Button>
        </div>
      )}

    </div>

  );

};

