"use client"

import { useQuery } from "@tanstack/react-query"
import { getInvoices } from "@/app/actions/subscription.action"

export interface Invoice {
  id: number
  invoiceNumber: string
  status: string
  amount: number
  currency: string
  totalAmount: number
  invoiceDate: Date
  paidAt: Date | null
  description: string | null
  subscription: {
    id: number
    plan: {
      id: number
      title: string
    } | null
  } | null
}

export function useInvoices() {
  const {
    data: invoices,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["invoices"],
    queryFn: async () => {
      const data = await getInvoices()
      return data as Invoice[]
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  })

  return {
    invoices: invoices || [],
    loading: isLoading,
    isError,
    error: error instanceof Error ? error.message : null,
    refetch,
  }
}

