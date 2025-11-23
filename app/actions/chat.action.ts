// app/actions/chat.action.ts
"use server"

import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { openai } from "@/lib/openai"
import upstageService from "@/lib/services/upstageService"

// ================================================================
// CHAT CREATION & TOPIC GENERATION
// ================================================================

/**
 * Create chat with first message and generate topic
 */
export async function createChatWithMessage(data: {
  mode: "assistant" | "ask-b"
  assistantId?: string
  firstMessage: string
}) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized", chatId: null }
    }

    const userId = BigInt(session.user.id)

    // Create chat with temporary topic
    const chat = await prisma.assistantUserChat.create({
      data: {
        userId,
        assistantId: data.assistantId ? BigInt(data.assistantId) : null,
        chatType: data.mode === "ask-b" ? "ASK_B" : "ASSISTANT",
        topic: "New Chat", // Temporary topic
      }
    })

    // Save first user message
    await prisma.assistantUserChatMessage.create({
      data: {
        assistantUserChatId: chat.id,
        role: "user",
        message: data.firstMessage,
        userId: userId,
        assistantId: data.assistantId ? BigInt(data.assistantId) : null,
      }
    })

    console.log("[createChatWithMessage] Chat created:", chat.id)

    // Trigger background topic generation (non-blocking)
    generateChatTopic(chat.id.toString(), data.firstMessage).catch(err => {
      console.error("[createChatWithMessage] Topic generation failed:", err)
      // Don't fail the request if topic generation fails
    })

        // Trigger background response generation (non-blocking)
        generateChatResponseInBackground({
          chatId: chat.id.toString(),
          assistantId: data.assistantId,
          chatType: data.mode === "ask-b" ? "ASK_B" : "ASSISTANT",
          webSearch: false,
          research: false,
          extractedContent: "" // No attachments in initial message creation
        }).catch(err => {
          console.error("[createChatWithMessage] Response generation failed:", err)
          // Don't fail the request if response generation fails
        })

    return {
      success: true,
      chatId: chat.id.toString(),
      chat: {
        id: chat.id.toString(),
        topic: chat.topic,
        chatType: chat.chatType,
        assistantId: data.assistantId || null,
        createdAt: chat.createdAt,
      }
    }
  } catch (error) {
    console.error("[createChatWithMessage] Error:", error)
    return { success: false, error: "Failed to create chat", chatId: null }
  }
}

/**
 * Generate topic from first message using AI
 */
async function generateChatTopic(chatId: string, firstMessage: string) {
  try {
    console.log("[generateChatTopic] Generating topic for chat:", chatId)

    // Call OpenAI to generate a short topic
    const response = await openai.responses.create({
      model: "gpt-5-nano",
      input: `Generate a concise 3-5 word topic/title for the following user message. Return ONLY the topic, no quotes, no explanation.\n\nUser message: ${firstMessage}`
    })

    const topic = response.output_text?.trim() || "New Chat"

    // Update chat topic in database
    await prisma.assistantUserChat.update({
      where: { id: parseInt(chatId) },
      data: {
        topic: topic.length > 50 ? topic.substring(0, 50) : topic,
        updatedAt: new Date()
      }
    })

    console.log("[generateChatTopic] Topic generated:", topic)

    return { success: true, topic }
  } catch (error) {
    console.error("[generateChatTopic] Error:", error)
    return { success: false, topic: "New Chat" }
  }
}

/**
 * Generate assistant response in the background (unified function for first and subsequent messages)
 */
