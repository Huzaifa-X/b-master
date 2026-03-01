// // hooks/useCustomChat.ts
// "use client"

// import { useState, useCallback, useRef, useEffect, useMemo } from "react"
// import { useQuery, useQueryClient } from "@tanstack/react-query"
// import {
//   getSpecificChat,
//   getChatMessages,
//   sendChatMessage,
//   cleanupChat,
// } from "@/app/actions/chat.action"
// import { Message, ChatContext, ChatType } from "@/types/chat"
// import { toast } from "sonner"
// import { useArtifactStore } from "@/lib/stores/artifact-store"

// export type ChatMode = "assistant" | "ask-b"

// export interface UseCustomChatOptions {
//   mode: ChatMode
//   assistantId?: string
//   chatId: string
// }

// export function useCustomChat(options: UseCustomChatOptions) {
//   const { mode, assistantId, chatId } = options
//   const queryClient = useQueryClient()

//   const [context, setContext] = useState<ChatContext | null>(null)
//   const [messages, setMessages] = useState<Message[]>([])
//   const [isStreaming, setIsStreaming] = useState(false)
//   const [streamingMessage, setStreamingMessage] = useState("")
//   const abortControllerRef = useRef<AbortController | null>(null)

//   // OAuth state
//   const [oauthPrompt, setOAuthPrompt] = useState<{
//     show: boolean
//     authUrl: string
//     assistantId: string
//     message: string
//   } | null>(null)

//   // 🔥 Track if initial cleanup has run (only run once per chat session)
//   const hasRunInitialCleanup = useRef(false)
//   // Track if auto-streaming has been started for this chat
//   const hasStartedAutoStream = useRef(false)

//   // 🔥 NEW: Use a ref to track streaming state immediately (doesn't wait for React render)
//   const isStreamingRef = useRef(false)

//   // Load specific chat
//   const {
//     data: chatData,
//     isLoading: isInitializing,
//     error: initError
//   } = useQuery({
//     queryKey: ["chat", chatId],
//     queryFn: async () => {
//       console.log("[useCustomChat] Loading chat:", chatId)
//       const result = await getSpecificChat(chatId)

//       if (!result.success || !result.chat) {
//         throw new Error(result.error || "Failed to load chat")
//       }

//       return result.chat
//     },
//     staleTime: 1000 * 60 * 5,
//     retry: 2,
//   })

//   // Load messages for the chat
//   const {
//     data: dbMessages = [],
//     isLoading: isLoadingMessages,
//     refetch: refetchMessages
//   } = useQuery({
//     queryKey: ["chat-messages", chatId],
//     queryFn: async () => {
//       console.log("[useCustomChat] Loading messages for chat:", chatId)

//       // 🔥 Only run cleanup on INITIAL load, not on every refetch
//       // This prevents deleting messages that are still waiting for streaming to complete
//       if (!hasRunInitialCleanup.current) {
//         console.log("[useCustomChat] Running initial cleanup with 2 minute grace period...")
//         try {
//           const cleanupResult = await cleanupChat(chatId, 2) // 2 minute grace period
//           if (cleanupResult.success && cleanupResult.deleted > 0) {
//             console.log(`[useCustomChat] Cleaned up ${cleanupResult.deleted} orphaned messages`)
//           }
//         } catch (error) {
//           console.error("[useCustomChat] Cleanup error (non-fatal):", error)
//           // Continue loading messages even if cleanup fails
//         }
//         hasRunInitialCleanup.current = true
//       }

//       // Then load messages
//       const result = await getChatMessages(chatId)

//       if (!result.success) {
//         console.error("[useCustomChat] Error loading messages:", result.error)
//         return []
//       }

//       return result.messages
//     },
//     enabled: !!chatId,
//     staleTime: 1000 * 10,
//     // Poll more frequently when waiting for background response
//     refetchInterval: (query) => {
//       if (isStreaming) return false

//       const msgs = query.state.data || []
//       if (msgs.length === 0) return false

//       // Get the last user message
//       const userMessages = msgs.filter((msg: Message) => msg.role === "user")
//       if (userMessages.length === 0) return 30000

