import { useQuery } from "@tanstack/react-query"
import { getAssistantById, getAssistantForEdit } from "@/app/actions/assistant.action"
import { useEffect } from "react"
import { useAssistantStore } from "@/lib/stores/assistant-store"
import { AssistantFormData } from "@/types/assistant"

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

interface UseAssistantForEditResult {
  assistantData: AssistantFormData | null
  isLoading: boolean
  isError: boolean
  error: Error | null
  refetch: () => void
}

/**
 * Hook to fetch assistant data for editing with React Query
 * Returns data formatted for the AssistantWizard component
 * @param assistantId - The ID of the assistant to fetch for editing
 * @param options - Optional configuration
 */
export function useAssistantForEdit(
  assistantId: string | null | undefined,
  options?: {
    enabled?: boolean
    refetchOnMount?: boolean
  }
): UseAssistantForEditResult {
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["assistant-edit", assistantId],
    queryFn: async () => {
      if (!assistantId) {
        throw new Error("Assistant ID is required")
      }

      const result = await getAssistantForEdit(assistantId)

      if (!result.success || !result.assistant) {
        throw new Error(result.error || "Failed to fetch assistant data")
      }

      const assistant = result.assistant

      // Process file URLs to match new structure
      const fileURLs: Array<{ url: string; fileName: string; fileSize: number }> = []
      if (assistant.files && Array.isArray(assistant.files) && assistant.files.length > 0) {
        for (const fileInfo of assistant.files) {
          // Clean up the file name (remove timestamp prefix)
          let fileName = fileInfo.name || 'file'
          fileName = fileName.replace(/^\d+_/, '') // Remove timestamp_ prefix
          fileName = fileName.replace(/^\d+-/, '') // Remove timestamp- prefix

          fileURLs.push({
            url: fileInfo.url,
            fileName: fileName,
            fileSize: 0 // Size unknown from URL, but not critical for display
          })
        }
      }

      // Map the fetched data to AssistantFormData format
      const formData: AssistantFormData = {
        name: assistant.name,
        price: assistant.price,
        category: assistant.category as any,
        description: assistant.description,
        imagePreview: assistant.imageURL, // Use imageURL for preview
        imageURL: assistant.imageURL,
        notes: assistant.notes || [],
        urls: assistant.urls || [],
        fileURLs: fileURLs,
        instructions: assistant.instructions || "",
        authenticationType: (assistant.apiConfiguration?.authenticationType || "none") as "none" | "api_key" | "oauth",
        apiKey: assistant.apiConfiguration?.apiKey || "",
        authType: (assistant.apiConfiguration?.authType || "basic") as "basic" | "bearer" | "custom" | undefined,
        customHeaderName: assistant.apiConfiguration?.customHeaderName || "",
        clientId: assistant.apiConfiguration?.clientId || "",
        clientSecret: assistant.apiConfiguration?.clientSecret || "",
        authorizationUrl: assistant.apiConfiguration?.authorizationUrl || "",
        tokenUrl: assistant.apiConfiguration?.tokenUrl || "",
        scope: assistant.apiConfiguration?.scope || "",
        tokenExchangeMethod: (assistant.apiConfiguration?.tokenExchangeMethod || "post") as "post" | "basic_auth" | undefined,
        schema: assistant.apiConfiguration?.schema || null,
        schemaText: assistant.apiConfiguration?.schemaText || "",
        permissionLevel: (assistant.permissionLevel === "public" ? "public" : "private") as "private" | "public",
        sharedUsers: assistant.sharedUsers || [],
        buyerPermissions: assistant.buyerPermissions || {
          chat: false,
          contact: false,
          messenger: false,
          artifact: false,
          newsFeed: false,
          library: false,
        },
      }

      return formData
    },
    enabled: (options?.enabled ?? true) && !!assistantId,
    refetchOnMount: options?.refetchOnMount ?? false,
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: 1,
  })

  return {
    assistantData: data || null,
    isLoading,
    isError,
    error: error as Error | null,
    refetch,
  }
}
