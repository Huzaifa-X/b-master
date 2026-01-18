"use client"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { FileText, Loader2 } from "lucide-react"
import { useSubscription } from "@/hooks/useSubscription"
import { useInvoices } from "@/hooks/useInvoices"
import { toast } from "sonner"

export default function BillingTab() {
  const {
    subscription,
    loading: subscriptionLoading,
    createPortal,
    isCreatingPortal,
  } = useSubscription()

  const { invoices, loading: invoicesLoading } = useInvoices()

  /**
   * Open Stripe Billing Portal - Following Guide 3
   */
  const handleManagePlan = async () => {
    try {
      const result = await createPortal()

      if (result.success && result.url) {
        // Redirect to Stripe portal
        window.location.href = result.url
      } else {
        toast.error(result.error || "Failed to open billing portal")
      }
    } catch (error: any) {
      console.error("Error opening portal:", error)
      toast.error(error.message || "Something went wrong")
    }
  }

  const formatDate = (date: Date | string | null | undefined) => {
    if (!date) return "N/A"
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  const formatCurrency = (amount: number, currency: string = "CHF") => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amount)
  }

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case "active":
        return <span className="px-2 py-1 text-xs rounded-full bg-green-500/10 text-green-500">Active</span>
      case "trialing":
        return <span className="px-2 py-1 text-xs rounded-full bg-blue-500/10 text-blue-500">Trial</span>
      case "canceled":
        return <span className="px-2 py-1 text-xs rounded-full bg-gray-500/10 text-gray-500">Canceled</span>
      case "past_due":
        return <span className="px-2 py-1 text-xs rounded-full bg-yellow-500/10 text-yellow-500">Past Due</span>
      default:
        return <span className="px-2 py-1 text-xs rounded-full bg-gray-500/10 text-gray-500">{status}</span>
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Billing & Subscription</h2>
        <p className="text-muted-foreground text-sm">
          Manage your subscription and payment methods
        </p>
      </div>

      <div className="space-y-6">
        {/* Current Plan Card */}
        <Card className="p-6 bg-transparent backdrop-blur-sm border-border/50">
          {subscriptionLoading ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Skeleton className="w-12 h-12 rounded-lg" />
                <div className="space-y-2">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-48" />
                </div>
              </div>
              <Skeleton className="h-9 w-24" />
            </div>
          ) : subscription ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <div className="w-6 h-6 relative">
                    <div className="absolute inset-0 rounded-full border-2 border-primary"></div>
                    <div className="absolute top-1 left-1 w-1 h-1 rounded-full bg-primary"></div>
                    <div className="absolute top-1 right-1 w-1 h-1 rounded-full bg-primary"></div>
                    <div className="absolute bottom-1 left-1 w-1 h-1 rounded-full bg-primary"></div>
                    <div className="absolute bottom-1 right-1 w-1 h-1 rounded-full bg-primary"></div>
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-semibold">{subscription.plan?.title || "Free"}</h3>
                  <p className="text-sm text-muted-foreground capitalize">
                    {subscription.plan?.period || "Free"} • {formatCurrency(subscription.plan?.amount || 0)}
                  </p>
                  {subscription.currentPeriodEnd && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Renews on {formatDate(subscription.currentPeriodEnd)}
                    </p>
                  )}
                  {subscription.status === "trialing" && (
                    <p className="text-xs text-blue-500 mt-1">Trial period active</p>
                  )}
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="hover:text-primary hover:bg-transparent"
                onClick={handleManagePlan}
                disabled={isCreatingPortal}
              >
                {isCreatingPortal ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Opening...
                  </>
                ) : (
                  "Manage Plan"
                )}
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <div className="w-6 h-6 relative">
                    <div className="absolute inset-0 rounded-full border-2 border-primary"></div>
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Free Plan</h3>
                  <p className="text-sm text-muted-foreground">No active subscription</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="hover:text-primary hover:bg-transparent"
                onClick={() => window.location.href = "/pricing"}
              >
                Upgrade Plan
              </Button>
            </div>
          )}
        </Card>

        {/* Subscription History Card */}
        <Card className="p-6 bg-transparent backdrop-blur-sm border-border/50">
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <FileText className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold">Subscription History</h3>
            </div>

            {invoicesLoading ? (
              <div className="space-y-3 mt-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="grid grid-cols-4 gap-4">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                ))}
              </div>
            ) : invoices && invoices.length > 0 ? (
              <div className="overflow-hidden">
                <div className="grid grid-cols-4 gap-4 text-sm font-medium text-muted-foreground border-b border-border pb-2">
                  <div>Date</div>
                  <div>Plan</div>
                  <div>Amount</div>
                  <div>Status</div>
                </div>

                <div className="space-y-3 mt-3">
                  {invoices.map((invoice) => (
                    <div key={invoice.id} className="grid grid-cols-4 gap-4 text-sm">
                      <div className="text-muted-foreground">
                        {formatDate(invoice.invoiceDate)}
                      </div>
                      <div className="font-medium">
                        {invoice.plan?.title || "Subscription"}
                      </div>
                      <div>{formatCurrency(invoice.amount, invoice.currency)}</div>
                      <div>{getStatusBadge(invoice.status)}</div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-sm text-muted-foreground">
                No subscription history found
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}

