"use client"

import { useEffect, useState } from "react"
import { Gift, Percent } from "lucide-react"
import { getActivePromotionForUser } from "@/app/actions/promotion.action"
import { useSidebar } from "@/components/ui/sidebar"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

type Promotion = {
  id: number
  code: string
  stripePromotionCodeId: string
  discountPercent: number | null
  discountAmount: number | null
}

export function SidebarPromotion() {
  const [promotion, setPromotion] = useState<Promotion | null>(null)
  const [loading, setLoading] = useState(true)
  const { state } = useSidebar()
  const isCollapsed = state === "collapsed"

  useEffect(() => {
    async function fetchPromotion() {
      try {
        const result = await getActivePromotionForUser()
        setPromotion(result)
      } catch (error) {
        console.error("Failed to fetch promotion:", error)
      } finally {
        setLoading(false)
      }
    }
    fetchPromotion()
  }, [])

  if (loading || !promotion) {
    return null
  }

  const discountText = promotion.discountPercent
    ? `${promotion.discountPercent}% OFF`
    : promotion.discountAmount
      ? `CHF ${promotion.discountAmount} OFF`
      : null

  if (!discountText) {
    return null
  }

  // Collapsed state - show icon with tooltip
  if (isCollapsed) {
    return (
      <div className="px-2 pb-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center justify-center w-8 h-8 rounded-md bg-gradient-to-r from-emerald-500 to-teal-500 cursor-default">
              <Gift className="h-4 w-4 text-white" />
            </div>
          </TooltipTrigger>
          <TooltipContent side="right" className="flex flex-col gap-1">
            <span className="font-semibold">{discountText}</span>
            <span className="text-xs text-muted-foreground">Code: {promotion.code}</span>
          </TooltipContent>
        </Tooltip>
      </div>
    )
  }

  // Expanded state - show full banner
  return (
    <div className="px-2 pb-2">
      <div className="relative overflow-hidden rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 p-3 text-white">
        <div className="absolute -right-2 -top-2 opacity-10">
          <Percent className="h-16 w-16" />
        </div>
        <div className="relative z-10 flex items-center gap-2">
          <Gift className="h-5 w-5 flex-shrink-0" />
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-medium opacity-90">You have a coupon!</span>
            <span className="text-sm font-bold truncate">{discountText}</span>
          </div>
        </div>
        <div className="relative z-10 mt-2 flex items-center gap-1.5 text-xs opacity-90">
          <span className="bg-white/20 px-1.5 py-0.5 rounded font-mono truncate">
            {promotion.code}
          </span>
          <span className="flex-shrink-0">Auto-applied at checkout</span>
        </div>
      </div>
    </div>
  )
}