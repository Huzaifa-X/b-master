"use client";

import { FC, useEffect, useState, useRef, useCallback } from "react";
import Editor from "@monaco-editor/react";
import { useTheme } from "next-themes";

import { X, Copy, Code2, FileCode, Eye, Code, Download, Share2, FileText, FileDown, MessageSquare, FileType, Presentation, MousePointer2, Edit3, Maximize2, Minimize2, ArrowLeft, Send } from "lucide-react";

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
import { Input } from "@/components/ui/input";

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

  const { artifactContent, isPreviewMode, togglePreview, setPrefilledPrompt, setSurgicalEditOuterHtml, isEditMode, toggleEditMode, updateArtifactContent, closePanel, isFullscreen, toggleFullscreen, wasAutoOpened } = useArtifactStore();
  const { theme } = useTheme();
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

  // Visual edit mode (click-to-edit like Lovable)
  const [isVisualEditMode, setIsVisualEditMode] = useState(false);

  // Inline edit input state (appears when clicking element in visual edit mode)
  const [inlineEditState, setInlineEditState] = useState<{
    visible: boolean;
    position: { x: number; y: number };
    description: string;
    outerHtml: string;
    value: string;
  }>({
    visible: false,
    position: { x: 0, y: 0 },
    description: "",
    outerHtml: "",
    value: "",
  });
  const inlineEditInputRef = useRef<HTMLInputElement>(null);

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

  const handleClose = useCallback(() => {
    // Close the panel in the store (resets modes and isPanelOpen)
    closePanel();
  }, [closePanel]);

  // Handle Monaco editor content changes
  const handleEditorChange = useCallback((value: string | undefined) => {
    if (value !== undefined) {
      updateArtifactContent(value);
    }
  }, [updateArtifactContent]);

  // Get Monaco language from artifact language
  const getMonacoLanguage = () => {
    const lang = artifactContent?.language?.toLowerCase() || "html";
    const languageMap: Record<string, string> = {
      "html": "html",
      "css": "css",
      "javascript": "javascript",
      "js": "javascript",
      "typescript": "typescript",
      "ts": "typescript",
      "json": "json",
      "python": "python",
      "py": "python",
      "jsx": "javascript",
      "tsx": "typescript",
    };
    return languageMap[lang] || lang;
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

  // Handle keyboard shortcut to exit visual edit mode (Escape) or close inline edit
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (inlineEditState.visible) {
          setInlineEditState(prev => ({ ...prev, visible: false }));
        } else if (isVisualEditMode) {
          setIsVisualEditMode(false);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isVisualEditMode, inlineEditState.visible]);

  // Handle inline edit submission
  const handleInlineEditSubmit = useCallback(() => {
    if (!inlineEditState.value.trim()) return;

    // Store the outerHTML so the chatbot can do a surgical patch
    setSurgicalEditOuterHtml(inlineEditState.outerHtml || null);

    // Create the full prompt
    const prompt = `Edit the ${inlineEditState.description}: ${inlineEditState.value}`;

    // Close inline edit and visual edit mode
    setInlineEditState(prev => ({ ...prev, visible: false, value: "" }));
    setIsVisualEditMode(false);

    // Dispatch event with the message to send directly (avoids timing issues with prefilledPrompt)
    window.dispatchEvent(new CustomEvent('trigger-chat-send', {
      detail: { message: prompt }
    }));
  }, [inlineEditState, setSurgicalEditOuterHtml]);

  // Close inline edit when clicking outside
  useEffect(() => {
    if (!inlineEditState.visible) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-inline-edit-input]')) {
        setInlineEditState(prev => ({ ...prev, visible: false }));
      }
    };

    // Small delay to prevent immediate close
    const timer = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [inlineEditState.visible]);

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

  // Listen for messages from iframe for text selection + visual element clicks
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
      } else if (event.data?.type === "elementClick") {
        // Visual edit mode: user clicked an element inside the iframe
        const { description, outerHtml, position } = event.data;
        if (description && position) {
          // Get iframe position to calculate absolute position
          const iframe = iframeRef.current;
          if (iframe) {
            const iframeRect = iframe.getBoundingClientRect();
            // Position the input below the clicked element
            const inputX = iframeRect.left + position.x;
            const inputY = iframeRect.top + position.y;

            // Show inline edit input instead of immediately setting prompt
            setInlineEditState({
              visible: true,
              position: { x: inputX, y: inputY },
              description: description,
              outerHtml: outerHtml || "",
              value: "",
            });

            // Focus the input after a short delay
            setTimeout(() => {
              inlineEditInputRef.current?.focus();
            }, 50);
          }
        }
      }
    };

    window.addEventListener("message", handleIframeMessage);
    return () => window.removeEventListener("message", handleIframeMessage);
  }, [setPrefilledPrompt]);

  // Send toggle message to iframe whenever visual edit mode changes
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe || !blobUrl) return;
    // Small delay to make sure iframe is loaded
    const send = () => {
      try {
        iframe.contentWindow?.postMessage({ type: "toggleVisualEdit", enabled: isVisualEditMode }, "*");
      } catch (_) { }
    };
    const t = setTimeout(send, 100);
    return () => clearTimeout(t);
  }, [isVisualEditMode, blobUrl]);

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

    // Inject text selection script for Ask-B feature + visual edit mode
    const selectionScript = `
      <script>
        (function() {
          // ── Text Selection (Ask-B) ─────────────────────────────────────────
          let lastSelection = '';
          document.addEventListener('mouseup', function(e) {
            if (window.__visualEditMode) return; // ignore selections during edit mode
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

          // ── Visual Edit Mode ───────────────────────────────────────────────
          window.__visualEditMode = false;
          var __hoveredEl = null;
          var __originalOutline = '';
          var __originalCursor = '';
          var __styleTag = null;

          function getElementDescription(el) {
            var tag = el.tagName.toLowerCase();
            var tagLabels = {
              h1:'H1 heading',h2:'H2 heading',h3:'H3 heading',h4:'H4 heading',
              h5:'H5 heading',h6:'H6 heading',p:'paragraph',button:'button',
              a:'link',img:'image',input:'input field',textarea:'text area',
              select:'dropdown',table:'table',tr:'table row',td:'table cell',
              th:'table header',ul:'list',ol:'ordered list',li:'list item',
              div:'section',span:'text',label:'label',nav:'navigation',
              header:'header',footer:'footer',section:'section',form:'form',
              article:'article',aside:'sidebar',figure:'figure',
              strong:'bold text',em:'italic text'
            };
            var label = tagLabels[tag] || tag;
            var detail = '';
            if (tag === 'img') {
              detail = el.alt || el.title || (el.src ? el.src.split('/').pop().split('?')[0] : '');
            } else if (tag === 'input') {
              detail = el.placeholder || el.name || el.type || '';
            } else if (tag === 'a') {
              detail = (el.textContent || '').trim().slice(0, 60);
            } else {
              detail = (el.textContent || '').replace(/\\s+/g,' ').trim().slice(0, 60);
            }
            return detail ? label + ' \"' + detail + '\"' : label;
          }

          function enableVisualEdit() {
            if (__styleTag) return;
            __styleTag = document.createElement('style');
            __styleTag.id = '__visual-edit-style';
            __styleTag.textContent = '* { cursor: crosshair !important; } body { user-select: none !important; }';
            document.head.appendChild(__styleTag);
            document.addEventListener('mouseover', __onMouseOver, true);
            document.addEventListener('mouseout', __onMouseOut, true);
            document.addEventListener('click', __onClick, true);
          }

          function disableVisualEdit() {
            if (__hoveredEl) {
              __hoveredEl.style.outline = __originalOutline;
              __hoveredEl.style.boxShadow = '';
              __hoveredEl = null;
            }
            document.removeEventListener('mouseover', __onMouseOver, true);
            document.removeEventListener('mouseout', __onMouseOut, true);
            document.removeEventListener('click', __onClick, true);
            if (__styleTag) { __styleTag.remove(); __styleTag = null; }
          }

          function __onMouseOver(e) {
            var el = e.target;
            if (el === document.body || el === document.documentElement) return;
            if (__hoveredEl && __hoveredEl !== el) {
              __hoveredEl.style.outline = __originalOutline;
              __hoveredEl.style.boxShadow = '';
            }
            __hoveredEl = el;
            __originalOutline = el.style.outline || '';
            el.style.outline = '2px solid #818cf8';
            el.style.boxShadow = '0 0 0 4px rgba(129,140,248,0.2)';
            e.stopPropagation();
          }

          function __onMouseOut(e) {
            var el = e.target;
            if (el === __hoveredEl) {
              el.style.outline = __originalOutline;
              el.style.boxShadow = '';
              __hoveredEl = null;
            }
          }

          function __onClick(e) {
            e.preventDefault();
            e.stopPropagation();
            var el = e.target;
            if (el === document.body || el === document.documentElement) return;
            var description = getElementDescription(el);
            var rect = el.getBoundingClientRect();
            window.parent.postMessage({
              type: 'elementClick',
              description: description,
              tag: el.tagName.toLowerCase(),
              outerHtml: el.outerHTML,
              // Position info for inline edit input
              position: {
                x: rect.left + rect.width / 2,
                y: rect.bottom + 8,
                elementTop: rect.top,
                elementBottom: rect.bottom
              }
            }, '*');
          }

          // Listen for toggle from parent
          window.addEventListener('message', function(e) {
            if (e.data && e.data.type === 'toggleVisualEdit') {
              window.__visualEditMode = !!e.data.enabled;
              if (window.__visualEditMode) { enableVisualEdit(); }
              else { disableVisualEdit(); }
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
          {/* Back Button - Show when panel was auto-opened */}
          {wasAutoOpened && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1.5 mr-1 text-muted-foreground hover:text-foreground"
              onClick={() => window.dispatchEvent(new CustomEvent('restore-chat-layout'))}
              title="Return to chat"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline text-xs">Back</span>
            </Button>
          )}

          {/* Preview/Code Toggle - Always show for HTML */}
          {isHtmlCode && (
            <Button
              variant={isPreviewMode && !isEditMode ? "default" : "ghost"}
              size="icon"
              className="h-7 w-7 md:h-8 md:w-8"
              title={isPreviewMode ? "Show code" : "Preview"}
              onClick={() => {
                if (isVisualEditMode) setIsVisualEditMode(false);
                togglePreview();
              }}
            >
              {isPreviewMode && !isEditMode ? <Code className="h-3 w-3 md:h-4 md:w-4" /> : <Eye className="h-3 w-3 md:h-4 md:w-4" />}
            </Button>
          )}

          {/* Edit Code Button */}
          {displayContent && (
            <Button
              variant={isEditMode ? "default" : "ghost"}
              size="icon"
              className={`h-7 w-7 md:h-8 md:w-8 ${isEditMode
                ? "bg-green-500 hover:bg-green-600 text-white"
                : ""
                }`}
              title={isEditMode ? "Exit edit mode" : "Edit code"}
              onClick={toggleEditMode}
            >
              <Edit3 className="h-3 w-3 md:h-4 md:w-4" />
            </Button>
          )}

          {/* Visual Edit Mode Toggle - only in HTML preview */}
          {isHtmlCode && isPreviewMode && (
            <Button
              variant={isVisualEditMode ? "default" : "ghost"}
              size="icon"
              className={`h-7 w-7 md:h-8 md:w-8 ${isVisualEditMode
                ? "bg-indigo-500 hover:bg-indigo-600 text-white"
                : "text-muted-foreground"
                }`}
              title={isVisualEditMode ? "Exit visual edit mode" : "Click any element to edit it"}
              onClick={() => setIsVisualEditMode((v) => !v)}
            >
              <MousePointer2 className="h-3 w-3 md:h-4 md:w-4" />
            </Button>
          )}

          {/* Fullscreen Toggle Button - Desktop only */}
          <Button
            variant={isFullscreen ? "default" : "ghost"}
            size="icon"
            className={`h-7 w-7 md:h-8 md:w-8 hidden md:flex ${isFullscreen ? "bg-blue-500 hover:bg-blue-600 text-white" : ""
              }`}
            title={isFullscreen ? "Exit fullscreen" : "Expand to fullscreen"}
            onClick={toggleFullscreen}
          >
            {isFullscreen ? (
              <Minimize2 className="h-3 w-3 md:h-4 md:w-4" />
            ) : (
              <Maximize2 className="h-3 w-3 md:h-4 md:w-4" />
            )}
          </Button>

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

          {/* Close Button - Always visible */}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 md:h-8 md:w-8"
            onClick={handleClose}
            title="Close panel"
          >
            <X className="h-3 w-3 md:h-4 md:w-4" />
          </Button>
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

            {/* Edit Mode with Monaco Editor */}
            {isEditMode ? (
              <div className="h-full w-full">
                <Editor
                  height="100%"
                  language={getMonacoLanguage()}
                  value={displayContent}
                  theme={theme === "dark" ? "vs-dark" : "light"}
                  onChange={handleEditorChange}
                  options={{
                    minimap: { enabled: false },
                    fontSize: 14,
                    lineNumbers: "on",
                    wordWrap: "on",
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                    tabSize: 2,
                    padding: { top: 16 },
                  }}
                />
              </div>
            ) : isPreviewMode && isHtmlCode ? (
              /* HTML Preview Mode */

              blobUrl ? (

                <div className="relative w-full h-full">
                  {/* Visual edit mode overlay banner */}
                  {isVisualEditMode && (
                    <div className="absolute top-0 left-0 right-0 z-10 bg-indigo-500/90 text-white text-xs text-center py-1.5 px-3 flex items-center justify-center gap-2 pointer-events-none">
                      <MousePointer2 className="h-3 w-3" />
                      <span>Click any element to edit it — press <kbd className="bg-white/20 rounded px-1">Esc</kbd> or the pointer button to exit</span>
                    </div>
                  )}
                  <iframe
                    ref={iframeRef}
                    src={blobUrl}
                    className="w-full h-full border-0"
                    referrerPolicy="no-referrer"
                    allow="clipboard-write"
                    title="HTML Preview"
                  />
                </div>

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

      {/* Inline Edit Input (appears when clicking element in visual edit mode) */}
      {inlineEditState.visible && (
        <div
          data-inline-edit-input
          className="fixed z-50 animate-in fade-in-0 zoom-in-95 duration-150"
          style={{
            left: inlineEditState.position.x,
            top: inlineEditState.position.y,
            transform: "translateX(-50%)",
          }}
        >
          <div className="flex flex-col gap-2 bg-background border rounded-lg shadow-xl p-2.5 min-w-[280px] max-w-[400px]">
            <p className="text-[10px] text-muted-foreground px-1 truncate">
              Edit: {inlineEditState.description}
            </p>
            <Input
              ref={inlineEditInputRef}
              value={inlineEditState.value}
              onChange={(e) => setInlineEditState(prev => ({ ...prev, value: e.target.value }))}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleInlineEditSubmit();
                }
              }}
              placeholder="What changes do you want?"
              className="h-9 text-sm"
            />
            <Button
              className="w-fit bg-indigo-500 hover:bg-indigo-600 gap-2 ml-auto"
              onClick={handleInlineEditSubmit}
              disabled={!inlineEditState.value.trim()}
            >
              <Send className="h-4 w-4" />
              Send
            </Button>
          </div>
        </div>
      )}

    </div>

  );

};

