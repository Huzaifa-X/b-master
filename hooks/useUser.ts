"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useSession } from "next-auth/react"
import { getCurrentUser, updateUserProfile, searchUsersForMention } from "@/app/actions/user.action"
import { toast } from "sonner"

interface UserData {
  id: string
  name: string
  email: string
  image: string
  organization: string
  gender: string
  address: string
  isEmailVerified?: boolean
  status?: string
  createdAt?: Date
}

interface UseUserReturn {
  user: UserData | null
  loading: boolean
  error: string | null
  refetch: () => void
  updateProfile: (data: Partial<UserData>) => Promise<boolean>
  isUpdating: boolean
}

const USER_QUERY_KEY = ["user", "profile"]

export function useUser(): UseUserReturn {
  const queryClient = useQueryClient()
  const { update: updateSession } = useSession()

  // Fetch user with React Query
  const {
    data: user,
    isLoading: loading,
    error,
    refetch,
  } = useQuery({
    queryKey: USER_QUERY_KEY,
    queryFn: async () => {
      const result = await getCurrentUser()

      if (result.success && result.user) {
        return result.user as UserData
      } else {
        throw new Error(result.error || "Failed to fetch user")
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - data stays fresh
    gcTime: 10 * 60 * 1000, // 10 minutes - cache persistence (formerly cacheTime)
    retry: 2,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  })

  // Update profile mutation
  const mutation = useMutation({
    mutationFn: async (data: Partial<UserData>) => {
      const result = await updateUserProfile({
        name: data.name,
        email: data.email,
        organization: data.organization,
        gender: data.gender,
        address: data.address,
        image: data.image,
      })

      if (!result.success) {
        throw new Error(result.error || "Failed to update profile")
      }

      return result.user
    },
    onMutate: async (newData) => {
      // Cancel outgoing refetches to avoid overwriting optimistic update
      await queryClient.cancelQueries({ queryKey: USER_QUERY_KEY })

      // Snapshot previous value for rollback
      const previousUser = queryClient.getQueryData<UserData>(USER_QUERY_KEY)

      // Optimistically update cache
      if (previousUser) {
        queryClient.setQueryData<UserData>(USER_QUERY_KEY, {
          ...previousUser,
          ...newData,
        })
      }

      return { previousUser }
    },
    onSuccess: async (updatedUser) => {
      // Invalidate and refetch user data everywhere
      await queryClient.invalidateQueries({ queryKey: USER_QUERY_KEY })

      // Update NextAuth session so sidebar updates
      if (updatedUser) {
        await updateSession({
          user: {
            name: updatedUser.name,
            image: updatedUser.image,
            email: updatedUser.email,
          },
        })
      }

      toast.success("Profile updated successfully")
    },
    onError: (error, _newData, context) => {
      // Rollback on error
      if (context?.previousUser) {
        queryClient.setQueryData(USER_QUERY_KEY, context.previousUser)
      }

      toast.error(error instanceof Error ? error.message : "Failed to update profile")
    },
  })

  const updateProfile = async (data: Partial<UserData>): Promise<boolean> => {
    try {
      await mutation.mutateAsync(data)
      return true
    } catch (err) {
      console.error("Error updating profile:", err)
      return false
    }
  }

  return {
    user: user || null,
    loading,
    error: error ? (error as Error).message : null,
    refetch: () => refetch(),
    updateProfile,
    isUpdating: mutation.isPending,
  }
}

interface MentionUser {
  id: string
  name: string
  email: string
  image: string | null
}

interface UseSearchUsersForMentionResult {
  users: MentionUser[]
  isLoading: boolean
  isError: boolean
  error: Error | null
}

/**
 * Hook to search users for mention in assistant chat
 * @param assistantId - The ID of the assistant
 * @param searchTerm - The search term to filter users
 * @param options - Optional configuration
 */
export function useSearchUsersForMention(
  assistantId: string | null | undefined,
  searchTerm: string = "",
  options?: {
    enabled?: boolean
  }
): UseSearchUsersForMentionResult {
  const {
    data,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["mentionUsers", assistantId, searchTerm],
    queryFn: async () => {
      if (!assistantId) {
        return []
      }

      const users = await searchUsersForMention(assistantId, searchTerm)
      return users as MentionUser[]
    },
    enabled: (options?.enabled ?? true) && !!assistantId,
    staleTime: 30 * 1000, // 30 seconds
    retry: 1,
  })

  return {
    users: data || [],
    isLoading,
    isError,
    error: error as Error | null,
  }
}

