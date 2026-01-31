"use client"

import { StatsCard } from "@/components/dashboard/stats-card"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Users,
  DollarSign,
  Activity,
  CreditCard,
  Server,
} from "lucide-react"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"
import { formatCurrency, formatNumber } from "@/lib/utils"

// Mock Data
const usageTrendData = [
  { date: "Jan 1", requests: 4000, tokens: 120000 },
  { date: "Jan 5", requests: 3000, tokens: 98000 },
  { date: "Jan 10", requests: 5000, tokens: 145000 },
  { date: "Jan 15", requests: 7000, tokens: 210000 },
  { date: "Jan 20", requests: 6500, tokens: 195000 },
  { date: "Jan 25", requests: 8000, tokens: 240000 },
  { date: "Jan 30", requests: 9500, tokens: 285000 },
]



export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard Overview</h1>
        <p className="text-muted-foreground">
          Welcome back! Here's what's happening with your platform today.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Users"
          value={formatNumber(2150)}
          icon={Users}
          trend={{ value: 12.5, isPositive: true }}
          description="from last month"
        />
        <StatsCard
          title="Total Revenue"
          value={formatCurrency(64870)}
          icon={DollarSign}
          trend={{ value: 8.2, isPositive: true }}
          description="from last month"
        />
        <StatsCard
          title="AI Requests Today"
          value={formatNumber(9543)}
          icon={Activity}
          trend={{ value: 4.3, isPositive: true }}
          description="from yesterday"
        />
        <StatsCard
          title="Active Subscriptions"
          value={formatNumber(748)}
          icon={CreditCard}
          trend={{ value: -2.1, isPositive: false }}
          description="from last month"
        />
      </div>

      {/* Main Content Area */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        
        {/* AI Usage Trend Chart */}
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>AI Usage Trend</CardTitle>
            <CardDescription>Requests and tokens over the last 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={usageTrendData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis 
                  dataKey="date" 
                  axisLine={false}
                  tickLine={false}
                  tickMargin={10}
                />
                <YAxis 
                  axisLine={false}
                  tickLine={false}
                  tickMargin={10}
                />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="requests"
                  stroke="#8884d8"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="tokens"
                  stroke="#82ca9d"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Side Panel: System Information */}
        <div className="col-span-3 space-y-4">
          
          {/* Detailed System Resources */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <Server className="h-4 w-4" />
                System Resources
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* CPU Usage */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-muted-foreground">CPU Usage</span>
                  <span className="font-bold">45%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-secondary">
                  <div className="h-full rounded-full bg-primary" style={{ width: "45%" }} />
                </div>
                <p className="text-xs text-muted-foreground">High load on Core 3</p>
              </div>

              {/* Memory Usage */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-muted-foreground">Memory Usage</span>
                  <span className="font-bold">6.2 GB / 16 GB</span>
                </div>
                <div className="h-2 w-full rounded-full bg-secondary">
                  <div className="h-full rounded-full bg-purple-500" style={{ width: "38%" }} />
                </div>
              </div>

              {/* Disk Usage */}
               <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-muted-foreground">Disk Usage</span>
                  <span className="font-bold">78%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-secondary">
                  <div className="h-full rounded-full bg-yellow-500" style={{ width: "78%" }} />
                </div>
                <p className="text-xs text-muted-foreground">140GB Free of 512GB</p>
              </div>
            </CardContent>
          </Card>

          {/* Services Health */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Services Health
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-sm font-medium">API Gateway</span>
                </div>
                <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
                  98ms
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                  <span className="text-sm font-medium">Database Cluster</span>
                </div>
                <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
                  Healthy
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="h-2 w-2 rounded-full bg-yellow-500" />
                  <span className="text-sm font-medium">Model Inference</span>
                </div>
                <Badge variant="outline" className="text-yellow-600 border-yellow-200 bg-yellow-50">
                  High Load
                </Badge>
              </div>
            </CardContent>
          </Card>

        </div>
      </div>




    </div>
  )
}
