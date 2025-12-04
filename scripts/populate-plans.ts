import prisma from "../lib/prisma"

/**
 * Populate plans table from pricing page data
 * Run: npx ts-node scripts/populate-plans.ts
 */

const plans = [
  // Free Plan
  {
    title: "Free",
    description: "Perfect for getting started with AI assistants",
    period: "free" as const,
    features: [
      "1 AI Assistant",
      "Basic support",
      "Standard response time",
      "Community access",
    ],
    amount: 0,
    assistantLimit: 1,
    stripeProductId: null,
    stripePriceId: null,
    isActive: true,
  },
  // Monthly Plans
  {
    title: "Starter",
    description: "Great for small teams and individual users",
    period: "monthly" as const,
    features: [
      "5 AI Assistants",
      "Priority support",
      "Faster response time",
      "Advanced customization",
      "API access",
      "Analytics dashboard",
    ],
    amount: 29.99,
    assistantLimit: 5,
    stripeProductId: null,
    stripePriceId: null,
    isActive: true,
  },
  {
    title: "Professional",
    description: "Ideal for growing businesses and teams",
    period: "monthly" as const,
    features: [
      "25 AI Assistants",
      "Priority support",
      "Fastest response time",
      "Advanced customization",
      "API access",
      "Analytics dashboard",
      "Team collaboration",
      "Custom integrations",
      "White-label options",
    ],
    amount: 99.99,
    assistantLimit: 25,
    stripeProductId: null,
    stripePriceId: null,
    isActive: true,
  },
  {
    title: "Enterprise",
    description: "For large organizations with custom needs",
    period: "monthly" as const,
    features: [
      "Unlimited AI Assistants",
      "24/7 dedicated support",
      "Instant response time",
      "Full customization",
      "API access",
      "Advanced analytics",
      "Team collaboration",
      "Custom integrations",
      "White-label options",
      "SLA guarantee",
      "Custom training",
      "On-premise deployment",
    ],
    amount: 299.99,
    assistantLimit: 999999, // Unlimited
    stripeProductId: null,
    stripePriceId: null,
    isActive: true,
  },
  // Yearly Plans
  {
    title: "Starter (Yearly)",
    description: "Great for small teams and individual users - Save 20%",
    period: "yearly" as const,
    features: [
      "5 AI Assistants",
      "Priority support",
      "Faster response time",
      "Advanced customization",
      "API access",
      "Analytics dashboard",
      "20% discount",
    ],
    amount: 287.9,
    assistantLimit: 5,
    stripeProductId: null,
    stripePriceId: null,
    isActive: true,
  },
  {
    title: "Professional (Yearly)",
    description: "Ideal for growing businesses and teams - Save 20%",
    period: "yearly" as const,
    features: [
      "25 AI Assistants",
      "Priority support",
      "Fastest response time",
      "Advanced customization",
      "API access",
      "Analytics dashboard",
      "Team collaboration",
      "Custom integrations",
      "White-label options",
      "20% discount",
    ],
    amount: 959.9,
    assistantLimit: 25,
    stripeProductId: null,
    stripePriceId: null,
    isActive: true,
  },
  {
    title: "Enterprise (Yearly)",
    description: "For large organizations with custom needs - Save 20%",
    period: "yearly" as const,
    features: [
      "Unlimited AI Assistants",
      "24/7 dedicated support",
      "Instant response time",
      "Full customization",
      "API access",
      "Advanced analytics",
      "Team collaboration",
      "Custom integrations",
      "White-label options",
      "SLA guarantee",
      "Custom training",
      "On-premise deployment",
      "20% discount",
    ],
    amount: 2879.9,
    assistantLimit: 999999, // Unlimited
    stripeProductId: null,
    stripePriceId: null,
    isActive: true,
  },
]

async function populatePlans() {
  try {
    console.log("\n📦 Populating plans table...\n")

    // Clear existing plans (optional - comment out if you want to keep existing)
    // await prisma.plan.deleteMany({})

    let created = 0
    let updated = 0

    for (const plan of plans) {
      const existing = await prisma.plan.findFirst({
        where: {
          title: plan.title,
          period: plan.period,
        },
      })

      if (existing) {
        await prisma.plan.update({
          where: { id: existing.id },
          data: {
            description: plan.description,
            features: plan.features,
            amount: plan.amount,
            assistantLimit: plan.assistantLimit,
            isActive: plan.isActive,
            // Don't overwrite Stripe IDs if they exist
            stripeProductId: existing.stripeProductId || plan.stripeProductId,
            stripePriceId: existing.stripePriceId || plan.stripePriceId,
          },
        })
        updated++
        console.log(`✅ Updated: ${plan.title} (${plan.period})`)
      } else {
        await prisma.plan.create({
          data: plan,
        })
        created++
        console.log(`✨ Created: ${plan.title} (${plan.period})`)
      }
    }

    console.log("\n" + "=".repeat(60))
    console.log(`✅ Successfully populated plans table!`)
    console.log(`   Created: ${created}`)
    console.log(`   Updated: ${updated}`)
    console.log("=".repeat(60))
    console.log("\n💡 Next step: Run the Stripe setup script to create products and prices")
    console.log("   npx ts-node scripts/create-stripe-products.ts\n")
  } catch (error: any) {
    console.error("\n❌ Error populating plans:")
    console.error(error.message)
    if (error.code === "P2002") {
      console.error("\n💡 Duplicate entry detected. Plans may already exist.")
    }
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the script
populatePlans()

