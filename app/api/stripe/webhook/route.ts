import { NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import prisma from "@/lib/prisma"
import Stripe from "stripe"
import NotificationService from "@/lib/services/notifactionService"

/**
 * Stripe Webhook Handler
 * Handles subscription lifecycle events
 * 
 * Stripe Configuration:
 * - Plan changes: "Charge or credit the full difference"
 * - Charge timing: "Invoice prorations immediately at the time of the update"
 * - Downgrades: "Update immediately"
 * 
 * Events handled:
 * - checkout.session.completed: Activates subscription after initial payment
 * - customer.subscription.updated: Syncs all plan changes, renewals, and status updates
 * - customer.subscription.deleted: Handles subscription cancellations
 * - invoice.payment_succeeded: Logs successful payments
 * - invoice.payment_failed: Handles failed payments and updates status
 */

export async function POST(req: NextRequest) {
    // ============================================
    // 1. SIGNATURE VERIFICATION
    // ============================================
    const body = await req.text()
    const signature = req.headers.get("stripe-signature")

    if (!signature) {
        console.error("[Webhook] No signature provided")
        return NextResponse.json(
            { error: "No signature provided" },
            { status: 400 }
        )
    }

    if (!process.env.STRIPE_WEBHOOK_SECRET) {
        console.error("[Webhook] STRIPE_WEBHOOK_SECRET is not set")
        return NextResponse.json(
            { error: "Webhook secret not configured" },
            { status: 500 }
        )
    }

    let event: Stripe.Event

    try {
        event = stripe.webhooks.constructEvent(
            body,
            signature,
            process.env.STRIPE_WEBHOOK_SECRET
        )
    } catch (err: any) {
        console.error("[Webhook] Signature verification failed:", err.message)
        return NextResponse.json(
            { error: `Webhook Error: ${err.message}` },
            { status: 400 }
        )
    }

    console.log(`[Webhook] Received event: ${event.type}`)

    // ============================================
    // 2. EVENT HANDLING
    // ============================================
    try {
        switch (event.type) {
            // ============================================
            // EVENT 1: CHECKOUT SESSION COMPLETED
            // Fires when user successfully completes payment
            // ============================================
            case "checkout.session.completed": {
                const session = event.data.object as Stripe.Checkout.Session

                // Handle assistant purchases (one-time payments with Connect)
                if (session.mode === "payment" && session.metadata?.type === "assistant_purchase") {
                    try {
                        const userId = BigInt(session.metadata?.userId || "0");
                        const assistantId = session.metadata?.assistantId;
                        if (!userId || !assistantId) {
                            console.error("❌ Missing userId or assistantId in metadata");
                            break;
                        }
                        const assistantIdBigInt = BigInt(assistantId);
                        // Get payment intent
                        const paymentIntentId = typeof session.payment_intent === "string"
                            ? session.payment_intent
                            : session.payment_intent?.id || null;
                        if (!paymentIntentId) {
                            console.error("❌ No payment intent ID");
                            break;
                        }
                        // Get payment intent details
                        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
                        // Get assistant
                        const assistant = await prisma.assistant.findUnique({
                            where: { id: assistantIdBigInt },
                            include: { owner: true },
                        });
                        if (!assistant) {
                            console.error("❌ Assistant not found");
                            break;
                        }
                        // Calculate amounts
                        const amount = assistant.price.toNumber();
                        const platformFee = amount * 0.15; // 15%
                        const netAmount = amount - platformFee;
                        // Update payment record to completed with assistant name in metadata
                        await prisma.paymentRecord.updateMany({
                            where: {
                                stripeCheckoutSessionId: session.id,
                                status: "pending",
                            },
                            data: {
                                status: "completed",
                                stripePaymentIntentId: paymentIntent.id,
                                completedAt: new Date(),
                                metadata: {
                                    assistantId: assistantId,
                                    assistantName: assistant.name,
                                    buyerId: userId.toString(),
                                    creatorId: assistant.userId.toString(),
                                },
                            },
                        });
                        // Update creator's wallet
                        await prisma.user.update({
                            where: { id: assistant.userId },
                            data: {
                                pendingBalance: {
                                    increment: netAmount,
                                },
                                lifetimeEarnings: {
                                    increment: netAmount,
                                },
                            },
                        });
                        // Grant buyer access (create AssistantContact)
                        const existingContact = await prisma.assistantContact.findFirst({
                            where: {
                                assistantId: assistantIdBigInt,
                                userId: userId,
                            },
                        });
                        if (!existingContact) {
                            let buyerPermissionsArray: string[] = [];
                            if (assistant.buyerPermissions) {
                                try {
                                    const parsed = JSON.parse(assistant.buyerPermissions);
                                    if (Array.isArray(parsed)) {
                                        buyerPermissionsArray = parsed;
                                    }
                                } catch (error) {
                                    console.error('Error parsing buyerPermissions:', error);
                                }
                            }
                            await prisma.assistantContact.create({
                                data: {
                                    assistantId: assistantIdBigInt,
                                    userId: userId,
                                    access: "user",
                                    permissions: JSON.stringify(buyerPermissionsArray),
                                },
                            });
                            console.log(`✅ AssistantContact created for buyer`);
                        }

                        // -------------------------------------------------------
                        // COPY ARTIFACTS FOR BUYER
                        // Each buyer gets their own editable copy of every artifact
                        // that the creator has published on this assistant.
                        // -------------------------------------------------------
                        try {
                            const originalArtifacts = await prisma.assistantArtifact.findMany({
                                where: {
                                    assistantId: assistantIdBigInt,
                                    userId: assistant.userId, // only the creator's original artifacts
                                    deletedAt: null,
                                },
                                include: {
                                    activeVersion: true,
                                },
                            });

                            let copiedCount = 0;
                            for (const artifact of originalArtifacts) {
                                // Idempotency: skip if buyer already has a copy
                                const existingCopy = await prisma.assistantArtifact.findFirst({
                                    where: {
                                        assistantId: assistantIdBigInt,
                                        userId: userId,
                                        name: artifact.name,
                                        deletedAt: null,
                                    },
                                });
                                if (existingCopy) continue;

                                // Create the buyer's personal artifact copy
                                const buyerArtifact = await prisma.assistantArtifact.create({
                                    data: {
                                        assistantId: assistantIdBigInt,
                                        userId: userId,
                                        name: artifact.name,
                                        instructions: artifact.instructions,
                                        category: artifact.category,
                                        tools: artifact.tools as any,
                                        apiKeys: artifact.apiKeys as any,
                                        isPublic: false,
                                        files: artifact.files as any,
                                        images: artifact.images as any,
                                        thumbnailUrl: artifact.thumbnailUrl,
                                        videoMetadata: artifact.videoMetadata as any,
                                        videoUrl: artifact.videoUrl,
                                    },
                                });

                                // Copy the active version's code into version 1 of the copy
                                if (artifact.activeVersion?.code) {
                                    const buyerVersion = await prisma.artifactVersion.create({
                                        data: {
                                            artifactId: buyerArtifact.id,
                                            userId: userId,
                                            versionNumber: 1,
                                            versionName: artifact.activeVersion.versionName ?? "Version 1",
                                            code: artifact.activeVersion.code,
                                            description: "Purchased copy",
                                            changeType: "manual",
                                            isSnapshot: false,
                                        },
                                    });

                                    // Set the copied version as active
                                    await prisma.assistantArtifact.update({
                                        where: { id: buyerArtifact.id },
                                        data: { activeVersionId: buyerVersion.id },
                                    });
                                }

                                // Grant buyer ADMIN permission on their own copy so they can edit it
                                await prisma.artifactPermission.create({
                                    data: {
                                        userId: userId,
                                        assistantId: assistantIdBigInt,
                                        artifactId: buyerArtifact.id,
                                        access: "ADMIN",
                                    },
                                });

                                copiedCount++;
                            }

                            if (copiedCount > 0) {
                                console.log(`✅ Copied ${copiedCount} artifact(s) for buyer ${userId}`);
                            } else {
                                console.log(`ℹ️ No artifacts to copy for this assistant`);
                            }
                        } catch (artifactCopyError) {
                            // Never fail the purchase over artifact copy errors
                            console.error("❌ Error copying artifacts for buyer:", artifactCopyError);
                        }

                        console.log(`✅ Assistant purchase completed: ${assistantId}`);
                        console.log(`💰 Creator wallet updated: +${netAmount} ${assistant.currency} (pending)`);
                        console.log(`🏦 Platform fee: ${platformFee} ${assistant.currency}`);
                        // Send notifications
                        try {
                            await Promise.all([
                                NotificationService.notifyAssistantPurchased(
                                    assistantId,
                                    userId.toString(),
                                    assistant.userId.toString()
                                ),
                                NotificationService.notifyAssistantSold(
                                    assistantId,
                                    userId.toString(),
                                    assistant.userId.toString()
                                ),
                            ]);
                        } catch (notifError) {
                            console.error("Error sending notifications:", notifError);
                        }
                    } catch (error: any) {
                        console.error("❌ Error processing assistant purchase:", error);
                    }
                }

                // Only handle subscription checkouts (not one-time payments)
                if (session.mode !== "subscription" || !session.subscription) {
                    console.log("[Webhook] Skipping non-subscription checkout")
                    break
                }

                const userId = session.metadata?.userId
                const planId = session.metadata?.planId

                if (!userId || !planId) {
                    console.error("[Webhook] Missing userId or planId in metadata")
                    break
                }

                const userIdBigInt = BigInt(userId)
                const planIdInt = parseInt(planId)

                console.log(`[Webhook] Processing subscription for user ${userId}, plan ${planId}`)

                // Retrieve full subscription details from Stripe
                const subscriptionId = typeof session.subscription === "string"
                    ? session.subscription
                    : session.subscription.id

                const subscription = await stripe.subscriptions.retrieve(subscriptionId)

                // Get the subscription item (contains period dates)
                const subscriptionItem = subscription.items.data[0]
                if (!subscriptionItem) {
                    console.error("[Webhook] No subscription item found")
                    break
                }

                // Get plan details for PaymentRecord
                const plan = await prisma.plan.findUnique({
                    where: { id: planIdInt },
                })

                // Update User model with subscription data
                await prisma.user.update({
                    where: { id: userIdBigInt },
                    data: {
                        stripeSubscriptionId: subscription.id,
                        subscriptionStatus: subscription.status,
                        subscriptionPeriodEnd: new Date(subscriptionItem.current_period_end * 1000),
                        currentPlanId: planIdInt,
                    },
                })

                // Create PaymentRecord for initial subscription
                try {
                    await prisma.paymentRecord.create({
                        data: {
                            userId: userIdBigInt,
                            type: "subscription",
                            amount: plan ? Number(plan.amount) : 0,
                            currency: "CHF",
                            platformFee: 0,
                            netAmount: plan ? Number(plan.amount) : 0,
                            status: "completed",
                            stripeSubscriptionId: subscription.id,
                            stripeCheckoutSessionId: session.id,
                            description: plan ? `New subscription: ${plan.title}` : "New subscription",
                            completedAt: new Date(),
                            metadata: {
                                type: "new_subscription",
                                plan: plan ? {
                                    id: plan.id,
                                    title: plan.title,
                                    period: plan.period,
                                    amount: Number(plan.amount),
                                } : null,
                            },
                        },
                    })
                    console.log(`✅ [Webhook] PaymentRecord created for new subscription`)
                } catch (recordError) {
                    console.error(`[Webhook] ❌ Failed to create PaymentRecord:`, recordError)
                }

                // Check if a promotion code was used and mark it redeemed
                const promotionId = session.metadata?.promotionId
                if (promotionId) {
                    try {
                        await prisma.userPromotion.update({
                            where: { id: parseInt(promotionId) },
                            data: {
                                redeemedAt: new Date(),
                                isActive: false,
                            }
                        })
                        console.log(`✅ [Webhook] Marked promotion ${promotionId} as redeemed for user ${userId}`)
                    } catch (promoError) {
                        console.error(`[Webhook] ❌ Failed to mark promotion as redeemed:`, promoError)
                    }
                }

                console.log(`✅ [Webhook] Subscription activated for user ${userId}`)
                console.log(`   - Subscription ID: ${subscription.id}`)
                console.log(`   - Status: ${subscription.status}`)
                console.log(`   - Period End: ${new Date(subscriptionItem.current_period_end * 1000).toISOString()}`)

                break
            }

            // ============================================
            // EVENT 2: SUBSCRIPTION UPDATED
            // Fires when subscription renews, changes, or status updates
            // With "Update immediately" setting, ALL plan changes happen instantly
            // ============================================
            case "customer.subscription.updated": {
                const subscription = event.data.object as Stripe.Subscription

                const customerId = typeof subscription.customer === "string"
                    ? subscription.customer
                    : subscription.customer.id

                // Find user by Stripe customer ID
                const user = await prisma.user.findFirst({
                    where: { stripeCustomerId: customerId },
                    include: { currentPlan: true },
                })

                if (!user) {
                    console.error(`[Webhook] User not found for customer ${customerId}`)
                    break
                }

                // Get subscription item for period dates and price
                const subscriptionItem = subscription.items.data[0]
                if (!subscriptionItem) {
                    console.error("[Webhook] No subscription item found")
                    break
                }

                // Get the Stripe price ID from subscription
                const stripePriceId = typeof subscriptionItem.price === "string"
                    ? subscriptionItem.price
                    : subscriptionItem.price.id

                // Find the plan in database by Stripe price ID
                const newPlan = await prisma.plan.findFirst({
                    where: { stripePriceId: stripePriceId },
                })

                if (!newPlan) {
                    console.warn(`[Webhook] Plan not found for Stripe price ${stripePriceId}`)
                    // Still update status and period, but don't change plan
                    await prisma.user.update({
                        where: { id: user.id },
                        data: {
                            subscriptionStatus: subscription.status,
                            subscriptionPeriodEnd: new Date(subscription.items.data[0].current_period_end * 1000),
                            cancelAtPeriodEnd: subscription.cancel_at_period_end || false,
                        },
                    })
                    break
                }

                // Determine if subscription is active
                const isActive = subscription.status === "active" || subscription.status === "trialing"

                // Check if plan changed
                const planChanged = user.currentPlanId && user.currentPlanId !== newPlan.id

                if (planChanged && user.currentPlan) {
                    console.log(`[Webhook] 🔄 Plan change detected: ${user.currentPlan.title} → ${newPlan.title}`)

                    // Determine change type
                    const isUpgrade = Number(newPlan.amount) > Number(user.currentPlan.amount)
                    const isDowngrade = Number(newPlan.amount) < Number(user.currentPlan.amount)
                    const changeType = isUpgrade ? "upgrade" : isDowngrade ? "downgrade" : "plan_change"

                    // Create PaymentRecord for ALL plan changes (upgrade, downgrade, or lateral)
                    try {
                        const priceDifference = Number(newPlan.amount) - Number(user.currentPlan.amount)

                        await prisma.paymentRecord.create({
                            data: {
                                userId: user.id,
                                type: "subscription",
                                amount: isUpgrade ? priceDifference : 0, // Only charge amount for upgrades
                                currency: "CHF",
                                platformFee: 0,
                                netAmount: isUpgrade ? priceDifference : 0,
                                status: "completed",
                                stripeSubscriptionId: subscription.id,
                                description: `Plan ${changeType}: ${user.currentPlan.title} → ${newPlan.title}`,
                                completedAt: new Date(),
                                metadata: {
                                    type: changeType,
                                    plan: {
                                        id: newPlan.id,
                                        title: newPlan.title,
                                        period: newPlan.period,
                                        amount: Number(newPlan.amount),
                                    },
                                    previousPlan: {
                                        id: user.currentPlan.id,
                                        title: user.currentPlan.title,
                                        amount: Number(user.currentPlan.amount),
                                    },
                                    priceDifference: priceDifference,
                                },
                            },
                        })

                        console.log(`[Webhook] ✅ PaymentRecord created for ${changeType}`)
                    } catch (recordError) {
                        console.error(`[Webhook] ❌ Failed to create PaymentRecord for ${changeType}:`, recordError)
                        // Don't fail the webhook
                    }

                    // Check if new plan has lower assistant limit (downgrade)
                    if (newPlan.assistantLimit < user.currentPlan.assistantLimit) {
                        console.log(`[Webhook] ⚠️ Downgrade detected: ${user.currentPlan.assistantLimit} → ${newPlan.assistantLimit} assistants`)

                        // Import and call the delete function
                        try {
                            const { deleteExcessAssistants } = await import('@/app/actions/assistant.action')
                            const deleteResult = await deleteExcessAssistants(user.id, newPlan.assistantLimit)

                            if (deleteResult.success && deleteResult.deletedCount && deleteResult.deletedCount > 0) {
                                console.log(`[Webhook] ✅ Deleted ${deleteResult.deletedCount} excess assistants`)
                                console.log(`[Webhook] Affected buyers: ${deleteResult.affectedBuyers}`)
                                console.log(`[Webhook] Deleted assistants:`, deleteResult.deletedAssistants?.map(a => a.name).join(', '))
                            } else if (!deleteResult.success) {
                                console.error(`[Webhook] ❌ Failed to delete excess assistants: ${deleteResult.error}`)
                            }
                        } catch (deleteError) {
                            console.error(`[Webhook] ❌ Error deleting excess assistants:`, deleteError)
                            // Don't fail the webhook - subscription update should still proceed
                        }
                    }
                }

                // Update user with new subscription data
                // Since Stripe is configured to "Update immediately", all changes are instant
                await prisma.user.update({
                    where: { id: user.id },
                    data: {
                        currentPlanId: isActive ? newPlan.id : null,
                        subscriptionStatus: subscription.status,
                        subscriptionPeriodEnd: new Date(subscription.items.data[0].current_period_end * 1000),
                        cancelAtPeriodEnd: subscription.cancel_at_period_end || false,
                        scheduledPlanChangeId: null, // Not used with immediate updates
                    },
                })

                // Log cancellation status
                if (subscription.cancel_at_period_end) {
                    console.log(`⚠️ [Webhook] Subscription cancellation scheduled for user ${user.id}`)
                    console.log(`   - Will cancel on: ${new Date(subscription.items.data[0].current_period_end * 1000).toISOString()}`)
                } else if (user.cancelAtPeriodEnd && !subscription.cancel_at_period_end) {
                    console.log(`✅ [Webhook] Subscription reactivated for user ${user.id}`)
                }

                console.log(`✅ [Webhook] Subscription updated for user ${user.id}`)
                console.log(`   - Plan: ${newPlan.title}`)
                console.log(`   - Status: ${subscription.status}`)
                console.log(`   - Cancel at period end: ${subscription.cancel_at_period_end}`)

                break
            }

            // ============================================
            // EVENT 3: SUBSCRIPTION DELETED
            // Fires when subscription is cancelled or expires
            // ============================================
            case "customer.subscription.deleted": {
                const subscription = event.data.object as Stripe.Subscription

                const customerId = typeof subscription.customer === "string"
                    ? subscription.customer
                    : subscription.customer.id

                // Find user by Stripe customer ID
                const user = await prisma.user.findFirst({
                    where: { stripeCustomerId: customerId },
                })

                if (!user) {
                    console.error(`[Webhook] User not found for customer ${customerId}`)
                    break
                }

                // Clear subscription data from user
                await prisma.user.update({
                    where: { id: user.id },
                    data: {
                        stripeSubscriptionId: null,
                        subscriptionStatus: null,
                        subscriptionPeriodEnd: null,
                        currentPlanId: null,
                    },
                })

                console.log(`✅ [Webhook] Subscription cancelled for user ${user.id}`)

                break
            }

            case "account.updated": {
                const account = event.data.object as Stripe.Account;

                // Determine status - check all three critical properties
                let status = 'pending';
                if (account.details_submitted && account.charges_enabled && account.payouts_enabled) {
                    status = 'active';
                } else if (account.requirements?.disabled_reason) {
                    status = 'restricted';
                }
                await prisma.user.update({
                    where: { stripeConnectAccountId: account.id },
                    data: {
                        stripeConnectStatus: status,
                        stripeConnectOnboarded: account.details_submitted || false,
                        stripeConnectPayoutsEnabled: account.payouts_enabled || false,
                    },
                });
                console.log(`✅ Connect account updated: ${account.id} - Status: ${status}`);
                break;
            }

            // ============================================
            // UNHANDLED EVENTS
            // ============================================
            default:
                console.log(`[Webhook] Unhandled event type: ${event.type}`)
        }

        // Return 200 to acknowledge receipt
        return NextResponse.json({ received: true }, { status: 200 })

    } catch (error: any) {
        console.error("[Webhook] Error processing event:", error)
        console.error("[Webhook] Stack:", error.stack)

        // Return 500 for errors to trigger Stripe retry
        return NextResponse.json(
            { error: "Webhook processing failed" },
            { status: 500 }
        )
    }
}
