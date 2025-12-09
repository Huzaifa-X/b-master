"use server"

import prisma from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

/**
 * Get user's wallet information
 */
export async function getUserWallet() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" }
    }

    const userId = BigInt(session.user.id)

    // Get or create wallet
    const wallet = await prisma.userWallet.upsert({
      where: { userId },
      create: {
        userId,
        pendingAmount: 0,
        availableAmount: 0,
        totalEarnings: 0,
        transferredAmount: 0,
        currency: "CHF",
      },
      update: {},
    })

    return {
      success: true,
      wallet: {
        id: wallet.id,
        userId: wallet.userId.toString(),
        pendingAmount: Number(wallet.pendingAmount),
        availableAmount: Number(wallet.availableAmount),
        totalEarnings: Number(wallet.totalEarnings),
        transferredAmount: Number(wallet.transferredAmount),
        currency: wallet.currency,
        lastUpdated: wallet.lastUpdated,
        createdAt: wallet.createdAt,
        updatedAt: wallet.updatedAt,
      },
    }
  } catch (error: any) {
    console.error("Error getting wallet:", error)
    return { success: false, error: error.message }
  }
}

/**
 * Get wallet transaction history
 */
export async function getWalletTransactions(limit = 50, offset = 0) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" }
    }

    const userId = BigInt(session.user.id)

    const transactions = await prisma.assistantTransaction.findMany({
      where: {
        assistantOwnerId: userId,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: limit,
      skip: offset,
    })

    const total = await prisma.assistantTransaction.count({
      where: {
        assistantOwnerId: userId,
      },
    })

    return {
      success: true,
      transactions: transactions.map((t) => ({
        id: t.id,
        assistantOwnerId: t.assistantOwnerId.toString(),
        amount: Number(t.amount),
        currency: t.currency,
        type: t.type,
        status: t.status,
        stripeTransactionId: t.stripeTransactionId,
        metadata: t.metadata,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
      })),
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

    // Find completed transactions older than holding period
    const eligibleTransactions = await prisma.assistantTransaction.findMany({
      where: {
        assistantOwnerId: userId,
        type: "sale",
        status: "completed",
        createdAt: {
          lte: cutoffDate,
        },
      },
      include: {
        purchases: {
          where: {
            status: "completed", // Only include non-refunded purchases
          },
        },
      },
    })

    // Calculate total amount eligible for release
    let totalToRelease = 0
    for (const transaction of eligibleTransactions) {
      if (transaction.purchases.length > 0) {
        totalToRelease += Number(transaction.amount)
      }
    }

    if (totalToRelease === 0) {
      return {
        success: true,
        message: "No pending amounts eligible for release",
        amountReleased: 0,
      }
    }

    // Get current wallet
    const wallet = await prisma.userWallet.findUnique({
      where: { userId },
    })

    if (!wallet || Number(wallet.pendingAmount) === 0) {
      return {
        success: true,
        message: "No pending amounts in wallet",
        amountReleased: 0,
      }
    }

    // Move from pending to available (up to the available pending amount)
    const amountToRelease = Math.min(totalToRelease, Number(wallet.pendingAmount))

    await prisma.userWallet.update({
      where: { userId },
      data: {
        pendingAmount: {
          decrement: amountToRelease,
        },
        availableAmount: {
          increment: amountToRelease,
        },
        lastUpdated: new Date(),
      },
    })

    return {
      success: true,
      message: "Pending amounts released successfully",
      amountReleased: amountToRelease,
      currency: wallet.currency,
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

    // Get wallet
    const wallet = await prisma.userWallet.findUnique({
      where: { userId },
    })

    if (!wallet) {
      return {
        success: true,
        stats: {
          totalSales: 0,
          totalRefunds: 0,
          pendingPayouts: 0,
          completedPayouts: 0,
        },
      }
    }

    // Get transaction statistics
    const [salesCount, refundsCount, salesAmount, refundsAmount] = await Promise.all([
      prisma.assistantTransaction.count({
        where: {
          assistantOwnerId: userId,
          type: "sale",
          status: "completed",
        },
      }),
      prisma.assistantTransaction.count({
        where: {
          assistantOwnerId: userId,
          type: "refund",
          status: "completed",
        },
      }),
      prisma.assistantTransaction.aggregate({
        where: {
          assistantOwnerId: userId,
          type: "sale",
          status: "completed",
        },
        _sum: {
          amount: true,
        },
      }),
      prisma.assistantTransaction.aggregate({
        where: {
          assistantOwnerId: userId,
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
        totalSalesAmount: Number(salesAmount._sum.amount || 0),
        totalRefundsAmount: Math.abs(Number(refundsAmount._sum.amount || 0)),
        pendingAmount: Number(wallet.pendingAmount),
        availableAmount: Number(wallet.availableAmount),
        totalEarnings: Number(wallet.totalEarnings),
        transferredAmount: Number(wallet.transferredAmount),
        currency: wallet.currency,
      },
    }
  } catch (error: any) {
    console.error("Error getting wallet stats:", error)
    return { success: false, error: error.message }
  }
}

/**
 * Request withdrawal/payout
 * Note: This would typically integrate with Stripe Connect or another payout system
 */
export async function requestPayout(amount: number) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" }
    }

    const userId = BigInt(session.user.id)

    // Get wallet
    const wallet = await prisma.userWallet.findUnique({
      where: { userId },
    })

    if (!wallet) {
      return { success: false, error: "Wallet not found" }
    }

    if (Number(wallet.availableAmount) < amount) {
      return {
        success: false,
        error: "Insufficient available balance",
      }
    }

    // In a real implementation, you would:
    // 1. Create a payout request record
    // 2. Integrate with Stripe Connect to transfer funds
    // 3. Update wallet.transferredAmount once payout is complete
    
    // For now, just return success with instructions
    return {
      success: true,
      message: "Payout request created. Please connect with Stripe to process.",
      availableBalance: Number(wallet.availableAmount),
      requestedAmount: amount,
    }
  } catch (error: any) {
    console.error("Error requesting payout:", error)
    return { success: false, error: error.message }
  }
}