//       const lastUserMsg = userMessages[userMessages.length - 1]
//       const lastUserMsgTime = new Date(lastUserMsg.createdAt).getTime()

//       // Check if there's an assistant response after the last user message
//       const assistantMessages = msgs.filter((msg: Message) =>
//         msg.role === "assistant" &&
//         msg.content &&
//         msg.content.trim().length > 0
//       )

//       const hasResponseAfterLastUser = assistantMessages.some((msg: Message) =>
//         new Date(msg.createdAt).getTime() > lastUserMsgTime
//       )

//       // Poll every 2s if waiting for response, otherwise 30s
//       if (!hasResponseAfterLastUser) {
//         console.log("[useCustomChat] Waiting for assistant response, polling every 2s")
//         return 2000
//       }

//       return 30000 // Default polling interval
//     },
//   })

//   // Reset cleanup flag when chatId changes
//   useEffect(() => {
//     hasRunInitialCleanup.current = false
//     hasStartedAutoStream.current = false
//   }, [chatId])

//   // Set context when chat is ready
//   useEffect(() => {
//     if (chatData) {
//       console.log("[useCustomChat] Chat context set:", chatData)
//       setContext({
//         chatId: chatData.id,
//         chatType: chatData.chatType as ChatType,
//         assistantId: chatData.assistantId,
//         assistantName: chatData.assistantName || "Assistant",
//         assistantInstructions: chatData.assistantInstructions,
//       })
//     }
//   }, [chatData])

//   useEffect(() => {
//     if (dbMessages.length > 0 && messages.length === 0 && !isStreamingRef.current) {
//       console.log("[useCustomChat] 📋 Initializing messages state with", dbMessages.length, "messages from DB")
//       setMessages(dbMessages)
//     }
//   }, [dbMessages, messages.length])

//   // Auto-start streaming if there's a PENDING user message without response
//   useEffect(() => {
//     if (!context || isStreaming || isLoadingMessages || !chatData || hasStartedAutoStream.current) return

//     // Check if last message is a user message with PENDING status
//     const lastMessage = dbMessages[dbMessages.length - 1]
//     if (!lastMessage || lastMessage.role !== "user") return

//     // Check if message has PENDING status (from DB)
//     const dbMessage = dbMessages.find(m => m.id === lastMessage.id)
//     console.log("[useCustomChat] Last message status:", dbMessage?.status, "Message:", lastMessage.id)

//     if (!dbMessage || dbMessage.status !== "PENDING") {
//       console.log("[useCustomChat] Skipping auto-stream - status is not PENDING")
//       return
//     }

//     // Check if there's already an assistant response after this user message
//     const hasResponse = dbMessages.some(
//       (msg, idx) => idx > dbMessages.indexOf(lastMessage) && msg.role === "assistant" && msg.content.trim()
//     )

//     if (!hasResponse) {
//       console.log("[useCustomChat] ✅ Auto-starting streaming for PENDING message:", lastMessage.id)
//       hasStartedAutoStream.current = true

//       // Get attachments and options from the user message's documents field
//       const attachments = lastMessage.attachments || []
      
//       // Parse documents to get options and mentionedUsers
//       let options = {
//         webSearch: false,
//         research: false,
//         chatWithAPI: false,
//         dropbox: false,
//         artifact: null as any,
//         mentionedUsers: [] as Array<{ id: string; name: string; email: string }>,
//         connectedApiIds: [] as string[],
//       }

//       try {
//         // Get the message from DB to access documents field
//         const dbMessage = dbMessages.find(m => m.id === lastMessage.id)
//         if (dbMessage && dbMessage.documents) {
//           const documentsData = JSON.parse(dbMessage.documents)
          
//           // Extract options from documents
//           if (documentsData.options) {
//             options.webSearch = documentsData.options.webSearch || false
//             options.research = documentsData.options.research || false
//             options.chatWithAPI = documentsData.options.chatWithAPI || false
//             options.dropbox = documentsData.options.dropbox || false
//             options.artifact = documentsData.options.artifact || null
//             options.connectedApiIds = documentsData.options.connectedApiIds || []
//             console.log("[useCustomChat] Retrieved options from message documents:", documentsData.options)
//           }

