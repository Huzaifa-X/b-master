import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { getArtifactById, getArtifacts } from "@/app/actions/artifact.action"
import { updateArtifactWithAI, type UpdateArtifactParams, type UpdateArtifactResult } from "@/app/actions/update-artifact.action"
import { toast } from "sonner"

interface ArtifactData {
  id: string
  name: string
  category: string
  htmlContent: string
  instructions: string
  createdAt: Date
  updatedAt: Date
  creator: {
    id: string
    name: string
    email: string
    image: string | null
  }
  isOwner: boolean
  access: string
  isPublic: boolean
  apiKeys?: Record<string, string> | null
}

interface UseArtifactByIdResult {
  artifact: ArtifactData | null
  isLoading: boolean
  isError: boolean
  error: Error | null
  refetch: () => void
}

/**
 * Hook to fetch a single artifact by ID with React Query
 * @param artifactId - The ID of the artifact to fetch
 * @param options - Optional configuration
 */
export function useArtifactById(
  artifactId: string,
  options?: {
    enabled?: boolean
    refetchOnMount?: boolean
    refetchOnWindowFocus?: boolean
  }
): UseArtifactByIdResult {
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["artifact", artifactId],
    queryFn: async () => {
      const result = await getArtifactById(artifactId)
      
      if (!result.success) {
        throw new Error(result.error || "Failed to fetch artifact")
      }
      
      return result.artifact as ArtifactData
    },
    enabled: options?.enabled ?? true,
    refetchOnMount: options?.refetchOnMount ?? false,
    refetchOnWindowFocus: options?.refetchOnWindowFocus ?? false,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  })

  return {
    artifact: data || null,
    isLoading,
    isError,
    error: error as Error | null,
    refetch,
  }
}

interface Artifact {
  id: string
  name: string
  category: string
  htmlContent: string
  createdAt: Date
  creator?: {
    id: string
    name: string
    email: string
    image: string | null
  }
  isOwner?: boolean
  access?: string
  isPublic?: boolean
}

interface UseArtifactsResult {
  artifacts: Artifact[]
  isLoading: boolean
  isError: boolean
  error: Error | null
  refetch: () => void
}

/**
 * Hook to fetch all artifacts for an assistant
 * @param assistantId - The ID of the assistant
 * @param options - Optional configuration
 */
export function useArtifacts(
  assistantId: string,
  options?: {
    enabled?: boolean
    refetchOnMount?: boolean
  }
): UseArtifactsResult {
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["artifacts", assistantId],
    queryFn: async () => {
      const result = await getArtifacts(assistantId)
      
      if (!result.success) {
        throw new Error(result.error || "Failed to fetch artifacts")
      }
      
      return result.artifacts as Artifact[]
    },
    enabled: options?.enabled ?? true,
    refetchOnMount: options?.refetchOnMount ?? true,
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: 1,
  })

  return {
    artifacts: data || [],
    isLoading,
    isError,
    error: error as Error | null,
    refetch,
  }
}

/**
 * Hook to invalidate artifact queries
 * Useful for refreshing data after mutations
 */
export function useInvalidateArtifacts() {
  const queryClient = useQueryClient()

  return {
    invalidateArtifact: (artifactId: string) => {
      queryClient.invalidateQueries({ queryKey: ["artifact", artifactId] })
    },
    invalidateArtifacts: (assistantId: string) => {
      queryClient.invalidateQueries({ queryKey: ["artifacts", assistantId] })
    },
    invalidateAllArtifacts: () => {
      queryClient.invalidateQueries({ queryKey: ["artifacts"] })
      queryClient.invalidateQueries({ queryKey: ["artifact"] })
    },
  }
}

interface UseUpdateArtifactOptions {
  onSuccess?: (result: UpdateArtifactResult) => void
  onError?: (error: string) => void
}

/**
 * Hook to update artifact with AI using React Query mutation
 * @param options - Optional callbacks for success and error handling
 */
export function useUpdateArtifact(options?: UseUpdateArtifactOptions) {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: async (params: UpdateArtifactParams): Promise<UpdateArtifactResult> => {
      const result = await updateArtifactWithAI(params)
      
      if (!result.success) {
        throw new Error(result.error || "Failed to update artifact")
      }
      
      return result
    },
    onSuccess: (result) => {
      // Invalidate artifact queries to refetch updated data
      if (result.artifact) {
        queryClient.invalidateQueries({ queryKey: ["artifact", result.artifact.id] })
      }
      
      // Show success toast
      toast.success("Artifact updated successfully!")
      
      // Call custom success callback
      options?.onSuccess?.(result)
    },
    onError: (error: Error) => {
      // Show error toast
      toast.error(error.message || "Failed to update artifact")
      
      // Call custom error callback
      options?.onError?.(error.message)
    },
  })

  return {
    updateArtifact: mutation.mutate,
    updateArtifactAsync: mutation.mutateAsync,
    isLoading: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
    isSuccess: mutation.isSuccess,
    data: mutation.data,
  }
}

