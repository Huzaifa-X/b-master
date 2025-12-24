// components/assistants/chat-input.tsx
"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Loader2, ArrowUp, X, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  PromptInputActions,
} from "@/components/ui/prompt-input"
import { Textarea } from "@/components/ui/textarea"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { AttachmentDropdown } from "@/components/assistants/attachment-dropdown"
import { DictateButton } from "@/components/assistants/dictate-button"
import { SelectArtifactDialog } from "@/components/assistants/select-artifact-dialog"
import { 
  Mention, 
  MentionInput, 
  MentionContent, 
  MentionItem,
  MentionPortal 
} from "@/components/ui/mention"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { searchUsersForMention } from "@/app/actions/user.action"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
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
      mode?: "webSearch" | "research" | "chatWithAPI" | "dropbox" | "artifact"
      webSearch?: boolean;
      research?: boolean;
      chatWithAPI?: boolean;
      dropbox?: boolean;
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
  onDropbox?: (enabled: boolean) => void
  className?: string
  mode?: "ask-b" | "assistant"
  assistantId?: string
  isAtBottom?: boolean // Indicates if chat input is at the bottom of the viewport
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
  onDropbox,
  className,
  mode = "assistant",
  assistantId,
  isAtBottom = false
}: ChatInputProps) {
  // Internal state for controlled input
  const [internalValue, setInternalValue] = useState("")
  const [attachedFiles, setAttachedFiles] = useState<File[]>([])
  const [showPreview, setShowPreview] = useState(false)
  const [webSearchEnabled, setWebSearchEnabled] = useState(false)
  const [researchEnabled, setResearchEnabled] = useState(false)
  const [chatWithAPIEnabled, setChatWithAPIEnabled] = useState(false)
  const [dropboxEnabled, setDropboxEnabled] = useState(false)
  const [selectedArtifact, setSelectedArtifact] = useState<{ id: string; name: string; instructions: string; htmlContent: string } | null>(null)
  const [isArtifactDialogOpen, setIsArtifactDialogOpen] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Mention functionality
  const [mentionUsers, setMentionUsers] = useState<User[]>([])
  const [isLoadingMentions, setIsLoadingMentions] = useState(false)
  const [mentionedUsers, setMentionedUsers] = useState<MentionedUser[]>([]) // Track mentioned users
  const [isMentionOpen, setIsMentionOpen] = useState(false) // Track if mention dropdown is open

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

  // Autosize textarea
  useEffect(() => {
    if (!textareaRef.current) return
    const textarea = textareaRef.current
    textarea.style.height = "auto"
    textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`
  }, [value])

  // Drag and drop handlers
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.dataTransfer.types.includes("Files") && !disabled) {
      setIsDragging(true)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!containerRef.current?.contains(e.relatedTarget as Node)) {
      setIsDragging(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    if (disabled) return

    const files = e.dataTransfer.files
    if (files && files.length > 0) {
      handleFileUpload(files)
    }
  }

  // Handle Enter key for submit
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      // Don't submit if mention dropdown is open - let the mention component handle it
      if (isMentionOpen) {
        return
      }
      e.preventDefault()
      handleSend()
    }
  }

  // Filter users for mention (exclude already mentioned)
  const getFilteredMentionUsers = useCallback(() => {
    return mentionUsers.filter(user => 
      !mentionedUsers.some(mentioned => mentioned.id === user.id)
    )
  }, [mentionUsers, mentionedUsers])

  // State to track current mention search term
  const [mentionSearchTerm, setMentionSearchTerm] = useState("")

  // Load users when mention search term changes
  useEffect(() => {
    if (mode !== "assistant" || !assistantId) {
      setMentionUsers([])
      return
    }

    const loadUsers = async () => {
      setIsLoadingMentions(true)
      try {
        const users = await searchUsersForMention(assistantId, mentionSearchTerm)
        setMentionUsers(users)
      } catch (error) {
        console.error("Error loading mention users:", error)
        setMentionUsers([])
      } finally {
        setIsLoadingMentions(false)
      }
    }

    // Debounce the search
    const timeoutId = setTimeout(() => {
      loadUsers()
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [mode, assistantId, mentionSearchTerm])

  // Handle mention filter (client-side filtering + update search term)
  const handleMentionFilter = useCallback((options: string[], term: string) => {
    // Update search term for async loading
    setMentionSearchTerm(term)
    
    // Also do client-side filtering on current options
    if (!term) return options
    const lowerTerm = term.toLowerCase()
    return options.filter(option => 
      option.toLowerCase().includes(lowerTerm)
    )
  }, [])

  // Handle text changes
  const handleValueChange = useCallback((newValue: string) => {
    onValueChange(newValue)
  }, [onValueChange])

  useEffect(() => {
    // Load mode and artifact from sessionStorage on mount
    if (typeof window !== "undefined") {
      const savedMode = sessionStorage.getItem("chat_mode")

      if (savedMode === "webSearch") {
        setWebSearchEnabled(true)
      } else if (savedMode === "research") {
        setResearchEnabled(true)
      } else if (savedMode === "chatWithAPI") {
        setChatWithAPIEnabled(true)
      } else if (savedMode === "dropbox") {
        setDropboxEnabled(true)
      } else if (savedMode === "artifact") {
        // 🔥 Load artifact data from sessionStorage
        const savedArtifact = sessionStorage.getItem("chat_artifact_data")
        if (savedArtifact) {
          try {
            const artifact = JSON.parse(savedArtifact)
            setSelectedArtifact(artifact)
            console.log("[ChatInput] Loaded artifact from sessionStorage:", artifact.name)
          } catch (error) {
            console.error("[ChatInput] Error loading artifact from sessionStorage:", error)
          }
        }
      }
    }
  }, [])

  const handleSend = async () => {
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
        dropbox: dropboxEnabled,
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
    setDropboxEnabled(false)

    // 🔥 Clear mode AND artifact data from sessionStorage
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("chat_mode")
      sessionStorage.removeItem("chat_artifact_data")
      sessionStorage.removeItem('chat_mentioned_users')
      console.log("[ChatInput] Cleared mode and artifact after send")
    }
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
      setResearchEnabled(false)
      setSelectedArtifact(null)
      // 🔥 Clear artifact data from sessionStorage
      if (typeof window !== "undefined") {
        sessionStorage.removeItem("chat_artifact_data")
        sessionStorage.removeItem('chat_mentioned_users')
      }
    }
    onWebSearch?.(enabled)
  }

  const handleResearchChange = (enabled: boolean) => {
    setResearchEnabled(enabled)
    if (enabled) {
      setWebSearchEnabled(false)
      setSelectedArtifact(null)
      // 🔥 Clear artifact data from sessionStorage
      if (typeof window !== "undefined") {
        sessionStorage.removeItem("chat_artifact_data")
        sessionStorage.removeItem('chat_mentioned_users')
      }
    }
    onResearch?.(enabled)
  }

  const handleChatWithAPIChange = () => {
    setChatWithAPIEnabled(true)
    setWebSearchEnabled(false)
    setResearchEnabled(false)
    setSelectedArtifact(null)
    // 🔥 Clear artifact data from sessionStorage
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("chat_artifact_data")
      sessionStorage.removeItem('chat_mentioned_users')
    }
    onWebSearch?.(false)
    onResearch?.(false)
    onChatWithAPI?.()
  }

  const handleDropboxChange = (enabled: boolean) => {
    setDropboxEnabled(enabled)
    if (enabled) {
      setSelectedArtifact(null)
      // 🔥 Clear artifact data from sessionStorage
      if (typeof window !== "undefined") {
        sessionStorage.removeItem("chat_artifact_data")
        sessionStorage.removeItem('chat_mentioned_users')
      }
    }
    onDropbox?.(enabled)
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
    console.log("[ChatInput] handleArtifactSelect called with:", artifact.name)

    setSelectedArtifact(artifact)

    // Disable ALL other modes
    setWebSearchEnabled(false)
    setResearchEnabled(false)
    setChatWithAPIEnabled(false)
    setDropboxEnabled(false)

    // Notify parent components
    onWebSearch?.(false)
    onResearch?.(false)
    onDropbox?.(false)

    // 🔥 Store BOTH mode and artifact data in sessionStorage
    if (typeof window !== "undefined") {
      sessionStorage.setItem("chat_mode", "artifact")
      sessionStorage.setItem("chat_artifact_data", JSON.stringify(artifact))

      console.log("[ChatInput] Stored artifact mode and data in sessionStorage:", artifact.name)
      console.log("[ChatInput] Verification - mode:", sessionStorage.getItem("chat_mode"))
      console.log("[ChatInput] Verification - data:", sessionStorage.getItem("chat_artifact_data"))
    }
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
        {mode === "assistant" && assistantId ? (
          <TooltipProvider>
            <Mention
              trigger="@"
              value={mentionedUsers.map(u => u.name)}
              onValueChange={(newMentions) => {
                // Update mentionedUsers based on the new mentions array
                setMentionedUsers(prev => {
                  // Find users that are in the new mentions
                  const updated = newMentions.map(name => {
                    // Check if we already have this user
                    const existing = prev.find(u => u.name === name)
                    if (existing) return existing

                    // Find in the full user list
                    const user = mentionUsers.find(u => u.name === name)
                    if (user) {
                      return { id: user.id, name: user.name, email: user.email }
                    }
                    return null
                  }).filter((u): u is MentionedUser => u !== null)

                  return updated
                })
              }}
              inputValue={value}
              onInputValueChange={handleValueChange}
              onFilter={handleMentionFilter}
              onOpenChange={setIsMentionOpen}
              disabled={disabled || isLoading}
              className={cn(
                "border-input bg-background rounded-3xl border p-2 shadow-xs relative transition-all",
                isDragging && "ring-2 ring-primary ring-offset-2 bg-primary/5 dark:bg-primary/10 border-primary",
                className
              )}
              onDragEnter={handleDragEnter}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              ref={containerRef}
            >
              <MentionInput asChild>
                <Textarea
                  ref={textareaRef}
                  onKeyDown={handleKeyDown}
                  onPaste={handlePaste}
                  placeholder={placeholder}
                  disabled={disabled || isLoading}
                  rows={1}
                  className="text-foreground placeholder:text-muted-foreground min-h-[44px] w-full resize-none border-none bg-transparent shadow-none outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
                />
              </MentionInput>

              <MentionPortal>
                <MentionContent
                  side={isAtBottom ? "top" : "bottom"}
                  align="start"
                  className="bg-background"
                >
                  {isLoadingMentions ? (
                    <div className="flex items-center justify-center gap-2 px-2 py-1.5 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Loading users...</span>
                    </div>
                  ) : getFilteredMentionUsers().length === 0 ? (
                    <div className="px-2 py-1.5 text-sm text-muted-foreground text-center">
                      No users found
                    </div>
                  ) : (
                    getFilteredMentionUsers().map((user) => (
                      <MentionItem
                        key={user.id}
                        value={user.name}
                      >
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={user.image || undefined} alt={user.name} />
                          <AvatarFallback className="text-xs">
                            {user.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .toUpperCase()
                              .slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{user.name}</div>
                          <div className="text-xs text-muted-foreground truncate">
                            {user.email}
                          </div>
                        </div>
                      </MentionItem>
                    ))
                  )}
                </MentionContent>
              </MentionPortal>

              {/* Drag and drop overlay */}
              {isDragging && (
                <div className="absolute inset-0 rounded-3xl bg-primary/10 dark:bg-primary/20 border-2 border-dashed border-primary flex items-center justify-center pointer-events-none z-10">
                  <div className="text-center">
                    <p className="text-sm font-medium text-primary">Drop files here to upload</p>
                  </div>
                </div>
              )}

              <PromptInputActions className="px-2 pb-1 justify-between">
                <div className="flex items-center gap-2">
                  <AttachmentDropdown
                    onFileSelect={handleFileSelect}
                    onWebSearch={handleWebSearchChange}
                    onResearch={handleResearchChange}
                    onChatWithArtifact={handleChatWithArtifact}
                    onChatWithAPI={handleChatWithAPIChange}
                    onDropbox={handleDropboxChange}
                    disabled={disabled || isLoading}
                    mode={mode}
                    assistantId={assistantId}
                    selectedArtifact={selectedArtifact}  // 🔥 Pass selected artifact
                    onRemoveArtifact={() => {            // 🔥 Handle removal
                      setSelectedArtifact(null)
                      if (typeof window !== "undefined") {
                        sessionStorage.removeItem("chat_selected_artifact")
                        sessionStorage.removeItem('chat_mentioned_users')
                      }
                    }}
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
                  <Tooltip>
                    <TooltipTrigger asChild disabled={disabled || isLoading}>
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
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      Send message (Enter)
                    </TooltipContent>
                  </Tooltip>
                </div>
              </PromptInputActions>
            </Mention>
          </TooltipProvider>
        ) : (
          <TooltipProvider>
            <div
              ref={containerRef}
              onDragEnter={handleDragEnter}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={cn(
                "border-input bg-background rounded-3xl border p-2 shadow-xs relative transition-all",
                isDragging && "ring-2 ring-primary ring-offset-2 bg-primary/5 dark:bg-primary/10 border-primary",
                className
              )}
            >
              <Textarea
                ref={textareaRef}
                value={value}
                onChange={(e) => handleValueChange(e.target.value)}
                onKeyDown={handleKeyDown}
                onPaste={handlePaste}
                placeholder={placeholder}
                disabled={disabled || isLoading}
                rows={1}
                className="text-primary min-h-[44px] w-full resize-none border-none bg-transparent shadow-none outline-none focus-visible:ring-0 focus-visible:ring-offset-0 text-foreground placeholder:text-muted-foreground"
              />

              {/* Drag and drop overlay */}
              {isDragging && (
                <div className="absolute inset-0 rounded-3xl bg-primary/10 dark:bg-primary/20 border-2 border-dashed border-primary flex items-center justify-center pointer-events-none z-10">
                  <div className="text-center">
                    <p className="text-sm font-medium text-primary">Drop files here to upload</p>
                  </div>
                </div>
              )}

            <PromptInputActions className="px-2 pb-1 justify-between">
              <div className="flex items-center gap-2">
                <AttachmentDropdown
                  onFileSelect={handleFileSelect}
                  onWebSearch={handleWebSearchChange}
                  onResearch={handleResearchChange}
                  onChatWithArtifact={handleChatWithArtifact}
                  onChatWithAPI={handleChatWithAPIChange}
                  onDropbox={handleDropboxChange}
                  disabled={disabled || isLoading}
                  mode={mode}
                  assistantId={assistantId}
                  selectedArtifact={selectedArtifact}
                  onRemoveArtifact={() => {
                    setSelectedArtifact(null)
                    if (typeof window !== "undefined") {
                      sessionStorage.removeItem("chat_selected_artifact")
                      sessionStorage.removeItem('chat_mentioned_users')
                    }
                  }}
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
                <Tooltip>
                  <TooltipTrigger asChild disabled={disabled || isLoading}>
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
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    Send message (Enter)
                  </TooltipContent>
                </Tooltip>
              </div>
            </PromptInputActions>
          </div>
          </TooltipProvider>
        )}
      </div>
    </div>
  )
}