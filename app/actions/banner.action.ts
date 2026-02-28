"use server"

import prisma from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export interface BannerData {
  id: number
  name: string
  message: string
  buttonText: string | null
  buttonUrl: string | null
  type: "INFO" | "WARNING" | "PROMO" | "ANNOUNCEMENT"
}

/**
 * Get the active banner for the current user based on their plan
 */
export async function getActiveBannerForUser(): Promise<BannerData | null> {
  try {
    const session = await getServerSession(authOptions)

    // Get user's current plan (null if not logged in or no plan)
    let userPlanId: number | null = null
    let userId: bigint | null = null

    if (session?.user?.id) {
      userId = BigInt(session.user.id)
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { currentPlanId: true }
      })
      userPlanId = user?.currentPlanId ?? null
    }

    const now = new Date()

    // Build the where clause for targeting
    const banners = await prisma.banner.findMany({
      where: {
        isActive: true,
        deletedAt: null,
        // Check date range
        OR: [
          { startDate: null, endDate: null },
          { startDate: { lte: now }, endDate: null },
          { startDate: null, endDate: { gte: now } },
          { startDate: { lte: now }, endDate: { gte: now } },
        ],
      },
      orderBy: {
        priority: "desc", // Higher priority first
      },
    })

    // Filter banners based on audience targeting
    for (const banner of banners) {
      // Check if user has dismissed this banner
      if (userId) {
        const dismissed = await prisma.userDismissedBanner.findUnique({
          where: {
            userId_bannerId: {
              userId: userId,
              bannerId: banner.id,
            },
          },
        })
        if (dismissed) continue
      }

      // Check audience targeting
      const audience = banner.targetAudience

      if (audience === "ALL") {
        return formatBanner(banner)
      }

      if (audience === "FREE_USERS" && userPlanId === null) {
        return formatBanner(banner)
      }

      if (audience === "PAID_USERS" && userPlanId !== null) {
        return formatBanner(banner)
      }

      if (audience === "SPECIFIC_PLANS" && banner.targetPlanIds.length > 0) {
        if (userPlanId && banner.targetPlanIds.includes(userPlanId)) {
          return formatBanner(banner)
        }
      }
    }

    return null
  } catch (error) {
    console.error("Error fetching banner:", error)
    return null
  }
}

/**
 * Dismiss a banner for the current user
 */
export async function dismissBanner(bannerId: number): Promise<boolean> {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return false
    }

    const userId = BigInt(session.user.id)

    await prisma.userDismissedBanner.upsert({
      where: {
        userId_bannerId: {
          userId: userId,
          bannerId: bannerId,
        },
      },
      create: {
        userId: userId,
        bannerId: bannerId,
      },
      update: {
        dismissedAt: new Date(),
      },
    })

    return true
  } catch (error) {
    console.error("Error dismissing banner:", error)
    return false
  }
}

function formatBanner(banner: any): BannerData {
  return {
    id: banner.id,
    name: banner.name,
    message: banner.message,
    buttonText: banner.buttonText,
    buttonUrl: banner.buttonUrl,
    type: banner.type,
  }
}
