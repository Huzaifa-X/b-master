"use client"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { CreditCard, FileText, XCircle } from "lucide-react"

export default function BillingTab() {
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
                <h3 className="text-lg font-semibold">Pro plan</h3>
                <p className="text-sm text-muted-foreground">Monthly</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Your subscription will auto renew on Nov 7, 2025.
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="hover:text-primary hover:bg-transparent"
            >
              Adjust plan
            </Button>
          </div>
        </Card>

        {/* Payment Method Card */}
        <Card className="p-6 bg-transparent backdrop-blur-sm border-border/50">
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
        </Card>

        {/* Invoices Card */}
        <Card className="p-6 bg-transparent backdrop-blur-sm border-border/50">
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <FileText className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold">Invoices</h3>
            </div>

            <div className="overflow-hidden">
              <div className="grid grid-cols-4 gap-4 text-sm font-medium text-muted-foreground border-b border-border pb-2">
                <div>Date</div>
                <div>Total</div>
                <div>Status</div>
              </div>

              <div className="space-y-3 mt-3">
                <div className="grid grid-cols-4 gap-4 text-sm">
                  <div>Oct 7, 2025</div>
                  <div>US$20.00</div>
                  <div className="text-green-500">Paid</div>
                </div>

                <div className="grid grid-cols-4 gap-4 text-sm">
                  <div>Sep 7, 2025</div>
                  <div>US$20.00</div>
                  <div className="text-green-500">Paid</div>
                </div>

                <div className="grid grid-cols-4 gap-4 text-sm">
                  <div>Aug 7, 2025</div>
                  <div>US$20.00</div>
                  <div className="text-green-500">Paid</div>
                </div>

                <div className="grid grid-cols-4 gap-4 text-sm">
                  <div>Jul 31, 2025</div>
                  <div>US$0.00</div>
                  <div className="text-green-500">Paid</div>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Cancellation Card */}
        <Card className="p-6 bg-transparent backdrop-blur-sm border-border/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-destructive/10 flex items-center justify-center">
                <XCircle className="w-6 h-6 text-destructive" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Cancellation</h3>
                <p className="text-sm text-muted-foreground">Cancel plan</p>
              </div>
            </div>
            <Button variant="destructive" size="sm">
              Cancel
            </Button>
          </div>
        </Card>
      </div>
    </div>
  )
}