async function generateChatResponseInBackground(data: {
  chatId: string
  assistantId?: string | null
  chatType: "ASK_B" | "ASSISTANT"
  webSearch?: boolean
  research?: boolean
  extractedContent?: string // Content extracted from attachments
}) {
  try {
    console.log("[generateChatResponseInBackground] Generating response for chat:", data.chatId)

    const chatIdInt = parseInt(data.chatId)

    // Get chat with full context including all messages
    const chat = await prisma.assistantUserChat.findFirst({
      where: { id: chatIdInt },
      include: {
        assistant: {
          select: {
            id: true,
            name: true,
            instructions: true,
            description: true,
            vectorStoreId: true,
            knowledgebases: {
              where: { type: "text" },
              select: { note: true }
            }
          }
        },
        messages: {
          orderBy: { createdAt: 'asc' },
          select: {
            role: true,
            message: true
          }
        }
      }
    })

    if (!chat) {
      throw new Error("Chat not found")
    }

    // Build system prompt based on chat type
    let systemPrompt = ""
    let assistantName = "Assistant"

    if (data.chatType === "ASK_B" || !data.assistantId) {
      assistantName = "Ask-B"
      systemPrompt = `You are Ask-B, a helpful, intelligent, and friendly AI assistant created by Business Master.

Your purpose is to assist users with a wide range of tasks including:
- Answering questions on various topics
- Helping with problem-solving and analysis
- Providing explanations and insights
- Assisting with writing and content creation
- Offering guidance and recommendations

Guidelines:
- Be helpful, accurate, and thorough
- Provide clear explanations with examples when helpful
- Ask clarifying questions if needed
- Maintain a professional yet friendly tone
- Admit when you're uncertain rather than guessing
- Focus on being genuinely helpful to the user`
    } else {
      assistantName = chat.assistant?.name || "Assistant"
      systemPrompt = `You are ${assistantName}, a specialized AI assistant with unique knowledge and capabilities.`

      if (chat.assistant?.description) {
        systemPrompt += `\n\n## About ${assistantName}\n${chat.assistant.description}`
      }

      if (chat.assistant?.instructions) {
        systemPrompt += `\n\n## Your Specific Instructions\n${chat.assistant.instructions}`
      }

      const knowledgeNotes = chat.assistant?.knowledgebases
        .map(kb => kb.note)
        .filter(Boolean) || []

      if (knowledgeNotes.length > 0) {
        systemPrompt += `\n\n## Your Knowledge Base\n${knowledgeNotes.join("\n\n")}`
      }

      systemPrompt += `\n\n## Critical Guidelines
- You are ${assistantName} - a specific assistant with unique knowledge. ALWAYS provide answers specific to your role and knowledge base.
- NEVER give generic or out-of-the-box answers. Every response must be tailored to your specific instructions and knowledge.
- ALWAYS prioritize information from your knowledge base and instructions above generic knowledge.
- When answering questions, first check if you have relevant information in your knowledge base or instructions.
- Stay in character as ${assistantName} - be consistent with your specific role and expertise.
- If you don't have specific information in your knowledge base, acknowledge this rather than guessing.
- Be conversational and engaging while maintaining your specific identity as ${assistantName}.`
    }

    // Prepare conversation history for context
    // This works for both first message (only user message) and subsequent messages (full history)
    const conversationMessages = chat.messages
      .filter(msg => msg.message)
      .map(msg => ({
        role: msg.role as "user" | "assistant" | "system",
        content: msg.message || ""
      }))

    // Get the last user message for file search
    const lastUserMessage = conversationMessages
      .filter(msg => msg.role === "user")
      .slice(-1)[0]?.content || ""

    // Enhance the last user message with extracted content from attachments
    let enhancedUserMessage = lastUserMessage
    if (data.extractedContent && data.extractedContent.trim()) {
      enhancedUserMessage = `${lastUserMessage}\n\n${data.extractedContent}\n\nPlease analyze the attached documents and provide insights based on their content. If research mode is enabled, also search the web for additional context about the topics mentioned in the documents.`
      console.log("[generateChatResponseInBackground] Enhanced user message with extracted content from attachments")
    }

    let assistantResponse = ""

    // Use Responses API with appropriate tools based on user selection
    // Priority: webSearch > research > file_search (if vector store exists)
    if (enhancedUserMessage) {
      try {
        // Build the full conversation context for the input
        // Replace the last user message with enhanced version if extracted content exists
        const conversationContext = conversationMessages
          .slice(0, -1) // All messages except the last one
          .map(msg => `${msg.role === "user" ? "User" : "Assistant"}: ${msg.content}`)
          .join("\n\n")
        
        // Use enhanced message (with extracted content) for the last user message
        const fullInput = conversationContext 
          ? `${conversationContext}\n\nUser: ${enhancedUserMessage}`
          : `User: ${enhancedUserMessage}`
        
        const tools: any[] = []
        
        // If web search is enabled, use ONLY web_search (no file_search)
        if (data.webSearch) {
          console.log("[generateChatResponseInBackground] Using Responses API with web_search only")
          tools.push({ type: "web_search" })
        }
        // If research is enabled, use BOTH file_search AND web_search
        else if (data.research) {
          console.log("[generateChatResponseInBackground] Using Responses API with BOTH file_search and web_search for research")
          
          // Add file_search if vector store exists
          if (data.assistantId && chat.assistant?.vectorStoreId) {
            tools.push({
              type: "file_search",
              vector_store_ids: [chat.assistant.vectorStoreId]
            })
          }
          
          // Always add web_search for research
          tools.push({ 
            type: "web_search",
            // Research mode can use higher reasoning effort if needed
          })
        }
        // Otherwise, use file_search if vector store exists
        else if (data.assistantId && chat.assistant?.vectorStoreId) {
          console.log("[generateChatResponseInBackground] Using Responses API with file_search for assistant-specific answer, vector store:", chat.assistant.vectorStoreId)
          tools.push({
            type: "file_search",
            vector_store_ids: [chat.assistant.vectorStoreId]
          })
        }

        // Only make API call if we have tools configured
        if (tools.length > 0) {
          const response = await openai.responses.create({
            model: "gpt-5",
            input: fullInput,
            tools: tools,
            include: data.webSearch 
              ? ["web_search_call.action.sources"] 
              : data.research
              ? ["file_search_call.results", "web_search_call.action.sources"] // Include both for research
              : ["file_search_call.results"], // Include search results in response
          })

          // Extract the message from the response
          // The response has an output array with web_search_call/file_search_call and message items
          const messageOutput = response.output?.find((item: any) => item.type === "message")
          if (messageOutput && 'content' in messageOutput && Array.isArray(messageOutput.content)) {
            // Extract text from content array
            const textContent = messageOutput.content.find((c: any) => c.type === "output_text")
            if (textContent && 'text' in textContent) {
              assistantResponse = textContent.text || ""
              const toolType = data.webSearch 
                ? "web_search" 
                : data.research 
                ? "file_search + web_search (research)" 
                : "file_search"
              console.log(`[generateChatResponseInBackground] Response generated via ${toolType}, length:`, assistantResponse.length)
            }
          }

          // If no response, fall back to chat completions
          if (!assistantResponse) {
            console.log("[generateChatResponseInBackground] No response from Responses API, falling back to chat completions")
            throw new Error("No response from Responses API")
          }
        } else {
          // No tools configured, fall through to chat completions
          throw new Error("No tools configured")
        }
      } catch (responsesError) {
        console.error("[generateChatResponseInBackground] Responses API failed, falling back to chat completions:", responsesError)
        // Fall through to chat completions API with enhanced system prompt
      }
    }

    // Fallback to Chat Completions API if Responses API failed or no tools configured
    if (!assistantResponse) {
      console.log("[generateChatResponseInBackground] Using Chat Completions API")
      
      // Enhance system prompt to emphasize using assistant-specific knowledge
      let enhancedSystemPrompt = systemPrompt
      if (data.assistantId && chat.assistant) {
        enhancedSystemPrompt += `\n\nIMPORTANT: You are ${assistantName}, a specific assistant with unique knowledge and instructions. Always refer to your specific instructions, description, and knowledge base when answering. Do not give generic answers - provide answers specific to your role and knowledge.`
      }
      
      // Replace last user message with enhanced version if extracted content exists
      const messagesForCompletion = [...conversationMessages]
      if (data.extractedContent && data.extractedContent.trim() && messagesForCompletion.length > 0) {
        const lastUserMsgIndex = messagesForCompletion.map((m, i) => m.role === "user" ? i : -1).filter(i => i !== -1).pop()
        if (lastUserMsgIndex !== undefined) {
          messagesForCompletion[lastUserMsgIndex] = {
            role: "user",
            content: enhancedUserMessage
          }
        }
      }
      
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: enhancedSystemPrompt },
          ...messagesForCompletion
        ],
        max_tokens: 4096,
        temperature: 0.7,
      })

      assistantResponse = response.choices[0]?.message?.content || ""
    }

    if (!assistantResponse) {
      throw new Error("No response generated")
    }

    // Check if assistant response already exists for the last user message (race condition protection)
    // Get the last user message timestamp from database
    const lastUserMessageInDb = await prisma.assistantUserChatMessage.findFirst({
      where: {
        assistantUserChatId: chatIdInt,
        role: "user"
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    if (lastUserMessageInDb) {
      // Check if there's already an assistant response after this user message
      const existingResponse = await prisma.assistantUserChatMessage.findFirst({
        where: {
          assistantUserChatId: chatIdInt,
          role: "assistant",
          message: {
            not: null
          },
          createdAt: {
            gt: lastUserMessageInDb.createdAt
          }
        }
      })

      // Only create if no response exists yet (prevent duplicates)
      if (!existingResponse) {
        // Save assistant response to database
        await prisma.assistantUserChatMessage.create({
          data: {
            assistantUserChatId: chatIdInt,
            role: "assistant",
            message: assistantResponse,
            userId: null,
            assistantId: data.assistantId ? BigInt(data.assistantId) : null,
          }
        })
        console.log("[generateChatResponseInBackground] Assistant response saved to database")
      } else {
        console.log("[generateChatResponseInBackground] Assistant response already exists, skipping duplicate creation")
        // Update existing response if it's empty or incomplete
        if (!existingResponse.message || existingResponse.message.trim().length === 0) {
          await prisma.assistantUserChatMessage.update({
            where: { id: existingResponse.id },
            data: { message: assistantResponse }
          })
          console.log("[generateChatResponseInBackground] Updated existing empty response")
        }
      }
    } else {
      // No user message found, create response anyway (shouldn't happen but safety check)
      await prisma.assistantUserChatMessage.create({
        data: {
          assistantUserChatId: chatIdInt,
          role: "assistant",
          message: assistantResponse,
          userId: null,
          assistantId: data.assistantId ? BigInt(data.assistantId) : null,
        }
      })
      console.log("[generateChatResponseInBackground] Assistant response saved (no user message found)")
    }

    // Update chat timestamp
    await prisma.assistantUserChat.update({
      where: { id: chatIdInt },
      data: { updatedAt: new Date() }
    })

    // Track usage metrics (only for Assistant mode)
    if (data.assistantId) {
      const inputTokens = Math.ceil(systemPrompt.length / 4) + 
                         Math.ceil(conversationMessages.reduce((acc, msg) => 
                           acc + msg.content.length, 0) / 4)
      const outputTokens = Math.ceil(assistantResponse.length / 4)
      const totalTokens = inputTokens + outputTokens
      
      await prisma.usageMetric.create({
        data: {
          userId: chat.userId,
          assistantId: BigInt(data.assistantId),
          inputToken: inputTokens,
          outputToken: outputTokens,
          totalToken: totalTokens,
          totalCost: (totalTokens / 1_000_000) * 0.375, // GPT-4o-mini pricing
          costType: "chat"
        }
      })
    }

    console.log("[generateChatResponseInBackground] Response generated and saved, length:", assistantResponse.length)

    return { success: true, response: assistantResponse }
  } catch (error) {
    console.error("[generateChatResponseInBackground] Error:", error)
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
  }
}

// ================================================================
// CHAT RETRIEVAL
// ================================================================

/**
 * Get a specific chat by ID
 */
export async function getSpecificChat(chatId: string) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized", chat: null }
    }

    const userId = BigInt(session.user.id)
    const chatIdInt = parseInt(chatId)

    // Fetch the specific chat
    const chat = await prisma.assistantUserChat.findFirst({
      where: {
        id: chatIdInt,
        userId,
        deletedAt: null
      },
      include: {
        assistant: {
          select: {
            id: true,
            name: true,
            instructions: true,
            description: true
          }
        },
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          select: {
            message: true,
            createdAt: true
          }
        }
      }
    })

    if (!chat) {
      return { success: false, error: "Chat not found", chat: null }
    }

    // Handle Ask-B vs Assistant chat
    const isAskB = chat.chatType === "ASK_B"

    return {
      success: true,
      chat: {
        id: chat.id.toString(),
        topic: chat.topic,
        chatType: chat.chatType,
        assistantId: chat.assistantId?.toString() || null,
        assistantName: isAskB ? "Ask-B" : (chat.assistant?.name || "Assistant"),
        assistantInstructions: chat.assistant?.instructions || null,
        lastMessage: chat.messages[0]?.message || null,
        lastMessageAt: chat.messages[0]?.createdAt || chat.createdAt,
        createdAt: chat.createdAt,
        updatedAt: chat.updatedAt
      }
    }
  } catch (error) {
    console.error("[getSpecificChat] Error:", error)
    return { success: false, error: "Failed to fetch chat", chat: null }
  }
}

