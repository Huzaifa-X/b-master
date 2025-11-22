// components/assistants/chat-input.tsx
"use client"

import { useState, useEffect, useRef } from "react"
import { Loader2, ArrowUp, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputActions,
  PromptInputAction,
} from "@/components/ui/prompt-input"
import { AttachmentDropdown } from "@/components/assistants/attachment-dropdown"
import { DictateButton } from "@/components/assistants/dictate-button"
import { toast } from "sonner"
import ReactMarkdown from "react-markdown"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism"

interface ChatInputProps {
  value?: string
  onValueChange?: (value: string) => void
  onSubmit: (message: string) => void // Changed signature
  isLoading?: boolean
  placeholder?: string
  onFileSelect?: (files: File[]) => void
  onWebSearch?: () => void
  onResearch?: () => void
  onChatWithArtifact?: () => void
  className?: string
}

export function ChatInput({
  value: externalValue,
  onValueChange: externalOnValueChange,
  onSubmit,
  isLoading = false,
  placeholder = "Send a message...",
  onFileSelect,
  onWebSearch,
  onResearch,
  onChatWithArtifact,
  className,
}: ChatInputProps) {
  // Internal state for controlled input
  const [internalValue, setInternalValue] = useState("")
  const [attachedFiles, setAttachedFiles] = useState<File[]>([])
  const [showPreview, setShowPreview] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Use external value if provided, otherwise use internal state
  const value = externalValue !== undefined ? externalValue : internalValue
  const onValueChange = externalOnValueChange || setInternalValue

  // Check if input contains markdown and show preview
  useEffect(() => {
    const hasMarkdown =
      value.includes("```") ||
      value.includes("**") ||
      value.includes("*") ||
      value.includes("#") ||
      value.includes("`")
    setShowPreview(hasMarkdown && value.length > 0)
  }, [value])

  const handleSend = () => {
    if ((!value.trim() && attachedFiles.length === 0) || isLoading) return
    
    // Call onSubmit with the message
    onSubmit(value.trim())
    
    // Clear input and attachments
    onValueChange("")
    setAttachedFiles([])
    setShowPreview(false)
  }

  const handleDictateTranscript = (text: string) => {
    onValueChange(value ? `${value} ${text}` : text)
  }

  const handleFileSelect = (files: File[]) => {
    setAttachedFiles((prev) => [...prev, ...files])
    toast.success(`${files.length} file(s) attached`)
    onFileSelect?.(files)
  }

  const handleRemoveFile = (index: number) => {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const pastedText = e.clipboardData.getData("text/plain")
    const looksLikeCode =
      pastedText.includes("function") ||
      pastedText.includes("const ") ||
      pastedText.includes("import ") ||
      (pastedText.includes("{") && pastedText.includes("}")) ||
      pastedText.match(/^\s{2,}/gm)

    if (looksLikeCode && !pastedText.trim().startsWith("```")) {
      e.preventDefault()
      let language = ""
      if (pastedText.includes("function") || pastedText.includes("const")) {
        language = "javascript"
      } else if (pastedText.includes("def ")) {
        language = "python"
      }

      const wrappedCode = `\`\`\`${language}\n${pastedText}\n\`\`\``
      const currentText = value
      const textarea = e.currentTarget
      const start = textarea.selectionStart
      const end = textarea.selectionEnd

      const newValue = currentText.substring(0, start) + wrappedCode + currentText.substring(end)
      onValueChange(newValue)

      setTimeout(() => {
        textarea.setSelectionRange(start + wrappedCode.length, start + wrappedCode.length)
      }, 0)
    }
  }

  return (
    <div className="w-full">
      {/* Attachments */}
      {attachedFiles.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {attachedFiles.map((file, index) => (
            <div
              key={index}
              className="flex items-center gap-2 rounded-lg border border-primary/30 bg-background/50 px-3 py-2 text-sm"
            >
              <span className="truncate max-w-[200px]">{file.name}</span>
              <button
                onClick={() => handleRemoveFile(index)}
                className="text-muted-foreground hover:text-foreground"
                aria-label="Remove file"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Markdown Preview */}
      {showPreview && value && (
        <div className="mb-2 max-h-48 overflow-y-auto rounded-lg border border-primary/30 bg-background/50 p-3 text-sm">
          <div className="mb-1 text-xs font-medium text-muted-foreground">Preview:</div>
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <ReactMarkdown
              components={{
                code(props) {
                  const { children, className, ...rest } = props
                  const match = /language-(\w+)/.exec(className || "")
                  return match ? (
                    <SyntaxHighlighter
                      PreTag="div"
                      language={match[1]}
                      style={vscDarkPlus}
                    >
                      {String(children).replace(/\n$/, "")}
                    </SyntaxHighlighter>
                  ) : (
                    <code
                      {...rest}
                      className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono"
                    >
                      {children}
                    </code>
                  )
                },
                h1: ({ children }) => (
                  <h1 className="text-lg font-bold mt-2 mb-1">{children}</h1>
                ),
                h2: ({ children }) => (
                  <h2 className="text-base font-bold mt-2 mb-1">{children}</h2>
                ),
                h3: ({ children }) => (
                  <h3 className="text-sm font-bold mt-1 mb-1">{children}</h3>
                ),
              }}
            >
              {value}
            </ReactMarkdown>
          </div>
        </div>
      )}

      <PromptInput
        value={value}
        onValueChange={onValueChange}
        onSubmit={handleSend}
        isLoading={isLoading}
        maxHeight={120}
        className={className}
      >
        <PromptInputTextarea
          ref={textareaRef}
          placeholder={placeholder}
          className="text-foreground placeholder:text-muted-foreground"
          onPaste={handlePaste}
        />
        <PromptInputActions className="px-2 pb-1 justify-between">
          <div className="flex items-center gap-2">
            <AttachmentDropdown
              onFileSelect={handleFileSelect}
              onWebSearch={onWebSearch}
              onResearch={onResearch}
              onChatWithArtifact={onChatWithArtifact}
            />
            <DictateButton onTranscript={handleDictateTranscript} />
          </div>
          <div className="flex items-center gap-2">
            <PromptInputAction tooltip="Send message (Enter)">
              <Button
                onClick={handleSend}
                disabled={(!value.trim() && attachedFiles.length === 0) || isLoading}
                size="icon"
                className="size-[34px] rounded-full p-1"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ArrowUp className="h-5 w-5" />
                )}
              </Button>
            </PromptInputAction>
          </div>
        </PromptInputActions>
      </PromptInput>
    </div>
  )
}