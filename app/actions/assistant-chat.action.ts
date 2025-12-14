'use server'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import Pusher from 'pusher'

// Initialize Pusher
const pusher = new Pusher({
    appId: process.env.PUSHER_APP_ID!,
    key: process.env.PUSHER_KEY!,
    secret: process.env.PUSHER_SECRET!,
    cluster: process.env.PUSHER_CLUSTER!,
    useTLS: true
})

// ================================================================
// HELPER FUNCTIONS
// ================================================================

async function checkChatAccess(chatId: bigint, userId: bigint): Promise<boolean> {
    const chat = await prisma.assistantChat.findFirst({
        where: {
            id: Number(chatId),
            isActive: true,
            OR: [
                { initiatorId: userId },
                { participantId: userId }
            ]
        }
    })
    return !!chat
}

async function getOrCreateChat(assistantId: bigint, initiatorId: bigint, participantId: bigint) {
    // Check if chat exists (in either direction)
    let chat = await prisma.assistantChat.findFirst({
        where: {
            assistantId,
            OR: [
                {
                    initiatorId: initiatorId,
                    participantId: participantId
                },
                {
                    initiatorId: participantId,
                    participantId: initiatorId
                }
            ]
        },
        include: {
            initiator: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                    image: true
                }
            },
            participant: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                    image: true
                }
            }
        }
    })

    if (chat) {
        // Reactivate if deactivated
        if (!chat.isActive) {
            chat = await prisma.assistantChat.update({
                where: { id: chat.id },
                data: { isActive: true },
                include: {
                    initiator: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            image: true
                        }
                    },
                    participant: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            image: true
                        }
                    }
                }
            })
        }
        return chat
    }

    // Create new chat
    return await prisma.assistantChat.create({
        data: {
            assistantId,
            initiatorId,
            participantId,
            isActive: true
        },
        include: {
            initiator: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                    image: true
                }
            },
            participant: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                    image: true
                }
            }
        }
    })
}

async function getLastMessage(chatId: number, lastMessageId: bigint | null) {
    if (!lastMessageId) return null
    
    const message = await prisma.assistantChatMessage.findUnique({
        where: { id: lastMessageId },
        include: {
            sender: {
                select: {
                    id: true,
                    name: true,
                    image: true
                }
            }
        }
    })
    
    return message
}

// ================================================================
// INITIATE OR GET CHAT
// ================================================================

export async function initiateChat(data: {
    assistantId: string
    participantId: string
}) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return {
                success: false,
                error: 'Authentication required'
            }
        }

        const userId = BigInt(session.user.id)
        const assistantId = BigInt(data.assistantId)
        const participantId = BigInt(data.participantId)

        // Check if users are trying to chat with themselves
        if (userId === participantId) {
            return {
                success: false,
                error: 'Cannot chat with yourself'
            }
        }

        // Verify assistant exists
        const assistant = await prisma.assistant.findUnique({
            where: { id: assistantId }
        })

        if (!assistant) {
            return {
                success: false,
                error: 'Assistant not found'
            }
        }

        // Verify participant exists
        const participant = await prisma.user.findUnique({
            where: { id: participantId }
        })

        if (!participant) {
            return {
                success: false,
                error: 'Participant not found'
            }
        }

        // Get or create chat
        const chat = await getOrCreateChat(assistantId, userId, participantId)
        
        // Fetch last message if exists
        const lastMessage = await getLastMessage(chat.id, chat.lastMessageId)

        return {
            success: true,
            chat: {
                ...chat,
                id: chat.id.toString(),
                assistantId: chat.assistantId.toString(),
                initiatorId: chat.initiatorId.toString(),
                participantId: chat.participantId.toString(),
                lastMessageId: chat.lastMessageId?.toString() || null,
                initiator: {
                    ...chat.initiator,
                    id: chat.initiator.id.toString()
                },
                participant: {
                    ...chat.participant,
                    id: chat.participant.id.toString()
                },
                lastMessage: lastMessage ? {
                    ...lastMessage,
                    id: lastMessage.id.toString(),
                    assistantChatId: lastMessage.assistantChatId.toString(),
                    assistantId: lastMessage.assistantId.toString(),
                    senderId: lastMessage.senderId.toString(),
                    attachmentSize: lastMessage.attachmentSize?.toString() || null,
                    sender: {
                        ...lastMessage.sender,
                        id: lastMessage.sender.id.toString()
                    }
                } : null
            }
        }
    } catch (error) {
        console.error('Error initiating chat:', error)
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to initiate chat'
        }
    }
}

