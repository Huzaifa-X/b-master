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
import { useLocale } from "@/lib/i18n";

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
  const { t } = useLocale();
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

  const codeContainerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Visual edit mode (click-to-edit like Lovable)
  const [isVisualEditMode, setIsVisualEditMode] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // Inline edit input state (appears when clicking element in visual edit mode)
  const [inlineEditState, setInlineEditState] = useState<{
    visible: boolean;
    position: { x: number; y: number };
    description: string;
    outerHtml: string;
    originalText: string;
    value: string;
    mode: "element" | "selection";
  }>({
    visible: false,
    position: { x: 0, y: 0 },
    description: "",
    outerHtml: "",
    originalText: "",
    value: "",
    mode: "element",
  });
  const inlineEditInputRef = useRef<HTMLInputElement>(null);

  // Check if the code is HTML
  const isHtmlCode = artifactContent?.language?.toLowerCase() === 'html' ||
    displayContent?.trim().startsWith('<!DOCTYPE') ||
    displayContent?.trim().startsWith('<html');

  const handleCopy = () => {

    if (displayContent) {

      navigator.clipboard.writeText(displayContent);

      toast.success(t("artifactPanel.copiedToClipboard"));

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
    toast.success(t("artifactPanel.downloadedAsHtml"));
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
        throw new Error(error.error || t("artifactPanel.failedToGeneratePdf"));
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

      toast.success(t("artifactPanel.pdfGenerated"));
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error(error instanceof Error ? error.message : t("artifactPanel.failedToGeneratePdf"));
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
        throw new Error(error.error || t("artifactPanel.failedToGenerateDocx"));
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

      toast.success(t("artifactPanel.docxGenerated"));
    } catch (error) {
      console.error("Error generating DOCX:", error);
      toast.error(error instanceof Error ? error.message : t("artifactPanel.failedToGenerateDocx"));
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
        throw new Error(error.error || t("artifactPanel.failedToGeneratePptx"));
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

      toast.success(t("artifactPanel.pptxGenerated"));
    } catch (error) {
      console.error("Error generating PPTX:", error);
      toast.error(error instanceof Error ? error.message : t("artifactPanel.failedToGeneratePptx"));
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

    toast.success(t("artifactPanel.downloadedSuccessfully"));
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

        // Directly show the edit popover
        setInlineEditState({
          visible: true,
          position: {
            x: rect.left + rect.width / 2,
            y: rect.top - 10
          },
          description: "Selection",
          outerHtml: "",
          originalText: text,
          value: text,
          mode: "selection"
        });

        // Focus the input
        setTimeout(() => {
          inlineEditInputRef.current?.focus();
          inlineEditInputRef.current?.select();
        }, 50);
      }
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

  // Handle manual update (direct string replacement without AI)
  const handleManualUpdate = useCallback(async (mode: "element" | "selection") => {
    if (!artifactId || !displayContent) return;

    // Determine what we're replacing
    const oldContent = mode === "element" ? inlineEditState.outerHtml : inlineEditState.originalText;
    const newContent = mode === "element" ? inlineEditState.value : inlineEditState.value; // For selection, value is the new text

    // If element mode, we need to be careful: the user typed just the text? Or meant to change the outerHTML?
    // In "element" mode, let's assume we replace the text INSIDE if it's simple text, or we do a smart replacement.
    // User said: "only the text gets replaced what use has typed no intervention of Chatbot!!"

    let processedNewContent = newContent;

    if (mode === "element" && inlineEditState.outerHtml) {
      // Try to replace just the text within the outerHTML
      const parser = new DOMParser();
      const doc = parser.parseFromString(inlineEditState.outerHtml, 'text/html');
      const el = doc.body.firstElementChild as HTMLElement;
      if (el) {
        el.textContent = newContent; // This replaces children too, but consistent with "replace text"
        processedNewContent = el.outerHTML;
      }
    }

    try {
      setIsUpdating(true);
      const response = await fetch("/api/artifacts/manual-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          artifactId,
          oldContent: mode === "element" ? inlineEditState.outerHtml : inlineEditState.originalText,
          newContent: processedNewContent,
          fullContent: displayContent,
          mode: mode
        }),
      });

      const result = await response.json();
      if (!result.success) throw new Error(result.error);

      // Update local state IMMEDIATELY
      updateArtifactContent(result.newFullHtml);

      // Close popover
      setInlineEditState(prev => ({ ...prev, visible: false }));

      toast.success(t("artifactPanel.updatedSuccessfully", { version: result.versionNumber }));

      // Notify parent to fetch new versions if dialog is open
      window.dispatchEvent(new CustomEvent('artifact-version-created'));

    } catch (err) {
      console.error("Manual update failed:", err);
      toast.error(err instanceof Error ? err.message : t("artifactPanel.manualUpdateFailed"));
    } finally {
      setIsUpdating(false);
    }
  }, [artifactId, displayContent, inlineEditState, updateArtifactContent]);

  // Handle inline edit submission (Ask Chatbot)
  const handleInlineEditSubmit = useCallback(() => {
    if (!inlineEditState.value.trim()) return;

    // Store the outerHTML so the chatbot can do a surgical patch
    setSurgicalEditOuterHtml(inlineEditState.outerHtml || null);

    // Create the full prompt
    const prompt = inlineEditState.mode === "selection"
      ? `Regarding this selected text: "${inlineEditState.originalText}"\n\nPlease make this change: ${inlineEditState.value}`
      : `Edit the ${inlineEditState.description}: ${inlineEditState.value}`;

    // Close inline edit and visual edit mode
    setInlineEditState(prev => ({ ...prev, visible: false, value: "" }));
    setIsVisualEditMode(false);

    // Dispatch event with the message to send directly
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


  // Listen for messages from iframe for text selection + visual element clicks
  useEffect(() => {
    const handleIframeMessage = (event: MessageEvent) => {
      if (event.data?.type === "textSelection") {
        const { text, x, y } = event.data;
        if (text && text.trim()) {
          const iframe = iframeRef.current;
          if (iframe) {
            const iframeRect = iframe.getBoundingClientRect();

            setInlineEditState({
              visible: true,
              position: {
                x: iframeRect.left + x,
                y: iframeRect.top + y - 10
              },
              description: "Selection",
              outerHtml: "",
              originalText: text.trim(),
              value: text.trim(),
              mode: "selection"
            });

            // Focus the input
            setTimeout(() => {
              inlineEditInputRef.current?.focus();
              inlineEditInputRef.current?.select();
            }, 50);
          }
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
              originalText: "",
              value: "",
              mode: "element"
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

    // Inject text selection script for {t("artifactPanel.askB")} feature + visual edit mode
    const selectionScript = `
      <script>
        (function() {
          // ── Text Selection ({t("artifactPanel.askB")}) ─────────────────────────────────────────
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
              {artifactContent?.title || t("artifactPanel.artifactPreview")}
            </h3>
            <p className="text-xs text-muted-foreground hidden sm:block">
              {artifactContent?.type === "code"
                ? artifactContent.language || t("system.code") || "code"
                : t("system.markdown") || "markdown"}
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
              <span className="hidden sm:inline text-xs">{t("common.back")}</span>
            </Button>
          )}

          {/* Preview/Code Toggle - Always show for HTML */}
          {isHtmlCode && (
            <Button
              variant={isPreviewMode && !isEditMode ? "default" : "ghost"}
              size="icon"
              className="h-7 w-7 md:h-8 md:w-8"
              title={isPreviewMode ? t("artifactPanel.showCode") : t("artifactPanel.preview")}
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
              title={isEditMode ? t("artifactPanel.exitEditMode") : t("artifactPanel.editCode")}
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
              title={isVisualEditMode ? t("artifactPanel.exitVisualEditMode") : t("artifactPanel.clickAnyElementToEdit")}
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
            title={isFullscreen ? t("artifactPanel.exitFullscreen") : t("artifactPanel.expandToFullscreen")}
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
                  title={t("artifactPanel.downloadItem")}
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
                      {t("artifactPanel.downloadAsHtmlItem")}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleDownloadAsPDF} disabled={isGeneratingPDF || isGeneratingDOCX || isGeneratingPPTX}>
                      <FileDown className="h-4 w-4 mr-2" />
                      {t("artifactPanel.downloadAsPdfItem")}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleDownloadAsDOCX} disabled={isGeneratingPDF || isGeneratingDOCX || isGeneratingPPTX}>
                      <FileType className="h-4 w-4 mr-2" />
                      {t("artifactPanel.downloadAsDocxItem")}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleDownloadAsPPTX} disabled={isGeneratingPDF || isGeneratingDOCX || isGeneratingPPTX}>
                      <Presentation className="h-4 w-4 mr-2" />
                      {t("artifactPanel.downloadAsPptxItem")}
                    </DropdownMenuItem>
                  </>
                ) : (
                  <DropdownMenuItem onClick={handleDownload} disabled={isGeneratingPDF || isGeneratingDOCX || isGeneratingPPTX}>
                    <Download className="h-4 w-4 mr-2" />
                    {t("artifactPanel.downloadAsExt", { ext: artifactContent?.language || "txt" })}
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
            title={t("artifactPanel.copyCode")}
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
              title={t("artifactPanel.shareArtifact")}
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
            title={t("artifactPanel.closePanel")}
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
                <h3 className="text-xl font-semibold mb-3">{t("artifactPanel.generatingArtifact")}</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {t("artifactPanel.generatingDescription")}
                </p>
                {/* Progress Bar */}
                <div className="w-full bg-muted rounded-full h-2.5 mb-2">
                  <div
                    className="bg-primary h-2.5 rounded-full transition-all duration-300"
                    style={{ width: `${generationProgress}%` }}
                  ></div>
                </div>
                <p className="text-xs text-muted-foreground">{generationProgress}% {t("artifactPanel.complete")}</p>
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
                      <span>{t("artifactPanel.visualEditModeHint")}</span>
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

                    <p className="text-sm text-muted-foreground">{t("artifactPanel.loadingPreview")}</p>

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

                {(() => {
                  // Languages that should render as monospace raw code
                  const MONO_LANGS = new Set([
                    'javascript','js','typescript','ts','jsx','tsx',
                    'python','py','css','json','sql','bash','sh',
                    'yaml','yml','toml','java','c','cpp','go','rust',
                    'ruby','php','swift','kotlin','scala','csharp','cs',
                    'xml','dockerfile','html','htm',
                  ])
                  const lang = artifactContent?.language?.toLowerCase() || ''
                  const isMonoCode = MONO_LANGS.has(lang) || isHtmlCode

                  if (isMonoCode) {
                    return (
                      <pre className="m-0 p-6 text-sm font-mono whitespace-pre-wrap break-all overflow-wrap-anywhere bg-muted rounded-lg relative">
                        <code className="block">
                          {displayContent}
                          {isStreaming && displayContent && (
                            <span className="inline-block w-2 h-4 bg-primary ml-1 animate-pulse"></span>
                          )}
                        </code>
                      </pre>
                    )
                  }

                  // Markdown / plain text — render with ReactMarkdown
                  return (
                    <div className="p-6 prose prose-sm dark:prose-invert max-w-none break-words overflow-wrap-anywhere">
                      <ReactMarkdown>{displayContent}</ReactMarkdown>
                      {isStreaming && displayContent && (
                        <span className="inline-block w-2 h-4 bg-primary ml-1 animate-pulse"></span>
                      )}
                    </div>
                  )
                })()}

              </div>

            )}

          </div>

        ) : (

          <div className="flex items-center justify-center h-full">

            <div className="text-center space-y-4">

              <div className="rounded-lg border bg-card p-8 shadow-sm">

                <Code2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />

                <h2 className="text-xl font-semibold mb-2">{t("artifactPanel.noArtifactSelected")}</h2>

                <p className="text-sm text-muted-foreground max-w-sm">

                  {t("artifactPanel.noArtifactDescription")}

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

      {/* Selection Popover is now handled via inlineEditState */}

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
          <div className="flex flex-col gap-2 bg-background border rounded-lg shadow-xl p-2.5 min-w-[320px] max-w-[450px]">
            <div className="flex items-center justify-between px-1">
              <p className="text-[10px] font-medium text-muted-foreground truncate uppercase tracking-wider">
                {inlineEditState.mode === "selection" ? t("artifactPanel.directEdit") : t("artifactPanel.editDescription", { description: inlineEditState.description })}
              </p>
              {inlineEditState.mode === "selection" && (
                <span className="text-[9px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground">{t("artifactPanel.selection")}</span>
              )}
            </div>

            <Input
              ref={inlineEditInputRef}
              value={inlineEditState.value}
              onChange={(e) => setInlineEditState(prev => ({ ...prev, value: e.target.value }))}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (e.metaKey || e.ctrlKey) {
                    if (inlineEditState.mode === "element") handleInlineEditSubmit();
                    else handleManualUpdate(inlineEditState.mode);
                  } else {
                    if (inlineEditState.mode === "selection") handleManualUpdate("selection");
                    else handleInlineEditSubmit(); // Default to AI for elements as requested
                  }
                }
              }}
              placeholder={inlineEditState.mode === "selection" ? t("artifactPanel.newTextContent") : t("artifactPanel.describeChange")}
              className="h-9 text-sm focus-visible:ring-indigo-500"
            />

            <div className="flex items-center gap-2 mt-1">
              {inlineEditState.mode === "element" && (
                <Button
                  size="sm"
                  className="w-fit ml-auto bg-indigo-500 hover:bg-indigo-600 text-white gap-2 text-xs shadow-sm"
                  onClick={handleInlineEditSubmit}
                  disabled={isUpdating || !inlineEditState.value.trim()}
                >
                  <MessageSquare className="h-4 w-4" />
                  {t("artifactPanel.askB")}
                </Button>
              )}

              {inlineEditState.mode === "selection" && (
                <Button
                  size="sm"
                  className="ml-auto w-fit bg-emerald-500 hover:bg-emerald-600 text-white gap-2 text-xs shadow-sm cursor-pointer"
                  onClick={() => handleManualUpdate("selection")}
                  disabled={!inlineEditState.value.trim() || isUpdating}
                >
                  {isUpdating ? (
                    <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  ) : (
                    <Send className="h-3.5 w-3.5" />
                  )}
                  {isUpdating ? t("artifactPanel.updating") : t("artifactPanel.updateSelectedText")}
                </Button>
              )}
            </div>

            <p className="text-[9px] text-muted-foreground/60 text-center px-1">
              {inlineEditState.mode === "selection"
                ? t("artifactPanel.pressEnterToSave")
                : t("artifactPanel.pressEnterToSend")}
            </p>
          </div>
        </div>
      )}

    </div>

  );

};

