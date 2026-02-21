import { useSession } from 'next-auth/react'
import {
  useQuery,
  useMutation,
  useQueryClient,
  useInfiniteQuery
} from '@tanstack/react-query'
import {
  getGroupChats,
  getGroupChatMessages,
  createGroupChat,
  sendGroupChatMessage,
  addGroupChatMember,
  removeGroupChatMember,
  updateGroupChat,
  deactivateGroupChat
} from '@/app/actions/assistant-group-chat.action'
import { useEffect, useRef, useMemo } from 'react'
import { getPusherConfig } from '@/app/actions/assistant-chat.action'
import Pusher from 'pusher-js'

// ================================================================
// TYPES
// ================================================================

export interface GroupChatMember {
  id: string
  groupChatId: string
  userId: string
  role: 'admin' | 'member'
  joinedAt: string
  leftAt: string | null
  user: {
    id: string
    name: string | null
    email: string
    image: string | null
  }
}

export interface GroupChat {
  id: string
  assistantId: string
  name: string
  description: string | null
  avatarUrl: string | null
  createdById: string
  isActive: boolean
  lastMessageAt: string | null
  lastMessageId: string | null
  createdAt: string
  members: GroupChatMember[]
  createdBy: { id: string; name: string | null; email: string; image: string | null } | null
}

export interface GroupChatMessage {
  id: string
  groupChatId: string
  assistantId: string
  senderId: string
  message: string
  messageType: string
  attachmentUrl: string | null
  attachmentName: string | null
  attachmentSize: string | null
  deletedAt: string | null
  createdAt: string
  updatedAt: string
  sender: {
    id: string
    name: string | null
    email: string
    image: string | null
  } | null
}

// ================================================================
// HOOKS
// ================================================================

export function useGroupChats(assistantId: string) {
  const queryClient = useQueryClient()
  const query = useQuery({
    queryKey: ['group-chats', assistantId],
    queryFn: async () => {
      const result = await getGroupChats(assistantId)
      if (!result.success) throw new Error(result.error)
      return result.groups as GroupChat[]
    },
    enabled: !!assistantId,
    staleTime: 30_000
  })

  return {
    groups: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch
  }
}

export function useGroupChatMessages(assistantId: string, groupChatId: string | null) {
  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
  } = useInfiniteQuery({
    queryKey: ['group-chat-messages', assistantId, groupChatId],
    queryFn: async ({ pageParam = 1 }) => {
      if (!groupChatId) return { messages: [], pagination: { hasMore: false, page: 1, total: 0 } }
      const result = await getGroupChatMessages({ assistantId, groupChatId, page: pageParam as number })
      if (!result.success) throw new Error(result.error)
      return result
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.pagination?.hasMore ? (lastPage.pagination.page ?? 1) + 1 : undefined,
    enabled: !!groupChatId && !!assistantId
  })

  const allMessages = useMemo(() => {
    const seen = new Set<string>()
    return (data?.pages.flatMap(p => p.messages ?? []) ?? []).filter((m: GroupChatMessage) => {
      if (seen.has(m.id)) return false
      seen.add(m.id)
      return true
    }) as GroupChatMessage[]
  }, [data])

  return {
    allMessages,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
  }
}

export function useCreateGroupChat(assistantId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (vars: { name: string; description?: string; memberIds: string[] }) =>
      createGroupChat({ assistantId, ...vars }),
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ['group-chats', assistantId] })
      }
    }
  })
}

