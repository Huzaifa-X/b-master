"use client"

import NumberFlow from "@number-flow/react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { ArrowRight, BadgeCheck, X } from "lucide-react"
import { useState } from "react"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useRouter } from "next/navigation"

const monthlyPlans = [
  {
    id: "free",
    name: "Free",
    price: 0,
    currency: "CHF",
    period: "monthly",
    description: "Perfect for getting started with AI assistants",
    features: [
      "1 AI Assistant",
      "Basic support",
      "Standard response time",
      "Community access",
    ],
    cta: "Get Free",
    popular: false,
  },
  {
    id: "starter",
    name: "Starter",
    price: 29.99,
    currency: "CHF",
    period: "monthly",
    description: "Great for small teams and individual users",
    features: [
      "5 AI Assistants",
      "Priority support",
      "Faster response time",
      "Advanced customization",
      "API access",
      "Analytics dashboard",
    ],
    cta: "Get Starter",
    popular: false,
  },
  {
    id: "professional",
    name: "Professional",
    price: 99.99,
    currency: "CHF",
    period: "monthly",
    description: "Ideal for growing businesses and teams",
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
    cta: "Get Professional",
    popular: true,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: 299.99,
    currency: "CHF",
    period: "monthly",
    description: "For large organizations with custom needs",
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
    cta: "Get Enterprise",
    popular: false,
  },
]

const yearlyPlans = [
  {
    id: "starter-yearly",
    name: "Starter (Yearly)",
    price: 287.9,
    currency: "CHF",
    period: "yearly",
    description: "Great for small teams and individual users - Save 20%",
    features: [
      "5 AI Assistants",
      "Priority support",
      "Faster response time",
      "Advanced customization",
      "API access",
      "Analytics dashboard",
      "20% discount",
    ],
    cta: "Get Starter (Yearly)",
    popular: false,
    discount: true,
  },
  {
    id: "professional-yearly",
    name: "Professional (Yearly)",
    price: 959.9,
    currency: "CHF",
    period: "yearly",
    description: "Ideal for growing businesses and teams - Save 20%",
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
    cta: "Get Professional (Yearly)",
    popular: true,
    discount: true,
  },
  {
    id: "enterprise-yearly",
    name: "Enterprise (Yearly)",
    price: 2879.9,
    currency: "CHF",
    period: "yearly",
    description: "For large organizations with custom needs - Save 20%",
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
    cta: "Get Enterprise (Yearly)",
    popular: false,
    discount: true,
  },
]

export default function PricingPage() {
  const router = useRouter()
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly")

  const currentPlans = billingCycle === "monthly" ? monthlyPlans : yearlyPlans

  const handleSubscribe = (planId: string) => {
    console.log("Subscribe to plan:", planId)
    // TODO: Implement subscription logic
  }

  const handleClose = () => {
    router.back()
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="container mx-auto px-4 py-12 max-w-7xl relative">
        {/* Close Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={handleClose}
          className="absolute top-4 right-4 hover:bg-transparent hover:text-[#BDA76D]"
        >
          <X className="h-5 w-5" />
        </Button>

        {/* Header */}
        <div className="flex flex-col items-center justify-center gap-8 mb-12">
          <h1 className="text-5xl font-medium tracking-tight text-balance text-center">
            Simple, transparent pricing
          </h1>
          <p className="mx-auto max-w-2xl text-balance text-lg text-muted-foreground text-center">
            Managing a business is hard enough, so why not make your life easier?
            Our pricing plans are simple, transparent and scale with you.
          </p>

          {/* Billing Cycle Toggle */}
          <Tabs defaultValue={billingCycle} onValueChange={(value) => setBillingCycle(value as "monthly" | "yearly")}>
            <TabsList>
              <TabsTrigger value="monthly">Monthly</TabsTrigger>
              <TabsTrigger value="yearly">
                Yearly
                <Badge variant="secondary" className="ml-2">20% off</Badge>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Pricing Cards */}
        <div className={cn(
          "grid gap-6 mx-auto",
          billingCycle === "monthly" ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-4 max-w-7xl" : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 max-w-6xl"
        )}>
          {currentPlans.map((plan) => (
            <Card
              className={cn(
                "relative w-full text-left flex flex-col",
                plan.popular && "ring-2 ring-[#BDA76D]"
              )}
              key={plan.id}
            >
              {plan.popular && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#BDA76D] hover:bg-[#BDA76D]/90 text-white">
                  Popular
                </Badge>
              )}
              <CardHeader>
                <CardTitle className="text-xl font-medium">
                  {plan.name}
                </CardTitle>
                <CardDescription>
                  <p className="mb-4">{plan.description}</p>
                  {typeof plan.price === "number" ? (
                    <div className="flex items-baseline gap-1">
                      <span className="text-sm text-muted-foreground">{plan.currency}</span>
                      <NumberFlow
                        className="font-medium text-foreground text-3xl"
                        format={{
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        }}
                        value={plan.price}
                      />
                      <span className="text-sm text-muted-foreground">/{billingCycle}</span>
                    </div>
                  ) : (
                    <span className="font-medium text-foreground text-lg">
                      {plan.price}
                    </span>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 flex-1">
                {plan.features.map((feature, index) => (
                  <div
                    className="flex gap-2 text-muted-foreground text-sm items-start"
                    key={index}
                  >
                    <BadgeCheck className="h-5 w-5 flex-none text-[#BDA76D] mt-0.5" />
                    <span>{feature}</span>
                  </div>
                ))}
              </CardContent>
              <CardFooter>
                <Button
                  className={cn(
                    "w-full",
                    plan.popular && "bg-[#BDA76D] hover:bg-[#BDA76D]/90 text-white"
                  )}
                  variant={plan.popular ? "default" : "secondary"}
                  onClick={() => handleSubscribe(plan.id)}
                >
                  {plan.cta}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}

