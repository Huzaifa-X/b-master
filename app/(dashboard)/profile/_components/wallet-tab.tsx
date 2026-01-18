"use client"

import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Wallet, TrendingUp, Clock, ArrowDownToLine, ArrowUpRight, ExternalLink, CheckCircle, AlertCircle, DollarSign, Loader2 } from "lucide-react"
import { useWallet } from "@/hooks/useWallet"
import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { toast } from 'sonner';

export default function WalletTab() {
  const { wallet, transactions, stats, loading, transactionsLoading, statsLoading } = useWallet()
  const [connectStatus, setConnectStatus] = useState<any>(null);
  const [connectLoading, setConnectLoading] = useState(false);

  useEffect(() => {
    refreshConnectStatus();
  }, []);
  const refreshConnectStatus = async () => {
    try {
      const response = await fetch('/api/stripe/connect/refresh-status');
      if (response.ok) {
        const data = await response.json();
        setConnectStatus(data);
      } else {
        setConnectStatus({ status: 'not_connected' });
      }
    } catch (error) {
      console.error('Failed to refresh Connect status:', error);
      setConnectStatus({ status: 'not_connected' });
    }
  };
  const handleConnectStripe = async () => {
    setConnectLoading(true);
    try {
      const response = await fetch('/api/stripe/connect/onboard', {
        method: 'POST',
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error);
      }
      // Redirect to Stripe
      window.location.href = data.url;
    } catch (error: any) {
      toast.error(error.message || 'Failed to start onboarding');
      setConnectLoading(false);
    }
  };
  const getConnectStatusBadge = () => {
    if (!connectStatus) return null;
    const statusConfig: any = {
      active: {
        icon: CheckCircle,
        color: 'text-green-500 bg-green-50 border-green-200',
        text: 'Connected'
      },
      pending: {
        icon: Clock,
        color: 'text-yellow-500 bg-yellow-50 border-yellow-200',
        text: 'Pending Setup'
      },
      restricted: {
        icon: AlertCircle,
        color: 'text-red-500 bg-red-50 border-red-200',
        text: 'Restricted'
      },
      not_connected: {
        icon: AlertCircle,
        color: 'text-gray-500 bg-gray-50 border-gray-200',
        text: 'Not Connected'
      },
    };
    const config = statusConfig[connectStatus.status] || statusConfig.not_connected;
    const Icon = config.icon;
    return (
      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${config.color}`}>
        <Icon className="w-4 h-4" />
        <span className="text-sm font-medium">{config.text}</span>
      </div>
    );
  };

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
        <Card className="p-6 bg-transparent backdrop-blur-sm border-border/50">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Wallet className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">Stripe Connect</h3>
                  <p className="text-xs text-muted-foreground">
                    Required to receive payments from assistant sales
                  </p>
                </div>
              </div>
              {getConnectStatusBadge()}
            </div>
            {connectStatus?.status === 'active' ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-sm text-green-800">
                  ✅ Your account is active and ready to receive payments!
                </p>
              </div>
            ) : connectStatus?.status === 'pending' ? (
              <div className="space-y-3">
                <Button
                  onClick={handleConnectStripe}
                  disabled={connectLoading}
                  className="w-full"
                  variant="default"
                >
                  {connectLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Redirecting...
                    </>
                  ) : (
                    <>
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Complete Stripe Setup
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <Button
                  onClick={handleConnectStripe}
                  disabled={connectLoading}
                  className="w-full"
                  variant="default"
                >
                  {connectLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Redirecting...
                    </>
                  ) : (
                    <>
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Connect Stripe Account
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </Card>
        {/* Wallet Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Pending Amount */}
          <Card className="p-6 bg-transparent backdrop-blur-sm border-border/50">
            {loading ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Skeleton className="w-4 h-4 rounded" />
                  <Skeleton className="h-4 w-16" />
                </div>
                <Skeleton className="h-8 w-32" />
                <Skeleton className="h-3 w-48" />
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
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Skeleton className="w-4 h-4 rounded" />
                  <Skeleton className="h-4 w-20" />
                </div>
                <Skeleton className="h-8 w-32" />
                <Skeleton className="h-3 w-36" />
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
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Skeleton className="w-4 h-4 rounded" />
                  <Skeleton className="h-4 w-28" />
                </div>
                <Skeleton className="h-8 w-32" />
                <Skeleton className="h-3 w-32" />
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
        {statsLoading ? (
          <Card className="p-6 bg-transparent backdrop-blur-sm border-border/50">
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Skeleton className="w-12 h-12 rounded-lg" />
                <Skeleton className="h-6 w-40" />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
                <div className="space-y-1">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-6 w-12" />
                </div>
                <div className="space-y-1">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-6 w-12" />
                </div>
                <div className="space-y-1">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-6 w-24" />
                </div>
                <div className="space-y-1">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-6 w-24" />
                </div>
              </div>
            </div>
          </Card>
        ) : stats && (
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
              <div className="space-y-3 mt-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="grid grid-cols-5 gap-4">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                ))}
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
