"use server"

import prisma from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

/**
 * Get user's wallet information
 * Wallet data is stored directly on the User model
 */
export async function getUserWallet() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" }
    }

    const userId = BigInt(session.user.id)

    // Get user with wallet fields
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        pendingBalance: true,
        availableBalance: true,
        lifetimeEarnings: true,
        currency: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    if (!user) {
      return { success: false, error: "User not found" }
    }

    return {
      success: true,
      wallet: {
        userId: user.id.toString(),
        pendingBalance: Number(user.pendingBalance),
        availableBalance: Number(user.availableBalance),
        lifetimeEarnings: Number(user.lifetimeEarnings),
        currency: user.currency,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    }
  } catch (error: any) {
    console.error("Error getting wallet:", error)
    return { success: false, error: error.message }
  }
}

/**
 * Get wallet transaction history
 * Uses PaymentRecord model to track all payment activity
 */
export async function getWalletTransactions(limit = 50, offset = 0) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" }
    }

    const userId = BigInt(session.user.id)

    // Get payment records where user is the recipient (earnings)
    const transactions = await prisma.paymentRecord.findMany({
      where: {
        userId: userId, // User is the recipient
        type: {
          in: ["assistant_purchase", "payout", "refund"],
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: limit,
      skip: offset,
    })

    const total = await prisma.paymentRecord.count({
      where: {
        userId: userId,
        type: {
          in: ["assistant_purchase", "payout", "refund"],
        },
      },
    })

    return {
      success: true,
      transactions: transactions.map((t) => {
        // Safely merge metadata
        const existingMetadata = (t.metadata && typeof t.metadata === 'object')
          ? t.metadata as Record<string, any>
          : {}

        return {
          id: t.id.toString(),
          userId: t.userId.toString(),
          payerUserId: t.payerUserId?.toString() || null,
          amount: Number(t.amount),
          currency: t.currency,
          platformFee: Number(t.platformFee),
          netAmount: Number(t.netAmount),
          type: t.type,
          status: t.status,
          description: t.description,
          relatedType: t.relatedType,
          relatedId: t.relatedId?.toString() || null,
          stripePaymentIntentId: t.stripePaymentIntentId,
          stripeChargeId: t.stripeChargeId,
          stripeTransferId: t.stripeTransferId,
          stripePayoutId: t.stripePayoutId,
          metadata: existingMetadata,
          completedAt: t.completedAt,
          refundedAt: t.refundedAt,
          createdAt: t.createdAt,
          updatedAt: t.updatedAt,
        }
      }),
      total,
    }
  } catch (error: any) {
    console.error("Error getting wallet transactions:", error)
    return { success: false, error: error.message }
  }
}

/**
 * Release pending amounts to available after holding period
 * This should be run as a cron job or triggered manually
 * Default holding period: 7 days
 */
export async function releasePendingAmounts(holdingPeriodDays = 7) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" }
    }

    const userId = BigInt(session.user.id)

    // Calculate the cutoff date
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - holdingPeriodDays)

    // Find completed assistant purchase payments older than holding period
    const eligiblePayments = await prisma.paymentRecord.findMany({
      where: {
        userId: userId,
        type: "assistant_purchase",
        status: "completed",
        completedAt: {
          lte: cutoffDate,
        },
      },
    })

    // Calculate total amount eligible for release (use netAmount)
    const totalToRelease = eligiblePayments.reduce(
      (sum, payment) => sum + Number(payment.netAmount),
      0
    )

    if (totalToRelease === 0) {
      return {
        success: true,
        message: "No pending amounts eligible for release",
        amountReleased: 0,
      }
    }

    // Get current user wallet
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        pendingBalance: true,
        currency: true,
      },
    })

    if (!user || Number(user.pendingBalance) === 0) {
      return {
        success: true,
        message: "No pending amounts in wallet",
        amountReleased: 0,
      }
    }

    // Move from pending to available (up to the available pending amount)
    const amountToRelease = Math.min(totalToRelease, Number(user.pendingBalance))

    await prisma.user.update({
      where: { id: userId },
      data: {
        pendingBalance: {
          decrement: amountToRelease,
        },
        availableBalance: {
          increment: amountToRelease,
        },
      },
    })

    return {
      success: true,
      message: "Pending amounts released successfully",
      amountReleased: amountToRelease,
      currency: user.currency,
    }
  } catch (error: any) {
    console.error("Error releasing pending amounts:", error)
    return { success: false, error: error.message }
  }
}

