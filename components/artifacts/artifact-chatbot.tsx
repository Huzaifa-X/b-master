"use client"

import { useState, useEffect, useRef } from "react"
import { Send, Loader2, Plus, X, File, FileText, Image as ImageIcon, Pencil, ArrowLeft, Maximize2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useSession } from "next-auth/react"
import Image from "next/image"
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputActions,
  PromptInputAction,
} from "@/components/ui/prompt-input"
import { useArtifactStore } from "@/lib/stores/artifact-store"
import { useArtifactById } from "@/hooks/useArtifact"
import ReactMarkdown from "react-markdown"
import { toast } from "sonner"
import { CreateArtifactDialog } from "./create-artifact-dialog"

interface UploadedFileData {
  name: string
  url: string
  type: string
  size: number
  preview?: string // For image previews
  extractedContent?: {
    text: string
    html: string
    tables?: Array<{ base64: string; page: number }>
    metadata?: { pages: number; model: string }
  }
}

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
  files?: UploadedFileData[] // Attached files
}

interface ArtifactChatbotProps {
  artifactId: string
  artifactName: string
  assistantId: string
  disabled?: boolean
  isGenerating?: boolean
  isPanelOpen?: boolean
  onTogglePanel?: () => void
  onclose?: () => void
}

export function ArtifactChatbot({ artifactId, artifactName, assistantId, disabled = false, isGenerating = false, isPanelOpen = true, onTogglePanel, onclose }: ArtifactChatbotProps) {
  const { data: session } = useSession()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const scrollRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const storageKey = `artifact-chat-${artifactId}`

  // Get current artifact data
  const { artifact, refetch } = useArtifactById(artifactId)
  const artifactContent = useArtifactStore((state) => state.artifactContent)
  const setArtifact = useArtifactStore((state) => state.setArtifact)
  const prefilledPrompt = useArtifactStore((state) => state.prefilledPrompt)
  const setPrefilledPrompt = useArtifactStore((state) => state.setPrefilledPrompt)
  const inputTextareaRef = useRef<HTMLTextAreaElement>(null)

  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingContent, setStreamingContent] = useState<string>("")

  // File upload state
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [isUploadingFiles, setIsUploadingFiles] = useState(false)

  // Edit dialog state
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)

  // ✅ Check if user can edit this artifact (OWNER or EDITOR)
  const canEditArtifact = artifact?.isOwner || artifact?.access === 'ADMIN'

  // Get user initials for avatar
  const getUserInitials = () => {
    if (!session?.user?.name) return "U"
    const names = session.user.name.split(" ")
    if (names.length >= 2) {
      return `${names[0][0]}${names[1][0]}`.toUpperCase()
    }
    return session.user.name.substring(0, 2).toUpperCase()
  }

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    // Validate file sizes (10MB max per file)
    const maxSize = 10 * 1024 * 1024 // 10MB
    const invalidFiles = files.filter(file => file.size > maxSize)

    if (invalidFiles.length > 0) {
      toast.error(`Some files exceed 10MB limit: ${invalidFiles.map(f => f.name).join(", ")}`)
      return
    }

    // Add to selected files
    setSelectedFiles(prev => [...prev, ...files])

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  // Remove file from selection
  const handleRemoveFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index))
  }

  // Handle file upload from drag and drop (used by PromptInput component)
  const handleFileUpload = (files: FileList) => {
    const fileArray = Array.from(files)
    if (fileArray.length === 0) return

    // Validate file sizes (10MB max per file)
    const maxSize = 10 * 1024 * 1024 // 10MB
    const invalidFiles = fileArray.filter(file => file.size > maxSize)

    if (invalidFiles.length > 0) {
      toast.error(`Some files exceed 10MB limit: ${invalidFiles.map(f => f.name).join(", ")}`)
      return
    }

    // Add to selected files
    setSelectedFiles(prev => [...prev, ...fileArray])
  }

  // Upload files to S3 and store in artifact database
  const uploadFilesToS3 = async (files: File[]): Promise<UploadedFileData[]> => {
    try {
      const uploadedFiles: UploadedFileData[] = []

      for (const file of files) {
        // Convert file to base64
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result as string)
          reader.onerror = reject
          reader.readAsDataURL(file)
        })

        // Upload to S3 (the API will handle document extraction automatically using Upstage)
        const uploadResponse = await fetch("/api/artifact/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileName: file.name,
            fileData: base64,
            contentType: file.type,
          }),
        })

        if (!uploadResponse.ok) {
          const errorData = await uploadResponse.json()
          throw new Error(errorData.error || `Failed to upload ${file.name}`)
        }

        const uploadResult = await uploadResponse.json()

        if (!uploadResult.success) {
          throw new Error(uploadResult.error || `Failed to upload ${file.name}`)
        }

        const uploadedFile = uploadResult.file

        uploadedFiles.push({
          name: uploadedFile.name,
          url: uploadedFile.url,
          type: uploadedFile.type,
          size: uploadedFile.size,
          preview: file.type.startsWith("image/") ? uploadedFile.url : undefined,
          extractedContent: uploadedFile.extractedContent, // Content extracted by Upstage
        })
      }

      // Store uploaded files in artifact database for future use
      if (uploadedFiles.length > 0) {
        console.log("[Artifact Chatbot] Storing", uploadedFiles.length, "files in artifact database")

        try {
          const storeResponse = await fetch("/api/artifacts/store-files", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              artifactId,
              files: uploadedFiles,
            }),
          })

          if (!storeResponse.ok) {
            console.error("[Artifact Chatbot] Failed to store files in database")
            // Don't throw error - files are still uploaded to S3 and can be used
          } else {
            const storeResult = await storeResponse.json()
            console.log("[Artifact Chatbot] Files stored successfully. Total files in artifact:", storeResult.totalFiles)
          }
        } catch (storeError) {
          console.error("[Artifact Chatbot] Error storing files:", storeError)
          // Don't throw error - files are still uploaded to S3 and can be used
        }
      }

      return uploadedFiles
    } catch (error) {
      console.error("Error uploading files:", error)
      throw error
    }
  }

  // Load messages from sessionStorage
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(storageKey)
      if (stored) {
        const parsed = JSON.parse(stored)
        setMessages(
          parsed.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp),
          }))
        )
      } else {
        // Initialize with welcome message
        const welcomeMessage: Message = {
          id: "welcome",
          role: "assistant",
          content: `Hello! I'm here to help you understand and work with "${artifactName}". Feel free to ask me questions about how it works, how to use it, or request modifications.`,
          timestamp: new Date(),
        }
        setMessages([welcomeMessage])
        sessionStorage.setItem(storageKey, JSON.stringify([welcomeMessage]))
      }
    } catch (error) {
      console.error("Error loading chat history:", error)
    }
  }, [artifactId, storageKey, artifactName])

  // Save messages to sessionStorage
  useEffect(() => {
    if (messages.length > 0) {
      try {
        sessionStorage.setItem(storageKey, JSON.stringify(messages))
      } catch (error) {
        console.error("Error saving chat history:", error)
      }
    }
  }, [messages, storageKey])

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  // Handle prefilled prompt from text selection (Ask-B feature)
  useEffect(() => {
    if (prefilledPrompt) {
      setInput(prefilledPrompt)
      setPrefilledPrompt(null) // Clear after using
      // Focus the input field
      setTimeout(() => {
        inputTextareaRef.current?.focus()
      }, 100)
    }
  }, [prefilledPrompt, setPrefilledPrompt])

  const handleSend = async () => {
    if ((!input.trim() && selectedFiles.length === 0) || isStreaming) return

    const userPrompt = input.trim()

    // Upload files first if any
    let uploadedFiles: UploadedFileData[] | undefined
    if (selectedFiles.length > 0) {
      setIsUploadingFiles(true)
      try {
        uploadedFiles = await uploadFilesToS3(selectedFiles)
        toast.success(`${selectedFiles.length} file(s) uploaded successfully`)
      } catch (error) {
        console.error("File upload error:", error)
        toast.error("Failed to upload files. Please try again.")
        setIsUploadingFiles(false)
        return
      }
      setIsUploadingFiles(false)
      setSelectedFiles([]) // Clear selected files
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: userPrompt || "📎 Attached files",
      timestamp: new Date(),
      files: uploadedFiles,
    }

    setMessages((prev) => [...prev, userMessage])
    setInput("")

    // IMPORTANT: Always use the active version's code (from artifact data)
    // Don't use artifactContent from store as it might be a historical version
    const currentHtmlCode = artifact?.htmlContent || ""

    console.log("[Artifact Chatbot] Using artifact code:", {
      source: 'artifact.htmlContent (active version)',
      codeLength: currentHtmlCode.length,
      artifactId: artifact?.id
    })

    if (!currentHtmlCode || currentHtmlCode.trim() === '') {
      const errorMessage: Message = {
        id: Date.now().toString(),
        role: "assistant",
        content: "❌ **Error**: Unable to find the current artifact code. The artifact may not have any content yet. Please refresh the page and try again.",
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMessage])
      return
    }

    // Build chat history for context (exclude welcome message)
    const chatHistory = messages
      .filter((msg) => msg.id !== "welcome")
      .map((msg) => ({
        role: msg.role as "user" | "assistant",
        content: msg.content,
        timestamp: msg.timestamp,
      }))

    // Start streaming update
    setIsStreaming(true)
    setStreamingContent("")

    // Add streaming message
    const streamingMessage: Message = {
      id: `streaming-${Date.now()}`,
      role: "assistant",
      content: "🔄 Updating artifact...",
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, streamingMessage])

    try {
      const response = await fetch('/api/artifacts/update-stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          artifactId,
          userPrompt,
          chatHistory,
          currentHtmlCode,
          uploadedFiles, // Include uploaded files
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`)
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let accumulatedCode = ""

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value, { stream: true })
          const lines = chunk.split('\n')

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const jsonStr = line.slice(6).trim()
                if (!jsonStr) continue

                const data = JSON.parse(jsonStr)

                if (data.type === 'code' && data.content) {
                  try {
                    // Decode base64 content (browser-compatible)
                    const decodedContent = atob(data.content)
                    accumulatedCode += decodedContent
                    setStreamingContent(accumulatedCode)

                    // Update artifact store in real-time
                    setArtifact({
                      type: "code",
                      language: "html",
                      content: accumulatedCode,
                      title: artifact?.name || artifactName,
                    })
                  } catch (decodeError) {
                    console.error("[Artifact Chatbot] Base64 decode error:", decodeError)
                    // Try using content as-is if base64 decode fails
                    accumulatedCode += data.content
                    setStreamingContent(accumulatedCode)
                  }
                } else if (data.type === 'done') {
                  setIsStreaming(false)

                  // Remove streaming message
                  setMessages((prev) => prev.filter((msg) => msg.id !== streamingMessage.id))

                  // Add success message
                  const successMessage: Message = {
                    id: Date.now().toString(),
                    role: "assistant",
                    content: `✅ **Artifact Updated Successfully!**\n\nThe artifact "${artifactName}" has been updated with your requested changes.`,
                    timestamp: new Date(),
                  }
                  setMessages((prev) => [...prev, successMessage])

                  // Refetch artifact to get final version
                  await refetch()

                  toast.success("Artifact updated successfully!")
                  break
                } else if (data.type === 'error') {
                  setIsStreaming(false)

                  // Remove streaming message
                  setMessages((prev) => prev.filter((msg) => msg.id !== streamingMessage.id))

                  // Add error message
                  const errorMessage: Message = {
                    id: Date.now().toString(),
                    role: "assistant",
                    content: `❌ **Update Failed**\n\n${data.error || "An error occurred"}\n\nPlease try again or rephrase your request.`,
                    timestamp: new Date(),
                  }
                  setMessages((prev) => [...prev, errorMessage])

                  toast.error(data.error || "Failed to update artifact")
                  break
                } else if (data.type === 'connected') {
                  console.log("[Artifact Chatbot] Streaming connected successfully")
                }
              } catch (parseError) {
                console.error("[Artifact Chatbot] JSON parse error:", parseError)
              }
            }
          }
        }
      }
    } catch (error: any) {
      console.error("[Artifact Chatbot] Streaming error:", error)
      setIsStreaming(false)

      // Remove streaming message
      setMessages((prev) => prev.filter((msg) => msg.id !== streamingMessage.id))

      // Add error message
      const errorMessage: Message = {
        id: Date.now().toString(),
        role: "assistant",
        content: `❌ **Update Failed**\n\n${error.message || "An unexpected error occurred. Please try again."}`,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMessage])

      toast.error("Failed to update artifact")
    }
  }

  return (
    <div className="h-full flex flex-col bg-background overflow-hidden">
      {/* Header with Edit Button */}
      <div className="flex-shrink-0 px-4 py-3 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="hover:bg-muted hover:text-primary"
            onClick={onclose}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h6>Ask questions or request changes</h6>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Show Close Panel button when panel is open, Show Open Panel button when closed */}
          {onTogglePanel && !isPanelOpen && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onTogglePanel}
              className="hover:bg-muted hover:text-primary"
              title={isPanelOpen ? "Close preview panel" : "Open preview panel"}
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
          )}
          {
            canEditArtifact && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditDialogOpen(true)}
                disabled={disabled || isGenerating}
                className="gap-2"
                title="Edit artifact settings"
              >
                <Pencil className="h-4 w-4" />
              </Button>
            )
          }
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 min-h-0 px-2 md:px-4 py-4" ref={scrollRef}>
        <div className="space-y-4">
          {messages.map((message) => (
            <div key={message.id} className="animate-in duration-150 ease-out fade-in slide-in-from-bottom-1">
              <div className="flex gap-2 md:gap-4">
                {/* Avatar - Always on left */}
                <div className="flex-shrink-0 pt-1">
                  {message.role === "assistant" ? (
                    <div className="flex size-6 md:size-8 items-center justify-center rounded-full">
                      <Image
                        src="/bmaster-icon.png"
                        alt="Assistant"
                        width={24}
                        height={24}
                        className="h-4 w-4 md:h-6 md:w-6"
                        style={{ width: 'auto', height: 'auto' }}
                        unoptimized
                      />
                    </div>
                  ) : (
                    <div className="flex size-6 md:size-8 items-center justify-center rounded-full bg-muted">
                      <span className="text-xs md:text-sm font-medium">{getUserInitials()}</span>
                    </div>
                  )}
                </div>

                {/* Message Content */}
                <div className="flex-1 min-w-0">
                  <div className={`inline-block rounded-2xl px-3 md:px-4 py-2 md:py-2.5 leading-6 md:leading-7 break-words ${message.role === "assistant"
                    ? "text-foreground"
                    : "bg-muted text-foreground"
                    }`}>
                    <div className="text-xs md:text-sm prose prose-sm dark:prose-invert max-w-none">
                      <ReactMarkdown
                        components={{
                          p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                          strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                          em: ({ children }) => <em className="italic">{children}</em>,
                          code: ({ children }) => (
                            <code className="rounded bg-muted px-1 py-0.5 text-[0.9em] font-mono">
                              {children}
                            </code>
                          ),
                          ul: ({ children }) => <ul className="my-2 ml-4 list-disc space-y-1">{children}</ul>,
                          ol: ({ children }) => <ol className="my-2 ml-4 list-decimal space-y-1">{children}</ol>,
                          li: ({ children }) => <li className="text-xs md:text-sm">{children}</li>,
                        }}
                      >
                        {message.content}
                      </ReactMarkdown>
                    </div>

                    {/* Display attached files */}
                    {message.files && message.files.length > 0 && (
                      <div className="mt-2 space-y-2">
                        {message.files.map((file, idx) => (
                          <div key={idx} className="rounded-lg border bg-background/50 p-2">
                            {file.preview ? (
                              // Image preview
                              <div className="relative w-full max-w-xs">
                                <Image
                                  src={file.preview}
                                  alt={file.name}
                                  width={300}
                                  height={200}
                                  className="rounded-md object-cover w-full"
                                  unoptimized
                                />
                                <p className="text-xs text-muted-foreground mt-1">{file.name}</p>
                              </div>
                            ) : (
                              // File attachment
                              <div className="flex items-center gap-2">
                                {file.type === "application/pdf" ? (
                                  <FileText className="h-4 w-4 text-red-500" />
                                ) : (
                                  <File className="h-4 w-4 text-blue-500" />
                                )}
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-medium truncate">{file.name}</p>
                                  <p className="text-[10px] text-muted-foreground">
                                    {(file.size / 1024).toFixed(1)} KB
                                    {file.extractedContent && " • Text extracted"}
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="text-[10px] md:text-xs text-muted-foreground">
                      {message.timestamp.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {isStreaming && (
            <div className="animate-in duration-150 ease-out fade-in slide-in-from-bottom-1">
              <div className="flex gap-2 md:gap-4">
                <div className="flex-shrink-0 pt-1">
                  <div className="flex size-6 md:size-8 items-center justify-center rounded-full">
                    <Image
                      src="/bmaster-icon.png"
                      alt="Assistant"
                      width={24}
                      height={24}
                      className="h-4 w-4 md:h-6 md:w-6"
                      style={{ width: 'auto', height: 'auto' }}
                      unoptimized
                    />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="inline-block rounded-2xl px-3 md:px-4 py-2 md:py-2.5 bg-muted">
                    <Loader2 className="h-3 w-3 md:h-4 md:w-4 animate-spin text-muted-foreground" />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input with PromptInput Component */}
      <div className="px-3 md:px-6 py-3 md:py-4 flex-shrink-0 relative">
        {/* Loading Overlay during Artifact Generation */}
        {isGenerating && (
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm border border-primary/20 rounded-lg flex flex-col items-center justify-center z-10 p-4">
            <div className="flex items-center gap-3 text-primary mb-3">
              <Loader2 className="h-5 w-5 animate-spin" />
              <div className="text-sm font-medium">
                Generating artifact...
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full max-w-xs">
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full animate-pulse" />
              </div>
              <p className="text-xs text-muted-foreground mt-2 text-center">
                This may take a few moments for complex artifacts
              </p>
            </div>
          </div>
        )}

        {/* File Upload Overlay */}
        {isUploadingFiles && (
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm border border-primary/20 rounded-lg flex flex-col items-center justify-center z-10 p-4">
            <div className="flex items-center gap-3 text-primary mb-3">
              <Loader2 className="h-5 w-5 animate-spin" />
              <div className="text-sm font-medium">
                Uploading files...
              </div>
            </div>
          </div>
        )}

        {/* Selected Files Preview */}
        {selectedFiles.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {selectedFiles.map((file, index) => (
              <div
                key={index}
                className="flex items-center gap-2 bg-muted rounded-lg px-2 py-1.5 text-xs"
              >
                {file.type.startsWith("image/") ? (
                  <ImageIcon className="h-3 w-3 text-green-500" />
                ) : file.type === "application/pdf" ? (
                  <FileText className="h-3 w-3 text-red-500" />
                ) : (
                  <File className="h-3 w-3 text-blue-500" />
                )}
                <span className="max-w-[120px] truncate">{file.name}</span>
                <button
                  onClick={() => handleRemoveFile(index)}
                  className="hover:bg-background rounded p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,.pdf,.doc,.docx,.txt"
          onChange={handleFileSelect}
          className="hidden"
        />

        <PromptInput
          value={input}
          onValueChange={setInput}
          onSubmit={handleSend}
          isLoading={isStreaming}
          maxHeight={120}
          disabled={disabled || isGenerating || isUploadingFiles}
          onFileUpload={handleFileUpload}
          className="border-primary/50 shadow-[0_0_100px_0px_hsl(var(--primary)),0_0_60px_0px_hsl(var(--primary)),0_0_30px_0px_hsl(var(--primary)),0_0_15px_0px_hsl(var(--primary))] dark:border-primary/60 dark:shadow-[0_0_120px_0px_hsl(var(--primary)),0_0_80px_0px_hsl(var(--primary)),0_0_40px_0px_hsl(var(--primary)),0_0_20px_0px_hsl(var(--primary))]"
        >
          <PromptInputTextarea
            ref={inputTextareaRef}
            placeholder={isGenerating ? "Generating artifact..." : isUploadingFiles ? "Uploading files..." : "Ask about this artifact..."}
            className="text-foreground placeholder:text-muted-foreground"
            disabled={disabled || isGenerating || isUploadingFiles}
          />
          <PromptInputActions className="px-2 pb-1 justify-between">
            {/* Left side: Plus icon for file upload */}
            <PromptInputAction tooltip="Attach files or images">
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={disabled || isGenerating || isUploadingFiles || isStreaming}
                size="icon"
                variant="ghost"
                className="h-8 w-8"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </PromptInputAction>

            {/* Right side: Send button */}
            <PromptInputAction tooltip={isGenerating ? "Generating artifact..." : "Send message (Enter)"}>
              <Button
                onClick={handleSend}
                disabled={(!input.trim() && selectedFiles.length === 0) || isStreaming || disabled || isGenerating || isUploadingFiles}
                size="icon"
                className="h-8 w-8"
              >
                {isStreaming || isUploadingFiles ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </PromptInputAction>
          </PromptInputActions>
        </PromptInput>
      </div>

      {/* Edit Artifact Dialog */}
      {
        canEditArtifact && (<CreateArtifactDialog
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          assistantId={assistantId}
          editArtifactId={artifactId}
        />
        )}
    </div>
  )
}

