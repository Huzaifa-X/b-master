"use client"

import { useQuery } from "@tanstack/react-query"
import { getSpecificChat } from "@/app/actions/chat.action"

interface UseSpecificChatOptions {
    chatId: string | null
    enabled?: boolean
    staleTime?: number
    refetchInterval?: number
}

/**
 * Hook to fetch specific chat data
 * Lightweight hook for components that only need chat metadata (topic, assistant name, etc.)
 * For full chat functionality with messaging, use useCustomChat instead
 */
export function useSpecificChat(options: UseSpecificChatOptions) {
    const { chatId, enabled = true, staleTime = 5000, refetchInterval = 10000 } = options

    return useQuery({
        queryKey: ["chat-header", chatId],
        queryFn: async () => {
            if (!chatId || chatId.trim() === '') return null
            const result = await getSpecificChat(chatId)
            return result.success ? result.chat : null
        },
        enabled: enabled && !!chatId && chatId.trim() !== '',
        staleTime,
        refetchInterval,
    })
}