//           // Extract mentionedUsers from documents
//           if (documentsData.mentionedUsers && Array.isArray(documentsData.mentionedUsers)) {
//             options.mentionedUsers = documentsData.mentionedUsers
//             console.log("[useCustomChat] Retrieved mentioned users from message documents:", documentsData.mentionedUsers)
//           }
//         } else {
//           console.log("[useCustomChat] No documents field found in message, using default options")
//         }

//         console.log("[useCustomChat] Auto-stream options:", options)
//       } catch (error) {
//         console.error("[useCustomChat] Error parsing message documents:", error)
//       }

//       // Start streaming automatically
//       const startAutoStream = async () => {
//         try {
//           isStreamingRef.current = true
//           setIsStreaming(true)
//           setStreamingMessage("")
//           abortControllerRef.current = new AbortController()

//           // Create temporary streaming assistant message
//           const tempAssistantId = `streaming-${Date.now()}`
//           const streamingMessage: Message = {
//             id: tempAssistantId,
//             role: "assistant",
//             content: "",
//             createdAt: new Date(),
//             isStreaming: true
//           }

//           setMessages(prev => {
//             const newMessages = [...prev, streamingMessage]
//             console.log("[useCustomChat] Messages array now has:", newMessages.length, "messages")
//             return newMessages
//           })

//           // Start streaming
//           const streamResponse = await fetch("/api/chat/stream", {
//             method: "POST",
//             headers: { "Content-Type": "application/json" },
//             body: JSON.stringify({
//               chatId: context.chatId,
//               assistantId: context.assistantId,
//               chatType: context.chatType,
//               webSearch: options.webSearch,      // 🔥 Use retrieved option
//               research: options.research,        // 🔥 Use retrieved option
//               chatWithAPI: options.chatWithAPI,  // 🔥 Use retrieved option
//               dropbox: options.dropbox,          // 🔥 Use retrieved option
//               artifact: options.artifact,        // 🔥 Use retrieved option
//               attachments: attachments,
//               mentionedUsers: options?.mentionedUsers,
//               connectedApiIds: options.connectedApiIds || [],
//             }),
//             signal: abortControllerRef.current.signal
//           })

//           if (!streamResponse.ok) {
//             throw new Error("Failed to start streaming")
//           }

//           // Process stream (same logic as sendMessage)
//           const reader = streamResponse.body?.getReader()
//           const decoder = new TextDecoder()
//           if (!reader) throw new Error("No response stream available")

//           let buffer = ""
//           let assistantContent = ""

//           while (true) {
//             const { done, value } = await reader.read()
//             if (done) break

//             buffer += decoder.decode(value, { stream: true })
//             const lines = buffer.split("\n\n")
//             buffer = lines.pop() || ""

//             for (const line of lines) {
//               if (!line.trim() || !line.startsWith("data: ")) continue

//               try {
//                 const data = JSON.parse(line.slice(6))
//                 switch (data.type) {
//                   case "text":
//                     assistantContent += data.content
//                     setStreamingMessage(assistantContent)
//                     setMessages(prev => {
//                       const updated = prev.map(msg =>
//                         msg.id === tempAssistantId
//                           ? { ...msg, content: assistantContent }
//                           : msg
//                       )

//                       // Verify the update happened
//                       const streamingMsg = updated.find(msg => msg.id === tempAssistantId)
//                       if (streamingMsg) {
//                         console.log("[useCustomChat] ✅ Message updated in state, content length:", streamingMsg.content.length)
//                       } else {
//                         console.error("[useCustomChat] ❌ STREAMING MESSAGE NOT FOUND IN STATE!")
//                       }

