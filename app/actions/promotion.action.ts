"use server"

import { stripe } from "@/lib/stripe"
import prisma from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export interface AssignPromotionResult {
    success: boolean
    promotion?: any
    error?: string
}

/**
 * Assign an existing Stripe Coupon to a user as a unique Promotion Code.
 * The Admin UI will call this action.
 */
export async function assignPromotionToUser(
    userId: string,
    stripeCouponId: string,
    customCodePrefix = "GIFT"
): Promise<AssignPromotionResult> {
    try {
        // Basic verification - Ensure the admin is performing this in a real app
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return { success: false, error: "Unauthorized" }
        }

        const targetUserId = BigInt(userId)

        const user = await prisma.user.findUnique({
            where: { id: targetUserId },
        })

        if (!user) {
            return { success: false, error: "User not found" }
        }

        // Verify the coupon exists in Stripe
        const stripeCoupon = await stripe.coupons.retrieve(stripeCouponId)

        // Generate a unique code (e.g. GIFT-A8F23B)
        const uniqueSuffix = Math.random().toString(36).substring(2, 8).toUpperCase()
        const promotionCodeValue = `${customCodePrefix}-${uniqueSuffix}`

        // Create a customer-specific Promotion Code in Stripe attached to the Coupon
        // If the user doesn't have a Stripe Customer ID yet, we'll just create a general promotion code
        // restricted to 1 use.
        const promotionCodeParams: any = {
            coupon: stripeCouponId,
            code: promotionCodeValue,
            max_redemptions: 1, // Only allow this code to be used once
        }

        if (user.stripeCustomerId) {
            promotionCodeParams.customer = user.stripeCustomerId
        }

        const stripePromoCode = await stripe.promotionCodes.create(promotionCodeParams)

        // Save it to our database
        const userPromotion = await prisma.userPromotion.create({
            data: {
                userId: targetUserId,
                stripeCouponId: stripeCoupon.id,
                stripePromotionCodeId: stripePromoCode.id,
                code: stripePromoCode.code,
                discountPercent: stripeCoupon.percent_off ? stripeCoupon.percent_off : null,
                discountAmount: stripeCoupon.amount_off ? stripeCoupon.amount_off / 100 : null,
                isActive: true,
            },
        })

        return {
            success: true,
            promotion: {
                id: userPromotion.id,
                code: userPromotion.code,
                discountPercent: Number(userPromotion.discountPercent),
                discountAmount: Number(userPromotion.discountAmount),
            },
        }
    } catch (error: any) {
        console.error("Error assigning promotion:", error)
        return {
            success: false,
            error: error.message || "Failed to assign promotion",
        }
    }
}

/**
 * Gets the active promotion for the currently logged-in user.
 */
export async function getActivePromotionForUser() {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return null
        }

        const userId = BigInt(session.user.id)

        // Find a promotion that has not been redeemed and is active
        const promotion = await prisma.userPromotion.findFirst({
            where: {
                userId: userId,
                isActive: true,
                redeemedAt: null,
            },
            orderBy: {
                createdAt: "desc",
            },
        })

        if (!promotion) return null

        return {
            id: promotion.id,
            code: promotion.code,
            stripePromotionCodeId: promotion.stripePromotionCodeId,
            discountPercent: promotion.discountPercent ? Number(promotion.discountPercent) : null,
            discountAmount: promotion.discountAmount ? Number(promotion.discountAmount) : null,
        }
    } catch (error) {
        console.error("Error fetching active promotion:", error)
        return null
    }
}
