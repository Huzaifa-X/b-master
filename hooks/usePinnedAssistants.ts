"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { getPinnedAssistants, togglePinAssistant } from "@/app/actions/assistant.action"
import { toast } from "sonner"

export interface PinnedAssistant {
    id: string
    name: string
    description: string | null
    image: string | null
    category: string
    public: boolean
    userId: string
    pinnedAt: Date
}

const PINNED_ASSISTANTS_KEY = ["pinned-assistants"]

export function usePinnedAssistants() {
    const queryClient = useQueryClient()

    // Query for fetching pinned assistants
    const {
        data: assistants = [],
        isLoading: loading,
        error,
        refetch
    } = useQuery({
        queryKey: PINNED_ASSISTANTS_KEY,
        queryFn: async () => {
            const result = await getPinnedAssistants()
            if (result.success) {
                return result.assistants as PinnedAssistant[]
            }
            throw new Error(result.error || "Failed to fetch pinned assistants")
        },
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
    })

    // Mutation for toggling pin status
    const togglePinMutation = useMutation({
        mutationFn: async (assistantId: string) => {
            const result = await togglePinAssistant(assistantId)
            if (!result.success) {
                throw new Error(result.error || "Failed to toggle pin")
            }
            return result
        },
        onMutate: async (assistantId: string) => {
            // Cancel outgoing refetches
            await queryClient.cancelQueries({ queryKey: PINNED_ASSISTANTS_KEY })

            // Snapshot previous value
            const previousAssistants = queryClient.getQueryData<PinnedAssistant[]>(PINNED_ASSISTANTS_KEY)

            // Optimistically update - remove the assistant
            queryClient.setQueryData<PinnedAssistant[]>(
                PINNED_ASSISTANTS_KEY,
                (old = []) => old.filter(a => a.id !== assistantId)
            )

            // Return context with previous value
            return { previousAssistants }
        },
        onError: (error, assistantId, context) => {
            // Rollback on error
            if (context?.previousAssistants) {
                queryClient.setQueryData(PINNED_ASSISTANTS_KEY, context.previousAssistants)
            }
            toast.error(error instanceof Error ? error.message : "Failed to toggle pin")
        },
        onSuccess: (result) => {
            toast.success(result.message || "Pin status updated")
        },
        onSettled: () => {
            // Refetch to ensure consistency
            queryClient.invalidateQueries({ queryKey: PINNED_ASSISTANTS_KEY })
        }
    })

    // Mutation for unpinning (optimistic update)
    const unpinMutation = useMutation({
        mutationFn: async (assistantId: string) => {
            const result = await togglePinAssistant(assistantId)
            if (!result.success || result.isPinned) {
                throw new Error("Failed to unpin assistant")
            }
            return result
        },
        onMutate: async (assistantId: string) => {
            // Cancel outgoing refetches
            await queryClient.cancelQueries({ queryKey: PINNED_ASSISTANTS_KEY })

            // Snapshot previous value
            const previousAssistants = queryClient.getQueryData<PinnedAssistant[]>(PINNED_ASSISTANTS_KEY)

            // Optimistically remove the assistant
            queryClient.setQueryData<PinnedAssistant[]>(
                PINNED_ASSISTANTS_KEY,
                (old = []) => old.filter(a => a.id !== assistantId)
            )

            return { previousAssistants }
        },
        onError: (error, assistantId, context) => {
            // Rollback on error
            if (context?.previousAssistants) {
                queryClient.setQueryData(PINNED_ASSISTANTS_KEY, context.previousAssistants)
            }
            toast.error("Failed to unpin assistant")
        },
        onSuccess: () => {
            toast.success("Assistant unpinned")
        },
        onSettled: () => {
            // Refetch to ensure consistency
            queryClient.invalidateQueries({ queryKey: PINNED_ASSISTANTS_KEY })
        }
    })

    return {
        assistants,
        loading,
        error: error instanceof Error ? error.message : null,
        togglePin: (assistantId: string) => togglePinMutation.mutate(assistantId),
        unpinAssistant: (assistantId: string) => unpinMutation.mutate(assistantId),
        refetch,
        isToggling: togglePinMutation.isPending,
        isUnpinning: unpinMutation.isPending,
    }
}

// Hook for invalidating pinned assistants cache (useful after creating/deleting assistants)
export function useInvalidatePinnedAssistants() {
    const queryClient = useQueryClient()
    
    return () => {
        queryClient.invalidateQueries({ queryKey: PINNED_ASSISTANTS_KEY })
    }
}