//                       return updated
//                     })
//                     break
//                   case "image":
//                     const imageMarkdown = `\n\n![Generated Image](${data.url})`
//                     assistantContent += imageMarkdown
//                     setStreamingMessage(assistantContent)
//                     setMessages(prev =>
//                       prev.map(msg =>
//                         msg.id === tempAssistantId
//                           ? { ...msg, content: assistantContent }
//                           : msg
//                       )
//                     )
//                     break
//                   case "done":
//                     setMessages(prev =>
//                       prev.map(msg =>
//                         msg.id === tempAssistantId
//                           ? { ...msg, isStreaming: false }
//                           : msg
//                       )
//                     )
//                     await refetchMessages()
//                     break
//                   case "artifact_updating":
//                     console.log("[useCustomChat] ⏳ Artifact updating:", data.artifactName)
//                     toast.loading(`Updating "${data.artifactName}"...`, { id: `artifact-update-${data.artifactId}`, duration: 30000 })
//                     break

//                   case "artifact_updated":
//                     console.log("[useCustomChat] 🎨 Artifact updated:", data.artifactName, "Version:", data.versionNumber)
//                     toast.dismiss(`artifact-update-${data.artifactId}`)

//                     // Refresh the artifact panel store with the new HTML so the preview updates in place
//                     if (data.updatedCode) {
//                       useArtifactStore.getState().setArtifact({
//                         type: "code",
//                         language: "html",
//                         content: data.updatedCode,
//                         title: data.artifactName,
//                       })
//                     }

//                     // Also invalidate react-query cache so version history refreshes
//                     queryClient.invalidateQueries({ queryKey: ["artifact", data.artifactId] })
//                     queryClient.invalidateQueries({ queryKey: ["artifacts"] })
//                     break

//                   case "artifact_update_error":
//                     console.error("[useCustomChat] ❌ Artifact update failed:", data.error)
//                     toast.error(`Failed to update artifact: ${data.error}`)
//                     break

//                   case "oauth_required":
//                     console.log("[useCustomChat] OAuth required (auto-stream):", data)
//                     // Show OAuth prompt
//                     setOAuthPrompt({
//                       show: true,
//                       authUrl: data.authUrl,
//                       assistantId: data.assistantId,
//                       message: data.message
//                     })
//                     // Remove streaming message
//                     setMessages(prev => prev.filter(msg => msg.id !== tempAssistantId))
//                     break

//                   case "error":
//                     throw new Error(data.error || "Streaming error")
//                 }
//               } catch (parseError) {
//                 console.error("[useCustomChat] Error parsing SSE data:", parseError)
//               }
//             }
//           }
//         } catch (error: any) {
//           console.error("[useCustomChat] Auto-stream error:", error)
//           if (error.name !== "AbortError") {
//             toast.error("Failed to generate response")
//           }
//         } finally {
//           isStreamingRef.current = false
//           setIsStreaming(false)
//           abortControllerRef.current = null
//         }
//       }

//       startAutoStream()
//     }
//   }, [context, dbMessages, isStreaming, isLoadingMessages, chatData, refetchMessages])

//   // Memoize message IDs for comparison
//   const dbMessageIds = useMemo(() =>
//     dbMessages.map(m => m.id).join(','),
//     [dbMessages]
//   )
//   const currentMessageIds = useMemo(() =>
//     messages.map(m => m.id).join(','),
//     [messages]
//   )

//   useEffect(() => {
//     if (isStreamingRef.current) {
//       console.log("[useCustomChat] 🔒 Skipping DB sync - streaming in progress (ref check)")
//       return
//     }

//     // 🔥 Also check local state for streaming messages
//     const hasLocalStreamingMessage = messages.some(m => m.isStreaming)

//     if (hasLocalStreamingMessage) {
//       console.log("[useCustomChat] 🔒 Skipping DB sync - has streaming message in local state")
//       return
//     }

//     if (dbMessageIds !== currentMessageIds) {
//       console.log("[useCustomChat] Updating messages from DB:", dbMessages.length)
//       setMessages(dbMessages)

//       // Check if a new assistant response was added
//       const previousAssistantCount = messages.filter(m => m.role === "assistant").length
//       const currentAssistantCount = dbMessages.filter(m => m.role === "assistant").length

//       // If a new assistant message was added, invalidate sidebar and header queries
//       if (currentAssistantCount > previousAssistantCount && context) {
//         console.log("[useCustomChat] New assistant response detected, invalidating queries")

