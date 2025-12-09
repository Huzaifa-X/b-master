"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Wallet, TrendingUp, Clock, ArrowDownToLine, ArrowUpRight, Loader2, DollarSign } from "lucide-react"
import { useWallet } from "@/hooks/useWallet"
import { toast } from "sonner"
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function WalletTab() {
  const { wallet, transactions, stats, loading, transactionsLoading, statsLoading, releaseEarnings, requestWithdrawal } = useWallet()
  const [isReleasing, setIsReleasing] = useState(false)
  const [isRequestingPayout, setIsRequestingPayout] = useState(false)
  const [payoutAmount, setPayoutAmount] = useState("")

  const handleReleaseEarnings = async () => {
    try {
      setIsReleasing(true)
      const result = await releaseEarnings(7)

      if (result.success) {
        toast.success(result.message || `Released ${formatCurrency(result.amountReleased || 0, result.currency || "CHF")} to available balance`)
      } else {
        toast.error(result.error || "Failed to release earnings")
      }
    } catch (error: any) {
      toast.error(error.message || "Something went wrong")
    } finally {
      setIsReleasing(false)
    }
  }

  const handleRequestPayout = async () => {
    const amount = parseFloat(payoutAmount)
    
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid amount")
      return
    }

    if (wallet && amount > wallet.availableAmount) {
      toast.error("Insufficient available balance")
      return
    }

    try {
      setIsRequestingPayout(true)
      const result = await requestWithdrawal(amount)

      if (result.success) {
        toast.success(result.message || "Payout request submitted successfully")
        setPayoutAmount("")
      } else {
        toast.error(result.error || "Failed to request payout")
      }
    } catch (error: any) {
      toast.error(error.message || "Something went wrong")
    } finally {
      setIsRequestingPayout(false)
    }
  }

  const formatCurrency = (amount: number, currency: string = "CHF") => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amount)
  }

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const getTransactionIcon = (type: string) => {
    if (type === "sale") {
      return <TrendingUp className="w-4 h-4 text-green-500" />
    }
    return <ArrowDownToLine className="w-4 h-4 text-red-500" />
  }

  const getTransactionColor = (type: string) => {
    if (type === "sale") {
      return "text-green-500"
    }
    return "text-red-500"
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Wallet & Earnings</h2>
        <p className="text-muted-foreground text-sm">
          Manage your earnings from assistant sales
        </p>
      </div>

      <div className="space-y-6">
        {/* Wallet Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Pending Amount */}
          <Card className="p-6 bg-transparent backdrop-blur-sm border-border/50">
            {loading ? (
              <div className="flex items-center gap-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-yellow-500" />
                  <span className="text-sm text-muted-foreground">Pending</span>
                </div>
                <p className="text-2xl font-semibold">
                  {formatCurrency(wallet?.pendingAmount || 0, wallet?.currency)}
                </p>
                <p className="text-xs text-muted-foreground">
                  Available after 7-day holding period
                </p>
              </div>
            )}
          </Card>

          {/* Available Amount */}
          <Card className="p-6 bg-transparent backdrop-blur-sm border-border/50">
            {loading ? (
              <div className="flex items-center gap-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-green-500" />
                  <span className="text-sm text-muted-foreground">Available</span>
                </div>
                <p className="text-2xl font-semibold text-green-500">
                  {formatCurrency(wallet?.availableAmount || 0, wallet?.currency)}
                </p>
                <p className="text-xs text-muted-foreground">
                  Ready for withdrawal
                </p>
              </div>
            )}
          </Card>

          {/* Total Earnings */}
          <Card className="p-6 bg-transparent backdrop-blur-sm border-border/50">
            {loading ? (
              <div className="flex items-center gap-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  <span className="text-sm text-muted-foreground">Total Earnings</span>
                </div>
                <p className="text-2xl font-semibold">
                  {formatCurrency(wallet?.totalEarnings || 0, wallet?.currency)}
                </p>
                <p className="text-xs text-muted-foreground">
                  Lifetime earnings
                </p>
              </div>
            )}
          </Card>
        </div>

        {/* Stats Card */}
        {stats && !statsLoading && (
          <Card className="p-6 bg-transparent backdrop-blur-sm border-border/50">
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold">Earnings Statistics</h3>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Total Sales</p>
                  <p className="text-xl font-semibold">{stats.totalSales}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Total Refunds</p>
                  <p className="text-xl font-semibold text-red-500">{stats.totalRefunds}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Sales Amount</p>
                  <p className="text-xl font-semibold text-green-500">
                    {formatCurrency(stats.totalSalesAmount, stats.currency)}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Refunded</p>
                  <p className="text-xl font-semibold text-red-500">
                    {formatCurrency(stats.totalRefundsAmount, stats.currency)}
                  </p>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Actions Card */}
        {/* <Card className="p-6 bg-transparent backdrop-blur-sm border-border/50 max-w-md mx-auto">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Actions</h3>

            <div className="flex flex-col sm:flex-row gap-4">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    className="flex items-center gap-2"
                    disabled={loading || !wallet || wallet.pendingAmount <= 0 || isReleasing}
                  >
                    {isReleasing ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Releasing...
                      </>
                    ) : (
                      <>
                        <ArrowUpRight className="h-4 w-4" />
                        Release Pending Earnings
                      </>
                    )}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Release Pending Earnings?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will move earnings from transactions older than 7 days from your pending balance to your available balance.
                      <br /><br />
                      <strong>Current Pending:</strong> {formatCurrency(wallet?.pendingAmount || 0, wallet?.currency)}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleReleaseEarnings}>
                      Release Earnings
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    className="flex items-center gap-2"
                    disabled={loading || !wallet || wallet.availableAmount <= 0 || isRequestingPayout}
                  >
                    {isRequestingPayout ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Wallet className="h-4 w-4" />
                        Request Payout
                      </>
                    )}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Request Payout</AlertDialogTitle>
                    <AlertDialogDescription>
                      Enter the amount you want to withdraw from your available balance.
                      <br /><br />
                      <strong>Available Balance:</strong> {formatCurrency(wallet?.availableAmount || 0, wallet?.currency)}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <div className="py-4">
                    <Label htmlFor="payout-amount">Amount ({wallet?.currency || "CHF"})</Label>
                    <Input
                      id="payout-amount"
                      type="number"
                      step="0.01"
                      min="0"
                      max={wallet?.availableAmount || 0}
                      value={payoutAmount}
                      onChange={(e) => setPayoutAmount(e.target.value)}
                      placeholder="0.00"
                      className="mt-2"
                    />
                  </div>
                  <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setPayoutAmount("")}>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleRequestPayout}>
                      Request Payout
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>

            <p className="text-xs text-muted-foreground">
              Note: Payout requests require Stripe Connect integration. Contact support for setup.
            </p>
          </div>
        </Card> */}

        {/* Transaction History Card */}
        <Card className="p-6 bg-transparent backdrop-blur-sm border-border/50">
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <ArrowUpRight className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold">Transaction History</h3>
            </div>

            {transactionsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : transactions.length > 0 ? (
              <div className="overflow-hidden">
                <div className="grid grid-cols-5 gap-4 text-sm font-medium text-muted-foreground border-b border-border pb-2">
                  <div>Date</div>
                  <div>Type</div>
                  <div>Status</div>
                  <div>Amount</div>
                  <div>Details</div>
                </div>

                <div className="space-y-3 mt-3 max-h-96 overflow-y-auto">
                  {transactions.map((transaction) => (
                    <div key={transaction.id} className="grid grid-cols-5 gap-4 text-sm items-center">
                      <div className="text-muted-foreground">{formatDate(transaction.createdAt)}</div>
                      <div className="flex items-center gap-2">
                        {getTransactionIcon(transaction.type)}
                        <span className="capitalize">{transaction.type}</span>
                      </div>
                      <div className="capitalize text-muted-foreground">{transaction.status}</div>
                      <div className={getTransactionColor(transaction.type)}>
                        {transaction.type === "sale" ? "+" : ""}
                        {formatCurrency(transaction.amount, transaction.currency)}
                      </div>
                      <div className="text-xs text-muted-foreground truncate" title={transaction.metadata?.assistantName || "-"}>
                        {transaction.metadata?.assistantName || "-"}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-sm text-muted-foreground">
                No transactions found. Start selling assistants to earn!
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}
