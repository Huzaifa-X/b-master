"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"
import { formatCurrency, formatNumber } from "@/lib/utils"

// Mock Data
const requestsOverTime = [
  { date: "Jan 1", requests: 1200, tokens: 45000, cost: 18.5 },
  { date: "Jan 3", requests: 1500, tokens: 52000, cost: 21.3 },
  { date: "Jan 5", requests: 1800, tokens: 68000, cost: 27.8 },
  { date: "Jan 7", requests: 2100, tokens: 75000, cost: 30.2 },
  { date: "Jan 9", requests: 1900, tokens: 70000, cost: 28.5 },
  { date: "Jan 11", requests: 2300, tokens: 82000, cost: 33.1 },
  { date: "Jan 13", requests: 2700, tokens: 95000, cost: 38.4 },
  { date: "Jan 15", requests: 2500, tokens: 88000, cost: 35.6 },
  { date: "Jan 17", requests: 2900, tokens: 105000, cost: 42.3 },
  { date: "Jan 19", requests: 3200, tokens: 115000, cost: 46.2 },
  { date: "Jan 21", requests: 3500, tokens: 125000, cost: 50.5 },
]

const costByModel = [
  { model: "GPT-4", cost: 1250, requests: 8500 },
  { model: "GPT-3.5", cost: 350, requests: 15200 },
  { model: "Claude-3", cost: 890, requests: 6800 },
  { model: "Gemini", cost: 420, requests: 4500 },
]

const featureUsage = [
  { name: "Text Generation", value: 45, color: "#0088FE" },
  { name: "Code Assistant", value: 25, color: "#00C49F" },
  { name: "Image Analysis", value: 15, color: "#FFBB28" },
  { name: "Translation", value: 10, color: "#FF8042" },
  { name: "Other", value: 5, color: "#8884d8" },
]

const topUsers = [
  { name: "sarah@example.com", tokens: 125000, cost: 52.5, requests: 850 },
  { name: "john@example.com", tokens: 98000, cost: 41.2, requests: 720 },
  { name: "mike@example.com", tokens: 85000, cost: 35.8, requests: 650 },
  { name: "lisa@example.com", tokens: 72000, cost: 30.1, requests: 580 },
  { name: "david@example.com", tokens: 65000, cost: 27.3, requests: 520 },
]

const hourlyUsage = [
  { hour: "00:00", requests: 120 },
  { hour: "03:00", requests: 80 },
  { hour: "06:00", requests: 150 },
  { hour: "09:00", requests: 450 },
  { hour: "12:00", requests: 680 },
  { hour: "15:00", requests: 720 },
  { hour: "18:00", requests: 580 },
  { hour: "21:00", requests: 420 },
]

export default function AnalyticsPage() {
  const [dateRange, setDateRange] = useState("30d")

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">AI Usage Analytics</h1>
          <p className="text-muted-foreground">
            Comprehensive insights into AI usage, costs, and patterns
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="custom">Custom Range</SelectItem>
            </SelectContent>
          </Select>
          <Button>
            <Download className="mr-2 h-4 w-4" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Requests</CardDescription>
            <CardTitle className="text-3xl">{formatNumber(28450)}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">+12.5%</span> from last period
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Tokens Consumed</CardDescription>
            <CardTitle className="text-3xl">{formatNumber(1045000)}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">+8.3%</span> from last period
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Cost</CardDescription>
            <CardTitle className="text-3xl">{formatCurrency(4235)}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">+5.2%</span> from last period
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Avg Response Time</CardDescription>
            <CardTitle className="text-3xl">1.2s</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              <span className="text-red-600">+0.1s</span> from last period
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Charts */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="costs">Costs</TabsTrigger>
          <TabsTrigger value="usage">Usage Patterns</TabsTrigger>
          <TabsTrigger value="users">Top Users</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Requests & Tokens Over Time</CardTitle>
                <CardDescription>Daily AI usage trends</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={requestsOverTime}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip />
                    <Legend />
                    <Area
                      yAxisId="left"
                      type="monotone"
                      dataKey="requests"
                      stroke="#8884d8"
                      fill="#8884d8"
                      fillOpacity={0.6}
                    />
                    <Area
                      yAxisId="right"
                      type="monotone"
                      dataKey="tokens"
                      stroke="#82ca9d"
                      fill="#82ca9d"
                      fillOpacity={0.6}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Feature Usage Distribution</CardTitle>
                <CardDescription>Breakdown by AI feature type</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={featureUsage}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name} ${value}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {featureUsage.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="costs" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Cost Over Time</CardTitle>
                <CardDescription>Daily AI costs in USD</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={requestsOverTime}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip formatter={(value) => `$${value}`} />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="cost"
                      stroke="#8884d8"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Cost by Model</CardTitle>
                <CardDescription>Spending breakdown by AI model</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={costByModel}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="model" />
                    <YAxis />
                    <Tooltip formatter={(value) => `$${value}`} />
                    <Legend />
                    <Bar dataKey="cost" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="usage" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Hourly Usage Pattern</CardTitle>
              <CardDescription>Request volume throughout the day</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={hourlyUsage}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="hour" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="requests" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Top Users by Usage</CardTitle>
              <CardDescription>Highest AI consumers this period</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {topUsers.map((user, index) => (
                  <div
                    key={user.name}
                    className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium">{user.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatNumber(user.requests)} requests
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatNumber(user.tokens)} tokens</p>
                      <p className="text-sm text-muted-foreground">
                        {formatCurrency(user.cost)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