//         // Invalidate chat history (sidebar) and header when new response arrives
//         const mode = context.chatType === "ASK_B" ? "ask-b" : "assistant"

//         // Invalidate and refetch sidebar (chat history)
//         queryClient.invalidateQueries({
//           queryKey: ["chat-history", mode, context.assistantId || undefined]
//         })
//         queryClient.refetchQueries({
//           queryKey: ["chat-history", mode, context.assistantId || undefined]
//         })

//         // Invalidate and refetch header (chat topic and info)
//         queryClient.invalidateQueries({
//           queryKey: ["chat-header", context.chatId]
//         })
//         queryClient.refetchQueries({
//           queryKey: ["chat-header", context.chatId]
//         })

//         console.log("[useCustomChat] Queries invalidated and refetched for sidebar and header")
//       }
//     }
//   }, [dbMessageIds, currentMessageIds, isStreaming, dbMessages, messages, context, queryClient])

//   // Send message with streaming
//   const sendMessage = useCallback(async (content: string, attachments?: { name: string; url: string; type: string; size: number }[], options?: { webSearch?: boolean; research?: boolean; chatWithAPI?: boolean; dropbox?: boolean; artifact?: { id: string; name: string; instructions: string; htmlContent: string }; mentionedUsers?: Array<{ id: string; name: string; email: string }>; connectedApiIds?: string[] }) => {
//     if (!context || !content.trim() || isStreamingRef.current) {  // 🔥 Use ref
//       console.warn("[useCustomChat] Cannot send message:", {
//         hasContext: !!context,
//         hasContent: !!content.trim(),
//         isStreaming: isStreamingRef.current
//       })
//       return
//     }

//     console.log("[useCustomChat] Sending message with streaming:", {
//       content: content.substring(0, 50),
//       chatId: context.chatId
//     })

//     isStreamingRef.current = true

//     abortControllerRef.current = new AbortController()

//     // Add user message optimistically
//     const userMessage: Message = {
//       id: `temp-user-${Date.now()}`,
//       role: "user",
//       content: content.trim(),
//       createdAt: new Date(),
//       attachments: attachments
//     }

//     setMessages(prev => [...prev, userMessage])
//     setIsStreaming(true)
//     setStreamingMessage("")

//     try {
//       // Step 1: Save user message to database via server action (skip background processing)
//       console.log("[useCustomChat] Saving user message via server action")
//       const result = await sendChatMessage({
//         chatId: context.chatId,
//         content: content.trim(),
//         assistantId: context.assistantId,
//         chatType: context.chatType,
//         attachments: attachments,
//         webSearch: options?.webSearch,
//         research: options?.research,
//         chatWithAPI: options?.chatWithAPI,
//         dropbox: options?.dropbox,
//         artifact: options?.artifact,
//         mentionedUsers: options?.mentionedUsers,
//         connectedApiIds: options?.connectedApiIds,
//       })

//       if (!result.success) {
//         throw new Error(result.error || "Failed to send message")
//       }

//       // Replace temp message with real one from DB
//       if (result.message) {
//         setMessages(prev =>
//           prev.map(msg =>
//             msg.id === userMessage.id
//               ? {
//                 ...msg,
//                 id: result.message!.id,
//                 createdAt: result.message!.createdAt
//               }
//               : msg
//           )
//         )
//       }

//       // Step 2: Start streaming response
//       console.log("[useCustomChat] Starting streaming response")

//       const streamResponse = await fetch("/api/chat/stream", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({
//           chatId: context.chatId,
//           assistantId: context.assistantId,
//           chatType: context.chatType,
//           webSearch: options?.webSearch,
//           research: options?.research,
//           chatWithAPI: options?.chatWithAPI,
//           dropbox: options?.dropbox,
//           artifact: options?.artifact,
//           attachments: attachments,
//           mentionedUsers: options?.mentionedUsers,
//           connectedApiIds: options?.connectedApiIds || [],
//         }),
//         signal: abortControllerRef.current.signal
//       })

//       if (!streamResponse.ok) {
//         const errorData = await streamResponse.json().catch(() => ({}))
//         throw new Error(errorData.error || "Failed to start streaming")
//       }

