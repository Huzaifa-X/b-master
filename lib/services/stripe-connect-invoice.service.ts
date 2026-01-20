// lib/services/stripe-connect-invoice.service.ts
import Stripe from "stripe"
import prisma from "@/lib/prisma"
import { generateInvoicePDFFromData } from "./invoice-pdf-service"
import { generatePDFFromHTML } from "./pdf-generator"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2025-11-17.clover",
})

export interface CreateStripeConnectInvoiceParams {
    userId: bigint
    customerName: string
    customerEmail: string
    amount: number // in dollars
    description: string
    currency?: string
    daysUntilDue?: number
    artifactHtml?: string // Optional: if user wants to use artifact template
}

export interface StripeConnectInvoiceResult {
    success: boolean
    error?: string
    stripeInvoiceUrl?: string
    pdfUrl?: string
    invoiceId?: string
    amountDue?: number
    currency?: string
    customerId?: string
    productId?: string
    priceId?: string
}

/**
 * Create a Stripe invoice on the user's connected Stripe account
 * and generate a PDF invoice
 */
export async function createStripeConnectInvoice(
    params: CreateStripeConnectInvoiceParams
): Promise<StripeConnectInvoiceResult> {
    const {
        userId,
        customerName,
        customerEmail,
        amount,
        description,
        currency = "chf",
        daysUntilDue = 7,
        artifactHtml,
    } = params

    try {
        // 1. Check if user has a connected Stripe account
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { stripeConnectAccountId: true },
        })

        if (!user?.stripeConnectAccountId) {
            return {
                success: false,
                error: "Please connect your Stripe account in your profile settings to create invoices and receive payments.",
            }
        }

        const stripeAccountId = user.stripeConnectAccountId
        console.log(`[StripeConnect] Creating invoice on connected account: ${stripeAccountId}`)

        // 2. Create customer on connected account
        console.log(`[StripeConnect] Creating customer: ${customerEmail}`)
        const customer = await stripe.customers.create(
            {
                email: customerEmail,
                name: customerName,
            },
            {
                stripeAccount: stripeAccountId,
            }
        )
        console.log(`[StripeConnect] ✅ Customer created: ${customer.id}`)

        // 3. Create product on connected account
        console.log(`[StripeConnect] Creating product: ${description}`)
        const product = await stripe.products.create(
            {
                name: description,
            },
            {
                stripeAccount: stripeAccountId,
            }
        )
        console.log(`[StripeConnect] ✅ Product created: ${product.id}`)

        // 4. Create one-time price on connected account
        const unitAmount = Math.round(amount * 100) // Convert dollars to cents
        console.log(`[StripeConnect] Creating price: ${unitAmount} ${currency}`)
        const price = await stripe.prices.create(
            {
                product: product.id,
                unit_amount: unitAmount,
                currency: currency.toLowerCase(),
            },
            {
                stripeAccount: stripeAccountId,
            }
        )
        console.log(`[StripeConnect] ✅ Price created: ${price.id}`)

        // 5. Create draft invoice on connected account
        console.log(`[StripeConnect] Creating invoice for customer: ${customer.id}`)
        const invoice = await stripe.invoices.create(
            {
                customer: customer.id,
                days_until_due: daysUntilDue,
                description: description,
            },
            {
                stripeAccount: stripeAccountId,
            }
        )
        console.log(`[StripeConnect] ✅ Invoice created: ${invoice.id}`)

        // 6. Add line item to invoice
        console.log(`[StripeConnect] Adding line item to invoice`)
        await stripe.invoiceItems.create(
            {
                customer: customer.id,
                invoice: invoice.id,
                amount: unitAmount,
                currency: currency.toLowerCase(),
                description: description,
            },
            {
                stripeAccount: stripeAccountId,
            }
        )
        console.log(`[StripeConnect] ✅ Line item added`)

        // 7. Finalize invoice
        console.log(`[StripeConnect] Finalizing invoice`)
        const finalizedInvoice = await stripe.invoices.finalizeInvoice(
            invoice.id,
            {},
            {
                stripeAccount: stripeAccountId,
            }
        )
        console.log(`[StripeConnect] ✅ Invoice finalized: ${finalizedInvoice.hosted_invoice_url}`)

        // 8. Generate PDF
        let pdfUrl: string
        if (artifactHtml) {
            console.log(`[StripeConnect] Generating PDF from artifact HTML`)
            const result = await generatePDFFromHTML({
                html: artifactHtml,
                filename: `invoice-${Date.now()}.pdf`,
                s3Folder: "invoices",
            })
            pdfUrl = result.pdfUrl
        } else {
            console.log(`[StripeConnect] Generating PDF from default template`)
            pdfUrl = await generateInvoicePDFFromData({
                customerName,
                customerEmail,
                amount,
                description,
                currency: currency.toUpperCase(),
            })
        }
        console.log(`[StripeConnect] ✅ PDF generated: ${pdfUrl}`)

        // 9. Return success with both URLs
        return {
            success: true,
            stripeInvoiceUrl: finalizedInvoice.hosted_invoice_url || undefined,
            pdfUrl,
            invoiceId: finalizedInvoice.id,
            amountDue: finalizedInvoice.amount_due / 100,
            currency: finalizedInvoice.currency,
            customerId: customer.id,
            productId: product.id,
            priceId: price.id,
        }
    } catch (error: any) {
        console.error("[StripeConnect] ❌ Error creating invoice:", error)
        return {
            success: false,
            error: error.message || "Failed to create invoice on connected Stripe account",
        }
    }
}
