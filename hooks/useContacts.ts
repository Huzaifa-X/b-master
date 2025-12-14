import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query"
import { getAssistantContacts, getAllContacts, deleteContact } from "@/app/actions/contact.action"
import { toast } from "sonner"

interface Contact {
  id: string
  contactId: string
  userId?: string // User ID for initiating chats
  name: string
  email: string
  description: string
  avatar: string
  gender: string
  role: "user" | "client" | "investor"
  address: string
  telephone?: string // Contact telephone number
  information?: string // Additional contact information
  assistantName?: string
  assistantId?: string
}

interface UseContactsResult {
  contacts: Contact[]
  isLoading: boolean
  isError: boolean
  error: Error | null
  refetch: () => void
}

/**
 * Hook to fetch contacts for a specific assistant
 * @param assistantId - The ID of the assistant
 * @param options - Optional configuration
 */
export function useAssistantContacts(
  assistantId: string | null | undefined,
  options?: {
    enabled?: boolean
    refetchOnMount?: boolean
  }
): UseContactsResult {
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["contacts", "assistant", assistantId],
    queryFn: async () => {
      if (!assistantId) {
        throw new Error("Assistant ID is required")
      }

      const result = await getAssistantContacts(assistantId)

      if (!result.success) {
        throw new Error(result.error || "Failed to fetch contacts")
      }

      return result.contacts as Contact[]
    },
    enabled: (options?.enabled ?? true) && !!assistantId,
    refetchOnMount: options?.refetchOnMount ?? true,
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: 1,
  })

  return {
    contacts: data || [],
    isLoading,
    isError,
    error: error as Error | null,
    refetch,
  }
}

/**
 * Hook to fetch all contacts across all assistants
 * @param options - Optional configuration
 */
export function useAllContacts(
  options?: {
    enabled?: boolean
    refetchOnMount?: boolean
  }
): UseContactsResult {
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["contacts", "all"],
    queryFn: async () => {
      const result = await getAllContacts()

      if (!result.success) {
        throw new Error(result.error || "Failed to fetch contacts")
      }

      return result.contacts as Contact[]
    },
    enabled: options?.enabled ?? true,
    refetchOnMount: options?.refetchOnMount ?? true,
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: 1,
  })

  return {
    contacts: data || [],
    isLoading,
    isError,
    error: error as Error | null,
    refetch,
  }
}

/**
 * Hook to invalidate contact queries
 */
export function useInvalidateContacts() {
  const queryClient = useQueryClient()

  return {
    invalidateAssistantContacts: (assistantId: string) => {
      queryClient.invalidateQueries({ queryKey: ["contacts", "assistant", assistantId] })
    },
    invalidateAllContacts: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts", "all"] })
    },
    invalidateAll: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] })
    },
  }
}

interface UseDeleteContactOptions {
  assistantId?: string
  onSuccess?: () => void
  onError?: (error: string) => void
}

/**
 * Hook to delete a contact using React Query mutation
 * @param options - Optional configuration including assistantId for cache invalidation
 */
export function useDeleteContact(options?: UseDeleteContactOptions) {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: async (contactId: string) => {
      const result = await deleteContact(contactId)
      
      if (!result.success) {
        throw new Error(result.error || "Failed to delete contact")
      }
      
      return result
    },
    onSuccess: () => {
      // Invalidate contact queries
      if (options?.assistantId) {
        queryClient.invalidateQueries({ queryKey: ["contacts", "assistant", options.assistantId] })
      }
      queryClient.invalidateQueries({ queryKey: ["contacts", "all"] })
      
      // Show success toast
      toast.success("Contact deleted successfully")
      
      // Call custom success callback
      options?.onSuccess?.()
    },
    onError: (error: Error) => {
      // Show error toast
      toast.error(error.message || "Failed to delete contact")
      
      // Call custom error callback
      options?.onError?.(error.message)
    },
  })

  return {
    deleteContact: mutation.mutate,
    deleteContactAsync: mutation.mutateAsync,
    isLoading: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
    isSuccess: mutation.isSuccess,
  }
}

