"use client"

import { use, useState } from "react"
import { useRouter } from "next/navigation"
import { mockUsers, User } from "../data"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Switch } from "@/components/ui/switch"
import { 
  ArrowLeft, 
  Mail, 
  Calendar, 
  Shield, 
  Activity, 
  CreditCard, 
  Lock, 
  History,
  AlertTriangle,
  CheckCircle2
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { formatDate } from "@/lib/utils"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar
} from "recharts"

// Mock Usage Data
const mockUsageData = [
  { date: "Jan 15", tokens: 1200, requests: 45 },
  { date: "Jan 16", tokens: 1800, requests: 62 },
  { date: "Jan 17", tokens: 900, requests: 30 },
  { date: "Jan 18", tokens: 2500, requests: 85 },
  { date: "Jan 19", tokens: 3100, requests: 110 },
  { date: "Jan 20", tokens: 2800, requests: 95 },
  { date: "Jan 21", tokens: 1500, requests: 55 },
]

// Mock Activity Logs
const mockActivityLogs = [
  { id: 1, action: "Login Successful", ip: "192.168.1.1", date: "2026-01-22 10:30 AM" },
  { id: 2, action: "API Key Created", ip: "192.168.1.1", date: "2026-01-21 02:15 PM" },
  { id: 3, action: "Password Changed", ip: "192.168.1.1", date: "2026-01-20 09:45 AM" },
  { id: 4, action: "Plan Upgraded to Pro", ip: "192.168.1.1", date: "2026-01-15 11:20 AM" },
]

export default function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const router = useRouter()
  const { toast } = useToast()
  
  const user = mockUsers.find(u => u.id === resolvedParams.id) || mockUsers[0]
  
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

  if (!user) {
    return <div>User not found</div>
  }

  const handlePasswordChange = () => {
    if (newPassword !== confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match",
        variant: "destructive"
      })
      return
    }
    toast({
      title: "Success",
      description: "User password has been updated successfully",
    })
    setNewPassword("")
    setConfirmPassword("")
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">User Details</h1>
          <p className="text-muted-foreground">Manage account settings and view activity</p>
        </div>
        <div className="flex gap-2">
          {user.status === "ACTIVE" ? (
             <Button variant="destructive">Suspend User</Button>
          ) : (
             <Button variant="outline" className="text-green-600 border-green-200 hover:bg-green-50">Activate User</Button>
          )}
        </div>
      </div>

      {/* User Profile Summary */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            <Avatar className="h-24 w-24 text-4xl">
              <AvatarImage src={user.avatar} />
              <AvatarFallback>
                {user.name.split(" ").map((n) => n[0]).join("")}
              </AvatarFallback>
            </Avatar>
            
            <div className="space-y-1 flex-1">
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-bold">{user.name}</h2>
                <Badge variant={user.status === "ACTIVE" ? "default" : "destructive"}>
                  {user.status}
                </Badge>
                <Badge variant="outline">{user.plan}</Badge>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 text-muted-foreground text-sm">
                <div className="flex items-center gap-1">
                  <Mail className="h-4 w-4" /> {user.email}
                </div>
                <div className="flex items-center gap-1">
                  <Shield className="h-4 w-4" /> {user.role}
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" /> Joined {formatDate(user.createdAt)}
                </div>
              </div>
            </div>
            
             <div className="grid grid-cols-2 gap-4 text-right">
              <div>
                <div className="text-sm text-muted-foreground">Total Usage</div>
                <div className="text-2xl font-bold">{new Intl.NumberFormat('en-US').format(user.totalUsage)}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Last Login</div>
                <div className="font-medium">{formatDate(user.lastLogin)}</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="usage">Usage & Analytics</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="activity">Activity Log</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Plan Details</CardTitle>
                <CreditCard className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{user.plan}</div>
                <p className="text-xs text-muted-foreground">$29/month billed yearly</p>
                <div className="mt-4 pt-4 border-t text-sm space-y-2">
                  <div className="flex justify-between">
                    <span>Next Billing Date</span>
                    <span className="font-medium">Feb 10, 2026</span>
                  </div>
                  <div className="flex items-center text-green-600 gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Auto-renewal on
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Account Health</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">Good Standing</div>
                <p className="text-xs text-muted-foreground">No recent policy violations</p>
                <div className="mt-4 pt-4 border-t">
                  <div className="h-2 w-full rounded-full bg-secondary">
                    <div className="h-full rounded-full bg-green-500 w-[95%]" />
                  </div>
                  <p className="text-xs text-center mt-1 text-muted-foreground">Trust Score: 95/100</p>
                </div>
              </CardContent>
            </Card>

             <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">API Keys</CardTitle>
                <Lock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">2 Active</div>
                <p className="text-xs text-muted-foreground">Last used 2 minutes ago</p>
                 <div className="mt-4 pt-4 border-t space-y-2">
                  <Button variant="outline" size="sm" className="w-full">Manage Keys</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Usage Tab */}
        <TabsContent value="usage" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Token Usage (Last 7 Days)</CardTitle>
                <CardDescription>Daily token consumption trend</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={mockUsageData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="tokens" stroke="#8884d8" name="Tokens" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>API Requests</CardTitle>
                <CardDescription>Number of API calls per day</CardDescription>
              </CardHeader>
              <CardContent>
                 <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={mockUsageData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="requests" fill="#82ca9d" name="Requests" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
              <CardDescription>Update password and security preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 max-w-md">
                <div className="space-y-2">
                  <Label>New Password</Label>
                  <Input 
                    type="password" 
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Confirm Password</Label>
                   <Input 
                    type="password" 
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
                <Button onClick={handlePasswordChange}>Update Password</Button>
              </div>

               <div className="border-t pt-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Two-Factor Authentication</Label>
                    <CardDescription>Enable 2FA for enhanced account security.</CardDescription>
                  </div>
                  <Switch />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Audit log of user actions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-8">
                {mockActivityLogs.map((log) => (
                  <div key={log.id} className="flex items-center">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback>
                        <History className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="ml-4 space-y-1">
                      <p className="text-sm font-medium leading-none">{log.action}</p>
                      <p className="text-sm text-muted-foreground">
                        IP: {log.ip}
                      </p>
                    </div>
                    <div className="ml-auto font-medium text-xs text-muted-foreground">
                      {log.date}
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
