export interface AssistantChat {
    id: string
    assistantId: string
    initiatorId: string
    participantId: string
    isActive: boolean
    lastMessageAt: Date | null
    lastMessageId: string | null
    createdAt: Date
    updatedAt: Date
    deletedAt: Date | null
    initiator: ChatUser
    participant: ChatUser
    lastMessage: ChatMessage | null
    unreadCount?: number
}

export interface ChatUser {
    id: string
    name: string | null
    email: string
    image: string | null
}

export interface ChatMessage {
    id: string
    assistantChatId: string
    assistantId: string
    senderId: string
    message: string
    messageType: 'text' | 'image' | 'file' | 'audio' | 'video'
    attachmentUrl: string | null
    attachmentName: string | null
    attachmentSize: string | null
    isRead: boolean
    readAt: Date | null
    createdAt: Date
    updatedAt: Date
    deletedAt: Date | null
    sender: ChatUser
}

export interface InitiateChatData {
    assistantId: string
    participantId: string
}

export interface SendMessageData {
    assistantId: string
    chatId: string
    message: string
    messageType?: 'text' | 'image' | 'file' | 'audio' | 'video'
    attachmentUrl?: string
    attachmentName?: string
    attachmentSize?: number
}

export interface GetUserChatsData {
    assistantId: string
    page?: number
    limit?: number
}

export interface GetChatMessagesData {
    assistantId: string
    chatId: string
    page?: number
    limit?: number
}

export interface MarkAsReadData {
    assistantId: string
    chatId: string
}

export interface UpdateMessageData {
    messageId: string
    message: string
}

export interface DeactivateChatData {
    assistantId: string
    chatId: string
}

export interface PusherConfig {
    key: string
    cluster: string
}

export interface PaginationInfo {
    page: number
    limit: number
    totalCount: number
    totalPages: number
    hasMore: boolean
}