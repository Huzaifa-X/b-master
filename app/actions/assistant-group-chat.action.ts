'use server'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import Pusher from 'pusher'

// Initialize Pusher (same config as 1-on-1 chat)
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

async function checkGroupChatAccess(groupChatId: number, userId: bigint): Promise<boolean> {
    const member = await prisma.assistantGroupChatMember.findFirst({
        where: {
            groupChatId,
            userId,
            leftAt: null,
            groupChat: { isActive: true }
        }
    })
    return !!member
}

async function checkGroupChatAdmin(groupChatId: number, userId: bigint): Promise<boolean> {
    const member = await prisma.assistantGroupChatMember.findFirst({
        where: {
            groupChatId,
            userId,
            role: 'admin',
            leftAt: null
        }
    })
    return !!member
}

function serializeMessage(message: any) {
    return {
        ...message,
        id: message.id.toString(),
        groupChatId: message.groupChatId.toString(),
        assistantId: message.assistantId.toString(),
        senderId: message.senderId.toString(),
        attachmentSize: message.attachmentSize?.toString() || null,
        sender: message.sender
            ? {
                  ...message.sender,
                  id: message.sender.id.toString()
              }
            : null
    }
}

function serializeGroup(group: any) {
    return {
        ...group,
        id: group.id.toString(),
        assistantId: group.assistantId.toString(),
        createdById: group.createdById.toString(),
        lastMessageId: group.lastMessageId?.toString() || null,
        members: group.members?.map((m: any) => ({
            ...m,
            id: m.id.toString(),
            groupChatId: m.groupChatId.toString(),
            userId: m.userId.toString(),
            user: m.user
                ? {
                      ...m.user,
                      id: m.user.id.toString()
                  }
                : null
        })) ?? [],
        createdBy: group.createdBy
            ? { ...group.createdBy, id: group.createdBy.id.toString() }
            : null,
        lastMessage: group.lastMessage
            ? serializeMessage(group.lastMessage)
            : null
    }
}

// ================================================================
// CREATE GROUP CHAT
// ================================================================

export async function createGroupChat(data: {
    assistantId: string
    name: string
    description?: string
    memberIds: string[]
}) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return { success: false, error: 'Authentication required' }
        }

        const userId = BigInt(session.user.id)
        const assistantId = BigInt(data.assistantId)

        // Ensure at least 2 other members
        const uniqueMemberIds = [...new Set(data.memberIds.filter(id => id !== session.user.id))]
        if (uniqueMemberIds.length < 1) {
            return { success: false, error: 'A group chat requires at least one other member' }
        }

        const group = await prisma.assistantGroupChat.create({
            data: {
                assistantId,
                name: data.name.trim(),
                description: data.description?.trim() || null,
                createdById: userId,
                members: {
                    create: [
                        // Creator is admin
                        { userId, role: 'admin' },
                        // All other members
                        ...uniqueMemberIds.map(memberId => ({
                            userId: BigInt(memberId),
                            role: 'member' as const
                        }))
                    ]
                }
            },
            include: {
                members: {
                    include: {
                        user: {
                            select: { id: true, name: true, email: true, image: true }
                        }
                    }
                },
                createdBy: {
                    select: { id: true, name: true, email: true, image: true }
                }
            }
        })

        revalidatePath(`/assistants/${data.assistantId}/messenger`)

        return { success: true, group: serializeGroup(group) }
    } catch (error) {
        console.error('Error creating group chat:', error)
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to create group chat'
        }
    }
}

// ================================================================
// GET GROUP CHATS FOR USER
// ================================================================

export async function getGroupChats(assistantId: string) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return { success: false, error: 'Authentication required' }
        }

        const userId = BigInt(session.user.id)
        const assistantIdBigInt = BigInt(assistantId)

        const groups = await prisma.assistantGroupChat.findMany({
            where: {
                assistantId: assistantIdBigInt,
                isActive: true,
                members: {
                    some: {
                        userId,
                        leftAt: null
                    }
                }
            },
            include: {
                members: {
                    where: { leftAt: null },
                    include: {
                        user: {
                            select: { id: true, name: true, email: true, image: true }
                        }
                    }
                },
                createdBy: {
                    select: { id: true, name: true, email: true, image: true }
                }
            },
            orderBy: [
                { lastMessageAt: 'desc' },
                { createdAt: 'desc' }
            ]
        })

        return {
            success: true,
            groups: groups.map(serializeGroup)
        }
    } catch (error) {
        console.error('Error fetching group chats:', error)
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to fetch group chats'
        }
    }
}

// ================================================================
// GET GROUP CHAT MESSAGES (paginated)
// ================================================================

