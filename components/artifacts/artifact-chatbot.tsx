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
import { DictateButton } from "@/components/assistants/dictate-button"
import { useLocale } from "@/lib/i18n"

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
  const { t } = useLocale()
  const { data: session } = useSession()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  // Sentinel div ref used for auto-scroll (works correctly with Radix ScrollArea)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  // Namespace the key by user ID so different users sharing a device don't see
  // each other's history, and use localStorage so it survives tab navigation
  // and mobile browser backgrounding (unlike sessionStorage).
  const storageKey = `artifact-chat-${session?.user?.id || 'anon'}-${artifactId}`

  // Get current artifact data
  const { artifact, refetch } = useArtifactById(artifactId)
  const artifactContent = useArtifactStore((state) => state.artifactContent)
  const setArtifact = useArtifactStore((state) => state.setArtifact)
  const prefilledPrompt = useArtifactStore((state) => state.prefilledPrompt)
  const setPrefilledPrompt = useArtifactStore((state) => state.setPrefilledPrompt)
  const surgicalEditOuterHtml = useArtifactStore((state) => state.surgicalEditOuterHtml)
  const setSurgicalEditOuterHtml = useArtifactStore((state) => state.setSurgicalEditOuterHtml)
  const inputTextareaRef = useRef<HTMLTextAreaElement>(null)
  const preRecordingTextRef = useRef<string | null>(null) // Track text before recording starts (null = not recording)

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
      toast.error(t("artifacts.chatbot.fileLimitError", { files: invalidFiles.map(f => f.name).join(", ") }))

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
      toast.error(t("artifacts.chatbot.fileLimitError", { files: invalidFiles.map(f => f.name).join(", ") }))
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

  // Load messages from localStorage (persists across navigation and mobile browser backgrounding)
  // Only runs on mount or when artifactId changes - not on artifactName change to avoid loops
  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey)
      if (stored) {
        const parsed: Message[] = JSON.parse(stored).map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp),
        }))
        setMessages(parsed)
      } else {
        // Initialize with welcome message
        const welcomeMessage: Message = {
          id: "welcome",
          role: "assistant",
          content: t("artifacts.chatbot.welcomeMessage", { name: artifactName }),
          timestamp: new Date(),
        }
        setMessages([welcomeMessage])
        localStorage.setItem(storageKey, JSON.stringify([welcomeMessage]))
      }
    } catch (error) {
      console.error("Error loading chat history:", error)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [artifactId, storageKey])

  // Save messages to localStorage
  useEffect(() => {
    if (messages.length > 0) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(messages))
      } catch (error) {
        console.error("Error saving chat history:", error)
      }
    }
  }, [messages, storageKey])

  // Auto-scroll to bottom using a sentinel element.
  // Directly setting scrollTop on the Radix <ScrollArea> root doesn't work because
  // the root is not the scrollable viewport — this caused the "jumps to top" bug.
  useEffect(() => {
    // Use requestAnimationFrame to batch scroll updates and prevent rapid re-renders
    const rafId = requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
    })
    return () => cancelAnimationFrame(rafId)
  }, [messages.length, isStreaming])

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

  // Listen for trigger-chat-send event from artifact panel inline edit
  // This is used when user submits an inline edit request from visual edit mode
  const handleSendRef = useRef<(msg?: string) => void>(() => {})
  useEffect(() => {
    handleSendRef.current = handleSend
  })

  useEffect(() => {
    const handler = (e: CustomEvent<{ message: string }>) => {
      const message = e.detail?.message
      if (message) {
        // Set the input for visual feedback, then call handleSend with the message directly
        setInput(message)
        // Pass message directly to handleSend to avoid state timing issues
        handleSendRef.current(message)
      }
    }
    window.addEventListener('trigger-chat-send', handler as EventListener)
    return () => window.removeEventListener('trigger-chat-send', handler as EventListener)
  }, [])

  const handleSend = async (directMessage?: string) => {
    // Use direct message if provided (from trigger-chat-send event), otherwise use input state
    const messageToSend = directMessage || input
    if ((!messageToSend.trim() && selectedFiles.length === 0) || isStreaming) return

    const userPrompt = messageToSend.trim()

    // Upload files first if any
    let uploadedFiles: UploadedFileData[] | undefined
    if (selectedFiles.length > 0) {
      setIsUploadingFiles(true)
      try {
        uploadedFiles = await uploadFilesToS3(selectedFiles)
        toast.success(t("artifacts.chatbot.uploadSuccess", { count: selectedFiles.length }))
      } catch (error) {
        console.error("File upload error:", error)
        toast.error(t("artifacts.chatbot.uploadFailed"))
        setIsUploadingFiles(false)
        return
      }
      setIsUploadingFiles(false)
      setSelectedFiles([]) // Clear selected files
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: userPrompt || t("artifacts.chatbot.attachedFiles"),
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
        content: t("artifacts.chatbot.errorNoCode"),
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

    // ── SURGICAL PATCH (visual click-to-edit) ──────────────────────────────────
    // If the user clicked a specific element in visual edit mode, we only send
    // that element's outerHTML to the AI and do an instant string-replace.
    // This avoids regenerating the entire document.
    const surgicalHtml = surgicalEditOuterHtml
    if (surgicalHtml) {
      setSurgicalEditOuterHtml(null) // Clear immediately

      const patchingMsg: Message = {
        id: `patch-${Date.now()}`,
        role: "assistant",
        content: t("artifacts.chatbot.patchApplying"),
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, patchingMsg])

      const patchToastId = toast.loading(t("artifacts.chatbot.applyingPatch"))

      try {
        const patchRes = await fetch("/api/artifacts/patch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            artifactId,
            elementOuterHtml: surgicalHtml,
            userPrompt,
            currentHtmlCode,
          }),
        })

        const patchData = await patchRes.json()
        toast.dismiss(patchToastId)

        if (!patchRes.ok || patchData.error) {
          throw new Error(patchData.error || "Patch failed")
        }

        const updatedHtml = patchData.newFullHtml || currentHtmlCode

        // Update the artifact preview instantly — no streaming needed
        setArtifact({
          type: "code",
          language: "html",
          content: updatedHtml,
          title: artifact?.name || artifactName,
        })

        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === patchingMsg.id
              ? {
                ...msg,
                content: patchData.warning
                  ? `⚠️ ${patchData.warning}`
                  : t("artifacts.chatbot.patchApplied", { version: patchData.versionNumber ? ` (v${patchData.versionNumber})` : "" }),
              }
              : msg
          )
        )

        toast.success(t("artifacts.chatbot.changeApplied"))
        await refetch()
      } catch (err: any) {
        toast.dismiss(patchToastId)
        toast.error(err.message || t("artifacts.errors.generateFailed"))
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === patchingMsg.id
              ? { ...msg, content: t("artifacts.chatbot.patchFailed", { error: err.message || t("common.unknownError") }) }
              : msg
          )
        )
      }
      return // Skip the full streaming path
    }
    // ── END SURGICAL PATCH ─────────────────────────────────────────────────────

    // Start streaming update
    setIsStreaming(true)
    setStreamingContent("")

    // Add a neutral "Thinking..." placeholder — will be updated once we know the intent
    const streamingMessage: Message = {
      id: `streaming-${Date.now()}`,
      role: "assistant",
      content: t("artifacts.chatbot.thinking"),
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, streamingMessage])

    // Tracks whether the server classified this as Q&A (text only, no artifact update)
    let isQAMode = false
    let qaAccumulatedText = ""
    let loadingToastId: string | number | undefined

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

                if (data.type === 'mode') {
                  // Server detected intent from first tokens — update placeholder immediately
                  if (data.mode === 'modify') {
                    setMessages((prev) =>
                      prev.map((msg) =>
                        msg.id === streamingMessage.id
                          ? { ...msg, content: t("artifacts.chatbot.updatingArtifact") }
                          : msg
                      )
                    )
                  } else if (data.mode === 'qa') {
                    setMessages((prev) =>
                      prev.map((msg) =>
                        msg.id === streamingMessage.id
                          ? { ...msg, content: "" }
                          : msg
                      )
                    )
                  }

                } else if (data.type === 'artifact_updating') {
                  // Server is about to write the new version to the database
                  isQAMode = false
                  loadingToastId = toast.loading(t("artifacts.chatbot.savingArtifact"))
                  setMessages((prev) =>
                    prev.map((msg) =>
                      msg.id === streamingMessage.id
                        ? { ...msg, content: t("artifacts.chatbot.savingChanges") }
                        : msg
                    )
                  )

                } else if (data.type === 'qa_response' && data.content) {
                  // Text answer streaming — accumulate and show inline
                  isQAMode = true
                  qaAccumulatedText += data.content
                  setMessages((prev) =>
                    prev.map((msg) =>
                      msg.id === streamingMessage.id
                        ? { ...msg, content: qaAccumulatedText }
                        : msg
                    )
                  )

                } else if (data.type === 'qa_done') {
                  // Q&A answer complete — no artifact was updated
                  setIsStreaming(false)
                  setMessages((prev) =>
                    prev.map((msg) =>
                        msg.id === streamingMessage.id
                          ? { ...msg, content: qaAccumulatedText || t("artifacts.chatbot.noResponse") }
                          : msg
                    )
                  )
                  // qa_done has an implicit break — we stop processing
                  break

                } else if (data.type === 'code' && data.content) {
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

                  // Dismiss the "Saving..." loading toast
                  if (loadingToastId !== undefined) {
                    toast.dismiss(loadingToastId)
                    loadingToastId = undefined
                  }

                  // Remove streaming message
                  setMessages((prev) => prev.filter((msg) => msg.id !== streamingMessage.id))

                  // Add success message — use server-provided narration if available
                  const successMessage: Message = {
                    id: Date.now().toString(),
                    role: "assistant",
                    content: data.message
                      ? t("artifacts.chatbot.updateSuccess", { message: data.message })
                      : t("artifacts.chatbot.updateSuccessDefault", { name: artifactName }),
                    timestamp: new Date(),
                  }
                  setMessages((prev) => [...prev, successMessage])

                  // Refetch artifact to get final version
                  await refetch()

                  toast.success(t("artifacts.chatbot.changeApplied"))
                  break
                } else if (data.type === 'error') {
                  setIsStreaming(false)

                  // Dismiss loading toast if present
                  if (loadingToastId !== undefined) {
                    toast.dismiss(loadingToastId)
                    loadingToastId = undefined
                  }

                  // Remove streaming message
                  setMessages((prev) => prev.filter((msg) => msg.id !== streamingMessage.id))

                  // Add error message
                  const errorMessage: Message = {
                    id: Date.now().toString(),
                    role: "assistant",
                    content: t("artifacts.chatbot.updateFailed", { error: data.error || t("common.unknownError") }),
                    timestamp: new Date(),
                  }
                  setMessages((prev) => [...prev, errorMessage])

                  toast.error(data.error || t("artifacts.errors.generateFailed"))
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

      // Dismiss loading toast if present
      if (loadingToastId !== undefined) {
        toast.dismiss(loadingToastId)
      }

      // Remove streaming message
      setMessages((prev) => prev.filter((msg) => msg.id !== streamingMessage.id))

      // Add error message
      const errorMessage: Message = {
        id: Date.now().toString(),
        role: "assistant",
        content: t("artifacts.chatbot.updateFailed", { error: error.message || t("common.unknownError") }),
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMessage])

      toast.error(t("artifacts.errors.generateFailed"))
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
            <h6>{t("artifacts.chatbot.headerTitle")}</h6>
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
              title={isPanelOpen ? t("artifacts.chatbot.tooltips.closePanel") : t("artifacts.chatbot.tooltips.openPanel")}
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
                title={t("artifacts.chatbot.tooltips.editSettings")}
              >
                <Pencil className="h-4 w-4" />
              </Button>
            )
          }
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 min-h-0 px-2 md:px-4 py-4">
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
                          // Always open links in a new tab to prevent SPA "not found" navigation
                          a: ({ href, children }) => (
                            <a
                              href={href}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary underline hover:text-primary/80 break-all"
                            >
                              {children}
                            </a>
                          ),
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
                                    {file.extractedContent && t("artifacts.chatbot.textExtracted")}
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
          {/* Sentinel: auto-scroll always lands here at the very bottom */}
          <div ref={messagesEndRef} />
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
                {t("artifacts.chatbot.generatingArtifact")}
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full max-w-xs">
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full animate-pulse" />
              </div>
              <p className="text-xs text-muted-foreground mt-2 text-center">
                {t("artifacts.chatbot.generationMoments")}
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
                {t("artifacts.chatbot.uploadingFiles")}
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
            placeholder={isGenerating ? t("artifacts.chatbot.generatingArtifact") : isUploadingFiles ? t("artifacts.chatbot.uploadingFiles") : t("artifacts.chatbot.placeholders.askArtifact")}
            className="text-foreground placeholder:text-muted-foreground"
            disabled={disabled || isGenerating || isUploadingFiles}
          />
          <PromptInputActions className="px-2 pb-1 justify-between">
            {/* Left side: Plus icon for file upload and Dictate button */}
            <div className="flex items-center gap-1">
              <PromptInputAction tooltip={t("artifacts.chatbot.tooltips.attachFiles")}>
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

              {/* Dictate Button */}
              <DictateButton
                onTranscript={(text) => {
                  // Append final transcription to the pre-recording text
                  const baseText = (preRecordingTextRef.current ?? "").trim()
                  setInput(baseText + (baseText ? " " : "") + text)
                  preRecordingTextRef.current = null // Reset for next recording
                }}
                onStreamingTranscript={(text) => {
                  // On first streaming call, save the current input
                  if (preRecordingTextRef.current === null) {
                    preRecordingTextRef.current = input
                  }
                  // Append streaming text to the saved pre-recording text
                  const baseText = (preRecordingTextRef.current ?? "").trim()
                  setInput(baseText + (baseText ? " " : "") + text)
                }}
                disabled={disabled || isGenerating || isUploadingFiles || isStreaming}
              />
            </div>

            {/* Right side: Send button */}
            <PromptInputAction tooltip={isGenerating ? t("artifacts.chatbot.generatingArtifact") : t("artifacts.chatbot.tooltips.sendMessage")}>
              <Button
                onClick={() => handleSend()}
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