//       // Create temporary streaming assistant message
//       const tempAssistantId = `streaming-${Date.now()}`
//       const streamingMessage: Message = {
//         id: tempAssistantId,
//         role: "assistant",
//         content: "",
//         createdAt: new Date(),
//         isStreaming: true
//       }

//       console.log("[useCustomChat] Adding streaming message with ID:", tempAssistantId)
//       setMessages(prev => {
//         const updated = [...prev, streamingMessage]
//         console.log("[useCustomChat] Messages after adding streaming:", updated.length, "messages")
//         return updated
//       })

//       // Process SSE stream
//       const reader = streamResponse.body?.getReader()
//       const decoder = new TextDecoder()

//       if (!reader) {
//         throw new Error("No response stream available")
//       }

//       let buffer = ""
//       let assistantContent = ""
//       let realResponseId: string | null = null

//       console.log("[useCustomChat] Starting to read stream...")

//       while (true) {
//         const { done, value } = await reader.read()

//         if (done) {
//           console.log("[useCustomChat] Stream reader done, buffer remaining:", buffer.substring(0, 100))
//           break
//         }

//         const chunk = decoder.decode(value, { stream: true })
//         console.log("[useCustomChat] Received chunk length:", chunk.length, "First 100 chars:", chunk.substring(0, 100))
//         buffer += chunk
//         const lines = buffer.split("\n\n")
//         buffer = lines.pop() || ""
//         console.log("[useCustomChat] Split into", lines.length, "lines")

//         for (const line of lines) {
//           if (!line.trim() || !line.startsWith("data: ")) {
//             console.log("[useCustomChat] Skipping line (not SSE format):", line.substring(0, 50))
//             continue
//           }

//           try {
//             const jsonStr = line.slice(6)
//             console.log("[useCustomChat] Parsing SSE data:", jsonStr.substring(0, 100))
//             const data = JSON.parse(jsonStr)
//             console.log("[useCustomChat] Parsed data type:", data.type)

//             switch (data.type) {
//               case "connected":
//                 console.log("[useCustomChat] Stream connected successfully")
//                 break

//               case "response_id":
//                 realResponseId = data.id
//                 console.log("[useCustomChat] Received response ID:", realResponseId)
//                 break

//               case "text":
//                 assistantContent += data.content
//                 setStreamingMessage(assistantContent)
//                 console.log("[useCustomChat] Received text chunk:", data.content.substring(0, 50), "total length:", assistantContent.length)
//                 // Update streaming message in real-time
//                 setMessages(prev => {
//                   const updated = prev.map(msg =>
//                     msg.id === tempAssistantId
//                       ? { ...msg, content: assistantContent }
//                       : msg
//                   )
//                   // Log to verify update
//                   const streamingMsg = updated.find(msg => msg.id === tempAssistantId)
//                   console.log("[useCustomChat] Updated streaming message, content length:", streamingMsg?.content?.length || 0)
//                   return updated
//                 })
//                 break

//               case "image":
//                 // Add image markdown to content
//                 const imageMarkdown = `\n\n![Generated Image](${data.url})`
//                 assistantContent += imageMarkdown
//                 setStreamingMessage(assistantContent)
//                 setMessages(prev =>
//                   prev.map(msg =>
//                     msg.id === tempAssistantId
//                       ? { ...msg, content: assistantContent }
//                       : msg
//                   )
//                 )
//                 break

//               case "oauth_required":
//                 console.log("[useCustomChat] OAuth required:", data)
//                 // Show OAuth prompt
//                 setOAuthPrompt({
//                   show: true,
//                   authUrl: data.authUrl,
//                   assistantId: data.assistantId,
//                   message: data.message
//                 })
//                 // Remove streaming message
//                 setMessages(prev => prev.filter(msg => msg.id !== tempAssistantId))
//                 break

//               case "done":
//                 // Finalize message - mark as not streaming
//                 setMessages(prev =>
//                   prev.map(msg =>
//                     msg.id === tempAssistantId
//                       ? { ...msg, isStreaming: false }
//                       : msg
//                   )
//                 )
//                 // Refetch to get the final message from DB
//                 await refetchMessages()
//                 break

