"use server"

import { stripe } from "@/lib/stripe"
import prisma from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

// ============================================================
// CHECKOUT SESSION TYPES
// ============================================================

export interface CreateCheckoutSessionResult {
  success: boolean
  url?: string
  error?: string
}

/**
 * Create a Stripe Checkout Session for subscription
 * Following Guide 1: Stripe Checkout API Implementation
 */
export async function createCheckoutSession(
  planId: number
): Promise<CreateCheckoutSessionResult> {
  try {
    // ============================================
    // 1. AUTHENTICATION & AUTHORIZATION
    // ============================================
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return {
        success: false,
        error: "You must be logged in to subscribe",
      }
    }

    const userId = BigInt(session.user.id)

    // ============================================
    // 2. PLAN VALIDATION
    // ============================================
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

    // ============================================
    // 3. USER VERIFICATION
    // ============================================
    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      return {
        success: false,
        error: "User not found",
      }
    }

    // ============================================
    // 4. DUPLICATE SUBSCRIPTION PREVENTION (Backend)
    // ============================================
    if (user.stripeSubscriptionId) {
      // Double-check with Stripe that subscription is actually active
      try {
        const subscription = await stripe.subscriptions.retrieve(
          user.stripeSubscriptionId
        )

        if (subscription.status === "active" || subscription.status === "trialing") {
          return {
            success: false,
            error: "You already have an active subscription. Please manage it from your dashboard.",
          }
        }

        // If subscription is cancelled/expired, clean up old data
        console.log(`[Checkout] Cleaning up expired subscription for user ${userId}`)
        await prisma.user.update({
          where: { id: userId },
          data: {
            stripeSubscriptionId: null,
            subscriptionStatus: null,
            subscriptionPeriodEnd: null,
            currentPlanId: null,
          },
        })
      } catch (error: any) {
        // Subscription doesn't exist in Stripe, clean up database
        if (error.code === 'resource_missing') {
          console.log(`[Checkout] Subscription not found in Stripe, cleaning up database`)
          await prisma.user.update({
            where: { id: userId },
            data: {
              stripeSubscriptionId: null,
              subscriptionStatus: null,
              subscriptionPeriodEnd: null,
              currentPlanId: null,
            },
          })
        } else {
          throw error
        }
      }
    }

    // ============================================
    // 5. STRIPE CUSTOMER MANAGEMENT
    // ============================================
    let stripeCustomerId = user.stripeCustomerId

    // Create Stripe customer if doesn't exist
    if (!stripeCustomerId) {
      console.log(`[Checkout] Creating new Stripe customer for user ${userId}`)
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
        data: { stripeCustomerId: customer.id },
      })

      stripeCustomerId = customer.id
    }

    // ============================================
    // 6. PROMO CODE APPLICATION
    // ============================================
    const activePromotion = await prisma.userPromotion.findFirst({
      where: {
        userId: userId,
        isActive: true,
        redeemedAt: null,
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    // ============================================
    // 7. CHECKOUT SESSION CREATION
    // ============================================
    // Strip non-ASCII chars (em-dashes, curly quotes, zero-width spaces, etc.) that
    // sometimes sneak in when a URL is copy-pasted into a .env file.  Stripe rejects
    // success_url / cancel_url that contain any non-ASCII byte.
    const rawBaseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "http://localhost:3000"
    const baseUrl = rawBaseUrl.replace(/[^\x20-\x7E]/g, "").replace(/\s+/g, "").trim() || "http://localhost:3000"

    const checkoutSessionParams: any = {
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
    }

    if (activePromotion) {
      console.log(`[Checkout] Applying promo code ${activePromotion.code} for user ${userId}`)
      checkoutSessionParams.discounts = [
        {
          promotion_code: activePromotion.stripePromotionCodeId,
        },
      ]

      // Pass the promotion ID in metadata to easily mark it redeemed later
      checkoutSessionParams.metadata.promotionId = activePromotion.id.toString()
      checkoutSessionParams.subscription_data.metadata.promotionId = activePromotion.id.toString()
    }

    const checkoutSession = await stripe.checkout.sessions.create(checkoutSessionParams)

    console.log(`[Checkout] Created checkout session ${checkoutSession.id} for user ${userId}`)

    return {
      success: true,
      url: checkoutSession.url || undefined,
    }
  } catch (error: any) {
    console.error("Error creating checkout session:", error)

    // Provide more specific error messages for Stripe errors
    if (error.type === 'StripeInvalidRequestError') {
      return {
        success: false,
        error: error.message || "Invalid request to Stripe",
      }
    }

    if (error.type === 'StripeAPIError') {
      return {
        success: false,
        error: "Payment service is temporarily unavailable. Please try again later.",
      }
    }

    return {
      success: false,
      error: error.message || "Failed to create checkout session",
    }
  }
}

/**
 * Get user's current subscription
 * NOTE: Subscription data is now stored directly on the User model
 */
export async function getCurrentSubscription() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return null
    }

    const userId = BigInt(session.user.id)

    // Query User model with subscription fields
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        stripeCustomerId: true,
        stripeSubscriptionId: true,
        subscriptionStatus: true,
        subscriptionPeriodEnd: true,
        currentPlanId: true,
        currentPlan: true, // Include the related Plan
        cancelAtPeriodEnd: true, // ✅ NEW: Track cancellation
        scheduledPlanChangeId: true, // ✅ NEW: Track scheduled downgrade
        scheduledPlanChange: true, // ✅ NEW: Include scheduled plan details
        createdAt: true,
      },
    })

    if (!user) {
      return null
    }

    // Check if user has an active subscription
    if (!user.subscriptionStatus ||
      !["active", "trialing"].includes(user.subscriptionStatus) ||
      !user.currentPlan) {
      return null
    }

    // Return subscription data in the expected format
    return {
      id: user.stripeSubscriptionId || "",
      userId: user.id.toString(),
      planId: user.currentPlanId,
      status: user.subscriptionStatus,
      periodEnd: user.subscriptionPeriodEnd,
      stripeSubscriptionId: user.stripeSubscriptionId,
      stripeCustomerId: user.stripeCustomerId,
      createdAt: user.createdAt,
      cancelAtPeriodEnd: user.cancelAtPeriodEnd || false, // ✅ NEW
      scheduledPlanChangeId: user.scheduledPlanChangeId, // ✅ NEW
      plan: {
        id: user.currentPlan.id,
        title: user.currentPlan.title,
        description: user.currentPlan.description,
        period: user.currentPlan.period,
        amount: Number(user.currentPlan.amount),
        features: user.currentPlan.features,
        assistantLimit: user.currentPlan.assistantLimit,
      },
      scheduledPlan: user.scheduledPlanChange ? { // ✅ NEW
        id: user.scheduledPlanChange.id,
        title: user.scheduledPlanChange.title,
        amount: Number(user.scheduledPlanChange.amount),
      } : null,
    }
  } catch (error) {
    console.error("Error getting subscription:", error)
    return null
  }
}