// ================================================================
// GET USER CHATS
// ================================================================

export async function getUserChats(data: {
    assistantId: string
    page?: number
    limit?: number
}) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return {
                success: false,
                error: 'Authentication required'
            }
        }

        const userId = BigInt(session.user.id)
        const assistantId = BigInt(data.assistantId)
        const page = data.page || 1
        const limit = data.limit || 20
        const skip = (page - 1) * limit

        const [chats, totalCount] = await Promise.all([
            prisma.assistantChat.findMany({
                where: {
                    assistantId,
                    isActive: true,
                    OR: [
                        { initiatorId: userId },
                        { participantId: userId }
                    ]
                },
                include: {
                    initiator: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            image: true
                        }
                    },
                    participant: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            image: true
                        }
                    },
                    messages: {
                        where: {
                            isRead: false,
                            senderId: { not: userId }
                        },
                        select: { id: true }
                    }
                },
                orderBy: {
                    lastMessageAt: 'desc'
                },
                skip,
                take: limit
            }),
            prisma.assistantChat.count({
                where: {
                    assistantId,
                    isActive: true,
                    OR: [
                        { initiatorId: userId },
                        { participantId: userId }
                    ]
                }
            })
        ])

        // Fetch last messages for all chats
        const lastMessageIds = chats
            .filter(chat => chat.lastMessageId)
            .map(chat => chat.lastMessageId!)
        
        const lastMessages = lastMessageIds.length > 0
            ? await prisma.assistantChatMessage.findMany({
                where: { id: { in: lastMessageIds } },
                include: {
                    sender: {
                        select: {
                            id: true,
                            name: true,
                            image: true
                        }
                    }
                }
            })
            : []
        
        const lastMessageMap = new Map(
            lastMessages.map(msg => [msg.id.toString(), msg])
        )

        const formattedChats = chats.map(chat => {
            const lastMessage = chat.lastMessageId 
                ? lastMessageMap.get(chat.lastMessageId.toString())
                : null
            
            return {
                ...chat,
                id: chat.id.toString(),
                assistantId: chat.assistantId.toString(),
                initiatorId: chat.initiatorId.toString(),
                participantId: chat.participantId.toString(),
                lastMessageId: chat.lastMessageId?.toString() || null,
                initiator: {
                    ...chat.initiator,
                    id: chat.initiator.id.toString()
                },
                participant: {
                    ...chat.participant,
                    id: chat.participant.id.toString()
                },
                lastMessage: lastMessage ? {
                    ...lastMessage,
                    id: lastMessage.id.toString(),
                    assistantChatId: lastMessage.assistantChatId.toString(),
                    assistantId: lastMessage.assistantId.toString(),
                    senderId: lastMessage.senderId.toString(),
                    attachmentSize: lastMessage.attachmentSize?.toString() || null,
                    sender: {
                        ...lastMessage.sender,
                        id: lastMessage.sender.id.toString()
                    }
                } : null,
                unreadCount: chat.messages.length,
                messages: undefined
            }
        })

        return {
            success: true,
            chats: formattedChats,
            pagination: {
                page,
                limit,
                totalCount,
                totalPages: Math.ceil(totalCount / limit),
                hasMore: page * limit < totalCount
            }
        }
    } catch (error) {
        console.error('Error fetching user chats:', error)
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to fetch chats'
        }
    }
}

// ================================================================
// GET CHAT MESSAGES
// ================================================================