//               case "artifact_updating":
//                 console.log("[useCustomChat] ⏳ Artifact updating (sendMessage):", data.artifactName)
//                 toast.loading(`Updating "${data.artifactName}"...`, { id: `artifact-update-${data.artifactId}`, duration: 30000 })
//                 break

//               case "artifact_updated":
//                 console.log("[useCustomChat] 🎨 Artifact updated (sendMessage):", data.artifactName, "Version:", data.versionNumber)
//                 toast.dismiss(`artifact-update-${data.artifactId}`)
//                 toast.success(`Artifact "${data.artifactName}" updated to version ${data.versionNumber}`)
//                 if (data.updatedCode) {
//                   useArtifactStore.getState().setArtifact({
//                     type: "code",
//                     language: "html",
//                     content: data.updatedCode,
//                     title: data.artifactName,
//                   })
//                 }
//                 queryClient.invalidateQueries({ queryKey: ["artifact", data.artifactId] })
//                 queryClient.invalidateQueries({ queryKey: ["artifacts"] })
//                 break

//               case "artifact_update_error":
//                 console.error("[useCustomChat] ❌ Artifact update failed:", data.error)
//                 toast.error(`Failed to update artifact: ${data.error}`)
//                 break

//               case "error":
//                 throw new Error(data.error || "Streaming error")
//             }
//           } catch (parseError) {
//             console.error("[useCustomChat] Error parsing SSE data:", parseError)
//           }
//         }
//       }

//       console.log("[useCustomChat] Stream completed, final content length:", assistantContent.length)
//       setIsStreaming(false)
//       setStreamingMessage("")

//       // Invalidate queries after streaming completes
//       const chatMode = context.chatType === "ASK_B" ? "ask-b" : "assistant"
//       queryClient.invalidateQueries({
//         queryKey: ["chat-history", chatMode, context.assistantId || undefined]
//       })
//       queryClient.invalidateQueries({
//         queryKey: ["chat-header", context.chatId]
//       })

//       console.log("[useCustomChat] Streaming completed")

//     } catch (error: any) {
//       if (error.name === 'AbortError') {
//         console.log("[useCustomChat] Request cancelled")
//         toast.info("Message cancelled")
//         // Remove streaming message on cancel
//         setMessages(prev => prev.filter(msg =>
//           msg.id !== userMessage.id && !msg.isStreaming
//         ))
//       } else {
//         console.error("[useCustomChat] Error sending message:", error)
//         toast.error(error.message || "Failed to send message")

//         // Remove user message and any streaming messages on error
//         setMessages(prev => prev.filter(msg =>
//           msg.id !== userMessage.id && !msg.isStreaming
//         ))
//       }
//     } finally {
//       isStreamingRef.current = false
//       setIsStreaming(false)
//       setStreamingMessage("")
//       abortControllerRef.current = null
//     }
//   }, [context, isStreaming, refetchMessages, queryClient, toast])

//   // Cancel streaming
//   const cancelStreaming = useCallback(() => {
//     if (abortControllerRef.current) {
//       console.log("[useCustomChat] Cancelling stream")
//       abortControllerRef.current.abort()
//       abortControllerRef.current = null
//     }
//     isStreamingRef.current = false
//     setIsStreaming(false)
//     setStreamingMessage("")
//     // Remove any streaming messages
//     setMessages(prev => prev.filter(msg => !msg.isStreaming))
//   }, [])

//   // Handle OAuth connection
//   const handleOAuthConnect = useCallback((authUrl: string, lastMessage?: string) => {
//     console.log("[useCustomChat] Opening OAuth popup:", authUrl)

//     // Open popup
//     const popup = window.open(
//       authUrl,
//       'oauth',
//       'width=600,height=700,scrollbars=yes,location=yes'
//     )

//     if (!popup) {
//       toast.error("Please allow popups for OAuth connection")
//       return
//     }

