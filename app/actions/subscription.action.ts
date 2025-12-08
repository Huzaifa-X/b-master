"use server"

import { stripe } from "@/lib/stripe"
import prisma from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export interface CreateCheckoutSessionResult {
  success: boolean
  url?: string
  error?: string
}

/**
 * Create a Stripe Checkout Session for subscription
 */
export async function createCheckoutSession(
  planId: number
): Promise<CreateCheckoutSessionResult> {
  try {
    // Get current user session
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return {
        success: false,
        error: "You must be logged in to subscribe",
      }
    }

    const userId = BigInt(session.user.id)

    // Get the plan
    const plan = await prisma.plan.findUnique({
      where: { id: planId },
    })

    if (!plan) {
      return {
        success: false,
        error: "Plan not found",
      }
    }

    if (!plan.isActive) {
      return {
        success: false,
        error: "This plan is not available",
      }
    }

    // Free plan doesn't need Stripe
    if (plan.period === "free") {
      return {
        success: false,
        error: "Free plan doesn't require payment",
      }
    }

    if (!plan.stripePriceId) {
      return {
        success: false,
        error: "Plan is not configured for payments. Please contact support.",
      }
    }

    // Get or create Stripe customer
    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      return {
        success: false,
        error: "User not found",
      }
    }

    let stripeCustomerId = user.stripeAccountId

    // Create Stripe customer if doesn't exist
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name || undefined,
        metadata: {
          userId: userId.toString(),
        },
      })

      // Save Stripe customer ID to database
      await prisma.user.update({
        where: { id: userId },
        data: { stripeAccountId: customer.id },
      })

      stripeCustomerId = customer.id
    }

    // Get base URL for redirects
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "http://localhost:3000"

    // Create Stripe Checkout Session
    const checkoutSession = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      payment_method_types: ["card"],
      line_items: [
        {
          price: plan.stripePriceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${baseUrl}/pricing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/pricing/cancel`,
      metadata: {
        userId: userId.toString(),
        planId: planId.toString(),
      },
      subscription_data: {
        metadata: {
          userId: userId.toString(),
          planId: planId.toString(),
        },
      },
    })

    return {
      success: true,
      url: checkoutSession.url || undefined,
    }
  } catch (error: any) {
    console.error("Error creating checkout session:", error)
    return {
      success: false,
      error: error.message || "Failed to create checkout session",
    }
  }
}

/**
 * Get user's current subscription
 */
export async function getCurrentSubscription() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return null
    }

    const userId = BigInt(session.user.id)

    const subscription = await prisma.subscription.findFirst({
      where: {
        userId,
        status: {
          in: ["active", "trialing"],
        },
        deletedAt: null,
      },
      include: {
        plan: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    if (!subscription) {
      return null
    }

    // Convert Decimal objects to numbers for client component serialization
    return {
      ...subscription,
      id: Number(subscription.id),
      userId: subscription.userId.toString(),
      planId: Number(subscription.planId),
      amount: Number(subscription.amount),
      plan: {
        ...subscription.plan,
        id: Number(subscription.plan.id),
        amount: Number(subscription.plan.amount),
      },
    }
  } catch (error) {
    console.error("Error getting subscription:", error)
    return null
  }
}

/**
 * Get all available plans
 */
export async function getPlans() {
  try {
    const plans = await prisma.plan.findMany({
      where: {
        isActive: true,
        deletedAt: null,
      },
      orderBy: [
        { period: "asc" },
        { amount: "asc" },
      ],
    })

    // Convert Decimal objects to numbers for client component serialization
    return plans.map((plan) => ({
      ...plan,
      amount: Number(plan.amount),
      id: Number(plan.id),
    }))
  } catch (error) {
    console.error("Error getting plans:", error)
    return []
  }
}

/**
 * Get user's invoices
 */
export async function getInvoices() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return []
    }

    const userId = BigInt(session.user.id)

    const invoices = await prisma.invoice.findMany({
      where: {
        userId,
        deletedAt: null,
      },
      include: {
        subscription: {
          include: {
            plan: true,
          },
        },
      },
      orderBy: {
        invoiceDate: "desc",
      },
    })

    return invoices.map((invoice) => ({
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      status: invoice.status,
      amount: Number(invoice.amount),
      currency: invoice.currency,
      totalAmount: Number(invoice.totalAmount),
      invoiceDate: invoice.invoiceDate,
      paidAt: invoice.paidAt,
      description: invoice.description,
      subscription: invoice.subscription
        ? {
            id: invoice.subscription.id,
            plan: invoice.subscription.plan
              ? {
                  id: invoice.subscription.plan.id,
                  title: invoice.subscription.plan.title,
                }
              : null,
          }
        : null,
    }))
  } catch (error) {
    console.error("Error getting invoices:", error)
    return []
  }
}

/**
 * Cancel subscription
 */
export async function cancelSubscription() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return {
        success: false,
        error: "You must be logged in to cancel your subscription",
      }
    }

    const userId = BigInt(session.user.id)

    // Get current active subscription
    const subscription = await prisma.subscription.findFirst({
      where: {
        userId,
        status: {
          in: ["active", "trialing"],
        },
        deletedAt: null,
      },
    })

    if (!subscription) {
      return {
        success: false,
        error: "No active subscription found",
      }
    }

    if (!subscription.stripeSubscriptionId) {
      return {
        success: false,
        error: "Subscription is not linked to Stripe",
      }
    }

    // Cancel subscription in Stripe
    await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
      cancel_at_period_end: true,
    })

    // Update subscription in database
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        cancelAtPeriodEnd: true,
      },
    })

    return {
      success: true,
      message: "Subscription will be canceled at the end of the current period",
    }
  } catch (error: any) {
    console.error("Error canceling subscription:", error)
    return {
      success: false,
      error: error.message || "Failed to cancel subscription",
    }
  }
}