export async function getChatMessages(data: {
    assistantId: string
    chatId: string
    page?: number
    limit?: number
}) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return {
                success: false,
                error: 'Authentication required'
            }
        }

        const userId = BigInt(session.user.id)
        const chatId = Number(data.chatId)

        // Verify user has access to this chat
        const hasAccess = await checkChatAccess(BigInt(chatId), userId)
        if (!hasAccess) {
            return {
                success: false,
                error: 'You do not have access to this chat'
            }
        }

        const page = data.page || 1
        const limit = data.limit || 50
        const skip = (page - 1) * limit

        const [messages, totalCount] = await Promise.all([
            prisma.assistantChatMessage.findMany({
                where: {
                    assistantChatId: chatId,
                    deletedAt: null
                },
                include: {
                    sender: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            image: true
                        }
                    }
                },
                orderBy: {
                    createdAt: 'desc'
                },
                skip,
                take: limit
            }),
            prisma.assistantChatMessage.count({
                where: {
                    assistantChatId: chatId,
                    deletedAt: null
                }
            })
        ])

        const formattedMessages = messages.map(message => ({
            ...message,
            id: message.id.toString(),
            assistantChatId: message.assistantChatId.toString(),
            assistantId: message.assistantId.toString(),
            senderId: message.senderId.toString(),
            attachmentSize: message.attachmentSize?.toString() || null,
            sender: {
                ...message.sender,
                id: message.sender.id.toString()
            }
        }))

        return {
            success: true,
            messages: formattedMessages,
            pagination: {
                page,
                limit,
                totalCount,
                totalPages: Math.ceil(totalCount / limit),
                hasMore: page * limit < totalCount
            }
        }
    } catch (error) {
        console.error('Error fetching chat messages:', error)
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to fetch messages'
        }
    }
}

// ================================================================
// SEND MESSAGE
// ================================================================

