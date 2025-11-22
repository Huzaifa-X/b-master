// hooks/useChatHistory.ts
"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
    getAssistantChats,
    getAskBChats,
    deleteChat,
    renameChat
} from "@/app/actions/chat.action"
import { ChatMode, ChatHistoryItem, Chat, ChatType } from "@/types/chat"
import { toast } from "sonner"

export interface UseChatHistoryOptions {
    mode: ChatMode
    assistantId?: string
}

export function useChatHistory(options: UseChatHistoryOptions) {
    const { mode, assistantId } = options
    const queryClient = useQueryClient()

    // Determine query function based on mode
    const queryFn = mode === "ask-b"
        ? getAskBChats
        : assistantId
            ? () => getAssistantChats(assistantId)
            : null

    // Load chat history
    const {
        data: chats = [],
        isLoading,
        error,
        refetch
    } = useQuery({
        queryKey: ["chat-history", mode, assistantId],
        queryFn: async () => {
            if (!queryFn) {
                // Return empty array if queryFn is not available (e.g., missing assistantId)
                return []
            }
            
            console.log("[useChatHistory] Loading chat history for", mode)
            const result = await queryFn()

            if (!result.success) {
                throw new Error(result.error || "Failed to load chat history")
            }

            // Transform to UI format
            return result.chats.map((chat: {
                id: string
                topic: string
                chatType: string
                assistantId: string | null
                lastMessage: string | null
                lastMessageAt: Date
                createdAt: Date
                updatedAt: Date
            }): ChatHistoryItem => ({
                id: chat.id,
                topic: chat.topic || "",
                lastMessage: chat.lastMessage || null,
                lastMessageAt: chat.lastMessageAt || new Date(),
                createdAt: chat.createdAt || new Date(),
                timestamp: formatTimestamp(chat.lastMessageAt || new Date())
            }))
        },
        enabled: !!queryFn, // Only run query if queryFn is available
        staleTime: 1000 * 30, // 30 seconds
        refetchInterval: 1000 * 30, // Auto-refetch every 30 seconds for real-time updates
    })

    // Delete chat mutation
    const deleteChatMutation = useMutation({
        mutationFn: deleteChat,
        onSuccess: (_, chatId) => {
            console.log("[useChatHistory] Chat deleted:", chatId)

            // Remove from cache
            queryClient.setQueryData<ChatHistoryItem[]>(
                ["chat-history", mode, assistantId],
                (old = []) => old.filter(chat => chat.id !== chatId)
            )

            toast.success("Chat deleted")
        },
        onError: (error) => {
            console.error("[useChatHistory] Error deleting chat:", error)
            toast.error("Failed to delete chat")
        }
    })

    // Rename chat mutation
    const renameChatMutation = useMutation({
        mutationFn: ({ chatId, newTopic }: { chatId: string; newTopic: string }) =>
            renameChat(chatId, newTopic),
        onSuccess: (_, { chatId, newTopic }) => {
            console.log("[useChatHistory] Chat renamed:", chatId)

            // Update cache
            queryClient.setQueryData<ChatHistoryItem[]>(
                ["chat-history", mode, assistantId],
                (old = []) => old.map(chat =>
                    chat.id === chatId
                        ? { ...chat, topic: newTopic }
                        : chat
                )
            )

            toast.success("Chat renamed")
        },
        onError: (error) => {
            console.error("[useChatHistory] Error renaming chat:", error)
            toast.error("Failed to rename chat")
        }
    })

    return {
        chats,
        isLoading,
        error,
        refetch,
        deleteChat: deleteChatMutation.mutate,
        renameChat: (chatId: string, newTopic: string) =>
            renameChatMutation.mutate({ chatId, newTopic }),
        isDeleting: deleteChatMutation.isPending,
        isRenaming: renameChatMutation.isPending,
    }
}

// Helper to format timestamps
function formatTimestamp(date: Date): string {
    const now = new Date()
    const messageDate = new Date(date)
    const diff = now.getTime() - messageDate.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return "Just now"
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    if (days < 7) return `${days}d ago`

    return messageDate.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: now.getFullYear() !== messageDate.getFullYear() ? "numeric" : undefined
    })
}