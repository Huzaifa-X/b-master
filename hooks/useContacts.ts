import { useQuery, useQueryClient } from "@tanstack/react-query"
import { getAssistantContacts, getAllContacts } from "@/app/actions/contact.action"

interface Contact {
  id: string
  contactId: string
  name: string
  email: string
  description: string
  avatar: string
  gender: string
  role: "user" | "client" | "investor"
  address: string
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