export async function sendChatMessage(data: {
    assistantId: string
    chatId: string
    message: string
    messageType?: 'text' | 'image' | 'file' | 'audio' | 'video'
    attachmentUrl?: string
    attachmentName?: string
    attachmentSize?: number
}) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return {
                success: false,
                error: 'Authentication required'
            }
        }

        const userId = BigInt(session.user.id)
        const assistantId = BigInt(data.assistantId)
        const chatId = Number(data.chatId)

        // Verify user has access to this chat
        const hasAccess = await checkChatAccess(BigInt(chatId), userId)
        if (!hasAccess) {
            return {
                success: false,
                error: 'You do not have access to this chat'
            }
        }

        // Create message
        const message = await prisma.assistantChatMessage.create({
            data: {
                assistantChatId: chatId,
                assistantId: assistantId,
                senderId: userId,
                message: data.message,
                messageType: data.messageType || 'text',
                attachmentUrl: data.attachmentUrl,
                attachmentName: data.attachmentName,
                attachmentSize: data.attachmentSize ? BigInt(data.attachmentSize) : null
            },
            include: {
                sender: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        image: true
                    }
                }
            }
        })

        // Update chat's last message
        await prisma.assistantChat.update({
            where: { id: chatId },
            data: {
                lastMessageAt: new Date(),
                lastMessageId: message.id
            }
        })

        // Get chat details to find recipient
        const chat = await prisma.assistantChat.findUnique({
            where: { id: chatId },
            include: {
                initiator: {
                    select: {
                        id: true,
                        name: true
                    }
                },
                participant: {
                    select: {
                        id: true,
                        name: true
                    }
                }
            }
        })

        // Determine recipient (the other user in the chat)
        const recipientId = chat?.initiatorId === userId 
            ? chat?.participantId 
            : chat?.initiatorId
        
        const recipient = chat?.initiatorId === userId
            ? chat?.participant
            : chat?.initiator

        // Send real-time message via Pusher
        try {
            await pusher.trigger('global-assistant-chat', 'new-message', {
                message: {
                    ...message,
                    id: message.id.toString(),
                    assistantChatId: message.assistantChatId.toString(),
                    assistantId: message.assistantId.toString(),
                    senderId: message.senderId.toString(),
                    attachmentSize: message.attachmentSize?.toString() || null,
                    sender: {
                        ...message.sender,
                        id: message.sender.id.toString()
                    }
                },
                chatId: chatId.toString(),
                assistantId: assistantId.toString(),
                timestamp: new Date().toISOString()
            })
        } catch (pusherError) {
            console.error('Pusher error:', pusherError)
            // Don't fail the request if Pusher fails
        }

        // Send notification to recipient
        if (recipientId && recipient) {
            try {
                const notificationService = (await import('@/lib/services/notifactionService')).default
                
                // Create notification message based on message type
                let notificationMessage = message.message
                if (data.messageType === 'image') {
                    notificationMessage = '📷 Sent an image'
                } else if (data.messageType === 'file') {
                    notificationMessage = `📎 Sent a file: ${data.attachmentName || 'file'}`
                } else if (data.messageType === 'audio') {
                    notificationMessage = '🎵 Sent an audio message'
                } else if (data.messageType === 'video') {
                    notificationMessage = '🎥 Sent a video'
                }

                await notificationService.createNotification({
                    userId: recipientId.toString(),
                    title: `💬 New message from ${message.sender.name || 'Someone'}`,
                    message: notificationMessage.length > 100 
                        ? notificationMessage.substring(0, 100) + '...' 
                        : notificationMessage,
                    type: 'chat_message',
                    relatedId: chatId.toString(),
                    relatedType: 'chat',
                    data: {
                        chatId: chatId.toString(),
                        messageId: message.id.toString(),
                        senderId: userId.toString(),
                        senderName: message.sender.name,
                        assistantId: assistantId.toString(),
                        messageType: data.messageType || 'text',
                        attachmentUrl: data.attachmentUrl
                    }
                })
                console.log(`[Chat] Notification sent to user: ${recipient.name}`)
            } catch (notificationError) {
                console.error('[Chat] Failed to send notification:', notificationError)
                // Don't fail the message send if notification fails
            }
        }

        revalidatePath(`/assistants/${data.assistantId}/messenger`)

        return {
            success: true,
            message: {
                ...message,
                id: message.id.toString(),
                assistantChatId: message.assistantChatId.toString(),
                assistantId: message.assistantId.toString(),
                senderId: message.senderId.toString(),
                attachmentSize: message.attachmentSize?.toString() || null,
                sender: {
                    ...message.sender,
                    id: message.sender.id.toString()
                }
            }
        }
    } catch (error) {
        console.error('Error sending message:', error)
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to send message'
        }
    }
}

// ================================================================
// MARK MESSAGES AS READ
// ================================================================

export async function markMessagesAsRead(data: {
    assistantId: string
    chatId: string
}) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return {
                success: false,
                error: 'Authentication required'
            }
        }

        const userId = BigInt(session.user.id)
        const chatId = Number(data.chatId)

        // Verify user has access
        const hasAccess = await checkChatAccess(BigInt(chatId), userId)
        if (!hasAccess) {
            return {
                success: false,
                error: 'You do not have access to this chat'
            }
        }

        // Mark all unread messages from other users as read
        const result = await prisma.assistantChatMessage.updateMany({
            where: {
                assistantChatId: chatId,
                senderId: { not: userId },
                isRead: false
            },
            data: {
                isRead: true,
                readAt: new Date()
            }
        })

        revalidatePath(`/assistants/${data.assistantId}/messenger`)

        return {
            success: true,
            updatedCount: result.count
        }
    } catch (error) {
        console.error('Error marking messages as read:', error)
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to mark messages as read'
        }
    }
}

// ================================================================
// GET UNREAD COUNT
// ================================================================

