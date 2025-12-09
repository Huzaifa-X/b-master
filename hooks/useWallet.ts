"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { getUserWallet, getWalletTransactions, getWalletStats, releasePendingAmounts, requestPayout } from "@/app/actions/wallet.action"

export interface WalletData {
  userId: string
  pendingAmount: number
  availableAmount: number
  totalEarnings: number
  transferredAmount: number
  currency: string
  lastUpdated: Date
}

export interface WalletTransaction {
  id: number
  assistantOwnerId: string
  amount: number
  currency: string
  type: string
  status: string
  stripeTransactionId: string | null
  metadata: any
  createdAt: Date
  updatedAt: Date
}

export interface WalletStats {
  totalSales: number
  totalRefunds: number
  totalSalesAmount: number
  totalRefundsAmount: number
  pendingAmount: number
  availableAmount: number
  totalEarnings: number
  transferredAmount: number
  currency: string
}

// Query keys for React Query cache management
const WALLET_KEYS = {
  all: ["wallet"] as const,
  details: () => [...WALLET_KEYS.all, "details"] as const,
  transactions: (limit?: number, offset?: number) => 
    [...WALLET_KEYS.all, "transactions", { limit, offset }] as const,
  stats: () => [...WALLET_KEYS.all, "stats"] as const,
}

export function useWallet(limit = 50, offset = 0) {
  const queryClient = useQueryClient()

  // Fetch wallet details with caching
  const {
    data: walletData,
    isLoading: loading,
    error: walletError,
    refetch: refetchWallet,
  } = useQuery({
    queryKey: WALLET_KEYS.details(),
    queryFn: async () => {
      const result = await getUserWallet()
      if (result.success && result.wallet) {
        return result.wallet as WalletData
      }
      throw new Error(result.error || "Failed to load wallet")
    },
    staleTime: 30000, // Consider data fresh for 30 seconds
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes (formerly cacheTime)
  })

  // Fetch transactions with caching
  const {
    data: transactionsData,
    isLoading: transactionsLoading,
    refetch: refetchTransactions,
  } = useQuery({
    queryKey: WALLET_KEYS.transactions(limit, offset),
    queryFn: async () => {
      const result = await getWalletTransactions(limit, offset)
      if (result.success && result.transactions) {
        return result.transactions as WalletTransaction[]
      }
      return []
    },
    staleTime: 60000, // 1 minute
    gcTime: 10 * 60 * 1000, // 10 minutes
  })

  // Fetch stats with caching
  const {
    data: statsData,
    isLoading: statsLoading,
    refetch: refetchStats,
  } = useQuery({
    queryKey: WALLET_KEYS.stats(),
    queryFn: async () => {
      const result = await getWalletStats()
      if (result.success && result.stats) {
        return result.stats as WalletStats
      }
      return null
    },
    staleTime: 60000, // 1 minute
    gcTime: 10 * 60 * 1000, // 10 minutes
  })

  // Mutation for releasing earnings
  const releaseEarningsMutation = useMutation({
    mutationFn: async (holdingPeriodDays: number = 7) => {
      const result = await releasePendingAmounts(holdingPeriodDays)
      if (!result.success) {
        throw new Error(result.error || "Failed to release earnings")
      }
      return result
    },
    onSuccess: () => {
      // Invalidate and refetch wallet queries
      queryClient.invalidateQueries({ queryKey: WALLET_KEYS.details() })
      queryClient.invalidateQueries({ queryKey: WALLET_KEYS.stats() })
    },
  })

  // Mutation for requesting payout
  const requestPayoutMutation = useMutation({
    mutationFn: async (amount: number) => {
      const result = await requestPayout(amount)
      if (!result.success) {
        throw new Error(result.error || "Failed to request payout")
      }
      return result
    },
    onSuccess: () => {
      // Invalidate and refetch wallet queries
      queryClient.invalidateQueries({ queryKey: WALLET_KEYS.details() })
    },
  })

  return {
    // Data
    wallet: walletData ?? null,
    transactions: transactionsData ?? [],
    stats: statsData ?? null,
    
    // Loading states
    loading,
    transactionsLoading,
    statsLoading,
    
    // Error
    error: walletError?.message ?? null,
    
    // Refetch functions
    refetch: refetchWallet,
    refetchTransactions,
    refetchStats,
    
    // Mutations
    releaseEarnings: async (holdingPeriodDays = 7) => {
      try {
        const result = await releaseEarningsMutation.mutateAsync(holdingPeriodDays)
        return result
      } catch (err: any) {
        return { success: false, error: err.message }
      }
    },
    requestWithdrawal: async (amount: number) => {
      try {
        const result = await requestPayoutMutation.mutateAsync(amount)
        return result
      } catch (err: any) {
        return { success: false, error: err.message }
      }
    },
    
    // Mutation states
    isReleasingEarnings: releaseEarningsMutation.isPending,
    isRequestingPayout: requestPayoutMutation.isPending,
  }
}
