"use client"

import { useState, useEffect } from "react"
import { getCurrentUser, updateUserProfile } from "@/app/actions/user.action"
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
  refetch: () => Promise<void>
  updateProfile: (data: Partial<UserData>) => Promise<boolean>
}

export function useUser(): UseUserReturn {
  const [user, setUser] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchUser = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const result = await getCurrentUser()
      
      if (result.success && result.user) {
        setUser(result.user as UserData)
      } else {
        setError(result.error || "Failed to fetch user")
      }
    } catch (err) {
      setError("An unexpected error occurred")
      console.error("Error in useUser:", err)
    } finally {
      setLoading(false)
    }
  }

  const updateProfile = async (data: Partial<UserData>): Promise<boolean> => {
    try {
      const result = await updateUserProfile({
        name: data.name,
        email: data.email,
        organization: data.organization,
        gender: data.gender,
        address: data.address,
        image: data.image,
      })

      if (result.success && result.user) {
        setUser((prev) => (prev ? { ...prev, ...result.user } : null))
        toast.success(result.message || "Profile updated successfully")
        return true
      } else {
        toast.error(result.error || "Failed to update profile")
        return false
      }
    } catch (err) {
      console.error("Error updating profile:", err)
      toast.error("An unexpected error occurred")
      return false
    }
  }

  useEffect(() => {
    fetchUser()
  }, [])

  return {
    user,
    loading,
    error,
    refetch: fetchUser,
    updateProfile,
  }
}

