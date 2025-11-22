// types/chat.ts

export enum ChatType {
    ASSISTANT = "ASSISTANT",
    ASK_B = "ASK_B",
}

export interface Message {
    id: string
    role: "user" | "assistant"
    content: string
    createdAt: Date
    isStreaming?: boolean
    attachments?: {
        name: string
        url: string
        type: string
        size: number
    }[]
}

export interface Chat {
    id: string
    topic: string
    chatType: ChatType
    assistantId: string | null
    assistantName?: string
    lastMessage: string | null
    lastMessageAt: Date
    createdAt: Date
    updatedAt: Date
}

export interface ChatContext {
    chatId: string
    chatType: ChatType
    assistantId: string | null
    assistantName: string
    assistantInstructions: string | null
}

export type ChatMode = "assistant" | "ask-b"

export interface ChatHistoryItem {
    id: string
    topic: string
    lastMessage: string | null
    lastMessageAt: Date
    createdAt: Date
    timestamp: string // Formatted for display
}