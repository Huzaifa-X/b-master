import { useMutation, useQuery, useQueryClient, useInfiniteQuery } from '@tanstack/react-query'
import {
    initiateChat,
    getUserChats,
    getChatMessages,
    sendChatMessage,
    markMessagesAsRead,
    getUnreadMessageCount,
    updateChatMessage,
    deactivateChat,
    getPusherConfig
} from '@/app/actions/assistant-chat.action'
import { toast } from 'sonner'
import { useEffect, useRef, useState } from 'react'
import Pusher from 'pusher-js'

// ================================================================
// PUSHER HOOK
// ================================================================

export function usePusher() {
    const [pusher, setPusher] = useState<Pusher | null>(null)
    const [isConnected, setIsConnected] = useState(false)
    const pusherRef = useRef<Pusher | null>(null)

    useEffect(() => {
        const initPusher = async () => {
            try {
                const result = await getPusherConfig()
                
                if (!result.success || !result.config) {
                    console.error('Failed to get Pusher config')
                    return
                }

                const pusherInstance = new Pusher(result.config.key, {
                    cluster: result.config.cluster,
                    forceTLS: true
                })

                pusherInstance.connection.bind('connected', () => {
                    console.log('✅ Pusher Connected')
                    setIsConnected(true)
                })

                pusherInstance.connection.bind('disconnected', () => {
                    console.log('⚠️ Pusher Disconnected')
                    setIsConnected(false)
                })

                pusherInstance.connection.bind('error', (error: any) => {
                    console.error('❌ Pusher Error:', error)
                })

                pusherRef.current = pusherInstance
                setPusher(pusherInstance)
            } catch (error) {
                console.error('Failed to initialize Pusher:', error)
            }
        }

        initPusher()

        return () => {
            if (pusherRef.current) {
                pusherRef.current.disconnect()
            }
        }
    }, [])

    return { pusher, isConnected }
}

// ================================================================
// CHAT INITIALIZATION
// ================================================================

export function useInitiateChat() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: initiateChat,
        onSuccess: (data) => {
            if (data.success) {
                queryClient.invalidateQueries({
                    queryKey: ['user-chats', data.chat?.assistantId]
                })
            } else {
                toast.error(data.error || 'Failed to initiate chat')
            }
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to initiate chat')
        }
    })
}

// ================================================================
// CHAT LIST QUERIES
// ================================================================

export function useUserChats(assistantId: string) {
    return useInfiniteQuery({
        queryKey: ['user-chats', assistantId],
        queryFn: async ({ pageParam = 1 }) => {
            const result = await getUserChats({
                assistantId,
                page: pageParam,
                limit: 20
            })

            if (!result.success) {
                throw new Error(result.error)
            }

            return result
        },
        getNextPageParam: (lastPage) => {
            if (lastPage.pagination?.hasMore) {
                return lastPage.pagination.page + 1
            }
            return undefined
        },
        initialPageParam: 1,
        enabled: !!assistantId
    })
}

// ================================================================
// CHAT MESSAGES QUERIES
// ================================================================

export function useChatMessages(assistantId: string, chatId: string) {
    return useInfiniteQuery({
        queryKey: ['chat-messages', assistantId, chatId],
        queryFn: async ({ pageParam = 1 }) => {
            const result = await getChatMessages({
                assistantId,
                chatId,
                page: pageParam,
                limit: 50
            })

            if (!result.success) {
                throw new Error(result.error)
            }

            return result
        },
        getNextPageParam: (lastPage) => {
            if (lastPage.pagination?.hasMore) {
                return lastPage.pagination.page + 1
            }
            return undefined
        },
        initialPageParam: 1,
        enabled: !!assistantId && !!chatId
    })
}

// ================================================================
// SEND MESSAGE MUTATION
// ================================================================

export function useSendMessage() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: sendChatMessage,
        onMutate: async (variables) => {
            // Cancel outgoing refetches
            await queryClient.cancelQueries({
                queryKey: ['chat-messages', variables.assistantId, variables.chatId]
            })

            // Snapshot previous value
            const previousMessages = queryClient.getQueryData([
                'chat-messages',
                variables.assistantId,
                variables.chatId
            ])

            // Optimistically update to the new value
            queryClient.setQueryData(
                ['chat-messages', variables.assistantId, variables.chatId],
                (old: any) => {
                    if (!old?.pages) return old

                    // Create optimistic message
                    const optimisticMessage = {
                        id: `temp-${Date.now()}`,
                        message: variables.message,
                        messageType: variables.messageType || 'text',
                        attachmentUrl: variables.attachmentUrl,
                        attachmentName: variables.attachmentName,
                        attachmentSize: variables.attachmentSize?.toString() || null,
                        isRead: false,
                        readAt: null,
                        createdAt: new Date(),
                        updatedAt: new Date(),
                        deletedAt: null,
                        assistantChatId: variables.chatId,
                        assistantId: variables.assistantId,
                        senderId: 'current-user', // Will be replaced by real data
                        sender: {
                            id: 'current-user',
                            name: 'You',
                            email: '',
                            image: null
                        }
                    }

                    return {
                        ...old,
                        pages: old.pages.map((page: any, index: number) => {
                            // Add to first page
                            if (index === 0) {
                                return {
                                    ...page,
                                    messages: [optimisticMessage, ...page.messages]
                                }
                            }
                            return page
                        })
                    }
                }
            )

            return { previousMessages }
        },
        onSuccess: (data, variables) => {
            if (data.success) {
                // Invalidate to refetch real data
                queryClient.invalidateQueries({
                    queryKey: ['chat-messages', variables.assistantId, variables.chatId]
                })
                queryClient.invalidateQueries({
                    queryKey: ['user-chats', variables.assistantId]
                })
            } else {
                toast.error(data.error || 'Failed to send message')
            }
        },
        onError: (error: Error, variables, context) => {
            // Rollback on error
            if (context?.previousMessages) {
                queryClient.setQueryData(
                    ['chat-messages', variables.assistantId, variables.chatId],
                    context.previousMessages
                )
            }
            toast.error(error.message || 'Failed to send message')
        }
    })
}

