"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { CreditCard, FileText, XCircle, Loader2 } from "lucide-react"
import { useSubscription } from "@/hooks/useSubscription"
import { useInvoices } from "@/hooks/useInvoices"
import { cancelSubscription } from "@/app/actions/subscription.action"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

export default function BillingTab() {
  const router = useRouter()
  const { subscription, loading: subscriptionLoading, refetch: refetchSubscription } = useSubscription()
  const { invoices, loading: invoicesLoading } = useInvoices()
  const [isCanceling, setIsCanceling] = useState(false)

  const handleAdjustPlan = () => {
    router.push("/pricing")
  }

  const handleCancelSubscription = async () => {
    try {
      setIsCanceling(true)
      const result = await cancelSubscription()

      if (result.success) {
        toast.success(result.message || "Subscription canceled successfully")
        refetchSubscription()
      } else {
        toast.error(result.error || "Failed to cancel subscription")
      }
    } catch (error: any) {
      console.error("Error canceling subscription:", error)
      toast.error(error.message || "Something went wrong")
    } finally {
      setIsCanceling(false)
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

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "paid":
        return "text-green-500"
      case "open":
        return "text-yellow-500"
      case "draft":
        return "text-gray-500"
      default:
        return "text-muted-foreground"
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
            <div className="flex items-center gap-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Loading subscription...</span>
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
                    {subscription.plan?.period || "Free"}
                  </p>
                  {subscription.currentPeriodEnd && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {subscription.cancelAtPeriodEnd
                        ? `Subscription will end on ${formatDate(subscription.currentPeriodEnd)}`
                        : `Your subscription will auto renew on ${formatDate(subscription.currentPeriodEnd)}`}
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
                onClick={handleAdjustPlan}
              >
                Adjust plan
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
                onClick={handleAdjustPlan}
              >
                Upgrade Plan
              </Button>
            </div>
          )}
        </Card>

        {/* Payment Method Card - Commented out as requested */}
        {/* <Card className="p-6 bg-transparent backdrop-blur-sm border-border/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Payment</h3>
                <div className="flex items-center gap-2 mt-1">
                  <CreditCard className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Mastercard</span>
                  <span className="text-sm text-muted-foreground">•••• 6458</span>
                </div>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="hover:text-primary hover:bg-transparent"
            >
              Update
            </Button>
          </div>
        </Card> */}

        {/* Invoices Card */}
        <Card className="p-6 bg-transparent backdrop-blur-sm border-border/50">
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <FileText className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold">Invoices</h3>
            </div>

            {invoicesLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : invoices.length > 0 ? (
              <div className="overflow-hidden">
                <div className="grid grid-cols-4 gap-4 text-sm font-medium text-muted-foreground border-b border-border pb-2">
                  <div>Date</div>
                  <div>Invoice #</div>
                  <div>Total</div>
                  <div>Status</div>
                </div>

                <div className="space-y-3 mt-3">
                  {invoices.map((invoice) => (
                    <div key={invoice.id} className="grid grid-cols-4 gap-4 text-sm">
                      <div>{formatDate(invoice.invoiceDate)}</div>
                      <div className="text-muted-foreground">{invoice.invoiceNumber}</div>
                      <div>{formatCurrency(invoice.totalAmount, invoice.currency)}</div>
                      <div className={getStatusColor(invoice.status)}>
                        {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-sm text-muted-foreground">
                No invoices found
              </div>
            )}
          </div>
        </Card>

        {/* Cancellation Card */}
        {subscription && subscription.status === "active" && !subscription.cancelAtPeriodEnd && (
          <Card className="p-6 bg-transparent backdrop-blur-sm border-border/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-destructive/10 flex items-center justify-center">
                  <XCircle className="w-6 h-6 text-destructive" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Cancellation</h3>
                  <p className="text-sm text-muted-foreground">
                    Cancel your subscription at the end of the current period
                  </p>
                </div>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm" disabled={isCanceling}>
                    {isCanceling ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Canceling...
                      </>
                    ) : (
                      "Cancel"
                    )}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Cancel Subscription?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to cancel your subscription? Your subscription will
                      remain active until the end of the current billing period (
                      {subscription.currentPeriodEnd
                        ? formatDate(subscription.currentPeriodEnd)
                        : "N/A"}
                      ). You will continue to have access to all features until then.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Keep Subscription</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleCancelSubscription}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Yes, Cancel Subscription
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </Card>
        )}

        {/* Already Canceled Card */}
        {subscription && subscription.cancelAtPeriodEnd && (
          <Card className="p-6 bg-transparent backdrop-blur-sm border-border/50 border-yellow-500/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                  <XCircle className="w-6 h-6 text-yellow-500" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Subscription Canceled</h3>
                  <p className="text-sm text-muted-foreground">
                    Your subscription will end on{" "}
                    {subscription.currentPeriodEnd
                      ? formatDate(subscription.currentPeriodEnd)
                      : "N/A"}
                  </p>
                </div>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}