/**
 * Get all Ask-B chats for current user
 */
export async function getAskBChats() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized", chats: [] }
    }

    const userId = BigInt(session.user.id)

    const chats = await prisma.assistantUserChat.findMany({
      where: {
        userId,
        chatType: "ASK_B",
        assistantId: null,
        deletedAt: null,
        messages: {
          some: {} // Only get chats that have messages
        }
      },
      include: {
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          select: {
            message: true,
            createdAt: true
          }
        }
      },
      orderBy: {
        updatedAt: 'desc'
      },
      take: 100 // Limit to 100 most recent chats
    })

    return {
      success: true,
      chats: chats.map(chat => ({
        id: chat.id.toString(),
        topic: chat.topic,
        chatType: chat.chatType,
        assistantId: null,
        lastMessage: chat.messages[0]?.message || null,
        lastMessageAt: chat.messages[0]?.createdAt || chat.createdAt,
        createdAt: chat.createdAt,
        updatedAt: chat.updatedAt
      }))
    }
  } catch (error) {
    console.error("[getAskBChats] Error:", error)
    return { success: false, error: "Failed to fetch chats", chats: [] }
  }
}

/**
 * Get all chats for a specific assistant
 */
export async function getAssistantChats(assistantId: string) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized", chats: [] }
    }

    const userId = BigInt(session.user.id)
    const assistantIdBigInt = BigInt(assistantId)

    // Verify user has access to this assistant
    const assistant = await prisma.assistant.findFirst({
      where: {
        id: assistantIdBigInt,
        OR: [
          { userId: userId }, // Owner
          { public: true }, // Public assistant
          {
            purchases: {
              some: {
                buyerId: userId,
                status: "completed"
              }
            }
          } // Purchased
        ],
        deletedAt: null
      }
    })

    if (!assistant) {
      return { success: false, error: "Assistant not found or access denied", chats: [] }
    }

    const chats = await prisma.assistantUserChat.findMany({
      where: {
        userId,
        assistantId: assistantIdBigInt,
        chatType: "ASSISTANT",
        deletedAt: null,
        messages: {
          some: {} // Only get chats that have messages
        }
      },
      include: {
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          select: {
            message: true,
            createdAt: true
          }
        }
      },
      orderBy: {
        updatedAt: 'desc'
      },
      take: 100 // Limit to 100 most recent chats
    })

    return {
      success: true,
      chats: chats.map(chat => ({
        id: chat.id.toString(),
        topic: chat.topic,
        chatType: chat.chatType,
        assistantId: chat.assistantId?.toString() || null,
        lastMessage: chat.messages[0]?.message || null,
        lastMessageAt: chat.messages[0]?.createdAt || chat.createdAt,
        createdAt: chat.createdAt,
        updatedAt: chat.updatedAt
      }))
    }
  } catch (error) {
    console.error("[getAssistantChats] Error:", error)
    return { success: false, error: "Failed to fetch chats", chats: [] }
  }
}

