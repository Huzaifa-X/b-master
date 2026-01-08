import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { getArtifactById, getArtifacts, getArtifactVersions, setActiveArtifactVersion, createArtifact, shareArtifact, deleteArtifactFile } from "@/app/actions/artifact.action"
import { updateArtifactWithAI, type UpdateArtifactParams, type UpdateArtifactResult } from "@/app/actions/update-artifact.action"
import { getArtifactEditData, updateArtifact, type EditArtifactParams } from "@/app/actions/edit-artifact.action"
import { toast } from "sonner"

interface ArtifactData {
  id: string
  name: string
  category: string
  htmlContent: string
  instructions: string
  createdAt: Date
  updatedAt: Date
  versionsCount: number
  hasVersions: boolean
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
    staleTime: 30 * 1000, // 30 seconds - reduced for better update responsiveness
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
  instructions?: string
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

interface ArtifactVersion {
  id: string
  versionNumber: number
  versionName: string | null
  code: string
  description: string | null
  changeType: string
  isSnapshot: boolean
  createdAt: Date
  isActive: boolean
  creator: {
    id: string
    name: string
    email: string
    image: string | null
  }
}

interface UseArtifactVersionsResult {
  versions: ArtifactVersion[]
  activeVersionId: string | null
  isLoading: boolean
  isError: boolean
  error: Error | null
  refetch: () => void
}

/**
 * Hook to fetch all versions for an artifact
 * @param artifactId - The ID of the artifact
 * @param options - Optional configuration
 */
export function useArtifactVersions(
  artifactId: string,
  options?: {
    enabled?: boolean
  }
): UseArtifactVersionsResult {
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["artifactVersions", artifactId],
    queryFn: async () => {
      const result = await getArtifactVersions(artifactId)

      if (!result.success) {
        throw new Error(result.error || "Failed to fetch artifact versions")
      }

      return result
    },
    enabled: options?.enabled ?? true,
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: 1,
  })

  return {
    versions: (data?.versions || []) as ArtifactVersion[],
    activeVersionId: data?.activeVersionId || null,
    isLoading,
    isError,
    error: error as Error | null,
    refetch,
  }
}

interface UseSetActiveVersionOptions {
  onSuccess?: () => void
  onError?: (error: string) => void
}

/**
 * Hook to set active version for an artifact
 * @param options - Optional callbacks for success and error handling
 */
export function useSetActiveVersion(options?: UseSetActiveVersionOptions) {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: async ({ artifactId, versionId }: { artifactId: string; versionId: string }) => {
      const result = await setActiveArtifactVersion(artifactId, versionId)

      if (!result.success) {
        throw new Error(result.error || "Failed to set active version")
      }

      return result
    },
    onSuccess: (_, variables) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ["artifact", variables.artifactId] })
      queryClient.invalidateQueries({ queryKey: ["artifactVersions", variables.artifactId] })

      // Show success toast
      toast.success("Active version updated successfully!")

      // Call custom success callback
      options?.onSuccess?.()
    },
    onError: (error: Error) => {
      // Show error toast
      toast.error(error.message || "Failed to set active version")

      // Call custom error callback
      options?.onError?.(error.message)
    },
  })

  return {
    setActiveVersion: mutation.mutate,
    setActiveVersionAsync: mutation.mutateAsync,
    isLoading: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
    isSuccess: mutation.isSuccess,
  }
}

/**
 * Hook to fetch artifact edit data
 * @param artifactId - The ID of the artifact to edit
 * @param options - Optional configuration
 */
export function useArtifactEditData(
  artifactId: string,
  options?: {
    enabled?: boolean
  }
) {
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["artifactEditData", artifactId],
    queryFn: async () => {
      const result = await getArtifactEditData(artifactId)

      if (!result.success) {
        throw new Error(result.error || "Failed to fetch artifact edit data")
      }

      return result.data
    },
    enabled: options?.enabled ?? true,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  })

  return {
    editData: data || null,
    isLoading,
    isError,
    error: error as Error | null,
    refetch,
  }
}

interface UseUpdateArtifactMutationOptions {
  onSuccess?: (artifactId: string) => void
  onError?: (error: string) => void
}

/**
 * Hook to update artifact (instructions, contacts, APIs)
 * @param options - Optional callbacks for success and error handling
 */
