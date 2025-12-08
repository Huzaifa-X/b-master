"use server"

import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { getCurrentSubscription } from "@/app/actions/subscription.action"

/**
 * Get the user's current plan limits
 * Returns the plan's assistantLimit or default to 1 for free users
 */
export async function getUserPlanLimits() {
  try {
    const subscription = await getCurrentSubscription()
    
    if (!subscription) {
      // Free plan - default limit
      return {
        assistantLimit: 1,
        planTitle: "Free"
      }
    }

    // Get the full plan details to access assistantLimit
    const plan = await prisma.plan.findUnique({
      where: { id: subscription.planId },
      select: { assistantLimit: true, title: true }
    })

    return {
      assistantLimit: plan?.assistantLimit || 1,
      planTitle: plan?.title || subscription.plan?.title || "Unknown"
    }
  } catch (error) {
    console.error("Error getting user plan limits:", error)
    // Default to free plan limits on error
    return {
      assistantLimit: 1,
      planTitle: "Free"
    }
  }
}

/**
 * Check if user can create more assistants
 * Returns true if user is within their limit, false otherwise
 */
export async function canCreateAssistant(): Promise<{
  allowed: boolean
  currentCount: number
  limit: number
  planTitle: string
  error?: string
}> {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return {
        allowed: false,
        currentCount: 0,
        limit: 0,
        planTitle: "Unknown",
        error: "Authentication required"
      }
    }

    const userId = BigInt(session.user.id)

    // Get user's plan limits
    const limits = await getUserPlanLimits()

    // Count existing assistants created by this user
    const assistantCount = await prisma.assistant.count({
      where: {
        userId,
        deletedAt: null
      }
    })

    const allowed = assistantCount < limits.assistantLimit

    return {
      allowed,
      currentCount: assistantCount,
      limit: limits.assistantLimit,
      planTitle: limits.planTitle,
      error: allowed ? undefined : `You have reached your plan limit of ${limits.assistantLimit} assistant(s). Please upgrade your plan to create more assistants.`
    }
  } catch (error) {
    console.error("Error checking assistant creation limit:", error)
    return {
      allowed: false,
      currentCount: 0,
      limit: 0,
      planTitle: "Unknown",
      error: "Failed to check plan limits"
    }
  }
}

