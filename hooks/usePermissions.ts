import { useQuery } from "@tanstack/react-query"
import { getUserAssistantPermissions } from "@/app/actions/assistant.action"

export type AssistantPermission = 'chat' | 'contacts' | 'messenger' | 'newsfeed' | 'artifacts'
export type AssistantAccess = 'admin' | 'user' | 'none'

export interface AssistantPermissionsData {
  hasAccess: boolean
  access: AssistantAccess
  permissions: AssistantPermission[]
  isOwner: boolean
  isPurchaser: boolean
  isShared: boolean
}

interface UseAssistantPermissionsResult {
  permissions: AssistantPermissionsData | null
  isLoading: boolean
  isError: boolean
  error: Error | null
  refetch: () => void
}

/**
 * Hook to fetch user permissions for an assistant
 * @param assistantId - The ID of the assistant
 * @param options - Optional configuration
 */
export function useAssistantPermissions(
  assistantId: string | null | undefined,
  options?: {
    enabled?: boolean
    refetchOnMount?: boolean
    refetchOnWindowFocus?: boolean
  }
): UseAssistantPermissionsResult {
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["assistant-permissions", assistantId],
    queryFn: async () => {
      if (!assistantId) {
        throw new Error("Assistant ID is required")
      }
      
      const result = await getUserAssistantPermissions(assistantId)
      
      if (!result.success || !result.permissions) {
        throw new Error(result.error || "Failed to fetch permissions")
      }
      
      return result.permissions as AssistantPermissionsData
    },
    enabled: (options?.enabled ?? true) && !!assistantId,
    refetchOnMount: options?.refetchOnMount ?? false,
    refetchOnWindowFocus: options?.refetchOnWindowFocus ?? false,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  })

  return {
    permissions: data || null,
    isLoading,
    isError,
    error: error as Error | null,
    refetch,
  }
}

/**
 * Helper hook to check if user has a specific permission
 */
export function useHasPermission(
  assistantId: string | null | undefined,
  requiredPermission: AssistantPermission
): boolean {
  const { permissions } = useAssistantPermissions(assistantId)
  
  if (!permissions || !permissions.hasAccess) {
    return false
  }
  
  // Admin has all permissions
  if (permissions.access === 'admin') {
    return true
  }
  
  // Check if user has the specific permission
  return permissions.permissions.includes(requiredPermission)
}

