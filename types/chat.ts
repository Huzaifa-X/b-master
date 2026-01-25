// types/chat.ts

export enum ChatType {
    ASSISTANT = "ASSISTANT",
    ASK_B = "ASK_B",
}

export interface Message {
    id: string
    role: "user" | "assistant" | "system"
    content: string
    createdAt: Date
    isStreaming?: boolean
    reasoning?: string
    parts?: any[]
    status?: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED"
    attachments?: {
        name: string
        url: string
        type: string
        size: number
    }[]
    documents?: string | null // Raw documents JSON string for accessing options
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

// types/chat.ts
import { type InferUITools, type UIDataTypes, type UIMessage as SDKUIMessage } from 'ai'

// Define your tools type (matching backend)
export type ChatTools = InferUITools<{
    create_stripe_connect_invoice: any
    image_generation: any
    update_artifact: any
    // Add API tools types here if needed
}>

// Define your custom message type
export type ChatMessage = SDKUIMessage<never, UIDataTypes, ChatTools>