//     // Listen for OAuth callback
//     const messageHandler = async (event: MessageEvent) => {
//       if (event.data.type === 'oauth_callback') {
//         console.log("[useCustomChat] OAuth callback received:", event.data)

//         if (event.data.error) {
//           toast.error(`OAuth failed: ${event.data.error}`)
//           setOAuthPrompt(null)
//           return
//         }

//         if (!event.data.code || !event.data.state) {
//           toast.error("Invalid OAuth response")
//           setOAuthPrompt(null)
//           return
//         }

//         // Close popup first
//         popup.close()

//         // Exchange code for tokens via backend
//         const exchangeTokens = async () => {
//           try {
//             // Get API configuration to retrieve OAuth details
//             const configResponse = await fetch(`/api/assistants/${context?.assistantId}/api-config`)
//             if (!configResponse.ok) {
//               throw new Error('Failed to fetch API configuration')
//             }

//             const configData = await configResponse.json()

//             // Exchange code for access token
//             const exchangeResponse = await fetch('/api/oauth/exchange-code', {
//               method: 'POST',
//               headers: { 'Content-Type': 'application/json' },
//               body: JSON.stringify({
//                 code: event.data.code,
//                 clientId: configData.clientId,
//                 clientSecret: configData.clientSecret,
//                 tokenUrl: configData.tokenUrl,
//                 redirectUri: `${window.location.origin}/api/oauth/callback`,
//                 tokenExchangeMethod: configData.tokenExchangeMethod || 'post'
//               })
//             })

//             const exchangeData = await exchangeResponse.json()

//             if (!exchangeData.success) {
//               throw new Error(exchangeData.error || 'Failed to exchange code for token')
//             }

//             // Store tokens in database
//             const updateResponse = await fetch(`/api/assistants/${context?.assistantId}/oauth-tokens`, {
//               method: 'POST',
//               headers: { 'Content-Type': 'application/json' },
//               body: JSON.stringify({
//                 accessToken: exchangeData.accessToken,
//                 refreshToken: exchangeData.refreshToken,
//                 expiresIn: exchangeData.expiresIn
//               })
//             })

//             if (!updateResponse.ok) {
//               throw new Error('Failed to store OAuth tokens')
//             }

//             toast.success("Connected successfully!")

//             // Hide OAuth prompt
//             setOAuthPrompt(null)

//             // Auto-retry the last message if provided
//             if (lastMessage && context) {
//               console.log("[useCustomChat] Retrying message after OAuth:", lastMessage)
//               setTimeout(() => {
//                 sendMessage(lastMessage, undefined, {
//                   chatWithAPI: true  // Ensure API is enabled for retry
//                 })
//               }, 1000)
//             }

//           } catch (error: any) {
//             console.error('[useCustomChat] OAuth token exchange failed:', error)
//             toast.error(error.message || 'Failed to complete OAuth connection')
//             setOAuthPrompt(null)
//           }
//         }

//         exchangeTokens()

//         // Clean up listener
//         window.removeEventListener('message', messageHandler)
//       }
//     }

//     window.addEventListener('message', messageHandler)

//     // Clean up on popup close
//     const checkPopupClosed = setInterval(() => {
//       if (popup.closed) {
//         clearInterval(checkPopupClosed)
//         window.removeEventListener('message', messageHandler)
//         console.log("[useCustomChat] OAuth popup closed")
//       }
//     }, 500)
//   }, [context, sendMessage, toast])

//   // Dismiss OAuth prompt
//   const dismissOAuthPrompt = useCallback(() => {
//     setOAuthPrompt(null)
//   }, [])

//   // Get display messages - messages array already contains the streaming message
//   // No need to add it again, just use messages directly
//   const displayMessages: Message[] = messages

//   return {
//     context,
//     messages: displayMessages,
//     isLoadingMessages: isLoadingMessages || isInitializing,
//     isStreaming,
//     streamingMessage,
//     isInitializing,
//     initError,
//     isReady: !!context && !isInitializing,
//     sendMessage,
//     cancelStreaming,
//     refetchMessages,
//     oauthPrompt,
//     handleOAuthConnect,
//     dismissOAuthPrompt,
//   }
// }