"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  getCurrentSubscription,
  getPlans,
  createCheckoutSession,
  createPortalSession,
  CreatePortalSessionResult
} from "@/app/actions/subscription.action"

export interface SubscriptionWithPlan {
  id: number
  userId: string
  planId: number
  status: "active" | "canceled" | "past_due" | "unpaid" | "trialing"
  amount: number
  currency: string
  currentPeriodStart: Date | null
  currentPeriodEnd: Date | null
  cancelAtPeriodEnd: boolean
  canceledAt: Date | null
  trialStart: Date | null
  trialEnd: Date | null
  plan: {
    id: number
    title: string
    amount: number
    period: string
  }
}

export interface Plan {
  id: number
  title: string
  description: string | null
  amount: number
  currency: string
  period: string
  features: string[]
  isActive: boolean
}

// Query keys for React Query cache management
const SUBSCRIPTION_KEYS = {
  all: ["subscription"] as const,
  current: () => [...SUBSCRIPTION_KEYS.all, "current"] as const,
  plans: () => [...SUBSCRIPTION_KEYS.all, "plans"] as const,
}

/**
 * Hook to fetch all available subscription plans
 */
export function usePlans() {
  const {
    data: plans,
    isLoading: loading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: SUBSCRIPTION_KEYS.plans(),
    queryFn: async () => {
      return await getPlans()
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - plans don't change often
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
    refetchOnWindowFocus: false,
  })

  return {
    plans: plans || [],
    loading,
    isError,
    error: error instanceof Error ? error.message : null,
    refetch,
  }
}

/**
 * Hook to manage user's subscription
 */
export function useSubscription() {
  const queryClient = useQueryClient()

  const {
    data: subscription,
    isLoading: loading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: SUBSCRIPTION_KEYS.current(),
    queryFn: async () => {
      const data = await getCurrentSubscription()
      return data as SubscriptionWithPlan | null
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes (formerly cacheTime)
    retry: 1,
    refetchOnWindowFocus: false,
  })

  // Mutation for creating checkout session
  const createCheckoutMutation = useMutation({
    mutationFn: async (planId: number) => {
      const result = await createCheckoutSession(planId)
      if (!result.success) {
        throw new Error(result.error || "Failed to create checkout session")
      }
      return result
    },
    onSuccess: () => {
      // Invalidate subscription queries as user might have a new subscription
      queryClient.invalidateQueries({ queryKey: SUBSCRIPTION_KEYS.current() })
    },
  })

  // Mutation for creating portal session
  const createPortalMutation = useMutation({
    mutationFn: async () => {
      const result = await createPortalSession()
      if (!result.success) {
        throw new Error(result.error || "Failed to create portal session")
      }
      return result
    },
  })

  return {
    subscription: subscription || null,
    loading,
    isError,
    error: error instanceof Error ? error.message : null,
    refetch,

    // Mutation for creating checkout session
    createCheckout: async (planId: number) => {
      try {
        const result = await createCheckoutMutation.mutateAsync(planId)
        return result
      } catch (err: any) {
        return { success: false, error: err.message }
      }
    },

    // Mutation state for checkout
    isCreatingCheckout: createCheckoutMutation.isPending,

    // Mutation for creating portal session
    createPortal: async (): Promise<CreatePortalSessionResult> => {
      try {
        const result = await createPortalMutation.mutateAsync()
        return result
      } catch (err: any) {
        return { success: false, error: err.message }
      }
    },

    // Mutation state for portal
    isCreatingPortal: createPortalMutation.isPending,
  }
}
