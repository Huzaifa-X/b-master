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
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Mention functionality
  const [showMentionDropdown, setShowMentionDropdown] = useState(false)
  const [mentionUsers, setMentionUsers] = useState<User[]>([])
  const [mentionQuery, setMentionQuery] = useState("")
  const [mentionStartIndex, setMentionStartIndex] = useState(0)
  const [mentionDropdownPosition, setMentionDropdownPosition] = useState<{ top?: number; bottom?: number; left: number; placement: "above" | "below" }>({ left: 0, placement: "below" })
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

  // Reset selected index when filtered users change (after filtering out mentioned users)
  useEffect(() => {
    const filteredUsers = mentionUsers.filter(user => 
      !mentionedUsers.some(mentioned => mentioned.id === user.id)
    )
    if (filteredUsers.length > 0 && selectedMentionIndex >= filteredUsers.length) {
      setSelectedMentionIndex(0)
    } else if (filteredUsers.length === 0 && selectedMentionIndex > 0) {
      setSelectedMentionIndex(0)
    }
  }, [mentionUsers, mentionedUsers, selectedMentionIndex])

  // Calculate dropdown position and placement relative to textarea element
  const getDropdownPosition = useCallback(() => {
    if (!textareaRef.current) return null

    const textarea = textareaRef.current
    const rect = textarea.getBoundingClientRect()
    const screenHeight = window.innerHeight
    const dropdownMaxHeight = 240
    const gap = 4

    // Use isAtBottom prop to determine placement preference
    const spaceBelow = screenHeight - rect.bottom
    const spaceAbove = rect.top

    // If input is at bottom, always show above
    // Otherwise, show below if there's space, above if not
    const shouldShowAbove = isAtBottom
      ? true
      : spaceBelow < dropdownMaxHeight + gap && spaceAbove > dropdownMaxHeight + gap

    // When showing above and at bottom, use bottom positioning so it grows upward
    // When showing above in middle, use top positioning
    // When showing below, use top positioning
    if (shouldShowAbove && isAtBottom) {
      // Position using bottom so it grows upward from the input
      const bottom = screenHeight - rect.top + gap
      return {
        top: undefined,
        bottom,
        left: rect.left,
        placement: "above" as const
      }
    } else if (shouldShowAbove) {
      // Position using top (middle of page scenario)
      const top = rect.top - dropdownMaxHeight - gap
      return {
        top,
        bottom: undefined,
        left: rect.left,
        placement: "above" as const
      }
    } else {
      // Position below using top
      const top = rect.bottom + gap
      return {
        top,
        bottom: undefined,
        left: rect.left,
        placement: "below" as const
      }
    }
  }, [isAtBottom])

  // Extract all mentions from text
  const extractMentionsFromText = useCallback((text: string): string[] => {
    // Match @username patterns - can include spaces in names
    // Pattern: @ followed by name (can have spaces) followed by space, newline, or end of string
    const mentionRegex = /@([^\s@]+(?:\s+[^\s@]+)*)(?:\s|$|\n)/g
    const mentions: string[] = []
    let match
    
    while ((match = mentionRegex.exec(text)) !== null) {
      const username = match[1].trim()
      if (username && !mentions.includes(username)) {
        mentions.push(username)
      }
    }
    
    return mentions
  }, [])

  // Update mentionedUsers based on current text
  const updateMentionedUsers = useCallback((text: string) => {
    const currentMentions = extractMentionsFromText(text)
    
    setMentionedUsers(prev => {
      // Keep only users whose names are still in the text
      return prev.filter(user => 
        currentMentions.includes(user.name)
      )
    })
  }, [extractMentionsFromText])

  // Handle text changes and detect mentions
  const handleValueChange = useCallback((newValue: string) => {
    onValueChange(newValue)

    // Update mentionedUsers to remove any that are no longer in the text
    updateMentionedUsers(newValue)

    // Use setTimeout to ensure the cursor position is updated
    setTimeout(() => {
      if (!textareaRef.current) return

      const cursorPosition = textareaRef.current.selectionStart
      const shouldShowMention = detectMentionTrigger(newValue, cursorPosition)

      if (shouldShowMention) {
        const dropdownPos = getDropdownPosition()

        if (dropdownPos) {
          const screenWidth = window.innerWidth
          const dropdownWidth = 256

          let { left } = dropdownPos

          // Adjust horizontal position if too close to edges
          if (left + dropdownWidth > screenWidth - 20) {
            left = screenWidth - dropdownWidth - 20
          }
          left = Math.max(20, left)

          setMentionDropdownPosition({ 
            top: dropdownPos.top, 
            bottom: dropdownPos.bottom, 
            left, 
            placement: dropdownPos.placement 
          })
          setShowMentionDropdown(true)
        }
      } else {
        setShowMentionDropdown(false)
      }
    }, 0)
  }, [onValueChange, detectMentionTrigger, mode, getDropdownPosition, updateMentionedUsers])

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
    // Filter out already mentioned users for navigation
    const filteredUsers = mentionUsers.filter(user => 
      !mentionedUsers.some(mentioned => mentioned.id === user.id)
    )
    
    if (showMentionDropdown && filteredUsers.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault()
        setSelectedMentionIndex((prev) => (prev + 1) % filteredUsers.length)
      } else if (e.key === "ArrowUp") {
        e.preventDefault()
        setSelectedMentionIndex((prev) => (prev - 1 + filteredUsers.length) % filteredUsers.length)
      } else if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault()
        if (filteredUsers[selectedMentionIndex]) {
          insertMention(filteredUsers[selectedMentionIndex])
        }
      } else if (e.key === "Escape") {
        e.preventDefault()
        setShowMentionDropdown(false)
      }
    }
  }, [showMentionDropdown, mentionUsers, mentionedUsers, selectedMentionIndex, insertMention])

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
                users={mentionUsers.filter(user => 
                  !mentionedUsers.some(mentioned => mentioned.id === user.id)
                )}
                isLoading={isLoadingMentions}
                onSelect={insertMention}
                position={mentionDropdownPosition}
                placement={mentionDropdownPosition.placement}
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