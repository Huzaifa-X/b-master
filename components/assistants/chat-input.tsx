// components/assistants/chat-input.tsx
"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Loader2, ArrowUp, X, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputActions,
  PromptInputAction,
} from "@/components/ui/prompt-input"
import { AttachmentDropdown } from "@/components/assistants/attachment-dropdown"
import { DictateButton } from "@/components/assistants/dictate-button"
import { SelectArtifactDialog } from "@/components/assistants/select-artifact-dialog"
import { MentionDropdown } from "@/components/assistants/mention-dropdown"
import { MentionDropdownPortal } from "@/components/assistants/mention-dropdown-portal"
import { searchUsersForMention } from "@/app/actions/user.action"
import { toast } from "sonner"
import ReactMarkdown from "react-markdown"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism"
import { uploadFilesToS3, type FileUploadData } from "@/app/actions/file-upload.action"

interface User {
  id: string
  name: string
  email: string
  image: string | null
}

interface MentionedUser {
  id: string
  name: string
  email: string
}

interface ChatInputProps {
  value?: string
  onValueChange?: (value: string) => void
  onSubmit: (
    message: string,
    attachments?: { name: string; url: string; type: string; size: number }[],
    options?: {
      webSearch?: boolean;
      research?: boolean;
      chatWithAPI?: boolean;
      artifact?: { id: string; name: string; instructions: string; htmlContent: string }
      mentionedUsers?: MentionedUser[]
    }
  ) => void
  isLoading?: boolean
  disabled?: boolean
  placeholder?: string
  onFileSelect?: (files: File[]) => void
  onWebSearch?: (enabled: boolean) => void
  onResearch?: (enabled: boolean) => void
  onChatWithArtifact?: () => void
  onChatWithAPI?: () => void
  className?: string
  mode?: "ask-b" | "assistant"
  assistantId?: string
}