export function useSendGroupMessage(assistantId: string, groupChatId: string) {
  const queryClient = useQueryClient()
  const { data: session } = useSession()

  return useMutation({
    mutationFn: (vars: {
      message: string
      messageType?: 'text' | 'image' | 'file' | 'audio' | 'video' | 'url'
      attachmentUrl?: string
      attachmentName?: string
      attachmentSize?: number
    }) => sendGroupChatMessage({ assistantId, groupChatId, ...vars }),
    onMutate: async (vars) => {
      await queryClient.cancelQueries({ queryKey: ['group-chat-messages', assistantId, groupChatId] })

      const optimistic: GroupChatMessage = {
        id: `temp-${Date.now()}`,
        groupChatId,
        assistantId,
        senderId: session?.user?.id ?? 'temp',
        message: vars.message,
        messageType: vars.messageType ?? 'text',
        attachmentUrl: vars.attachmentUrl ?? null,
        attachmentName: vars.attachmentName ?? null,
        attachmentSize: vars.attachmentSize?.toString() ?? null,
        deletedAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        sender: session?.user
          ? {
              id: session.user.id,
              name: session.user.name ?? null,
              email: session.user.email ?? '',
              image: session.user.image ?? null
            }
          : null
      }

      queryClient.setQueryData<any>(
        ['group-chat-messages', assistantId, groupChatId],
        (old: any) => {
          if (!old) return old
          return {
            ...old,
            pages: old.pages.map((page: any, i: number) =>
              i === 0
                ? { ...page, messages: [optimistic, ...(page.messages ?? [])] }
                : page
            )
          }
        }
      )

      return { optimistic }
    },
    onSuccess: (result, _vars, context) => {
      if (result.success && result.message && context?.optimistic) {
        // Replace optimistic with real message
        queryClient.setQueryData<any>(
          ['group-chat-messages', assistantId, groupChatId],
          (old: any) => {
            if (!old) return old
            return {
              ...old,
              pages: old.pages.map((page: any) => ({
                ...page,
                messages: (page.messages ?? []).map((m: any) =>
                  m.id === context.optimistic.id ? result.message : m
                )
              }))
            }
          }
        )
        queryClient.invalidateQueries({ queryKey: ['group-chats', assistantId] })
      }
    },
    onError: (_err, _vars, context) => {
      if (context?.optimistic) {
        queryClient.setQueryData<any>(
          ['group-chat-messages', assistantId, groupChatId],
          (old: any) => {
            if (!old) return old
            return {
              ...old,
              pages: old.pages.map((page: any) => ({
                ...page,
                messages: (page.messages ?? []).filter(
                  (m: any) => m.id !== context.optimistic.id
                )
              }))
            }
          }
        )
      }
    }
  })
}

export function useAddGroupMember(assistantId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (vars: { groupChatId: string; userId: string }) =>
      addGroupChatMember({ assistantId, ...vars }),
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ['group-chats', assistantId] })
      }
    }
  })
}

export function useRemoveGroupMember(assistantId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (vars: { groupChatId: string; userId: string }) =>
      removeGroupChatMember({ assistantId, ...vars }),
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ['group-chats', assistantId] })
      }
    }
  })
}

export function useUpdateGroupChat(assistantId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (vars: { groupChatId: string; name?: string; description?: string }) =>
      updateGroupChat({ assistantId, ...vars }),
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ['group-chats', assistantId] })
      }
    }
  })
}

export function useDeactivateGroupChat(assistantId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (groupChatId: string) => deactivateGroupChat({ assistantId, groupChatId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-chats', assistantId] })
    }
  })
}

// ================================================================
// REAL-TIME SUBSCRIPTION — reuses same Pusher channel
// ================================================================

export function useGroupMessageSubscription(
  assistantId: string,
  groupChatId: string | null,
  onNewMessage: (msg: GroupChatMessage) => void
) {
  const pusherRef = useRef<Pusher | null>(null)

  useEffect(() => {
    if (!groupChatId) return

    let channel: any

    getPusherConfig().then((res) => {
      if (!res.success || !res.config) return

      if (!pusherRef.current) {
        pusherRef.current = new Pusher(res.config.key, { cluster: res.config.cluster })
      }

      channel = pusherRef.current.subscribe('global-assistant-chat')
      channel.bind('new-group-message', (data: any) => {
        if (data.groupChatId === groupChatId && data.assistantId === assistantId) {
          onNewMessage(data.message as GroupChatMessage)
        }
      })
    })

    return () => {
      if (channel) channel.unbind('new-group-message')
    }
  }, [groupChatId, assistantId, onNewMessage])
}