// ================================================================
// MESSAGE OPERATIONS
// ================================================================

/**
 * Get messages for a specific chat
 */
export async function getChatMessages(chatId: string) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized", messages: [] }
    }

    const userId = BigInt(session.user.id)
    const chatIdInt = parseInt(chatId)

    // Verify ownership
    const chat = await prisma.assistantUserChat.findFirst({
      where: {
        id: chatIdInt,
        userId,
        deletedAt: null
      }
    })

    if (!chat) {
      return { success: false, error: "Chat not found", messages: [] }
    }

    const messages = await prisma.assistantUserChatMessage.findMany({
      where: {
        assistantUserChatId: chatIdInt
      },
      orderBy: {
        createdAt: 'asc'
      },
      select: {
        id: true,
        role: true,
        message: true,
        image: true,
        documents: true,
        createdAt: true
      }
    })

    return {
      success: true,
      messages: messages.map(msg => {
        // Parse attachments from documents (JSON string) and image
        const attachments: {
          name: string
          url: string
          type: string
          size: number
        }[] = []

        // Parse documents if it exists (stored as JSON string)
        if (msg.documents) {
          try {
            const documents = typeof msg.documents === 'string' 
              ? JSON.parse(msg.documents) 
              : msg.documents
            
            if (Array.isArray(documents)) {
              documents.forEach((doc: any) => {
                if (doc && (doc.url || doc.name)) {
                  attachments.push({
                    name: doc.name || 'Document',
                    url: doc.url || '',
                    type: doc.type || 'application/octet-stream',
                    size: doc.size || 0
                  })
                }
              })
            }
          } catch (e) {
            console.error("[getChatMessages] Error parsing documents:", e)
          }
        }

        // Add image as attachment if it exists
        if (msg.image) {
          attachments.push({
            name: 'Image',
            url: msg.image,
            type: 'image',
            size: 0
          })
        }

        return {
          id: msg.id.toString(),
          role: msg.role as "user" | "assistant",
          content: msg.message || "",
          createdAt: msg.createdAt,
          attachments: attachments.length > 0 ? attachments : undefined
        }
      })
    }
  } catch (error) {
    console.error("[getChatMessages] Error:", error)
    return { success: false, error: "Failed to fetch messages", messages: [] }
  }
}

