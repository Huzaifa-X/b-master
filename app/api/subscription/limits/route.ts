import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { getCurrentSubscription } from "@/app/actions/subscription.action"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const userId = BigInt(session.user.id)
    const subscription = await getCurrentSubscription()

    // Get plan limits
    let assistantLimit = 1
    let planTitle = "Free"

    if (subscription) {
      const plan = await prisma.plan.findUnique({
        where: { id: subscription.planId },
        select: { assistantLimit: true, title: true }
      })
      assistantLimit = plan?.assistantLimit || 1
      planTitle = plan?.title || subscription.plan?.title || "Free"
    }

    // Count current assistants
    const currentAssistants = await prisma.assistant.count({
      where: {
        userId,
        deletedAt: null
      }
    })

    const canCreateMore = currentAssistants < assistantLimit
    const remaining = Math.max(0, assistantLimit - currentAssistants)

    return NextResponse.json({
      assistantLimit,
      planTitle,
      currentAssistants,
      canCreateMore,
      remaining
    })
  } catch (error: any) {
    console.error("Error fetching subscription limits:", error)
    return NextResponse.json(
      { error: "Failed to fetch limits" },
      { status: 500 }
    )
  }
}

