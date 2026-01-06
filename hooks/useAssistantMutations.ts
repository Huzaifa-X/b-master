"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { createCompleteAssistant, updateCompleteAssistant, hardDeleteAssistant } from "@/app/actions/assistant.action"
import { AssistantCategory } from "@/types/assistant"
import { toast } from "sonner"

interface CreateAssistantParams {
    // Step 1: Basic Info
    name: string
    price: string
    category: AssistantCategory
    description: string

    // Step 2: Image (S3 URL)
    imageURL?: string | null

    // Step 3: Knowledge Base (S3 URLs)
    notes: string[]
    urls: string[]
    fileURLs: Array<{
        url: string
        fileName: string
        fileSize: number
    }>

    // Step 4: Instructions
    instructions: string

    // Step 5: API Config
    authenticationType: string
    apiKey?: string
    authType?: string
    customHeaderName?: string
    clientId?: string
    clientSecret?: string
    authorizationUrl?: string
    tokenUrl?: string
    scope?: string
    tokenExchangeMethod?: string
    schemaText?: string
    schema?: any

    // Step 6: Sharing
    permissionLevel: string
    sharedUsers: Array<{
        id: string
        name: string
        email: string
        permissions: {
            chat: boolean
            contact: boolean
            messenger: boolean
            artifact: boolean
            newsFeed: boolean
        }
    }>
    buyerPermissions: {
        chat: boolean
        contact: boolean
        messenger: boolean
        artifact: boolean
        newsFeed: boolean
    }
}

interface UpdateAssistantParams extends CreateAssistantParams {
    assistantId: string
}

/**
 * Hook to manage assistant creation and updates with React Query
 */
export function useAssistantMutations() {
    const queryClient = useQueryClient()

    // Mutation for creating assistant
    const createAssistantMutation = useMutation({
        mutationFn: async (params: CreateAssistantParams) => {
            const result = await createCompleteAssistant(params)
            if (!result.success) {
                throw new Error(result.error || "Failed to create assistant")
            }
            return result
        },
        onSuccess: () => {
            // Invalidate all assistant queries to refresh lists
            queryClient.invalidateQueries({ queryKey: ["assistants"] })
        },
    })

    // Mutation for updating assistant
    const updateAssistantMutation = useMutation({
        mutationFn: async ({ assistantId, ...params }: UpdateAssistantParams) => {
            const result = await updateCompleteAssistant(assistantId, params)
            if (!result.success) {
                throw new Error(result.error || "Failed to update assistant")
            }
            return result
        },
        onSuccess: (data, variables) => {
            // Invalidate all assistant queries
            queryClient.invalidateQueries({ queryKey: ["assistants"] })
            // Invalidate specific assistant query
            queryClient.invalidateQueries({ queryKey: ["assistant", variables.assistantId] })
        },
    })

    return {
        // Create assistant
        createAssistant: async (params: CreateAssistantParams) => {
            try {
                const result = await createAssistantMutation.mutateAsync(params)
                return result
            } catch (err: any) {
                return { success: false, error: err.message }
            }
        },
        isCreating: createAssistantMutation.isPending,

        // Update assistant
        updateAssistant: async (params: UpdateAssistantParams) => {
            try {
                const result = await updateAssistantMutation.mutateAsync(params)
                return result
            } catch (err: any) {
                return { success: false, error: err.message }
            }
        },
        isUpdating: updateAssistantMutation.isPending,
    }
}

interface UseHardDeleteAssistantOptions {
    onSuccess?: () => void
    onError?: (error: string) => void
}

/**
 * Hook to hard delete an assistant using React Query mutation
 * @param options - Optional callbacks for success and error handling
 */
export function useHardDeleteAssistant(options?: UseHardDeleteAssistantOptions) {
    const queryClient = useQueryClient()

    const mutation = useMutation({
        mutationFn: async (assistantId: string) => {
            const result = await hardDeleteAssistant(assistantId)

            if (!result.success) {
                throw new Error(result.error || "Failed to delete assistant")
            }

            return result
        },
        onSuccess: () => {
            // Invalidate all assistant queries to refresh lists
            queryClient.invalidateQueries({ queryKey: ["assistants"] })

            // Show success toast
            toast.success("Assistant deleted successfully")

            // Call custom success callback
            options?.onSuccess?.()
        },
        onError: (error: Error) => {
            // Show error toast
            toast.error(error.message || "Failed to delete assistant")

            // Call custom error callback
            options?.onError?.(error.message)
        },
    })

    return {
        deleteAssistant: mutation.mutate,
        deleteAssistantAsync: mutation.mutateAsync,
        isDeleting: mutation.isPending,
        isError: mutation.isError,
        error: mutation.error,
        isSuccess: mutation.isSuccess,
    }
}

interface UsePurchaseAssistantOptions {
    onSuccess?: (url: string) => void
    onError?: (error: string) => void
}

/**
 * Hook to purchase an assistant using React Query mutation
 * @param options - Optional callbacks for success and error handling
 */
export function usePurchaseAssistant(options?: UsePurchaseAssistantOptions) {
    const mutation = useMutation({
        mutationFn: async (assistantId: string) => {
            const { purchaseAssistant } = await import("@/app/actions/assistant.action")
            const result = await purchaseAssistant(assistantId)

            if (!result.success || !result.url) {
                throw new Error(result.error || "Failed to initiate purchase")
            }

            return result.url
        },
        onSuccess: (url) => {
            // Redirect to Stripe Checkout
            window.location.href = url

            // Call custom success callback
            options?.onSuccess?.(url)
        },
        onError: (error: Error) => {
            // Show error toast
            toast.error(error.message || "Failed to initiate purchase")

            // Call custom error callback
            options?.onError?.(error.message)
        },
    })

    return {
        purchaseAssistant: mutation.mutate,
        purchaseAssistantAsync: mutation.mutateAsync,
        isPurchasing: mutation.isPending,
        isError: mutation.isError,
        error: mutation.error,
        isSuccess: mutation.isSuccess,
    }
}