/**
 * Get wallet statistics
 */
export async function getWalletStats() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" }
    }

    const userId = BigInt(session.user.id)

    // Get user wallet info
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        pendingBalance: true,
        availableBalance: true,
        lifetimeEarnings: true,
        currency: true,
      },
    })

    if (!user) {
      return {
        success: true,
        stats: {
          totalSales: 0,
          totalRefunds: 0,
          totalSalesAmount: 0,
          totalRefundsAmount: 0,
          pendingBalance: 0,
          availableBalance: 0,
          lifetimeEarnings: 0,
          currency: "CHF",
        },
      }
    }

    // Get transaction statistics from PaymentRecord
    const [salesCount, refundsCount, salesAmount, refundsAmount] = await Promise.all([
      prisma.paymentRecord.count({
        where: {
          userId: userId,
          type: "assistant_purchase",
          status: "completed",
        },
      }),
      prisma.paymentRecord.count({
        where: {
          userId: userId,
          type: "refund",
          status: "completed",
        },
      }),
      prisma.paymentRecord.aggregate({
        where: {
          userId: userId,
          type: "assistant_purchase",
          status: "completed",
        },
        _sum: {
          netAmount: true, // Use netAmount (after platform fee)
        },
      }),
      prisma.paymentRecord.aggregate({
        where: {
          userId: userId,
          type: "refund",
          status: "completed",
        },
        _sum: {
          amount: true,
        },
      }),
    ])

    return {
      success: true,
      stats: {
        totalSales: salesCount,
        totalRefunds: refundsCount,
        totalSalesAmount: Number(salesAmount._sum.netAmount || 0),
        totalRefundsAmount: Math.abs(Number(refundsAmount._sum.amount || 0)),
        pendingBalance: Number(user.pendingBalance),
        availableBalance: Number(user.availableBalance),
        lifetimeEarnings: Number(user.lifetimeEarnings),
        currency: user.currency,
      },
    }
  } catch (error: any) {
    console.error("Error getting wallet stats:", error)
    return { success: false, error: error.message }
  }
}

/**
 * Request withdrawal/payout via Stripe Connect
 */
export async function requestPayout(amount: number) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" }
    }

    const userId = BigInt(session.user.id)

    // Get user with wallet and Stripe Connect info
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        availableBalance: true,
        currency: true,
        stripeConnectAccountId: true,
        stripeConnectStatus: true,
        stripeConnectPayoutsEnabled: true,
      },
    })

    if (!user) {
      return { success: false, error: "User not found" }
    }

    if (Number(user.availableBalance) < amount) {
      return {
        success: false,
        error: "Insufficient available balance",
      }
    }

    // Check if Stripe Connect is set up
    if (!user.stripeConnectAccountId || !user.stripeConnectPayoutsEnabled) {
      return {
        success: false,
        error: "Please complete Stripe Connect onboarding to request payouts",
        needsOnboarding: true,
      }
    }

    if (user.stripeConnectStatus !== "active") {
      return {
        success: false,
        error: "Your Stripe Connect account is not active. Please complete verification.",
        needsOnboarding: true,
      }
    }

    // Create a payout request record
    await prisma.paymentRecord.create({
      data: {
        userId: userId,
        type: "payout",
        amount: amount,
        currency: user.currency,
        platformFee: 0,
        netAmount: amount,
        status: "pending",
        description: `Payout request for ${amount} ${user.currency}`,
        metadata: {
          requestedAt: new Date().toISOString(),
          stripeConnectAccountId: user.stripeConnectAccountId,
        },
      },
    })

    // In a real implementation, you would:
    // 1. Create a Stripe Transfer to the connected account
    // 2. Update the payment record with stripeTransferId
    // 3. Deduct from availableBalance
    // 4. Update status to "completed" when transfer succeeds

    return {
      success: true,
      message: "Payout request created successfully. Processing may take 1-2 business days.",
      availableBalance: Number(user.availableBalance),
      requestedAmount: amount,
    }
  } catch (error: any) {
    console.error("Error requesting payout:", error)
    return { success: false, error: error.message }
  }
}
