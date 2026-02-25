"use client";

import { CornerRightUp, Paperclip, Link2, X, FileText, Image as ImageIcon } from "lucide-react";
import { useState, useRef } from "react";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import { useAutoResizeTextarea } from "@/hooks/use-auto-resize-textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export interface PendingAttachment {
  type: "file" | "url"
  /** For file: the File object (not yet uploaded) */
  file?: File
  /** For url: the URL string */
  url?: string
  /** Preview src for images */
  previewSrc?: string
  name: string
}

interface AIInputProps {
  id?: string
  placeholder?: string
  minHeight?: number
  maxHeight?: number
  onSubmit?: (value: string, attachment?: PendingAttachment) => void
  onFileUpload?: (files: FileList) => void
  className?: string
}

export function AIInput({
  id = "ai-input",
  placeholder = "Type your message...",
  minHeight = 52,
  maxHeight = 200,
  onSubmit,
  onFileUpload,
  className
}: AIInputProps) {
  const { textareaRef, adjustHeight } = useAutoResizeTextarea({
    minHeight,
    maxHeight,
  });
  const [inputValue, setInputValue] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [pendingAttachment, setPendingAttachment] = useState<PendingAttachment | null>(null);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlValue, setUrlValue] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const isImageFile = (name: string) => {
    return /\.(jpg|jpeg|png|gif|webp|svg|bmp)$/i.test(name);
  };

  const handleReset = () => {
    if (!inputValue.trim() && !pendingAttachment) return;
    onSubmit?.(inputValue, pendingAttachment ?? undefined);
    setInputValue("");
    setPendingAttachment(null);
    adjustHeight(true);
  };

  const handleFileClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    const isImg = isImageFile(file.name);
    const attachment: PendingAttachment = {
      type: "file",
      file,
      name: file.name,
      previewSrc: isImg ? URL.createObjectURL(file) : undefined,
    };
    setPendingAttachment(attachment);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleAddUrl = () => {
    const trimmed = urlValue.trim();
    if (!trimmed) return;
    // Auto-prefix http if missing
    const normalized = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    setPendingAttachment({ type: "url", url: normalized, name: normalized });
    setUrlValue("");
    setShowUrlInput(false);
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.types.includes("Files")) setIsDragging(true);
  };
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); };
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!containerRef.current?.contains(e.relatedTarget as Node)) setIsDragging(false);
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      const isImg = isImageFile(file.name);
      setPendingAttachment({
        type: "file",
        file,
        name: file.name,
        previewSrc: isImg ? URL.createObjectURL(file) : undefined,
      });
    }
  };

  const hasContent = inputValue.trim() || pendingAttachment;

  return (
    <div
      className={cn("w-full py-2 px-4", className)}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      ref={containerRef}
    >
      {/* URL input row */}
      {showUrlInput && (
        <div className="flex items-center gap-2 mb-2 px-1">
          <Link2 className="h-4 w-4 text-muted-foreground shrink-0" />
          <Input
            autoFocus
            placeholder="Paste a URL..."
            value={urlValue}
            onChange={(e) => setUrlValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); handleAddUrl(); }
              if (e.key === "Escape") { setShowUrlInput(false); setUrlValue(""); }
            }}
            className="h-8 text-sm"
          />
          <Button size="sm" className="h-8 px-3" onClick={handleAddUrl} disabled={!urlValue.trim()}>
            Attach
          </Button>
          <button onClick={() => { setShowUrlInput(false); setUrlValue(""); }} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Pending attachment chip */}
      {pendingAttachment && (
        <div className="flex items-center gap-2 mb-2 px-1 py-1.5 rounded-lg bg-muted border text-sm">
          {pendingAttachment.type === "url" ? (
            <Link2 className="h-4 w-4 text-primary shrink-0" />
          ) : pendingAttachment.previewSrc ? (
            <img src={pendingAttachment.previewSrc} alt="" className="h-8 w-8 object-cover rounded" />
          ) : (
            <FileText className="h-4 w-4 text-primary shrink-0" />
          )}
          <span className="flex-1 truncate text-xs text-muted-foreground">{pendingAttachment.name}</span>
          <button
            onClick={() => setPendingAttachment(null)}
            className="shrink-0 text-muted-foreground hover:text-destructive"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <div className={cn("relative w-full", isDragging && "opacity-50")}>
        <Textarea
          id={id}
          placeholder={isDragging ? "Drop files here..." : placeholder}
          className={cn(
            "w-full bg-black/5 dark:bg-white/5 rounded-3xl pl-6 pr-24",
            "placeholder:text-black/50 dark:placeholder:text-white/50",
            "border-none ring-black/20 dark:ring-white/20",
            "text-black dark:text-white text-wrap",
            "overflow-y-auto resize-none",
            "focus-visible:ring-0 focus-visible:ring-offset-0",
            "transition-all duration-200 ease-out",
            "leading-[1.2] py-[16px]",
            `min-h-[${minHeight}px]`,
            `max-h-[${maxHeight}px]`,
            "[&::-webkit-resizer]:hidden",
            isDragging && "ring-2 ring-primary ring-offset-2 bg-primary/5 dark:bg-primary/10"
          )}
          ref={textareaRef}
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            adjustHeight();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleReset();
            }
          }}
        />

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple={false}
          className="hidden"
          onChange={handleFileChange}
          accept="image/*,application/pdf,.doc,.docx,.txt,.csv,.xls,.xlsx,.zip"
        />

        {/* Action buttons */}
        <div className={cn(
          "absolute top-1/2 -translate-y-1/2 flex items-center gap-0.5",
          hasContent ? "right-10" : "right-3"
        )}>
          {/* URL attach */}
          <button
            onClick={() => setShowUrlInput((v) => !v)}
            type="button"
            className="rounded-xl bg-black/5 dark:bg-white/5 py-1 px-1 transition-all duration-200 hover:bg-black/10 dark:hover:bg-white/10"
            title="Attach URL"
          >
            <Link2 className="w-4 h-4 text-black/70 dark:text-white/70" />
          </button>
          {/* File attach */}
          <button
            onClick={handleFileClick}
            type="button"
            className="rounded-xl bg-black/5 dark:bg-white/5 py-1 px-1 transition-all duration-200 hover:bg-black/10 dark:hover:bg-white/10"
            title="Attach file"
          >
            <Paperclip className="w-4 h-4 text-black/70 dark:text-white/70" />
          </button>
        </div>

        {/* Send button */}
        <button
          onClick={handleReset}
          type="button"
          className={cn(
            "absolute top-1/2 -translate-y-1/2 right-3",
            "rounded-xl bg-black/5 dark:bg-white/5 py-1 px-1",
            "transition-all duration-200",
            hasContent
              ? "opacity-100 scale-100"
              : "opacity-0 scale-95 pointer-events-none"
          )}
        >
          <CornerRightUp className="w-4 h-4 text-black/70 dark:text-white/70" />
        </button>

        {/* Drag and drop overlay */}
        {isDragging && (
          <div className="absolute inset-0 rounded-3xl bg-primary/10 dark:bg-primary/20 border-2 border-dashed border-primary flex items-center justify-center pointer-events-none z-10">
            <div className="text-center">
              <Paperclip className="w-8 h-8 mx-auto mb-2 text-primary" />
              <p className="text-sm font-medium text-primary">Drop file here to attach</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}