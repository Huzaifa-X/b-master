"use client"

import { useQuery } from "@tanstack/react-query"
import { useSubscription } from "./useSubscription"

export function useSubscriptionLimits() {
  const { subscription, loading: subscriptionLoading } = useSubscription()

  const {
    data: limits,
    isLoading: limitsLoading,
  } = useQuery({
    queryKey: ["subscription-limits", subscription?.planId],
    queryFn: async () => {
      const response = await fetch("/api/subscription/limits")
      if (!response.ok) {
        throw new Error("Failed to fetch limits")
      }
      return response.json()
    },
    enabled: !subscriptionLoading,
    staleTime: 30 * 1000, // 30 seconds
  })

  return {
    limits: limits || {
      assistantLimit: 1,
      planTitle: "Free",
      currentAssistants: 0,
      canCreateMore: true,
      remaining: 1
    },
    loading: limitsLoading || subscriptionLoading,
  }
}

