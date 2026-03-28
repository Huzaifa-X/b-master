"use server"

import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { getCurrentSubscription } from "@/app/actions/subscription.action"

export interface TokenCheckResult {
  allowed: boolean
  currentUsage: bigint
  limit: bigint
  remaining: bigint
  planTitle: string
  resetDate: Date
  error?: string
  isUnlimited: boolean
}

export interface TokenUsageStats {
  currentUsage: bigint
  limit: bigint
  remaining: bigint
  percentUsed: number
  resetDate: Date
  isUnlimited: boolean
  planTitle: string
}

/**
 * Get next reset date (1st of next month at midnight UTC)
 */
function getNextResetDate(): Date {
  const now = new Date()
  const nextMonth = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth() + 1,
    1, 0, 0, 0, 0
  ))
  return nextMonth
}

/**
 * Check if user can use tokens before making AI call
 * Implements lazy reset: automatically resets usage if reset date has passed
 *
 * @param estimatedTokens - Estimated tokens for this operation
 * @param userId - Optional user ID (falls back to session)
 * @returns TokenCheckResult with allowed status and usage info
 */
export async function canUseTokens(
  estimatedTokens: number,
  userId?: string
): Promise<TokenCheckResult> {
  try {
    // 1. Get user session
    const session = await getServerSession(authOptions)
    const actualUserId = userId || session?.user?.id

    if (!actualUserId) {
      return {
        allowed: false,
        currentUsage: 0n,
        limit: 0n,
        remaining: 0n,
        planTitle: "Unknown",
        resetDate: new Date(),
        isUnlimited: false,
        error: "Authentication required"
      }
    }

    const userIdBigInt = BigInt(actualUserId)

    // 2. Get user's plan limits
    const subscription = await getCurrentSubscription()

    let monthlyLimit: bigint
    let planTitle: string

    if (!subscription) {
      // Free plan - default limit
      monthlyLimit = 10000n
      planTitle = "Free"
    } else {
      const plan = await prisma.plan.findUnique({
        where: { id: subscription.planId },
        select: { monthlyTokenLimit: true, title: true }
      })

      monthlyLimit = BigInt(plan?.monthlyTokenLimit || 100000)
      planTitle = plan?.title || subscription.plan?.title || "Unknown"
    }

    // 3. Check if unlimited (enterprise)
    const isUnlimited = monthlyLimit === 0n
    if (isUnlimited) {
      return {
        allowed: true,
        currentUsage: 0n,
        limit: 0n,
        remaining: 0n,
        planTitle,
        resetDate: new Date(),
        isUnlimited: true
      }
    }

    // 4. Get user's current usage (with lazy reset check)
    const user = await prisma.user.findUnique({
      where: { id: userIdBigInt },
      select: {
        tokenUsage: true,
        tokenUsageResetAt: true
      }
    })

    if (!user) {
      return {
        allowed: false,
        currentUsage: 0n,
        limit: 0n,
        remaining: 0n,
        planTitle,
        resetDate: new Date(),
        isUnlimited: false,
        error: "User not found"
      }
    }

    // 5. Lazy reset if reset date has passed
    let currentUsage = BigInt(user.tokenUsage)
    let resetDate = user.tokenUsageResetAt

    if (new Date() >= resetDate) {
      // Reset usage and set next reset date
      const nextResetDate = getNextResetDate()
      await prisma.user.update({
        where: { id: userIdBigInt },
        data: {
          tokenUsage: 0,
          tokenUsageResetAt: nextResetDate
        }
      })
      currentUsage = 0n
      resetDate = nextResetDate
      console.log(`[TokenLimits] Lazy reset for user ${actualUserId}, next reset: ${nextResetDate.toISOString()}`)
    }

    // 6. Check if adding estimated tokens would exceed limit
    const projectedUsage = currentUsage + BigInt(estimatedTokens)
    const remaining = monthlyLimit - currentUsage
    const allowed = projectedUsage <= monthlyLimit

    if (!allowed) {
      return {
        allowed: false,
        currentUsage,
        limit: monthlyLimit,
        remaining,
        planTitle,
        resetDate,
        isUnlimited: false,
        error: `Monthly token limit exceeded. You've used ${currentUsage.toLocaleString()} of ${monthlyLimit.toLocaleString()} tokens. Your limit will reset on ${resetDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}. Upgrade to Enterprise for unlimited tokens.`
      }
    }

    return {
      allowed: true,
      currentUsage,
      limit: monthlyLimit,
      remaining,
      planTitle,
      resetDate,
      isUnlimited: false
    }

  } catch (error) {
    console.error("[TokenLimits] Error checking token limits:", error)
    return {
      allowed: false,
      currentUsage: 0n,
      limit: 0n,
      remaining: 0n,
      planTitle: "Unknown",
      resetDate: new Date(),
      isUnlimited: false,
      error: "Failed to check token limits"
    }
  }
}

/**
 * Track actual token usage after AI call completes
 * Updates user's tokenUsage counter
 * Non-blocking - doesn't fail the request if tracking fails
 *
 * @param userId - User ID
 * @param actualTokens - Actual tokens consumed
 */
export async function trackTokenUsage(
  userId: string,
  actualTokens: number
): Promise<void> {
  try {
    const userIdBigInt = BigInt(userId)

    // Increment user's token usage
    await prisma.user.update({
      where: { id: userIdBigInt },
      data: {
        tokenUsage: {
          increment: actualTokens
        }
      }
    })

    console.log(`[TokenLimits] Tracked ${actualTokens} tokens for user ${userId}`)
  } catch (error) {
    console.error("[TokenLimits] Error tracking token usage:", error)
    // Non-blocking - don't fail the request if tracking fails
  }
}

/**
 * Get user's token usage stats (for dashboard display)
 *
 * @param userId - Optional user ID (falls back to session)
 * @returns TokenUsageStats or null if user not found
 */
export async function getTokenUsageStats(userId?: string): Promise<TokenUsageStats | null> {
  try {
    // Use canUseTokens with 0 tokens to get current state
    const checkResult = await canUseTokens(0, userId)

    if (checkResult.isUnlimited) {
      return {
        currentUsage: 0n,
        limit: 0n,
        remaining: 0n,
        percentUsed: 0,
        resetDate: checkResult.resetDate,
        isUnlimited: true,
        planTitle: checkResult.planTitle
      }
    }

    const percentUsed = checkResult.limit > 0n
      ? Number((checkResult.currentUsage * 100n) / checkResult.limit)
      : 0

    return {
      currentUsage: checkResult.currentUsage,
      limit: checkResult.limit,
      remaining: checkResult.remaining,
      percentUsed,
      resetDate: checkResult.resetDate,
      isUnlimited: false,
      planTitle: checkResult.planTitle
    }
  } catch (error) {
    console.error("[TokenLimits] Error getting token usage stats:", error)
    return null
  }
}