export async function getUnreadMessageCount(assistantId: string) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return {
                success: false,
                error: 'Authentication required'
            }
        }

        const userId = BigInt(session.user.id)
        const assistantIdBigInt = BigInt(assistantId)

        // Get all chats for this user in this assistant
        const chats = await prisma.assistantChat.findMany({
            where: {
                assistantId: assistantIdBigInt,
                isActive: true,
                OR: [
                    { initiatorId: userId },
                    { participantId: userId }
                ]
            },
            select: { id: true }
        })

        const chatIds = chats.map(chat => chat.id)

        // Count unread messages
        const unreadCount = await prisma.assistantChatMessage.count({
            where: {
                assistantChatId: { in: chatIds },
                senderId: { not: userId },
                isRead: false
            }
        })

        return {
            success: true,
            unreadCount
        }
    } catch (error) {
        console.error('Error getting unread count:', error)
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to get unread count'
        }
    }
}

// ================================================================
// UPDATE MESSAGE
// ================================================================

export async function updateChatMessage(data: {
    messageId: string
    message: string
}) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return {
                success: false,
                error: 'Authentication required'
            }
        }

        const userId = BigInt(session.user.id)
        const messageId = BigInt(data.messageId)

        // Check if message exists and user is the sender
        const existingMessage = await prisma.assistantChatMessage.findUnique({
            where: { id: messageId }
        })

        if (!existingMessage) {
            return {
                success: false,
                error: 'Message not found'
            }
        }

        if (existingMessage.senderId !== userId) {
            return {
                success: false,
                error: 'You can only edit your own messages'
            }
        }

        // Update message
        const updatedMessage = await prisma.assistantChatMessage.update({
            where: { id: messageId },
            data: { message: data.message },
            include: {
                sender: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        image: true
                    }
                }
            }
        })

        // Send update via Pusher
        try {
            await pusher.trigger('global-assistant-chat', 'message-updated', {
                message: {
                    ...updatedMessage,
                    id: updatedMessage.id.toString(),
                    assistantChatId: updatedMessage.assistantChatId.toString(),
                    assistantId: updatedMessage.assistantId.toString(),
                    senderId: updatedMessage.senderId.toString(),
                    attachmentSize: updatedMessage.attachmentSize?.toString() || null,
                    sender: {
                        ...updatedMessage.sender,
                        id: updatedMessage.sender.id.toString()
                    }
                },
                timestamp: new Date().toISOString()
            })
        } catch (pusherError) {
            console.error('Pusher error:', pusherError)
        }

        return {
            success: true,
            message: {
                ...updatedMessage,
                id: updatedMessage.id.toString(),
                assistantChatId: updatedMessage.assistantChatId.toString(),
                assistantId: updatedMessage.assistantId.toString(),
                senderId: updatedMessage.senderId.toString(),
                attachmentSize: updatedMessage.attachmentSize?.toString() || null,
                sender: {
                    ...updatedMessage.sender,
                    id: updatedMessage.sender.id.toString()
                }
            }
        }
    } catch (error) {
        console.error('Error updating message:', error)
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to update message'
        }
    }
}

// ================================================================
// DEACTIVATE CHAT
// ================================================================

export async function deactivateChat(data: {
    assistantId: string
    chatId: string
}) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return {
                success: false,
                error: 'Authentication required'
            }
        }

        const userId = BigInt(session.user.id)
        const chatId = Number(data.chatId)

        // Verify user has access
        const hasAccess = await checkChatAccess(BigInt(chatId), userId)
        if (!hasAccess) {
            return {
                success: false,
                error: 'You do not have access to this chat'
            }
        }

        await prisma.assistantChat.update({
            where: { id: chatId },
            data: { isActive: false }
        })

        revalidatePath(`/assistants/${data.assistantId}/messenger`)

        return {
            success: true,
            message: 'Chat deactivated successfully'
        }
    } catch (error) {
        console.error('Error deactivating chat:', error)
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to deactivate chat'
        }
    }
}

// ================================================================
// GET PUSHER CONFIG
// ================================================================

export async function getPusherConfig() {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return {
                success: false,
                error: 'Authentication required'
            }
        }

        return {
            success: true,
            config: {
                key: process.env.PUSHER_KEY!,
                cluster: process.env.PUSHER_CLUSTER!
            }
        }
    } catch (error) {
        console.error('Error getting Pusher config:', error)
        return {
            success: false,
            error: 'Failed to get Pusher configuration'
        }
    }
}