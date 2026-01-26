// app/actions/chat.action.ts
"use server"

import { after } from "next/server"
import { randomUUID } from "crypto"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { openai } from "@/lib/openai"
import { cleanupOrphanedMessages } from "@/lib/message-cleanup"

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
  attachments?: {
    name: string
    url: string
    type: string
    size: number
  }[]
  webSearch?: boolean
  research?: boolean
  chatWithAPI?: boolean
  dropbox?: boolean
  artifact?: {
    id: string
    name: string
    instructions: string
    htmlContent: string
  }
  mentionedUsers?: Array<{ id: string; name: string; email: string }>
}) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized", chatId: null }
    }

    const userId = BigInt(session.user.id)

    // Generate unique shareable ID
    const shareableId = randomUUID()

    // Create chat with temporary topic
    const chat = await prisma.assistantUserChat.create({
      data: {
        userId,
        assistantId: data.assistantId ? BigInt(data.assistantId) : null,
        chatType: data.mode === "ask-b" ? "ASK_B" : "ASSISTANT",
        topic: "Untitled", // Temporary topic (updated by AI in background)
        shareableId,
      }
    })

    // Prepare documents data - store attachments, mentioned users, and options
    let documentsJson: string | null = null

    if (data.attachments || data.mentionedUsers || data.webSearch || data.research || data.chatWithAPI || data.dropbox || data.artifact) {
      const documentsData: any = {}

      if (data.attachments && data.attachments.length > 0) {
        documentsData.attachments = data.attachments
        console.log(`[createChatWithMessage] Storing ${data.attachments.length} attachment(s) with S3 URLs in database`)
      }

      if (data.mentionedUsers && data.mentionedUsers.length > 0) {
        documentsData.mentionedUsers = data.mentionedUsers
        console.log(`[createChatWithMessage] Message mentions ${data.mentionedUsers.length} user(s):`, data.mentionedUsers.map(u => `${u.name} (${u.email})`).join(", "))
      }

      // Store options for auto-streaming
      if (data.webSearch || data.research || data.chatWithAPI || data.dropbox || data.artifact) {
        documentsData.options = {
          webSearch: data.webSearch || false,
          research: data.research || false,
          chatWithAPI: data.chatWithAPI || false,
          dropbox: data.dropbox || false,
          artifact: data.artifact || null
        }
        console.log(`[createChatWithMessage] Storing message options:`, documentsData.options)
      }

      documentsJson = JSON.stringify(documentsData)
    }

    // Save first user message
    await prisma.assistantUserChatMessage.create({
      data: {
        assistantUserChatId: chat.id,
        role: "user",
        message: data.firstMessage,
        userId: userId,
        status: "PENDING", // Initially pending, will be updated to PROCESSING when AI starts
        assistantId: data.assistantId ? BigInt(data.assistantId) : null,
        documents: documentsJson
      }
    })

    console.log("[createChatWithMessage] Chat created:", chat.id)

    // Trigger background topic generation (reliably in background)
    after(() => {
      generateChatTopic(chat.id.toString(), data.firstMessage).catch(err => {
        console.error("[createChatWithMessage] Topic generation failed:", err)
      })
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
      },
      options: {
        webSearch: data.webSearch || false,
        research: data.research || false,
        chatWithAPI: data.chatWithAPI || false,
        dropbox: data.dropbox || false,
        artifact: data.artifact || null,
        mentionedUsers: data.mentionedUsers || null
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
      model: "gpt-5-mini",
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

    // Validate chatId
    if (!chatId || typeof chatId !== 'string' || chatId.trim() === '') {
      return { success: false, error: "Invalid chat ID", chat: null }
    }

    const userId = BigInt(session.user.id)
    const chatIdInt = parseInt(chatId)

    // Validate parsed chatId
    if (isNaN(chatIdInt) || chatIdInt <= 0) {
      return { success: false, error: "Invalid chat ID", chat: null }
    }

    // Fetch the specific chat
    const chat = await prisma.assistantUserChat.findFirst({
      where: {
        id: chatIdInt,
        userId,
        deletedAt: null
      },
      select: {
        id: true,
        topic: true,
        chatType: true,
        assistantId: true,
        shareableId: true,
        createdAt: true,
        updatedAt: true,
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
        shareableId: chat.shareableId,
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
                paymentRecord: {
                  status: "completed"
                }
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
export async function getChatMessages(chatId: string, limit?: number) {
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
      take: limit || 1000, // Default to 1000 messages
      select: {
        id: true,
        role: true,
        message: true,
        documents: true,
        createdAt: true,
        status: true
      }
    })

    return {
      success: true,
      messages: messages.map(msg => {
        // Parse attachments from documents (JSON string)
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

            // Handle new structure: { attachments: [...], mentionedUsers: [...] }
            if (documents && typeof documents === 'object' && !Array.isArray(documents)) {
              // New structure with attachments property
              if (Array.isArray(documents.attachments)) {
                documents.attachments.forEach((doc: any) => {
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
            } else if (Array.isArray(documents)) {
              // Legacy structure: direct array of attachments (for backward compatibility)
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

        return {
          id: msg.id.toString(),
          role: msg.role as "user" | "assistant" | "system",
          content: msg.message || "",
          createdAt: msg.createdAt,
          attachments: attachments.length > 0 ? attachments : undefined,
          status: msg.status,
          documents: msg.documents // Include raw documents field for options parsing
        }
      })
    }
  } catch (error) {
    console.error("[getChatMessages] Error:", error)
    return { success: false, error: "Failed to fetch messages", messages: [] }
  }
}

/**
 * Cleanup orphaned user messages (messages without assistant responses)
 * This is useful when streaming was interrupted (e.g., user reloaded page)
 * 
 * @param chatId - The chat ID to clean up
 * @param gracePeriodMinutes - Don't delete messages newer than this (default: 2 minutes)
 */
export async function cleanupChat(chatId: string, gracePeriodMinutes?: number) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized", deleted: 0 }
    }

    const result = await cleanupOrphanedMessages(chatId, gracePeriodMinutes)
    return { success: true, deleted: result.deleted }
  } catch (error) {
    console.error("[cleanupChat] Error:", error)
    return { success: false, error: String(error), deleted: 0 }
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
  chatWithAPI?: boolean
  dropbox?: boolean
  artifact?: {
    id: string
    name: string
    instructions: string
    htmlContent: string
  }
  mentionedUsers?: Array<{ id: string; name: string; email: string }>
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

    // Prepare documents data - store attachments, mentioned users, and options
    let documentsJson: string | null = null

    if (data.attachments || data.mentionedUsers || data.webSearch || data.research || data.chatWithAPI || data.dropbox || data.artifact) {
      const documentsData: any = {}

      if (data.attachments && data.attachments.length > 0) {
        documentsData.attachments = data.attachments
        console.log(`[sendChatMessage] Storing ${data.attachments.length} attachment(s) with S3 URLs in database`)
      }

      if (data.mentionedUsers && data.mentionedUsers.length > 0) {
        documentsData.mentionedUsers = data.mentionedUsers
        console.log(`[sendChatMessage] Message mentions ${data.mentionedUsers.length} user(s):`, data.mentionedUsers.map(u => `${u.name} (${u.email})`).join(", "))
      }

      // Store options for auto-streaming
      if (data.webSearch || data.research || data.chatWithAPI || data.dropbox || data.artifact) {
        documentsData.options = {
          webSearch: data.webSearch || false,
          research: data.research || false,
          chatWithAPI: data.chatWithAPI || false,
          dropbox: data.dropbox || false,
          artifact: data.artifact || null
        }
        console.log(`[sendChatMessage] Storing message options:`, documentsData.options)
      }

      documentsJson = JSON.stringify(documentsData)
    }

    // Save user message immediately with PENDING status
    const userMessage = await prisma.assistantUserChatMessage.create({
      data: {
        assistantUserChatId: chatIdInt,
        role: "user",
        message: data.content,
        userId: userId,
        assistantId: chat.assistantId,
        documents: documentsJson,
        status: "PENDING" // Initially pending, will be updated to PROCESSING when AI starts
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