export function useUpdateArtifactMutation(options?: UseUpdateArtifactMutationOptions) {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: async (params: EditArtifactParams) => {
      const result = await updateArtifact(params)

      if (!result.success) {
        throw new Error(result.error || "Failed to update artifact")
      }

      return result
    },
    onSuccess: async (result) => {
      if (result.artifact) {
        console.log('[useUpdateArtifactMutation] Update successful, invalidating cache for artifact:', result.artifact.id)

        // Invalidate and refetch artifact queries immediately
        await queryClient.invalidateQueries({
          queryKey: ["artifact", result.artifact.id],
          refetchType: 'active' // Force active queries to refetch
        })
        await queryClient.invalidateQueries({
          queryKey: ["artifactEditData", result.artifact.id],
          refetchType: 'active'
        })
        await queryClient.invalidateQueries({
          queryKey: ["artifacts"],
          refetchType: 'active'
        })

        console.log('[useUpdateArtifactMutation] Cache invalidated, forcing refetch...')

        // Also manually refetch the specific artifact to ensure it updates
        await queryClient.refetchQueries({
          queryKey: ["artifact", result.artifact.id],
          type: 'active'
        })

        console.log('[useUpdateArtifactMutation] ✅ Refetch complete')
      }

      // Show success toast
      toast.success("Artifact updated successfully!")

      // Call custom success callback
      if (result.artifact) {
        options?.onSuccess?.(result.artifact.id)
      }
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

interface CreateArtifactParams {
  assistantId: string
  name: string
  instructions: string
  category: string
  permissions: "private" | "team" | "public"
  selectedUsers: Array<{ id: string; name: string; email: string }>
  apiConfigs: Array<{ key: string; value: string }>
  uploadedFiles: any[]
  uploadedImages: any[]
  videoDuration?: "4" | "8" | "12"
  selectedChatId?: string | null
  templateHtml?: string
  bookingConfig?: any
}

interface UseCreateArtifactOptions {
  onSuccess?: (artifactId: string) => void
  onError?: (error: string) => void
}

/**
 * Hook to create artifact using React Query mutation
 * @param options - Optional callbacks for success and error handling
 */
export function useCreateArtifact(options?: UseCreateArtifactOptions) {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: async (params: CreateArtifactParams) => {
      const result = await createArtifact(params)

      if (!result.success) {
        throw new Error(result.error || "Failed to create artifact")
      }

      return result
    },
    onSuccess: (result, variables) => {
      // Invalidate artifacts list for this assistant
      queryClient.invalidateQueries({ queryKey: ["artifacts", variables.assistantId] })
      queryClient.invalidateQueries({ queryKey: ["artifacts"] })

      // Show success toast
      toast.success("Artifact created successfully!")

      // Call custom success callback
      if (result.artifact) {
        options?.onSuccess?.(result.artifact.id.toString())
      }
    },
    onError: (error: Error) => {
      // Show error toast
      toast.error(error.message || "Failed to create artifact")

      // Call custom error callback
      options?.onError?.(error.message)
    },
  })

  return {
    createArtifact: mutation.mutate,
    createArtifactAsync: mutation.mutateAsync,
    isCreating: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
    isSuccess: mutation.isSuccess,
    data: mutation.data,
  }
}

interface ShareArtifactParams {
  artifactId: string
  artifactName: string
  assistantId: string
  recipientUserId: string
  recipientName: string
}

interface UseShareArtifactOptions {
  onSuccess?: (recipientName: string) => void
  onError?: (error: string) => void
}

/**
 * Hook to share artifact with a contact using React Query mutation
 * @param options - Optional callbacks for success and error handling
 */
export function useShareArtifact(options?: UseShareArtifactOptions) {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: async (params: ShareArtifactParams) => {
      const result = await shareArtifact(params)

      if (!result.success) {
        throw new Error(result.error || "Failed to share artifact")
      }

      return result
    },
    onSuccess: (_, variables) => {
      // Optionally invalidate relevant queries if needed
      // queryClient.invalidateQueries({ queryKey: ["artifact", variables.artifactId] })

      // Show success toast
      toast.success(`Artifact shared with ${variables.recipientName}!`)

      // Call custom success callback
      options?.onSuccess?.(variables.recipientName)
    },
    onError: (error: Error) => {
      // Show error toast
      toast.error(error.message || "Failed to share artifact")

      // Call custom error callback
      options?.onError?.(error.message)
    },
  })

  return {
    shareArtifact: mutation.mutate,
    shareArtifactAsync: mutation.mutateAsync,
    isSharing: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
    isSuccess: mutation.isSuccess,
  }
}

interface UseDeleteArtifactFileOptions {
  onSuccess?: () => void
  onError?: (error: string) => void
}

/**
 * Hook to delete artifact file from storage using React Query mutation
 * @param options - Optional callbacks for success and error handling
 */
export function useDeleteArtifactFile(options?: UseDeleteArtifactFileOptions) {
  const mutation = useMutation({
    mutationFn: async (fileUrl: string) => {
      const result = await deleteArtifactFile(fileUrl)

      if (!result.success) {
        throw new Error(result.error || "Failed to delete file from storage")
      }

      return result
    },
    onSuccess: () => {
      // Call custom success callback
      options?.onSuccess?.()
    },
    onError: (error: Error) => {
      // Show error toast
      toast.error(error.message || "Failed to delete file from storage")

      // Call custom error callback
      options?.onError?.(error.message)
    },
  })

  return {
    deleteFile: mutation.mutate,
    deleteFileAsync: mutation.mutateAsync,
    isDeleting: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
    isSuccess: mutation.isSuccess,
  }
}
