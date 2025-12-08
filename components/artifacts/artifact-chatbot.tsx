"use client"

import { useState, useEffect, useRef } from "react"
import { Send, Loader2 } from "lucide-react"
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

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
}

interface ArtifactChatbotProps {
  artifactId: string
  artifactName: string
  disabled?: boolean
  isGenerating?: boolean
}

export function ArtifactChatbot({ artifactId, artifactName, disabled = false, isGenerating = false }: ArtifactChatbotProps) {
  const { data: session } = useSession()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const scrollRef = useRef<HTMLDivElement>(null)
  const storageKey = `artifact-chat-${artifactId}`
  
  // Get current artifact data
  const { artifact, refetch } = useArtifactById(artifactId)
  const artifactContent = useArtifactStore((state) => state.artifactContent)
  const setArtifact = useArtifactStore((state) => state.setArtifact)
  
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingContent, setStreamingContent] = useState<string>("")
  
  // Get user initials for avatar
  const getUserInitials = () => {
    if (!session?.user?.name) return "U"
    const names = session.user.name.split(" ")
    if (names.length >= 2) {
      return `${names[0][0]}${names[1][0]}`.toUpperCase()
    }
    return session.user.name.substring(0, 2).toUpperCase()
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

  const handleSend = async () => {
    if (!input.trim() || isStreaming) return

    const userPrompt = input.trim()
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: userPrompt,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput("")

    // Get current HTML code from artifact store or artifact data
    const currentHtmlCode = artifactContent?.content || artifact?.htmlContent || ""
    
    if (!currentHtmlCode) {
      const errorMessage: Message = {
        id: Date.now().toString(),
        role: "assistant",
        content: "❌ **Error**: Unable to find the current artifact code. Please refresh the page and try again.",
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
                  <div className={`inline-block rounded-2xl px-3 md:px-4 py-2 md:py-2.5 leading-6 md:leading-7 break-words ${
                    message.role === "assistant" 
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

        <PromptInput
          value={input}
          onValueChange={setInput}
          onSubmit={handleSend}
          isLoading={isStreaming}
          maxHeight={120}
          disabled={disabled || isGenerating}
          className="border-primary/50 shadow-[0_0_100px_0px_hsl(var(--primary)),0_0_60px_0px_hsl(var(--primary)),0_0_30px_0px_hsl(var(--primary)),0_0_15px_0px_hsl(var(--primary))] dark:border-primary/60 dark:shadow-[0_0_120px_0px_hsl(var(--primary)),0_0_80px_0px_hsl(var(--primary)),0_0_40px_0px_hsl(var(--primary)),0_0_20px_0px_hsl(var(--primary))]"
        >
          <PromptInputTextarea
            placeholder={isGenerating ? "Generating artifact..." : "Ask about this artifact..."}
            className="text-foreground placeholder:text-muted-foreground"
            disabled={disabled || isGenerating}
          />
          <PromptInputActions className="px-2 pb-1 justify-end">
            <PromptInputAction tooltip={isGenerating ? "Generating artifact..." : "Send message (Enter)"}>
              <Button
                onClick={handleSend}
                disabled={!input.trim() || isStreaming || disabled || isGenerating}
                size="icon"
                className="h-8 w-8"
              >
                {isStreaming ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </PromptInputAction>
          </PromptInputActions>
        </PromptInput>
      </div>
    </div>
  )
}