export async function getGroupChatMessages(data: {
    assistantId: string
    groupChatId: string
    page?: number
    limit?: number
}) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return { success: false, error: 'Authentication required' }
        }

        const userId = BigInt(session.user.id)
        const groupChatId = Number(data.groupChatId)
        const limit = data.limit || 50
        const page = data.page || 1
        const skip = (page - 1) * limit

        const hasAccess = await checkGroupChatAccess(groupChatId, userId)
        if (!hasAccess) {
            return { success: false, error: 'You do not have access to this group' }
        }

        const [messages, total] = await Promise.all([
            prisma.assistantGroupChatMessage.findMany({
                where: {
                    groupChatId,
                    deletedAt: null
                },
                include: {
                    sender: {
                        select: { id: true, name: true, email: true, image: true }
                    }
                },
                orderBy: { createdAt: 'desc' },
                take: limit,
                skip
            }),
            prisma.assistantGroupChatMessage.count({
                where: { groupChatId, deletedAt: null }
            })
        ])

        return {
            success: true,
            messages: messages.map(serializeMessage),
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
                hasMore: skip + messages.length < total
            }
        }
    } catch (error) {
        console.error('Error fetching group messages:', error)
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to fetch messages'
        }
    }
}

// ================================================================
// SEND GROUP MESSAGE
// ================================================================

export async function sendGroupChatMessage(data: {
    assistantId: string
    groupChatId: string
    message: string
    messageType?: 'text' | 'image' | 'file' | 'audio' | 'video' | 'url'
    attachmentUrl?: string
    attachmentName?: string
    attachmentSize?: number
}) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return { success: false, error: 'Authentication required' }
        }

        const userId = BigInt(session.user.id)
        const assistantId = BigInt(data.assistantId)
        const groupChatId = Number(data.groupChatId)

        const hasAccess = await checkGroupChatAccess(groupChatId, userId)
        if (!hasAccess) {
            return { success: false, error: 'You do not have access to this group' }
        }

        const message = await prisma.assistantGroupChatMessage.create({
            data: {
                groupChatId,
                assistantId,
                senderId: userId,
                message: data.message,
                messageType: data.messageType || 'text',
                attachmentUrl: data.attachmentUrl,
                attachmentName: data.attachmentName,
                attachmentSize: data.attachmentSize ? BigInt(data.attachmentSize) : null
            },
            include: {
                sender: {
                    select: { id: true, name: true, email: true, image: true }
                }
            }
        })

        // Update group's last message
        await prisma.assistantGroupChat.update({
            where: { id: groupChatId },
            data: {
                lastMessageAt: new Date(),
                lastMessageId: message.id
            }
        })

        const serialized = serializeMessage(message)

        // Trigger Pusher on the SAME channel as 1-on-1 chat so the same subscription handles it
        try {
            await pusher.trigger('global-assistant-chat', 'new-group-message', {
                message: serialized,
                groupChatId: groupChatId.toString(),
                assistantId: data.assistantId,
                timestamp: new Date().toISOString()
            })
        } catch (pusherError) {
            console.error('Pusher error:', pusherError)
        }

        // Send notifications to all other group members
        try {
            const notificationService = (await import('@/lib/services/notifactionService')).default
            const members = await prisma.assistantGroupChatMember.findMany({
                where: { groupChatId, leftAt: null, userId: { not: userId } }
            })

            const group = await prisma.assistantGroupChat.findUnique({
                where: { id: groupChatId },
                select: { name: true }
            })

            let notificationMessage = data.message
            if (data.messageType === 'image') notificationMessage = '📷 Sent an image'
            else if (data.messageType === 'file') notificationMessage = `📎 Sent a file: ${data.attachmentName || 'file'}`
            else if (data.messageType === 'audio') notificationMessage = '🎵 Sent an audio message'
            else if (data.messageType === 'video') notificationMessage = '🎥 Sent a video'
            else if (data.messageType === 'url') notificationMessage = `🔗 Shared a link: ${data.attachmentUrl || data.message}`

            await Promise.allSettled(
                members.map(m =>
                    notificationService.createNotification({
                        userId: m.userId.toString(),
                        title: `💬 ${message.sender.name || 'Someone'} in ${group?.name || 'Group'}`,
                        message: notificationMessage.length > 100
                            ? notificationMessage.substring(0, 100) + '...'
                            : notificationMessage,
                        type: 'group_message',
                        relatedId: groupChatId.toString(),
                        relatedType: 'group_chat',
                        data: {
                            groupChatId: groupChatId.toString(),
                            messageId: message.id.toString(),
                            senderId: userId.toString(),
                            senderName: message.sender.name,
                            assistantId: data.assistantId,
                            messageType: data.messageType || 'text'
                        }
                    })
                )
            )
        } catch (notifError) {
            console.error('[GroupChat] Failed to send notifications:', notifError)
        }

        revalidatePath(`/assistants/${data.assistantId}/messenger`)

        return { success: true, message: serialized }
    } catch (error) {
        console.error('Error sending group message:', error)
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to send message'
        }
    }
}

