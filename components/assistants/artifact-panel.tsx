"use client";

import { FC, useEffect, useState } from "react";

import { X, Copy, Code2, FileCode, Eye, Code, Download } from "lucide-react";

import { Button } from "@/components/ui/button";

import { useArtifactStore } from "@/lib/stores/artifact-store";

import ReactMarkdown from 'react-markdown';

import { toast } from "sonner";

interface ArtifactPanelProps {
  onClose?: () => void;
  streamingContent?: string;
  isStreaming?: boolean;
}

export const ArtifactPanel: FC<ArtifactPanelProps> = ({ onClose, streamingContent, isStreaming = false }) => {

  const { artifactContent, isPreviewMode, togglePreview } = useArtifactStore();

  // Use streaming content if available, otherwise use stored content
  const displayContent = streamingContent || artifactContent?.content || "";

  const [blobUrl, setBlobUrl] = useState<string>("");

  const handleCopy = () => {

    if (displayContent) {

      navigator.clipboard.writeText(displayContent);

      toast.success("Code copied to clipboard");

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

    // Generate filename based on title and language

    const fileName = artifactContent?.title

      ? `${artifactContent.title.replace(/\s+/g, "-").toLowerCase()}`

      : "artifact";

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

  // Check if the code is HTML

  const isHtmlCode = artifactContent?.language?.toLowerCase() === 'html' ||

    displayContent?.trim().startsWith('<!DOCTYPE') ||

    displayContent?.trim().startsWith('<html');

  // Create blob URL for secure iframe isolation

  useEffect(() => {

    if (!displayContent || !isPreviewMode || !isHtmlCode) {

      if (blobUrl) {

        URL.revokeObjectURL(blobUrl);

        setBlobUrl("");

      }

      return;

    }

    const blob = new Blob([displayContent], { type: "text/html" });

    const url = URL.createObjectURL(blob);

    setBlobUrl(url);

    return () => {

      URL.revokeObjectURL(url);

    };

  }, [displayContent, isPreviewMode, isHtmlCode]);

  return (

    <div className="h-full flex flex-col bg-background border-l">

      {/* Header */}

      <div className="flex items-center justify-between border-b px-4 py-3 bg-muted/50">

        <div className="flex items-center gap-2">

          {artifactContent?.type === "code" ? (

            <FileCode className="h-4 w-4 text-primary" />

          ) : (

            <Code2 className="h-4 w-4 text-primary" />

          )}

          <div className="flex-1">

            <h3 className="font-semibold text-sm">

              {artifactContent?.title || "Artifact Preview"}

            </h3>

            <p className="text-xs text-muted-foreground">

              {artifactContent?.type === "code"

                ? artifactContent.language || "code"

                : "markdown"}

            </p>

          </div>

        </div>

        <div className="flex items-center gap-1">

          {isHtmlCode && (

            <Button

              variant={isPreviewMode ? "default" : "ghost"}

              size="icon"

              className="h-8 w-8"

              title={isPreviewMode ? "Show code" : "Preview"}

              onClick={togglePreview}

            >

              {isPreviewMode ? <Code className="h-4 w-4" /> : <Eye className="h-4 w-4" />}

            </Button>

          )}

          <Button

            variant="ghost"

            size="icon"

            className="h-8 w-8"

            title="Download"

            onClick={handleDownload}

          >

            <Download className="h-4 w-4" />

          </Button>

          <Button

            variant="ghost"

            size="icon"

            className="h-8 w-8"

            title="Copy code"

            onClick={handleCopy}

          >

            <Copy className="h-4 w-4" />

          </Button>

          {

            onClose && (

              <Button

                variant="ghost"

                size="icon"

                className="h-8 w-8"

                onClick={handleClose}

                title="Close panel"

              >

                <X className="h-4 w-4" />

              </Button>

            )}

        </div>

      </div>

      {/* Content Area */}

      <div className="flex-1 overflow-auto">

        {(displayContent || isStreaming) ? (

          <div className="h-full">

            {/* HTML Preview Mode */}

            {isPreviewMode && isHtmlCode ? (

              blobUrl ? (

                <iframe

                  src={blobUrl}

                  className="w-full h-full border-0"

                  sandbox="allow-scripts allow-same-origin allow-forms allow-popups"

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

              <div className="h-full overflow-auto">

                {artifactContent?.type === "code" || isStreaming ? (

                  <pre className="m-0 p-6 text-sm font-mono whitespace-pre-wrap break-all overflow-wrap-anywhere bg-muted rounded-lg">

                    <code className="block">{displayContent}</code>

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

    </div>

  );

};