/**
 * Add a message to a chat
 */
export async function addMessageToChat(data: {
  chatId: string
  role: "user" | "assistant"
  content: string
}) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" }
    }

    const userId = BigInt(session.user.id)
    const chatIdInt = parseInt(data.chatId)

    // Verify ownership
    const chat = await prisma.assistantUserChat.findFirst({
      where: {
        id: chatIdInt,
        userId,
        deletedAt: null
      }
    })

    if (!chat) {
      return { success: false, error: "Chat not found" }
    }

    // Create message
    const message = await prisma.assistantUserChatMessage.create({
      data: {
        assistantUserChatId: chatIdInt,
        role: data.role,
        message: data.content,
        userId: data.role === "user" ? userId : null,
        assistantId: chat.assistantId
      }
    })

    // Update chat timestamp
    await prisma.assistantUserChat.update({
      where: { id: chatIdInt },
      data: { updatedAt: new Date() }
    })

    return {
      success: true,
      message: {
        id: message.id.toString(),
        role: message.role,
        content: message.message || "",
        createdAt: message.createdAt
      }
    }
  } catch (error) {
    console.error("[addMessageToChat] Error:", error)
    return { success: false, error: "Failed to add message" }
  }
}

/**
 * Send a user message and generate assistant response in background
 */
export async function sendChatMessage(data: {
  chatId: string
  content: string
  assistantId?: string | null
  chatType: "ASK_B" | "ASSISTANT"
  attachments?: {
    name: string
    url: string
    type: string
    size: number
  }[]
  webSearch?: boolean
  research?: boolean
}) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" }
    }

    const userId = BigInt(session.user.id)
    const chatIdInt = parseInt(data.chatId)

    // Verify ownership
    const chat = await prisma.assistantUserChat.findFirst({
      where: {
        id: chatIdInt,
        userId,
        deletedAt: null
      },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          select: {
            role: true,
            message: true
          }
        }
      }
    })

    if (!chat) {
      return { success: false, error: "Chat not found" }
    }

    // Prepare attachments data and extract content
    let documentsJson: string | null = null
    let imageUrl: string | null = null
    let extractedContent: string = ""

    if (data.attachments && data.attachments.length > 0) {
      // Separate images from documents
      const images = data.attachments.filter(att => att.type.startsWith('image/'))
      const documents = data.attachments.filter(att => !att.type.startsWith('image/'))

      // Store first image in image field
      if (images.length > 0) {
        imageUrl = images[0].url
      }

      // Extract content from documents using Upstage
      const extractedTexts: string[] = []
      for (const attachment of data.attachments) {
        // Check if file type is supported by Upstage
        if (upstageService.isSupportedFileType(attachment.type) && attachment.url) {
          try {
            console.log(`[sendChatMessage] Extracting content from attachment: ${attachment.name}`)
            const extracted = await upstageService.extractFromUrl(attachment.url)
            if (extracted.text) {
              extractedTexts.push(`\n\n--- Content from ${attachment.name} ---\n${extracted.text}\n--- End of ${attachment.name} ---\n`)
              console.log(`[sendChatMessage] Extracted ${extracted.text.length} characters from ${attachment.name}`)
            }
          } catch (error) {
            console.error(`[sendChatMessage] Failed to extract content from ${attachment.name}:`, error)
            // Continue with other attachments even if one fails
          }
        }
      }

      // Combine all extracted content
      if (extractedTexts.length > 0) {
        extractedContent = extractedTexts.join("\n\n")
      }

      // Store all attachments (including images) in documents as JSON
      documentsJson = JSON.stringify(data.attachments)
    }

    // Save user message immediately
    const userMessage = await prisma.assistantUserChatMessage.create({
      data: {
        assistantUserChatId: chatIdInt,
        role: "user",
        message: data.content,
        userId: userId,
        assistantId: chat.assistantId,
        image: imageUrl,
        documents: documentsJson
      }
    })

    // Update chat timestamp
    await prisma.assistantUserChat.update({
      where: { id: chatIdInt },
      data: { updatedAt: new Date() }
    })

    console.log("[sendChatMessage] User message saved, triggering background response")

    // Trigger background response generation (non-blocking)
    // Pass extracted content so AI can research about it
    generateChatResponseInBackground({
      chatId: data.chatId,
      assistantId: data.assistantId,
      chatType: data.chatType,
      webSearch: data.webSearch,
      research: data.research,
      extractedContent: extractedContent // ✅ Pass extracted content from attachments
    }).catch(err => {
      console.error("[sendChatMessage] Background response generation failed:", err)
      // Don't fail the request if background generation fails
    })

    return {
      success: true,
      message: {
        id: userMessage.id.toString(),
        role: userMessage.role,
        content: userMessage.message || "",
        createdAt: userMessage.createdAt
      }
    }
  } catch (error) {
    console.error("[sendChatMessage] Error:", error)
    return { success: false, error: "Failed to send message" }
  }
}