// ================================================================
// ADD GROUP MEMBER
// ================================================================

export async function addGroupChatMember(data: {
    assistantId: string
    groupChatId: string
    userId: string
}) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return { success: false, error: 'Authentication required' }
        }

        const currentUserId = BigInt(session.user.id)
        const groupChatId = Number(data.groupChatId)
        const newUserId = BigInt(data.userId)

        const isAdmin = await checkGroupChatAdmin(groupChatId, currentUserId)
        if (!isAdmin) {
            return { success: false, error: 'Only admins can add members' }
        }

        // Upsert: re-add if they had left
        const member = await prisma.assistantGroupChatMember.upsert({
            where: { groupChatId_userId: { groupChatId, userId: newUserId } },
            create: { groupChatId, userId: newUserId, role: 'member' },
            update: { leftAt: null, role: 'member' },
            include: {
                user: { select: { id: true, name: true, email: true, image: true } }
            }
        })

        revalidatePath(`/assistants/${data.assistantId}/messenger`)

        return {
            success: true,
            member: {
                ...member,
                id: member.id.toString(),
                groupChatId: member.groupChatId.toString(),
                userId: member.userId.toString(),
                user: { ...member.user, id: member.user.id.toString() }
            }
        }
    } catch (error) {
        console.error('Error adding group member:', error)
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to add member'
        }
    }
}

// ================================================================
// REMOVE GROUP MEMBER
// ================================================================

export async function removeGroupChatMember(data: {
    assistantId: string
    groupChatId: string
    userId: string
}) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return { success: false, error: 'Authentication required' }
        }

        const currentUserId = BigInt(session.user.id)
        const groupChatId = Number(data.groupChatId)
        const targetUserId = BigInt(data.userId)

        // Allow admins to remove others, or members to remove themselves (leave)
        const isSelf = currentUserId === targetUserId
        if (!isSelf) {
            const isAdmin = await checkGroupChatAdmin(groupChatId, currentUserId)
            if (!isAdmin) {
                return { success: false, error: 'Only admins can remove members' }
            }
        }

        await prisma.assistantGroupChatMember.update({
            where: { groupChatId_userId: { groupChatId, userId: targetUserId } },
            data: { leftAt: new Date() }
        })

        revalidatePath(`/assistants/${data.assistantId}/messenger`)

        return { success: true }
    } catch (error) {
        console.error('Error removing group member:', error)
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to remove member'
        }
    }
}

// ================================================================
// UPDATE GROUP CHAT (name / description)
// ================================================================

export async function updateGroupChat(data: {
    assistantId: string
    groupChatId: string
    name?: string
    description?: string
}) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return { success: false, error: 'Authentication required' }
        }

        const currentUserId = BigInt(session.user.id)
        const groupChatId = Number(data.groupChatId)

        const isAdmin = await checkGroupChatAdmin(groupChatId, currentUserId)
        if (!isAdmin) {
            return { success: false, error: 'Only admins can update group settings' }
        }

        const updated = await prisma.assistantGroupChat.update({
            where: { id: groupChatId },
            data: {
                ...(data.name ? { name: data.name.trim() } : {}),
                ...(data.description !== undefined ? { description: data.description.trim() || null } : {})
            },
            include: {
                members: {
                    where: { leftAt: null },
                    include: {
                        user: { select: { id: true, name: true, email: true, image: true } }
                    }
                },
                createdBy: { select: { id: true, name: true, email: true, image: true } }
            }
        })

        revalidatePath(`/assistants/${data.assistantId}/messenger`)

        return { success: true, group: serializeGroup(updated) }
    } catch (error) {
        console.error('Error updating group chat:', error)
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to update group'
        }
    }
}

// ================================================================
// DEACTIVATE (delete) GROUP CHAT
// ================================================================

export async function deactivateGroupChat(data: {
    assistantId: string
    groupChatId: string
}) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return { success: false, error: 'Authentication required' }
        }

        const currentUserId = BigInt(session.user.id)
        const groupChatId = Number(data.groupChatId)

        const isAdmin = await checkGroupChatAdmin(groupChatId, currentUserId)
        if (!isAdmin) {
            return { success: false, error: 'Only admins can delete the group' }
        }

        await prisma.assistantGroupChat.update({
            where: { id: groupChatId },
            data: { isActive: false }
        })

        revalidatePath(`/assistants/${data.assistantId}/messenger`)

        return { success: true }
    } catch (error) {
        console.error('Error deactivating group chat:', error)
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to delete group'
        }
    }
}