export function ChatInput({
  value: externalValue,
  onValueChange: externalOnValueChange,
  onSubmit,
  isLoading = false,
  disabled = false,
  placeholder = "Send a message...",
  onFileSelect,
  onWebSearch,
  onResearch,
  onChatWithArtifact,
  onChatWithAPI,
  className,
  mode = "assistant",
  assistantId
}: ChatInputProps) {
  // Internal state for controlled input
  const [internalValue, setInternalValue] = useState("")
  const [attachedFiles, setAttachedFiles] = useState<File[]>([])
  const [showPreview, setShowPreview] = useState(false)
  const [webSearchEnabled, setWebSearchEnabled] = useState(false)
  const [researchEnabled, setResearchEnabled] = useState(false)
  const [chatWithAPIEnabled, setChatWithAPIEnabled] = useState(false)
  const [selectedArtifact, setSelectedArtifact] = useState<{ id: string; name: string; instructions: string; htmlContent: string } | null>(null)
  const [isArtifactDialogOpen, setIsArtifactDialogOpen] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  
  // Mention functionality
  const [showMentionDropdown, setShowMentionDropdown] = useState(false)
  const [mentionUsers, setMentionUsers] = useState<User[]>([])
  const [mentionQuery, setMentionQuery] = useState("")
  const [mentionStartIndex, setMentionStartIndex] = useState(0)
  const [mentionDropdownPosition, setMentionDropdownPosition] = useState({ top: 0, left: 0 })
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0)
  const [isLoadingMentions, setIsLoadingMentions] = useState(false)
  const [mentionedUsers, setMentionedUsers] = useState<MentionedUser[]>([]) // Track mentioned users

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

  // Detect @ mention trigger
  const detectMentionTrigger = useCallback((text: string, cursorPosition: number) => {
    if (mode !== "assistant") return false

    // Find the last @ before cursor
    const textBeforeCursor = text.substring(0, cursorPosition)
    const lastAtIndex = textBeforeCursor.lastIndexOf("@")
    if (lastAtIndex === -1) return false

    // Check if @ is at start or preceded by whitespace
    const charBeforeAt = lastAtIndex > 0 ? textBeforeCursor[lastAtIndex - 1] : " "
    if (charBeforeAt !== " " && charBeforeAt !== "\n") return false

    // Get text after @ up to cursor
    const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1)

    // Check if there's a space after @ (which would end the mention)
    if (textAfterAt.includes(" ") || textAfterAt.includes("\n")) return false

    setMentionStartIndex(lastAtIndex)
    setMentionQuery(textAfterAt)
    return true
  }, [mode])

  // Load users when mention is triggered
  useEffect(() => {
    const loadMentionUsers = async () => {
      if (!showMentionDropdown || !assistantId) return

      setIsLoadingMentions(true)
      try {
        const users = await searchUsersForMention(assistantId, mentionQuery)
        setMentionUsers(users)
        setSelectedMentionIndex(0)
      } catch (error) {
        console.error("Error loading mention users:", error)
        setMentionUsers([])
      } finally {
        setIsLoadingMentions(false)
      }
    }

    loadMentionUsers()
  }, [showMentionDropdown, mentionQuery, assistantId])

  // Calculate dropdown position relative to textarea element
  const getDropdownPosition = useCallback(() => {
    if (!textareaRef.current) return null

    const textarea = textareaRef.current
    const rect = textarea.getBoundingClientRect()
    
    // Position dropdown below the textarea, aligned to the left
    // Similar to Material-UI Menu's default positioning
    return {
      top: rect.bottom + 4, // 4px gap below textarea
      left: rect.left
    }
  }, [])

  // Handle text changes and detect mentions
  const handleValueChange = useCallback((newValue: string) => {
    onValueChange(newValue)

    // Use setTimeout to ensure the cursor position is updated
    setTimeout(() => {
      if (!textareaRef.current) return

      const cursorPosition = textareaRef.current.selectionStart
      const shouldShowMention = detectMentionTrigger(newValue, cursorPosition)

      if (shouldShowMention) {
        const dropdownPos = getDropdownPosition()
        
        if (dropdownPos) {
          const screenWidth = window.innerWidth
          const screenHeight = window.innerHeight
          const dropdownWidth = 256
          const dropdownMaxHeight = 240
          
          let { left, top } = dropdownPos
          
          // Adjust if too close to edges
          if (left + dropdownWidth > screenWidth - 20) {
            left = screenWidth - dropdownWidth - 20
          }
          left = Math.max(20, left)
          
          // Show above if too close to bottom
          if (top + dropdownMaxHeight > screenHeight - 20) {
            if (textareaRef.current) {
              const rect = textareaRef.current.getBoundingClientRect()
              top = rect.top - dropdownMaxHeight - 4
            }
          }
          
          setMentionDropdownPosition({ top, left })
          setShowMentionDropdown(true)
        }
      } else {
        setShowMentionDropdown(false)
      }
    }, 0)
  }, [onValueChange, detectMentionTrigger, mode, getDropdownPosition])

  // Insert mention into text
  const insertMention = useCallback((user: User) => {
    const beforeMention = value.substring(0, mentionStartIndex)
    const afterMention = value.substring(textareaRef.current?.selectionStart || value.length)
    const mentionText = `@${user.name} `
    
    const newValue = beforeMention + mentionText + afterMention
    onValueChange(newValue)
    
    // Track this user as mentioned (including email)
    setMentionedUsers(prev => {
      // Avoid duplicates
      if (prev.some(u => u.id === user.id)) return prev
      return [...prev, { id: user.id, name: user.name, email: user.email }]
    })
    
    // Set cursor position after mention
    setTimeout(() => {
      if (textareaRef.current) {
        const newCursorPosition = beforeMention.length + mentionText.length
        textareaRef.current.focus()
        textareaRef.current.setSelectionRange(newCursorPosition, newCursorPosition)
      }
    }, 0)
    
    setShowMentionDropdown(false)
    setMentionUsers([])
    setMentionQuery("")
  }, [value, mentionStartIndex, onValueChange])

  // Handle keyboard navigation in mention dropdown
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // If mention dropdown is open, handle navigation and prevent other actions
    if (showMentionDropdown && mentionUsers.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault()
        setSelectedMentionIndex((prev) => (prev + 1) % mentionUsers.length)
      } else if (e.key === "ArrowUp") {
        e.preventDefault()
        setSelectedMentionIndex((prev) => (prev - 1 + mentionUsers.length) % mentionUsers.length)
      } else if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault()
        if (mentionUsers[selectedMentionIndex]) {
          insertMention(mentionUsers[selectedMentionIndex])
        }
      } else if (e.key === "Escape") {
        e.preventDefault()
        setShowMentionDropdown(false)
      }
    }
  }, [showMentionDropdown, mentionUsers, selectedMentionIndex, insertMention])

  const handleSend = async () => {
    // Don't send if mention dropdown is open
    if (showMentionDropdown) return
    
    if ((!value.trim() && attachedFiles.length === 0) || isLoading || disabled) return
    
    let attachments: { name: string; url: string; type: string; size: number }[] = []

    // Upload files to S3 if there are any attachments
    if (attachedFiles.length > 0) {
      // Convert files to base64 for server action
      const fileUploadData: FileUploadData[] = await Promise.all(
        attachedFiles.map(async (file) => {
          const base64 = await fileToBase64(file)
          return {
            fileName: file.name,
            fileData: base64,
            contentType: file.type || 'application/octet-stream',
          }
        })
      )

      // Upload to S3
      const result = await uploadFilesToS3(fileUploadData)

      if (!result.success) {
        toast.error(result.error || 'Failed to upload files. Please try again.')
        return
      }

      attachments = result.files
    }

    // Call onSubmit with the message, attachments, search options, and mentioned users
    onSubmit(
      value.trim(),
      attachments.length > 0 ? attachments : undefined,
      {
        webSearch: webSearchEnabled,
        research: researchEnabled,
        chatWithAPI: chatWithAPIEnabled,
        artifact: selectedArtifact || undefined,
        mentionedUsers: mentionedUsers.length > 0 ? mentionedUsers : undefined,
      }
    )
    
    // Clear input, attachments, and mentioned users
    onValueChange("")
    setAttachedFiles([])
    setShowPreview(false)
    setSelectedArtifact(null)
    setMentionedUsers([])
    setChatWithAPIEnabled(false)
  }

  // Helper function to convert File to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result)
        } else {
          reject(new Error('Failed to read file'))
        }
      }
      reader.onerror = () => reject(reader.error)
      reader.readAsDataURL(file)
    })
  }

  const handleWebSearchChange = (enabled: boolean) => {
    setWebSearchEnabled(enabled)
    if (enabled) {
      setResearchEnabled(false) // Disable research if web search is enabled
    }
    onWebSearch?.(enabled)
  }

  const handleResearchChange = (enabled: boolean) => {
    setResearchEnabled(enabled)
    if (enabled) {
      setWebSearchEnabled(false) // Disable web search if research is enabled
    }
    onResearch?.(enabled)
  }

  const handleChatWithAPIChange = () => {
    setChatWithAPIEnabled(true)
    // Disable other modes when chat with API is enabled
    setWebSearchEnabled(false)
    setResearchEnabled(false)
    setSelectedArtifact(null)
    onWebSearch?.(false)
    onResearch?.(false)
    onChatWithAPI?.()
  }

  const handleDictateTranscript = (text: string) => {
    onValueChange(value ? `${value} ${text}` : text)
  }

  const handleFileSelect = (files: File[]) => {
    setAttachedFiles((prev) => [...prev, ...files])
    onFileSelect?.(files)
  }

  const handleFileUpload = (fileList: FileList) => {
    // Convert FileList to File array and handle the same way as manual file selection
    const files = Array.from(fileList)
    handleFileSelect(files)
  }

  const handleChatWithArtifact = () => {
    if (!assistantId) {
      return
    }
    setIsArtifactDialogOpen(true)
    onChatWithArtifact?.()
  }

  const handleArtifactSelect = (artifact: { id: string; name: string; instructions: string; htmlContent: string }) => {
    setSelectedArtifact(artifact)
    // Disable other modes when artifact is selected
    setWebSearchEnabled(false)
    setResearchEnabled(false)
    onWebSearch?.(false)
    onResearch?.(false)
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
      {/* Attachments and Artifact */}
      {(attachedFiles.length > 0 || selectedArtifact) && (
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
          {selectedArtifact && (
            <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-sm">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="truncate max-w-[200px]">{selectedArtifact.name}</span>
              <button
                onClick={() => setSelectedArtifact(null)}
                className="text-muted-foreground hover:text-foreground"
                aria-label="Remove artifact"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
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

      <div className="relative">
        <PromptInput
          value={value}
          onValueChange={handleValueChange}
          onSubmit={handleSend}
          isLoading={isLoading}
          disabled={disabled || isLoading}
          maxHeight={120}
          onFileUpload={handleFileUpload}
          className={className}
        >
          <PromptInputTextarea
            ref={textareaRef}
            placeholder={placeholder}
            className="text-foreground placeholder:text-muted-foreground"
            onPaste={handlePaste}
            onKeyDown={handleKeyDown}
            disabled={disabled || isLoading}
          />
        
        {/* Mention Dropdown - Portal to body */}
        {showMentionDropdown && (
          <MentionDropdownPortal>
            <MentionDropdown
              users={mentionUsers}
              isLoading={isLoadingMentions}
              onSelect={insertMention}
              position={mentionDropdownPosition}
              selectedIndex={selectedMentionIndex}
              onSelectedIndexChange={setSelectedMentionIndex}
            />
          </MentionDropdownPortal>
        )}
        <PromptInputActions className="px-2 pb-1 justify-between">
          <div className="flex items-center gap-2">
            <AttachmentDropdown
              onFileSelect={handleFileSelect}
              onWebSearch={handleWebSearchChange}
              onResearch={handleResearchChange}
              onChatWithArtifact={handleChatWithArtifact}
              onChatWithAPI={handleChatWithAPIChange}
              disabled={disabled || isLoading}
              mode={mode}
              assistantId={assistantId}
            />
            {assistantId && (
              <SelectArtifactDialog
                open={isArtifactDialogOpen}
                onOpenChange={setIsArtifactDialogOpen}
                assistantId={assistantId}
                onSelect={handleArtifactSelect}
              />
            )}
            <DictateButton 
              onTranscript={handleDictateTranscript}
              disabled={disabled || isLoading}
            />
          </div>
          <div className="flex items-center gap-2">
            <PromptInputAction tooltip="Send message (Enter)">
              <Button
                onClick={handleSend}
                disabled={(!value.trim() && attachedFiles.length === 0) || isLoading || disabled}
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
    </div>
  )
}