// ================================================================
// CHAT MANAGEMENT
// ================================================================

/**
 * Rename a chat
 */
export async function renameChat(chatId: string, newTopic: string) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" }
    }

    const userId = BigInt(session.user.id)
    const chatIdInt = parseInt(chatId)

    // Verify ownership
    const chat = await prisma.assistantUserChat.findFirst({
      where: {
        id: chatIdInt,
        userId,
        deletedAt: null
      }
    })

    if (!chat) {
      return { success: false, error: "Chat not found" }
    }

    // Validate topic
    const sanitizedTopic = newTopic.trim()
    if (!sanitizedTopic || sanitizedTopic.length > 100) {
      return { success: false, error: "Invalid topic" }
    }

    await prisma.assistantUserChat.update({
      where: { id: chatIdInt },
      data: { 
        topic: sanitizedTopic,
        updatedAt: new Date()
      }
    })

    return { success: true }
  } catch (error) {
    console.error("[renameChat] Error:", error)
    return { success: false, error: "Failed to rename chat" }
  }
}

/**
 * Delete a chat (soft delete)
 */
export async function deleteChat(chatId: string) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" }
    }

    const userId = BigInt(session.user.id)
    const chatIdInt = parseInt(chatId)

    // Verify ownership
    const chat = await prisma.assistantUserChat.findFirst({
      where: {
        id: chatIdInt,
        userId,
        deletedAt: null
      }
    })

    if (!chat) {
      return { success: false, error: "Chat not found" }
    }

    // Soft delete
    await prisma.assistantUserChat.update({
      where: { id: chatIdInt },
      data: { deletedAt: new Date() }
    })

    return { success: true }
  } catch (error) {
    console.error("[deleteChat] Error:", error)
    return { success: false, error: "Failed to delete chat" }
  }
}