// ============================================================
// BILLING PORTAL
// ============================================================

export interface CreatePortalSessionResult {
  success: boolean
  url?: string
  error?: string
}

/**
 * Create a Stripe Billing Portal session
 * Following Guide 3: Billing Portal Integration
 */
export async function createPortalSession(): Promise<CreatePortalSessionResult> {
  try {
    // ============================================
    // 1. AUTHENTICATION CHECK
    // ============================================
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return {
        success: false,
        error: "You must be logged in to access the billing portal",
      }
    }

    const userId = BigInt(session.user.id)

    // ============================================
    // 2. USER & SUBSCRIPTION VERIFICATION
    // ============================================
    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      return {
        success: false,
        error: "User not found",
      }
    }

    if (!user.stripeCustomerId) {
      return {
        success: false,
        error: "No subscription found. Please subscribe to a plan first.",
      }
    }

    // Optional: Check if user has active subscription
    if (!user.stripeSubscriptionId) {
      return {
        success: false,
        error: "No active subscription found.",
      }
    }

    // ============================================
    // 3. PORTAL SESSION CREATION
    // ============================================
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "http://localhost:3000"

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${baseUrl}/home`,
    })

    console.log(`[Portal] Created portal session for user ${userId}`)

    return {
      success: true,
      url: portalSession.url || undefined,
    }

  } catch (error: any) {
    console.error("[Portal] Error creating portal session:", error)

    // Handle Stripe-specific errors
    if (error.type === 'StripeInvalidRequestError') {
      return {
        success: false,
        error: "Customer not found. Please contact support.",
      }
    }

    return {
      success: false,
      error: error.message || "Failed to create portal session",
    }
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
 * Get user's subscription payment history from PaymentRecord table
 */
export async function getInvoices() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return []
    }

    const userId = BigInt(session.user.id)

    // Fetch subscription payment records for this user
    const paymentRecords = await prisma.paymentRecord.findMany({
      where: {
        userId,
        type: {
          in: ["subscription", "plan_change", "downgrade", "upgrade"], // Only subscription payments
        },
        status: {
          in: ["completed", "processing", "pending"], // Include relevant statuses
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    // Transform payment records into invoice format
    return paymentRecords.map((record) => {
      // Extract plan info from metadata if available
      const metadata = record.metadata as any
      const planInfo = metadata?.plan || null

      return {
        id: record.id.toString(),
        invoiceNumber: record.stripeInvoiceId || `INV-${record.id}`,
        status: record.status,
        amount: Number(record.amount),
        currency: record.currency,
        totalAmount: Number(record.amount), // For subscriptions, amount = totalAmount
        invoiceDate: record.createdAt,
        paidAt: record.completedAt,
        description: record.description || `Subscription payment`,
        stripeInvoiceId: record.stripeInvoiceId,
        stripeSubscriptionId: record.stripeSubscriptionId,
        plan: planInfo
          ? {
            id: planInfo.id,
            title: planInfo.title || planInfo.name,
            period: planInfo.period,
            amount: planInfo.amount,
          }
          : null,
      }
    })
  } catch (error) {
    console.error("Error getting subscription payment history:", error)
    return []
  }
}
