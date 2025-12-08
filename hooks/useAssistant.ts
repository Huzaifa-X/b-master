import { useQuery } from "@tanstack/react-query"
import { getAssistantById } from "@/app/actions/assistant.action"
import { useEffect } from "react"
import { useAssistantStore } from "@/lib/stores/assistant-store"

interface AssistantData {
  id: string
  name: string
  description: string | null
  image: string | null
  price: number
  currency: string
  priceType: string
  category: string
  public: boolean
  instructions: string | null
  vectorStoreId: string | null
  userId: string
  createdAt: Date
  updatedAt: Date
  isPinned?: boolean
}

interface UseAssistantByIdResult {
  assistant: AssistantData | null
  isLoading: boolean
  isError: boolean
  error: Error | null
  refetch: () => void
}

/**
 * Hook to fetch a single assistant by ID with React Query
 * @param assistantId - The ID of the assistant to fetch
 * @param options - Optional configuration
 */
export function useAssistantById(
  assistantId: string | null | undefined,
  options?: {
    enabled?: boolean
    refetchOnMount?: boolean
    refetchOnWindowFocus?: boolean
  }
): UseAssistantByIdResult {
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["assistant", assistantId],
    queryFn: async () => {
      if (!assistantId) {
        throw new Error("Assistant ID is required")
      }
      
      const result = await getAssistantById(assistantId)
      
      if (!result.success) {
        throw new Error(result.error || "Failed to fetch assistant")
      }
      
      return result.assistant as AssistantData
    },
    enabled: (options?.enabled ?? true) && !!assistantId,
    refetchOnMount: options?.refetchOnMount ?? false,
    refetchOnWindowFocus: options?.refetchOnWindowFocus ?? false,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  })

  return {
    assistant: data || null,
    isLoading,
    isError,
    error: error as Error | null,
    refetch,
  }
}

/**
 * Hook to automatically set assistant mode in the store when assistant is loaded
 * This ensures the assistant name appears in the header
 * @param assistantId - The ID of the assistant
 */
export function useSetAssistantMode(assistantId: string | null | undefined) {
  const { assistant, isLoading } = useAssistantById(assistantId)
  const { setAssistantMode, clearAssistantMode } = useAssistantStore()

  useEffect(() => {
    if (!assistantId) {
      clearAssistantMode()
      return
    }

    if (assistant && !isLoading) {
      setAssistantMode(assistantId, assistant.name)
    }

    // Cleanup on unmount
    return () => {
      clearAssistantMode()
    }
  }, [assistant, assistantId, isLoading, setAssistantMode, clearAssistantMode])
}

