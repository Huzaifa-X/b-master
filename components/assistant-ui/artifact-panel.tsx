"use client";

import { FC } from "react";
import { X, Copy, Maximize2, Code2, FileCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useArtifactStore } from "@/lib/stores/artifact-store";
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import ReactMarkdown from 'react-markdown';

interface ArtifactPanelProps {
  onClose: () => void;
}

export const ArtifactPanel: FC<ArtifactPanelProps> = ({ onClose }) => {
  const { artifactContent } = useArtifactStore();

  const handleCopy = () => {
    if (artifactContent?.content) {
      navigator.clipboard.writeText(artifactContent.content);
    }
  };

  const handleClose = () => {
    onClose();
  };

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
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            title="Copy code"
            onClick={handleCopy}
          >
            <Copy className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleClose}
            title="Close panel"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-auto">
        {artifactContent ? (
          <div className="p-6">
            {artifactContent.type === "code" ? (
              <SyntaxHighlighter
                language={artifactContent.language || "javascript"}
                style={vscDarkPlus}
                showLineNumbers
                customStyle={{
                  margin: 0,
                  borderRadius: "0.5rem",
                  fontSize: "0.875rem",
                }}
              >
                {artifactContent.content}
              </SyntaxHighlighter>
            ) : (
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <ReactMarkdown>{artifactContent.content}</ReactMarkdown>
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
