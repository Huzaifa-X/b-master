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
import { ArrowRight, BadgeCheck, X, Loader2 } from "lucide-react"
import { useState } from "react"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { useSubscription, usePlans } from "@/hooks/useSubscription"
import { Skeleton } from "@/components/ui/skeleton"

export default function PricingPage() {
  const router = useRouter()
  const { subscription, loading: subscriptionLoading } = useSubscription()
  const { plans: allPlans, loading: plansLoading } = usePlans()
  const { createCheckout } = useSubscription()
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly")
  const [subscribingPlanId, setSubscribingPlanId] = useState<number | null>(null)

  const currentPlans = allPlans.filter((plan) => {
    if (billingCycle === "monthly") {
      return plan.period === "monthly" || plan.period === "free"
    } else {
      return plan.period === "yearly"
    }
  })

  /**
   * Handle subscription - Following Guide 1 & 4 pattern
   * Frontend duplicate subscription check before calling createCheckout
   */
  const handleSubscribe = async (planId: number, planName: string) => {
    try {
      setSubscribingPlanId(planId)

      // ============================================
      // FRONTEND DUPLICATE SUBSCRIPTION CHECK (Guide 4)
      // ============================================
      if (subscription && subscription.planId) {
        // User already has an active subscription
        toast.error(
          `You already have an active subscription. Please visit your profile to manage your subscription.`,
          {
            action: {
              label: "Manage",
              onClick: () => router.push("/profile"),
            },
          }
        )
        setSubscribingPlanId(null)
        return
      }

      // ============================================
      // CREATE CHECKOUT SESSION (Guide 1)
      // ============================================
      const result = await createCheckout(planId)

      if (result.success && 'url' in result && result.url) {
        // Redirect to Stripe Checkout
        window.location.href = result.url
      } else {
        // Show error
        toast.error('error' in result ? result.error : "Failed to create checkout session")
        setSubscribingPlanId(null)
      }
    } catch (error: any) {
      console.error("Error subscribing:", error)
      toast.error(error.message || "Something went wrong")
      setSubscribingPlanId(null)
    }
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
        {plansLoading ? (
          <div className={cn(
            "grid gap-6 mx-auto",
            billingCycle === "monthly" ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-4 max-w-7xl" : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 max-w-6xl"
          )}>
            {Array.from({ length: billingCycle === "monthly" ? 4 : 3 }).map((_, i) => (
              <Card key={i} className="relative w-full text-left flex flex-col">
                <CardHeader>
                  <Skeleton className="h-6 w-32 mb-2" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <div className="flex items-baseline gap-1">
                      <Skeleton className="h-8 w-24" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="grid gap-3 flex-1">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <div key={j} className="flex gap-2">
                      <Skeleton className="h-5 w-5 rounded" />
                      <Skeleton className="h-4 w-full" />
                    </div>
                  ))}
                </CardContent>
                <CardFooter>
                  <Skeleton className="h-10 w-full" />
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : (
          <div className={cn(
            "grid gap-6 mx-auto",
            currentPlans.length === 2 && "grid-cols-1 md:grid-cols-2 max-w-4xl",
            currentPlans.length === 3 && "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 max-w-6xl",
            currentPlans.length === 4 && "grid-cols-1 md:grid-cols-2 lg:grid-cols-4 max-w-7xl",
            currentPlans.length > 4 && "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 max-w-7xl"
          )}>
            {currentPlans.map((plan) => {
              const features = Array.isArray(plan.features) ? plan.features : []
              const isPopular = plan.title === "Professional" || plan.title === "Professional (Yearly)"
              const isSubscribing = subscribingPlanId === plan.id
              const isFree = plan.period === "free"
              const isCurrentPlan = subscription?.planId === plan.id

              return (
                <Card
                  className={cn(
                    "relative w-full text-left flex flex-col",
                    isPopular && "ring-2 ring-[#BDA76D]"
                  )}
                  key={plan.id}
                >
                  {isPopular && (
                    <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#BDA76D] hover:bg-[#BDA76D]/90 text-white">
                      Popular
                    </Badge>
                  )}
                  <CardHeader>
                    <CardTitle className="text-xl font-medium">
                      {plan.title}
                    </CardTitle>
                    <CardDescription>
                      <p className="mb-4">{plan.description || ""}</p>
                      <div className="flex items-baseline gap-1">
                        <span className="text-sm text-muted-foreground">CHF</span>
                        <NumberFlow
                          className="font-medium text-foreground text-3xl"
                          format={{
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          }}
                          value={Number(plan.amount)}
                        />
                        {!isFree && (
                          <span className="text-sm text-muted-foreground">/{plan.period === "yearly" ? "year" : "month"}</span>
                        )}
                      </div>
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-3 flex-1">
                    {features.map((feature, index: number) => (
                      <div
                        className="flex gap-2 text-muted-foreground text-sm items-start"
                        key={index}
                      >
                        <BadgeCheck className="h-5 w-5 flex-none text-[#BDA76D] mt-0.5" />
                        <span>{String(feature)}</span>
                      </div>
                    ))}
                  </CardContent>
                  <CardFooter>
                    <Button
                      className={cn(
                        "w-full",
                        isPopular && !isCurrentPlan && "bg-[#BDA76D] hover:bg-[#BDA76D]/90 text-white",
                        isCurrentPlan && "bg-green-600 hover:bg-green-600 text-white"
                      )}
                      variant={isPopular && !isCurrentPlan ? "default" : isCurrentPlan ? "default" : "secondary"}
                      onClick={() => handleSubscribe(plan.id, plan.title)}
                      disabled={isSubscribing || isFree || isCurrentPlan}
                    >
                      {isSubscribing ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : isCurrentPlan ? (
                        <>
                          <BadgeCheck className="mr-2 h-4 w-4" />
                          Current Plan
                        </>
                      ) : isFree ? (
                        "Free"
                      ) : (
                        <>
                          Get {plan.title.replace(" (Yearly)", "")}
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </>
                      )}
                    </Button>
                  </CardFooter>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