/**
 * Archive a chat
 */
export async function archiveChat(chatId: string) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" }
    }

    const userId = BigInt(session.user.id)
    const chatIdInt = parseInt(chatId)

    // Verify ownership
    const chat = await prisma.assistantUserChat.findFirst({
      where: {
        id: chatIdInt,
        userId,
        deletedAt: null
      }
    })

    if (!chat) {
      return { success: false, error: "Chat not found" }
    }

    // For now, we'll use soft delete for archiving
    // In the future, you might want to add an 'archived' field
    await prisma.assistantUserChat.update({
      where: { id: chatIdInt },
      data: { 
        deletedAt: new Date() // Using deletedAt as archived for now
      }
    })

    return { success: true }
  } catch (error) {
    console.error("[archiveChat] Error:", error)
    return { success: false, error: "Failed to archive chat" }
  }
}

/**
 * Get chat statistics for a user
 */
export async function getChatStats() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized", stats: null }
    }

    const userId = BigInt(session.user.id)

    const [totalChats, askBChats, assistantChats, totalMessages] = await Promise.all([
      // Total chats
      prisma.assistantUserChat.count({
        where: {
          userId,
          deletedAt: null
        }
      }),
      // Ask-B chats
      prisma.assistantUserChat.count({
        where: {
          userId,
          chatType: "ASK_B",
          deletedAt: null
        }
      }),
      // Assistant chats
      prisma.assistantUserChat.count({
        where: {
          userId,
          chatType: "ASSISTANT",
          deletedAt: null
        }
      }),
      // Total messages
      prisma.assistantUserChatMessage.count({
        where: {
          userId
        }
      })
    ])

    return {
      success: true,
      stats: {
        totalChats,
        askBChats,
        assistantChats,
        totalMessages
      }
    }
  } catch (error) {
    console.error("[getChatStats] Error:", error)
    return { success: false, error: "Failed to fetch stats", stats: null }
  }
}

