// hooks/useConnectedAPIs.ts
"use client"

import { useQuery } from "@tanstack/react-query"
import { getUserAssistantsWithAPI, type ConnectedAPIOption } from "@/app/actions/connected-apis.action"

interface UseConnectedAPIsOptions {
  excludeAssistantId?: string
  enabled?: boolean
}

export function useConnectedAPIs({ excludeAssistantId, enabled = true }: UseConnectedAPIsOptions = {}) {
  const { data, isLoading, error, refetch } = useQuery<ConnectedAPIOption[]>({
    queryKey: ["connected-apis", excludeAssistantId ?? null],
    queryFn: async () => {
      const result = await getUserAssistantsWithAPI(excludeAssistantId)
      if (!result.success) {
        throw new Error(result.error || "Failed to fetch API assistants")
      }
      return result.data
    },
    enabled,
    staleTime: 1000 * 60 * 2, // 2 minutes
    retry: 1,
  })

  return {
    apiAssistants: data ?? [],
    isLoading,
    error,
    refetch,
  }
}