// ================================================================
// MARK AS READ MUTATION
// ================================================================

export function useMarkAsRead() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: markMessagesAsRead,
        onSuccess: (data, variables) => {
            if (data.success) {
                queryClient.invalidateQueries({
                    queryKey: ['chat-messages', variables.assistantId, variables.chatId]
                })
                queryClient.invalidateQueries({
                    queryKey: ['user-chats', variables.assistantId]
                })
                queryClient.invalidateQueries({
                    queryKey: ['unread-count', variables.assistantId]
                })
            }
        },
        onError: (error: Error) => {
            console.error('Failed to mark messages as read:', error)
        }
    })
}

// ================================================================
// UNREAD COUNT QUERY
// ================================================================

export function useUnreadCount(assistantId: string) {
    return useQuery({
        queryKey: ['unread-count', assistantId],
        queryFn: async () => {
            const result = await getUnreadMessageCount(assistantId)

            if (!result.success) {
                throw new Error(result.error)
            }

            return result.unreadCount
        },
        enabled: !!assistantId,
        refetchInterval: 30000 // Refetch every 30 seconds
    })
}

// ================================================================
// UPDATE MESSAGE MUTATION
// ================================================================

export function useUpdateMessage() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: updateChatMessage,
        onSuccess: (data) => {
            if (data.success) {
                toast.success('Message updated successfully')
                // Invalidate all chat messages queries
                queryClient.invalidateQueries({
                    queryKey: ['chat-messages']
                })
            } else {
                toast.error(data.error || 'Failed to update message')
            }
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to update message')
        }
    })
}

// ================================================================
// DEACTIVATE CHAT MUTATION
// ================================================================

export function useDeactivateChat() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: deactivateChat,
        onSuccess: (data, variables) => {
            if (data.success) {
                toast.success('Chat deactivated successfully')
                queryClient.invalidateQueries({
                    queryKey: ['user-chats', variables.assistantId]
                })
            } else {
                toast.error(data.error || 'Failed to deactivate chat')
            }
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to deactivate chat')
        }
    })
}

// ================================================================
// REAL-TIME MESSAGE SUBSCRIPTION HOOK
// ================================================================

export function useMessageSubscription(
    assistantId: string,
    chatId: string,
    enabled: boolean = true
) {
    const queryClient = useQueryClient()
    const { pusher, isConnected } = usePusher()

    useEffect(() => {
        if (!pusher || !isConnected || !enabled || !chatId) return

        const channel = pusher.subscribe('global-assistant-chat')

        // Handle new messages
        channel.bind('new-message', (data: any) => {
            if (data.chatId === chatId) {
                // Add new message to cache
                queryClient.setQueryData(
                    ['chat-messages', assistantId, chatId],
                    (old: any) => {
                        if (!old?.pages) return old

                        return {
                            ...old,
                            pages: old.pages.map((page: any, index: number) => {
                                if (index === 0) {
                                    // Check if message already exists
                                    const exists = page.messages.some(
                                        (msg: any) => msg.id === data.message.id
                                    )
                                    if (!exists) {
                                        return {
                                            ...page,
                                            messages: [data.message, ...page.messages]
                                        }
                                    }
                                }
                                return page
                            })
                        }
                    }
                )

                // Update chat list
                queryClient.invalidateQueries({
                    queryKey: ['user-chats', assistantId]
                })
            }
        })

        // Handle message updates
        channel.bind('message-updated', (data: any) => {
            queryClient.setQueryData(
                ['chat-messages', assistantId, chatId],
                (old: any) => {
                    if (!old?.pages) return old

                    return {
                        ...old,
                        pages: old.pages.map((page: any) => ({
                            ...page,
                            messages: page.messages.map((msg: any) =>
                                msg.id === data.message.id ? data.message : msg
                            )
                        }))
                    }
                }
            )
        })

        return () => {
            channel.unbind_all()
            pusher.unsubscribe('global-assistant-chat')
        }
    }, [pusher, isConnected, enabled, chatId, assistantId, queryClient])

    return { isConnected }
}