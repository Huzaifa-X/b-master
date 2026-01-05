"use client"

import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query"
import { getAssistants, type AssistantListItem } from "@/app/actions/assistant.action"
import { useMemo } from "react"

interface UseAssistantsParams {
    type: 'my' | 'purchased' | 'shared' | 'public'
    search?: string
    limit?: number
}

export function useAssistants({ type, search = '', limit = 12 }: UseAssistantsParams) {
    const queryClient = useQueryClient()

    const {
        data,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isLoading,
        isError,
        error,
        refetch
    } = useInfiniteQuery({
        queryKey: ['assistants', type, search],
        queryFn: async ({ pageParam = 1 }) => {
            const result = await getAssistants({
                type,
                page: pageParam,
                limit,
                search
            })

            if (!result.success) {
                throw new Error(result.error || 'Failed to fetch assistants')
            }

            return result
        },
        getNextPageParam: (lastPage) => {
            return lastPage.pagination.hasMore
                ? lastPage.pagination.page + 1
                : undefined
        },
        initialPageParam: 1,
        staleTime: 2 * 60 * 1000, // 2 minutes
        gcTime: 5 * 60 * 1000, // 5 minutes
    })

    // Flatten all pages into a single array
    const assistants = useMemo(() => {
        return data?.pages.flatMap(page => page.assistants) ?? []
    }, [data])

    // Get pagination info from the last page
    const pagination = useMemo(() => {
        const lastPage = data?.pages[data.pages.length - 1]
        return lastPage?.pagination ?? {
            page: 1,
            limit,
            total: 0,
            totalPages: 0,
            hasMore: false
        }
    }, [data, limit])

    // Invalidate cache for this query
    const invalidate = () => {
        queryClient.invalidateQueries({ queryKey: ['assistants', type, search] })
    }

    // Invalidate all assistant queries
    const invalidateAll = () => {
        queryClient.invalidateQueries({ queryKey: ['assistants'] })
    }

    return {
        assistants,
        pagination,
        isLoading,
        isError,
        error: error instanceof Error ? error.message : null,
        hasMore: hasNextPage,
        loadMore: fetchNextPage,
        isLoadingMore: isFetchingNextPage,
        refetch,
        invalidate,
        invalidateAll
    }
}

// Hook to invalidate all assistant queries (useful after creating/deleting)
export function useInvalidateAssistants() {
    const queryClient = useQueryClient()

    return () => {
        queryClient.invalidateQueries({ queryKey: ['assistants'] })
    }
}