/**
 * Search chats by topic or content
 */
export async function searchChats(query: string) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized", chats: [] }
    }

    const userId = BigInt(session.user.id)
    const searchQuery = query.trim().toLowerCase()

    if (!searchQuery || searchQuery.length < 2) {
      return { success: false, error: "Search query too short", chats: [] }
    }

    const chats = await prisma.assistantUserChat.findMany({
      where: {
        userId,
        deletedAt: null,
        OR: [
          {
            topic: {
              contains: searchQuery,
              mode: 'insensitive'
            }
          },
          {
            messages: {
              some: {
                message: {
                  contains: searchQuery,
                  mode: 'insensitive'
                }
              }
            }
          }
        ]
      },
      include: {
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          select: {
            message: true,
            createdAt: true
          }
        }
      },
      orderBy: {
        updatedAt: 'desc'
      },
      take: 50
    })

    return {
      success: true,
      chats: chats.map(chat => ({
        id: chat.id.toString(),
        topic: chat.topic,
        chatType: chat.chatType,
        assistantId: chat.assistantId?.toString() || null,
        lastMessage: chat.messages[0]?.message || null,
        lastMessageAt: chat.messages[0]?.createdAt || chat.createdAt,
        createdAt: chat.createdAt,
        updatedAt: chat.updatedAt
      }))
    }
  } catch (error) {
    console.error("[searchChats] Error:", error)
    return { success: false, error: "Failed to search chats", chats: [] }
  }
}