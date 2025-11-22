// app/actions/chat.action.ts
"use server"

import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { openai } from "@/lib/openai"

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
      chatType: data.mode === "ask-b" ? "ASK_B" : "ASSISTANT"
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
      systemPrompt = `You are ${assistantName}, an AI assistant.`

      if (chat.assistant?.description) {
        systemPrompt += `\n\n${chat.assistant.description}`
      }

      if (chat.assistant?.instructions) {
        systemPrompt += `\n\n## Instructions\n${chat.assistant.instructions}`
      }

      const knowledgeNotes = chat.assistant?.knowledgebases
        .map(kb => kb.note)
        .filter(Boolean) || []

      if (knowledgeNotes.length > 0) {
        systemPrompt += `\n\n## Knowledge Base\n${knowledgeNotes.join("\n\n")}`
      }

      systemPrompt += `\n\n## Guidelines
- Stay in character as ${assistantName}
- Provide helpful, accurate, and relevant information
- Be conversational and engaging
- If you don't know something, admit it honestly
- Follow the instructions and use the knowledge base provided above`
    }

    // Prepare conversation history for context
    // This works for both first message (only user message) and subsequent messages (full history)
    const conversationMessages = chat.messages
      .filter(msg => msg.message)
      .map(msg => ({
        role: msg.role as "user" | "assistant" | "system",
        content: msg.message || ""
      }))

    // Call OpenAI to generate response (non-streaming for background)
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        ...conversationMessages
      ],
      max_tokens: 4096,
      temperature: 0.7,
    })

    const assistantResponse = response.choices[0]?.message?.content || ""

    if (!assistantResponse) {
      throw new Error("No response generated")
    }

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
      messages: messages.map(msg => ({
        id: msg.id.toString(),
        role: msg.role as "user" | "assistant",
        content: msg.message || "",
        createdAt: msg.createdAt,
        image: msg.image,
        documents: msg.documents
      }))
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

    // Save user message immediately
    const userMessage = await prisma.assistantUserChatMessage.create({
      data: {
        assistantUserChatId: chatIdInt,
        role: "user",
        message: data.content,
        userId: userId,
        assistantId: chat.assistantId
      }
    })

    // Update chat timestamp
    await prisma.assistantUserChat.update({
      where: { id: chatIdInt },
      data: { updatedAt: new Date() }
    })

    console.log("[sendChatMessage] User message saved, triggering background response")

    // Trigger background response generation (non-blocking)
    generateChatResponseInBackground({
      chatId: data.chatId,
      assistantId: data.assistantId,
      chatType: data.chatType
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