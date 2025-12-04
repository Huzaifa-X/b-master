import { NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import prisma from "@/lib/prisma"
import Stripe from "stripe"

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

        console.log("📦 Checkout session completed:", {
          sessionId: session.id,
          mode: session.mode,
          subscription: session.subscription,
          metadata: session.metadata,
        })

        // Only handle subscription checkouts
        if (session.mode === "subscription" && session.subscription) {
          const subscriptionId = typeof session.subscription === "string" 
            ? session.subscription 
            : session.subscription.id

          // ✅ Use expand to get full subscription object
          const subscription: Stripe.Subscription = await stripe.subscriptions.retrieve(
            subscriptionId,
            { expand: ['items.data.price.product'] }
          )

          console.log("📋 Subscription retrieved:", {
            subscriptionId: subscription.id,
            status: subscription.status,
            subscriptionMetadata: subscription.metadata,
          })

          // ✅ Get metadata from session or subscription (metadata can be on either)
          const userIdStr = session.metadata?.userId || subscription.metadata?.userId
          const planIdStr = session.metadata?.planId || subscription.metadata?.planId

          if (!userIdStr || !planIdStr) {
            console.error("❌ Missing userId or planId in metadata", {
              sessionMetadata: session.metadata,
              subscriptionMetadata: subscription.metadata,
            })
            break
          }

          const userId = BigInt(userIdStr)
          const planId = parseInt(planIdStr)

          if (planId === 0 || isNaN(planId)) {
            console.error("❌ Invalid planId in metadata", { planIdStr, planId })
            break
          }

          console.log("✅ Parsed metadata:", { userId: userId.toString(), planId })

          // ✅ Get the price details
          const priceId = subscription.items.data[0]?.price.id
          if (!priceId) {
            console.error("No price ID found in subscription")
            break
          }
          console.log("priceId", priceId)
          const price: Stripe.Price = await stripe.prices.retrieve(priceId)

          // ✅ Check if subscription already exists to avoid duplicates
          const existingSubscription = await prisma.subscription.findUnique({
            where: {
              stripeSubscriptionId: subscription.id,
            },
          })
          console.log("existingSubscription", existingSubscription)
          if (existingSubscription) {
            console.log(`Subscription already exists: ${subscription.id}`)
            break
          }

          // ✅ Map subscription status correctly (handle all possible statuses)
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
            // For incomplete subscriptions, we still create the record but mark as active
            // The status will be updated when payment succeeds via invoice.payment_succeeded
            status = "active"
          }

          // ✅ Create subscription in database
          let newSubscription
          try {
            newSubscription = await prisma.subscription.create({
              data: {
                userId,
                planId,
                stripeSubscriptionId: subscription.id,
                status,
                currentPeriodStart: new Date((subscription as any).current_period_start * 1000),
                currentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
                cancelAtPeriodEnd: subscription.cancel_at_period_end || false,
                canceledAt: subscription.canceled_at 
                  ? new Date(subscription.canceled_at * 1000)
                  : null,
                trialStart: subscription.trial_start
                  ? new Date(subscription.trial_start * 1000)
                  : null,
                trialEnd: subscription.trial_end
                  ? new Date(subscription.trial_end * 1000)
                  : null,
                amount: price.unit_amount ? price.unit_amount / 100 : 0,
                currency: (price.currency || "usd").toUpperCase(),
              },
            })

            console.log(`✅ Subscription created successfully:`, {
              subscriptionId: newSubscription.id,
              stripeSubscriptionId: subscription.id,
              userId: userId.toString(),
              planId,
              status,
            })
          } catch (createError: any) {
            console.error("❌ Error creating subscription in database:", {
              error: createError.message,
              code: createError.code,
              userId: userId.toString(),
              planId,
              stripeSubscriptionId: subscription.id,
            })
            // Re-throw to trigger webhook retry
            throw createError
          }

          // ✅ Create invoice for initial payment if amount > 0
          if (session.invoice && price.unit_amount && price.unit_amount > 0) {
            try {
              const invoice: Stripe.Invoice = await stripe.invoices.retrieve(session.invoice as string)
              
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

              // Serialize billing details properly for JSON storage
              const billingDetails = {
                customer: typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id || null,
                customer_email: invoice.customer_email || null,
                customer_name: invoice.customer_name || null,
                billing_reason: invoice.billing_reason || null,
                collection_method: invoice.collection_method || null,
              }

              await prisma.invoice.create({
                data: {
                  userId,
                  subscriptionId: newSubscription.id,
                  stripeInvoiceId: invoice.id,
                  stripePaymentIntentId: paymentIntentId,
                  invoiceNumber: invoice.number || `INV-${Date.now()}`,
                  status: (invoice as any).paid ? "paid" : "open",
                  amount: invoice.amount_due / 100,
                  currency: invoice.currency.toUpperCase(),
                  taxAmount: (invoice as any).tax ? (invoice as any).tax / 100 : 0,
                  discountAmount,
                  totalAmount: invoice.total / 100,
                  description: invoice.description || `Initial payment for subscription`,
                  billingDetails: billingDetails as any,
                  dueDate: invoice.due_date
                    ? new Date(invoice.due_date * 1000)
                    : null,
                  paidAt: (invoice as any).paid ? new Date((invoice as any).status_transitions?.paid_at ? (invoice as any).status_transitions.paid_at * 1000 : Date.now()) : null,
                  invoiceDate: new Date(invoice.created * 1000),
                },
              })

              console.log(`✅ Invoice created: ${invoice.id}`)
            } catch (invoiceError: any) {
              console.error("Error creating invoice:", invoiceError.message)
              // Don't fail the webhook if invoice creation fails
            }
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

