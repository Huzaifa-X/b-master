"use client";

import { CornerRightUp, Paperclip } from "lucide-react";
import { useState, useRef } from "react";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import { useAutoResizeTextarea } from "@/hooks/use-auto-resize-textarea";

interface AIInputProps {
  id?: string
  placeholder?: string
  minHeight?: number
  maxHeight?: number
  onSubmit?: (value: string) => void
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleReset = () => {
    if (!inputValue.trim()) return;
    onSubmit?.(inputValue);
    setInputValue("");
    adjustHeight(true);
  };

  const handleFileClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onFileUpload?.(files);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.types.includes("Files")) {
      setIsDragging(true);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only set dragging to false if we're leaving the container
    if (!containerRef.current?.contains(e.relatedTarget as Node)) {
      setIsDragging(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0 && onFileUpload) {
      onFileUpload(files);
    }
  };

  return (
    <div 
      className={cn("w-full py-4 px-4", className)}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      ref={containerRef}
    >
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
          multiple
          className="hidden"
          onChange={handleFileChange}
          accept="image/*,application/pdf,.doc,.docx,.txt"
        />

        {/* File upload button */}
        <button
          onClick={handleFileClick}
          type="button"
          className={cn(
            "absolute top-1/2 -translate-y-1/2 rounded-xl bg-black/5 dark:bg-white/5 py-1 px-1 transition-all duration-200 hover:bg-black/10 dark:hover:bg-white/10",
            inputValue ? "right-10" : "right-5"
          )}
          title="Attach file"
        >
          <Paperclip className="w-4 h-4 text-black/70 dark:text-white/70" />
        </button>

        {/* Send button */}
        <button
          onClick={handleReset}
          type="button"
          className={cn(
            "absolute top-1/2 -translate-y-1/2 right-3",
            "rounded-xl bg-black/5 dark:bg-white/5 py-1 px-1",
            "transition-all duration-200",
            inputValue 
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
              <p className="text-sm font-medium text-primary">Drop files here to upload</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}