import { NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import prisma from "@/lib/prisma"
import Stripe from "stripe"
import NotificationService from "@/lib/services/notifactionService"

// Helper function to update user wallet
async function updateUserWallet(
  userId: BigInt,
  amount: number,
  currency: string,
  type: "add_pending" | "pending_to_available" | "deduct_available",
  tx: any
) {
  const wallet = await tx.userWallet.upsert({
    where: { userId },
    create: {
      userId,
      pendingAmount: type === "add_pending" ? amount : 0,
      availableAmount: type === "pending_to_available" ? amount : 0,
      totalEarnings: type === "add_pending" || type === "pending_to_available" ? amount : 0,
      transferredAmount: 0,
      currency,
      lastUpdated: new Date(),
    },
    update: {
      pendingAmount: {
        increment: 
          type === "add_pending" ? amount : 
          type === "pending_to_available" ? -amount : 0,
      },
      availableAmount: {
        increment: 
          type === "pending_to_available" ? amount : 
          type === "deduct_available" ? -amount : 0,
      },
      totalEarnings: {
        increment: type === "add_pending" || type === "pending_to_available" ? amount : 0,
      },
      lastUpdated: new Date(),
    },
  })
  return wallet
}

export async function POST(req: NextRequest) {
  const body = await req.text()
  const signature = req.headers.get("stripe-signature")

  if (!signature) {
    return NextResponse.json(
      { error: "No signature provided" },
      { status: 400 }
    )
  }

  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    console.error("STRIPE_WEBHOOK_SECRET is not set")
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
    console.error("Webhook signature verification failed:", err.message)
    return NextResponse.json(
      { error: `Webhook Error: ${err.message}` },
      { status: 400 }
    )
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session

        console.log("📦 Checkout session completed")

        // Handle assistant purchases (one-time payments)
        if (session.mode === "payment" && session.metadata?.type === "assistant_purchase") {
          try {
            const userId = BigInt(session.metadata?.userId || "0")
            const assistantId = session.metadata?.assistantId

            if (!userId || !assistantId) {
              console.error("❌ Missing userId or assistantId in metadata")
              break
            }

            const assistantIdBigInt = BigInt(assistantId)

            // Find the pending purchase record with assistant owner info
            const purchase = await prisma.assistantPurchase.findFirst({
              where: {
                stripeCheckoutSessionId: session.id,
                buyerId: userId,
                assistantId: assistantIdBigInt,
                status: "pending",
              },
              include: {
                assistant: {
                  include: {
                    owner: true,
                  },
                },
              },
            })

            if (!purchase) {
              console.error("❌ Purchase record not found")
              break
            }

            // Get payment intent ID
            const paymentIntentId = typeof session.payment_intent === "string"
              ? session.payment_intent
              : session.payment_intent?.id || null

            // Get the purchase amount from session
            const amountTotal = session.amount_total ? session.amount_total / 100 : 0
            const currency = (session.currency || "CHF").toUpperCase()

            // Calculate platform fee (e.g., 10%)
            const platformFeePercentage = 0.1 // 10% platform fee
            const platformFee = amountTotal * platformFeePercentage
            const sellerAmount = amountTotal - platformFee

            // Update purchase to completed and create transaction
            const [updatedPurchase, transaction] = await prisma.$transaction(async (tx) => {
              // 1. Update purchase status
              const updatedPurchase = await tx.assistantPurchase.update({
                where: { id: purchase.id },
                data: {
                  status: "completed",
                  stripePaymentIntentId: paymentIntentId,
                  purchaseDate: new Date(),
                },
              })

              // 2. Create transaction record for the sale
              const transaction = await tx.assistantTransaction.create({
                data: {
                  assistantOwnerId: purchase.assistant.userId,
                  amount: sellerAmount,
                  currency: currency,
                  type: "sale",
                  status: "completed",
                  stripeTransactionId: paymentIntentId,
                  metadata: {
                    assistantId: assistantId,
                    buyerId: userId.toString(),
                    purchaseId: purchase.id,
                    grossAmount: amountTotal,
                    platformFee: platformFee,
                    netAmount: sellerAmount,
                  },
                },
              })

              // 3. Update or create seller's wallet (add to pending)
              await updateUserWallet(
                purchase.assistant.userId,
                sellerAmount,
                currency,
                "add_pending",
                tx
              )

              // 4. Link transaction to purchase
              await tx.assistantPurchase.update({
                where: { id: purchase.id },
                data: {
                  transactionId: transaction.id,
                },
              })

              return [updatedPurchase, transaction]
            })

            console.log(`✅ Assistant purchase completed: ${assistantId}`)
            console.log(`💰 Seller wallet updated: +${sellerAmount} ${currency} (pending)`)
            console.log(`🏦 Platform fee: ${platformFee} ${currency}`)

            // Send notifications to buyer and seller
            try {
              await Promise.all([
                NotificationService.notifyAssistantPurchased(
                  assistantId,
                  userId.toString(),
                  purchase.assistant.userId.toString()
                ),
                NotificationService.notifyAssistantSold(
                  assistantId,
                  userId.toString(),
                  purchase.assistant.userId.toString()
                ),
              ])
            } catch (notifError) {
              console.error("Error sending notifications:", notifError)
              // Don't fail the webhook if notifications fail
            }
          } catch (error: any) {
            console.error("❌ Error processing assistant purchase:", error.message)
            console.error("Stack:", error.stack)
            // Don't throw - let the webhook complete
          }
          break
        }

        // Handle subscription checkouts
        if (session.mode === "subscription" && session.subscription) {
          try {
            const subscriptionId = typeof session.subscription === "string"
              ? session.subscription
              : session.subscription.id

            const subscriptionResponse = await stripe.subscriptions.retrieve(subscriptionId)

            // Access the subscription items to get period dates
            const subscriptionItem = subscriptionResponse.items.data[0]
            if (!subscriptionItem) {
              console.error("❌ No subscription item found")
              break
            }

            const currentPeriodStart = subscriptionItem.current_period_start
            const currentPeriodEnd = subscriptionItem.current_period_end

            console.log("Subscription periods:", {
              start: currentPeriodStart,
              end: currentPeriodEnd,
            })

            const userId = BigInt(session.metadata?.userId || "0")
            const planId = parseInt(session.metadata?.planId || "0")

            if (!userId || !planId) {
              console.error("❌ Missing metadata")
              break
            }

            // Check if already exists
            const existing = await prisma.subscription.findUnique({
              where: { stripeSubscriptionId: subscriptionResponse.id },
            })

            if (existing) {
              console.log("⚠️  Subscription already exists")
              break
            }

            // Get price
            const priceId = subscriptionItem.price.id
            if (!priceId) {
              console.error("❌ No price found")
              break
            }

            const priceData = await stripe.prices.retrieve(priceId)

            // Create subscription
            const newSub = await prisma.subscription.create({
              data: {
                userId,
                planId,
                stripeSubscriptionId: subscriptionResponse.id,
                status: subscriptionResponse.status === "active" ? "active" : "trialing",
                currentPeriodStart: new Date(currentPeriodStart * 1000),
                currentPeriodEnd: new Date(currentPeriodEnd * 1000),
                cancelAtPeriodEnd: subscriptionResponse.cancel_at_period_end,
                canceledAt: subscriptionResponse.canceled_at ? new Date(subscriptionResponse.canceled_at * 1000) : null,
                trialStart: subscriptionResponse.trial_start ? new Date(subscriptionResponse.trial_start * 1000) : null,
                trialEnd: subscriptionResponse.trial_end ? new Date(subscriptionResponse.trial_end * 1000) : null,
                amount: priceData.unit_amount ? priceData.unit_amount / 100 : 0,
                currency: (priceData.currency || "CHF").toUpperCase(),
              },
            })

            console.log("✅ Subscription created:", newSub.id)

            // Note: Subscription payments go to the platform, not individual user wallets
            // If you have a referral/affiliate system, wallet updates would go here

            // Create invoice
            if (session.invoice && priceData.unit_amount && priceData.unit_amount > 0) {
              const invoiceId = typeof session.invoice === "string"
                ? session.invoice
                : session.invoice.id

              const invoiceResponse = await stripe.invoices.retrieve(invoiceId)
              const invoiceData = invoiceResponse as any

              const paymentIntentId = typeof invoiceData.payment_intent === "string"
                ? invoiceData.payment_intent
                : invoiceData.payment_intent?.id || null

              await prisma.invoice.create({
                data: {
                  userId,
                  subscriptionId: newSub.id,
                  stripeInvoiceId: invoiceData.id,
                  stripePaymentIntentId: paymentIntentId,
                  invoiceNumber: invoiceData.number || `INV-${Date.now()}`,
                  status: invoiceData.paid ? "paid" : "open",
                  amount: invoiceData.amount_due / 100,
                  currency: invoiceData.currency.toUpperCase(),
                  taxAmount: invoiceData.tax ? invoiceData.tax / 100 : 0,
                  discountAmount: 0,
                  totalAmount: invoiceData.total / 100,
                  description: invoiceData.description || "Subscription payment",
                  billingDetails: {
                    email: invoiceData.customer_email,
                    name: invoiceData.customer_name,
                  },
                  dueDate: invoiceData.due_date ? new Date(invoiceData.due_date * 1000) : null,
                  paidAt: invoiceData.paid ? new Date() : null,
                  invoiceDate: new Date(invoiceData.created * 1000),
                },
              })

              console.log("✅ Invoice created:", invoiceData.id)
            }
          } catch (error: any) {
            console.error("❌ Error in checkout.session.completed:", error.message)
            console.error("Stack:", error.stack)
            throw error
          }
        }
        break
      }

      case "customer.subscription.updated": {
        const subscription: Stripe.Subscription = event.data.object as Stripe.Subscription

        // ✅ Find subscription first
        const existingSubscription = await prisma.subscription.findUnique({
          where: {
            stripeSubscriptionId: subscription.id,
          },
        })

        if (!existingSubscription) {
          console.error(`Subscription not found for update: ${subscription.id}`)
          break
        }

        // ✅ Map status correctly (handle all possible statuses)
        let status: "active" | "canceled" | "past_due" | "unpaid" | "trialing" = "active"
        if (subscription.status === "active") {
          status = "active"
        } else if (subscription.status === "trialing") {
          status = "trialing"
        } else if (subscription.status === "canceled") {
          status = "canceled"
        } else if (subscription.status === "past_due") {
          status = "past_due"
        } else if (subscription.status === "unpaid") {
          status = "unpaid"
        } else if (subscription.status === "incomplete" || subscription.status === "incomplete_expired") {
          // For incomplete subscriptions, keep as active but will be updated when payment succeeds
          status = "active"
        } else if (subscription.status === "paused") {
          // Paused subscriptions are still considered active for access purposes
          status = "active"
        }

        await prisma.subscription.update({
          where: {
            id: existingSubscription.id,
          },
          data: {
            status,
            currentPeriodStart: new Date((subscription as any).current_period_start * 1000),
            currentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
            cancelAtPeriodEnd: subscription.cancel_at_period_end || false,
            canceledAt: subscription.canceled_at
              ? new Date(subscription.canceled_at * 1000)
              : null,
          },
        })

        console.log(`✅ Subscription updated: ${subscription.id}`)
        break
      }

      case "customer.subscription.deleted": {
        const subscription: Stripe.Subscription = event.data.object as Stripe.Subscription

        const existingSubscription = await prisma.subscription.findUnique({
          where: {
            stripeSubscriptionId: subscription.id,
          },
        })

        if (existingSubscription) {
          await prisma.subscription.update({
            where: {
              id: existingSubscription.id,
            },
            data: {
              status: "canceled",
              canceledAt: new Date(),
            },
          })

          console.log(`✅ Subscription canceled: ${subscription.id}`)
        } else {
          console.error(`Subscription not found for deletion: ${subscription.id}`)
        }
        break
      }

      case "invoice.payment_succeeded": {
        const invoice: Stripe.Invoice = event.data.object as Stripe.Invoice

        // Get subscription ID
        const subscriptionId = typeof (invoice as any).subscription === "string"
          ? (invoice as any).subscription
          : (invoice as any).subscription?.id

        if (!subscriptionId) {
          console.error("No subscription ID in invoice")
          break
        }

        // ✅ Find subscription in database
        const subscription = await prisma.subscription.findFirst({
          where: {
            stripeSubscriptionId: subscriptionId,
          },
        })

        if (!subscription) {
          console.error(`Subscription not found for invoice: ${subscriptionId}`)
          break
        }

        // ✅ Update subscription status to active
        await prisma.subscription.update({
          where: {
            id: subscription.id,
          },
          data: {
            status: "active",
          },
        })

        // Calculate discount amount
        let discountAmount = 0
        if (invoice.total_discount_amounts && invoice.total_discount_amounts.length > 0) {
          discountAmount = invoice.total_discount_amounts.reduce(
            (sum, discount) => sum + discount.amount,
            0
          ) / 100
        }

        // Get payment intent ID
        const paymentIntentId = typeof (invoice as any).payment_intent === "string"
          ? (invoice as any).payment_intent
          : (invoice as any).payment_intent?.id || null

        // ✅ Check if invoice already exists
        const existingInvoice = await prisma.invoice.findUnique({
          where: {
            stripeInvoiceId: invoice.id,
          },
        })

        // Serialize billing details properly for JSON storage
        const billingDetails = {
          email: invoice.customer_email || null,
          name: invoice.customer_name || null,
          phone: invoice.customer_phone || null,
          address: invoice.customer_address ? {
            line1: invoice.customer_address.line1 || null,
            line2: invoice.customer_address.line2 || null,
            city: invoice.customer_address.city || null,
            state: invoice.customer_address.state || null,
            postal_code: invoice.customer_address.postal_code || null,
            country: invoice.customer_address.country || null,
          } : null,
        }

        if (existingInvoice) {
          // Update existing invoice
          await prisma.invoice.update({
            where: {
              id: existingInvoice.id,
            },
            data: {
              status: (invoice as any).paid ? "paid" : "open",
              paidAt: (invoice as any).paid ? new Date((invoice as any).status_transitions?.paid_at ? (invoice as any).status_transitions.paid_at * 1000 : Date.now()) : null,
            },
          })
          console.log(`✅ Invoice updated: ${invoice.id}`)
        } else {
          // Create new invoice record
          await prisma.invoice.create({
            data: {
              userId: subscription.userId,
              subscriptionId: subscription.id,
              stripeInvoiceId: invoice.id,
              stripePaymentIntentId: paymentIntentId,
              invoiceNumber: invoice.number || `INV-${Date.now()}`,
              status: (invoice as any).paid ? "paid" : "open",
              amount: invoice.amount_due / 100,
              currency: invoice.currency.toUpperCase(),
              taxAmount: (invoice as any).tax ? (invoice as any).tax / 100 : 0,
              discountAmount,
              totalAmount: invoice.total / 100,
              description: invoice.description || null,
              billingDetails: billingDetails as any,
              dueDate: invoice.due_date
                ? new Date(invoice.due_date * 1000)
                : null,
              paidAt: (invoice as any).paid ? new Date((invoice as any).status_transitions?.paid_at ? (invoice as any).status_transitions.paid_at * 1000 : Date.now()) : null,
              invoiceDate: new Date(invoice.created * 1000),
            },
          })

          console.log(`✅ Invoice created: ${invoice.id}`)
        }
        break
      }

      case "invoice.payment_action_required": {
        const invoice: Stripe.Invoice = event.data.object as Stripe.Invoice

        // Get subscription ID
        const subscriptionId = typeof (invoice as any).subscription === "string"
          ? (invoice as any).subscription
          : (invoice as any).subscription?.id

        if (!subscriptionId) {
          console.error("No subscription ID in invoice")
          break
        }

        // ✅ Find subscription in database
        const subscription = await prisma.subscription.findFirst({
          where: {
            stripeSubscriptionId: subscriptionId,
          },
        })

        if (!subscription) {
          console.error(`Subscription not found for invoice: ${subscriptionId}`)
          break
        }

        // Subscription remains incomplete until payment is confirmed
        // No status change needed here, just log for monitoring
        console.log(`⚠️  Payment action required for subscription: ${subscriptionId}, invoice: ${invoice.id}`)
        break
      }

      case "invoice.payment_failed": {
        const invoice: Stripe.Invoice = event.data.object as Stripe.Invoice

        // Get subscription ID
        const subscriptionId = typeof (invoice as any).subscription === "string"
          ? (invoice as any).subscription
          : (invoice as any).subscription?.id

        if (!subscriptionId) {
          console.error("No subscription ID in invoice")
          break
        }

        const subscription = await prisma.subscription.findFirst({
          where: {
            stripeSubscriptionId: subscriptionId,
          },
        })

        if (!subscription) {
          console.error(`Subscription not found for failed payment: ${subscriptionId}`)
          break
        }

        // ✅ Determine subscription status based on whether this is initial or recurring payment
        // For initial payments, subscription might be incomplete
        // For recurring payments, subscription should be past_due
        const isInitialPayment = subscription.status === "active" && !subscription.currentPeriodStart

        await prisma.subscription.update({
          where: {
            id: subscription.id,
          },
          data: {
            status: isInitialPayment ? "active" : "past_due", // Keep active for initial, set past_due for recurring
          },
        })

        // ✅ Create or update invoice record for failed payment
        const existingInvoice = await prisma.invoice.findUnique({
          where: {
            stripeInvoiceId: invoice.id,
          },
        })

        if (!existingInvoice) {
          const paymentIntentId = typeof (invoice as any).payment_intent === "string"
            ? (invoice as any).payment_intent
            : (invoice as any).payment_intent?.id || null

          let discountAmount = 0
          if (invoice.total_discount_amounts && invoice.total_discount_amounts.length > 0) {
            discountAmount = invoice.total_discount_amounts.reduce(
              (sum, discount) => sum + discount.amount,
              0
            ) / 100
          }

          // Serialize billing details properly for JSON storage
          const billingDetails = {
            email: invoice.customer_email || null,
            name: invoice.customer_name || null,
            phone: invoice.customer_phone || null,
            address: invoice.customer_address ? {
              line1: invoice.customer_address.line1 || null,
              line2: invoice.customer_address.line2 || null,
              city: invoice.customer_address.city || null,
              state: invoice.customer_address.state || null,
              postal_code: invoice.customer_address.postal_code || null,
              country: invoice.customer_address.country || null,
            } : null,
          }

          await prisma.invoice.create({
            data: {
              userId: subscription.userId,
              subscriptionId: subscription.id,
              stripeInvoiceId: invoice.id,
              stripePaymentIntentId: paymentIntentId,
              invoiceNumber: invoice.number || `INV-${Date.now()}`,
              status: "open", // Failed payment = open/unpaid
              amount: invoice.amount_due / 100,
              currency: invoice.currency.toUpperCase(),
              taxAmount: (invoice as any).tax ? (invoice as any).tax / 100 : 0,
              discountAmount,
              totalAmount: invoice.total / 100,
              description: invoice.description || null,
              billingDetails: billingDetails as any,
              dueDate: invoice.due_date
                ? new Date(invoice.due_date * 1000)
                : null,
              paidAt: null, // Not paid
              invoiceDate: new Date(invoice.created * 1000),
            },
          })
        }

        console.log(`⚠️  Payment failed for subscription: ${subscriptionId}`)
        break
      }

      case "charge.refunded": {
        const charge: Stripe.Charge = event.data.object as Stripe.Charge

        // Get payment intent ID
        const paymentIntentId = typeof charge.payment_intent === "string"
          ? charge.payment_intent
          : charge.payment_intent?.id

        if (!paymentIntentId) {
          console.error("No payment intent in refunded charge")
          break
        }

        // Find the purchase associated with this payment
        const purchase = await prisma.assistantPurchase.findFirst({
          where: {
            stripePaymentIntentId: paymentIntentId,
          },
          include: {
            assistant: true,
            transaction: true,
          },
        })

        if (!purchase) {
          console.log("⚠️  No purchase found for refunded charge (might be subscription)")
          break
        }

        // Only process if purchase was completed
        if (purchase.status !== "completed") {
          console.log("⚠️  Purchase was not completed, skipping refund")
          break
        }

        const refundAmount = charge.amount_refunded / 100
        const currency = charge.currency.toUpperCase()

        // Calculate seller's portion of refund (after platform fee)
        const platformFeePercentage = 0.1
        const sellerRefundAmount = refundAmount * (1 - platformFeePercentage)

        await prisma.$transaction(async (tx) => {
          // 1. Update purchase status to refunded
          await tx.assistantPurchase.update({
            where: { id: purchase.id },
            data: {
              status: "refunded",
              updatedAt: new Date(),
            },
          })

          // 2. Create refund transaction
          await tx.assistantTransaction.create({
            data: {
              assistantOwnerId: purchase.assistant.userId,
              amount: -sellerRefundAmount, // Negative amount for refund
              currency: currency,
              type: "refund",
              status: "completed",
              stripeTransactionId: charge.id,
              metadata: {
                assistantId: purchase.assistantId.toString(),
                buyerId: purchase.buyerId.toString(),
                purchaseId: purchase.id,
                originalTransactionId: purchase.transactionId,
                refundAmount: refundAmount,
                sellerRefundAmount: sellerRefundAmount,
              },
            },
          })

          // 3. Deduct from seller's wallet
          // Try to deduct from pending first, then available
          const sellerWallet = await tx.userWallet.findUnique({
            where: { userId: purchase.assistant.userId },
          })

          if (sellerWallet) {
            if (Number(sellerWallet.pendingAmount) >= sellerRefundAmount) {
              // Deduct from pending
              await tx.userWallet.update({
                where: { userId: purchase.assistant.userId },
                data: {
                  pendingAmount: {
                    decrement: sellerRefundAmount,
                  },
                  totalEarnings: {
                    decrement: sellerRefundAmount,
                  },
                  lastUpdated: new Date(),
                },
              })
            } else if (Number(sellerWallet.availableAmount) >= sellerRefundAmount) {
              // Deduct from available
              await tx.userWallet.update({
                where: { userId: purchase.assistant.userId },
                data: {
                  availableAmount: {
                    decrement: sellerRefundAmount,
                  },
                  totalEarnings: {
                    decrement: sellerRefundAmount,
                  },
                  lastUpdated: new Date(),
                },
              })
            } else {
              // Deduct from both
              const remainingAfterPending = sellerRefundAmount - Number(sellerWallet.pendingAmount)
              await tx.userWallet.update({
                where: { userId: purchase.assistant.userId },
                data: {
                  pendingAmount: 0,
                  availableAmount: {
                    decrement: remainingAfterPending,
                  },
                  totalEarnings: {
                    decrement: sellerRefundAmount,
                  },
                  lastUpdated: new Date(),
                },
              })
            }
          }
        })

        console.log(`✅ Refund processed for assistant purchase: ${purchase.id}`)
        console.log(`💸 Seller wallet deducted: -${sellerRefundAmount} ${currency}`)

        // Send notifications to buyer and seller
        try {
          await Promise.all([
            // Notify buyer about refund
            NotificationService.createNotification({
              userId: purchase.buyerId.toString(),
              title: "💸 Refund Processed",
              message: `Your purchase of "${purchase.assistant.name}" has been refunded. Amount: ${refundAmount} ${currency}`,
              type: "assistant_refund",
              relatedId: purchase.assistantId.toString(),
              relatedType: "assistant",
              data: {
                assistantName: purchase.assistant.name,
                refundAmount: refundAmount,
                currency: currency,
              },
            }),
            // Notify seller about refund deduction
            NotificationService.createNotification({
              userId: purchase.assistant.userId.toString(),
              title: "⚠️ Refund Processed",
              message: `A refund has been processed for "${purchase.assistant.name}". Amount deducted: ${sellerRefundAmount} ${currency}`,
              type: "assistant_refund_seller",
              relatedId: purchase.assistantId.toString(),
              relatedType: "assistant",
              data: {
                assistantName: purchase.assistant.name,
                refundAmount: sellerRefundAmount,
                currency: currency,
              },
            }),
          ])
        } catch (notifError) {
          console.error("Error sending refund notifications:", notifError)
          // Don't fail the webhook if notifications fail
        }
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error: any) {
    console.error("Error processing webhook:", error)
    return NextResponse.json(
      { error: `Webhook handler failed: ${error.message}` },
      { status: 500 }
    )
  }
}

