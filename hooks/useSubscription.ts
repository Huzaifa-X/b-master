"use client"

import { useQuery } from "@tanstack/react-query"
import { getCurrentSubscription } from "@/app/actions/subscription.action"

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

export function useSubscription() {
  const {
    data: subscription,
    isLoading: loading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["subscription", "current"],
    queryFn: async () => {
      const data = await getCurrentSubscription()
      return data as SubscriptionWithPlan | null
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes (formerly cacheTime)
    retry: 1,
    refetchOnWindowFocus: false,
  })

  return {
    subscription: subscription || null,
    loading,
    isError,
    error: error instanceof Error ? error.message : null,
    refetch,
  }
}

