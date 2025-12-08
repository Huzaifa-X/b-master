import prisma from "../lib/prisma"
import { stripe } from "../lib/stripe"

/**
 * Create Stripe products and prices, then update plans table
 * Run: npx ts-node scripts/create-stripe-products.ts
 * 
 * This script will:
 * 1. Get all plans from database
 * 2. Create Stripe products for each plan (grouping monthly/yearly)
 * 3. Create Stripe prices for each plan
 * 4. Update plans table with Stripe IDs
 */

interface PlanGroup {
  baseName: string
  monthly?: {
    plan: any
    productId?: string
  }
  yearly?: {
    plan: any
    productId?: string
  }
}

async function createStripeProducts() {
  try {
    console.log("\n🔧 Creating Stripe products and prices...\n")

    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error("STRIPE_SECRET_KEY environment variable is not set")
    }

    // Get all active plans
    const allPlans = await prisma.plan.findMany({
      where: { isActive: true },
      orderBy: [{ period: "asc" }, { amount: "asc" }],
    })

    if (allPlans.length === 0) {
      console.log("⚠️  No plans found. Please run populate-plans.ts first.")
      process.exit(1)
    }

    // Group plans by base name (excluding period)
    const planGroups: Map<string, PlanGroup> = new Map()

    for (const plan of allPlans) {
      if (plan.period === "free") {
        // Skip free plan - no Stripe product needed
        continue
      }

      // Extract base name (remove " (Yearly)" suffix)
      const baseName = plan.title.replace(" (Yearly)", "").trim()
      
      if (!planGroups.has(baseName)) {
        planGroups.set(baseName, { baseName })
      }

      const group = planGroups.get(baseName)!
      
      if (plan.period === "monthly") {
        group.monthly = { plan }
      } else if (plan.period === "yearly") {
        group.yearly = { plan }
      }
    }

    console.log(`Found ${planGroups.size} plan groups to create\n`)
    console.log("=".repeat(60))

    // Create products and prices for each group
    for (const [baseName, group] of planGroups) {
      console.log(`\n📦 Processing: ${baseName}`)

      let productId: string | null = null

      // Check if monthly plan already has a product ID
      if (group.monthly?.plan.stripeProductId) {
        productId = group.monthly.plan.stripeProductId
        console.log(`   ✅ Using existing product: ${productId}`)
      } else {
        // Create Stripe product
        const product = await stripe.products.create({
          name: baseName,
          description: group.monthly?.plan.description || group.yearly?.plan.description || "",
        })
        productId = product.id
        console.log(`   ✨ Created product: ${productId}`)
      }

      // Create/update monthly price
      if (group.monthly) {
        if (group.monthly.plan.stripePriceId) {
          console.log(`   ✅ Monthly price already exists: ${group.monthly.plan.stripePriceId}`)
        } else {
          const monthlyPrice = await stripe.prices.create({
            product: productId || "",
            unit_amount: Math.round(group.monthly.plan.amount * 100), // Convert to cents
            currency: "chf",
            recurring: {
              interval: "month",
            },
          })
          
          await prisma.plan.update({
            where: { id: group.monthly.plan.id },
            data: {
              stripeProductId: productId,
              stripePriceId: monthlyPrice.id,
            },
          })
          
          console.log(`   ✨ Created monthly price: ${monthlyPrice.id} (CHF ${group.monthly.plan.amount})`)
        }
      }

      // Create/update yearly price
      if (group.yearly) {
        if (group.yearly.plan.stripePriceId) {
          console.log(`   ✅ Yearly price already exists: ${group.yearly.plan.stripePriceId}`)
        } else {
          const yearlyPrice = await stripe.prices.create({
            product: productId || "",
            unit_amount: Math.round(group.yearly.plan.amount * 100), // Convert to cents
            currency: "chf",
            recurring: {
              interval: "year",
            },
          })
          
          await prisma.plan.update({
            where: { id: group.yearly.plan.id },
            data: {
              stripeProductId: productId,
              stripePriceId: yearlyPrice.id,
            },
          })
          
          console.log(`   ✨ Created yearly price: ${yearlyPrice.id} (CHF ${group.yearly.plan.amount})`)
        }
      }
    }

    console.log("\n" + "=".repeat(60))
    console.log("✅ Successfully created Stripe products and prices!")
    console.log("=".repeat(60))
    console.log("\n💡 Next steps:")
    console.log("   1. Set up Stripe webhook endpoint: /api/webhooks/stripe")
    console.log("   2. Update your pricing page to use subscription actions")
    console.log("   3. Test the subscription flow\n")
  } catch (error: any) {
    console.error("\n❌ Error creating Stripe products:")
    console.error(error.message)
    if (error.type === "StripeAuthenticationError") {
      console.error("\n💡 Make sure STRIPE_SECRET_KEY is set correctly in your .env file")
    }
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the script
createStripeProducts()

