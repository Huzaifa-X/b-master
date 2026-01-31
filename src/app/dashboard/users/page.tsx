"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { DataTable } from "@/components/dashboard/data-table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Eye, Search, Filter } from "lucide-react"
import { ColumnDef } from "@tanstack/react-table"
import { formatDate } from "@/lib/utils"
import { mockUsers, User } from "./data"

export default function UsersPage() {
  const router = useRouter()
  const [users, setUsers] = useState<User[]>(mockUsers)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("ALL")
  const [planFilter, setPlanFilter] = useState("ALL")

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesStatus = statusFilter === "ALL" || user.status === statusFilter
    const matchesPlan = planFilter === "ALL" || user.plan === planFilter

    return matchesSearch && matchesStatus && matchesPlan
  })

  const getRoleBadgeVariant = (role: User["role"]) => {
    switch (role) {
      case "SUPER_ADMIN":
        return "destructive"
      case "ADMIN":
        return "default"
      default:
        return "secondary"
    }
  }

  const getStatusBadgeVariant = (status: User["status"]) => {
    switch (status) {
      case "ACTIVE":
        return "default"
      case "SUSPENDED":
        return "destructive"
      default:
        return "secondary"
    }
  }

  const columns: ColumnDef<User>[] = [
    {
      accessorKey: "name",
      header: "User",
      cell: ({ row }) => (
        <div 
          className="flex items-center gap-3 cursor-pointer group" 
          onClick={() => router.push(`/dashboard/users/${row.original.id}`)}
        >
          <Avatar className="h-9 w-9 border group-hover:border-primary/50 transition-colors">
            <AvatarImage src={row.original.avatar} />
            <AvatarFallback>
              {row.original.name.split(" ").map((n) => n[0]).join("")}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="font-medium group-hover:text-primary transition-colors">{row.getValue("name")}</div>
            <div className="text-sm text-muted-foreground">{row.original.email}</div>
          </div>
        </div>
      ),
    },
    {
      accessorKey: "plan",
      header: "Plan",
      cell: ({ row }) => <Badge variant="outline" className="font-mono">{row.getValue("plan")}</Badge>,
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <Badge variant={getStatusBadgeVariant(row.getValue("status"))}>
          {row.getValue("status")}
        </Badge>
      ),
    },
    {
      accessorKey: "totalUsage",
      header: "Tokens Used",
      cell: ({ row }) => (
        <div className="text-sm font-mono text-muted-foreground">
          {new Intl.NumberFormat('en-US').format(row.getValue("totalUsage"))}
        </div>
      ),
    },
    {
      accessorKey: "lastLogin",
      header: "Last Active",
      cell: ({ row }) => (
        <div className="text-sm text-muted-foreground">
          {formatDate(row.getValue("lastLogin"))}
        </div>
      ),
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => router.push(`/dashboard/users/${row.original.id}`)}
        >
          <Eye className="h-4 w-4 mr-2" />
          Details
        </Button>
      ),
    },
  ]

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex items-center justify-between flex-none">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
          <p className="text-muted-foreground">
            Manage your users, view usage analytics, and handle account security.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 flex-none bg-muted/20 p-4 rounded-lg border">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search by name or email..." 
            className="pl-8 bg-background" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
           <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px] bg-background">
              <Filter className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Status</SelectItem>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="SUSPENDED">Suspended</SelectItem>
              <SelectItem value="INACTIVE">Inactive</SelectItem>
            </SelectContent>
          </Select>

          <Select value={planFilter} onValueChange={setPlanFilter}>
            <SelectTrigger className="w-[140px] bg-background">
              <Filter className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
               <SelectValue placeholder="Plan" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Plans</SelectItem>
              <SelectItem value="Free">Free</SelectItem>
              <SelectItem value="Basic">Basic</SelectItem>
              <SelectItem value="Pro">Pro</SelectItem>
              <SelectItem value="Enterprise">Enterprise</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="border rounded-md flex-1 bg-background">
        <DataTable columns={columns} data={filteredUsers} />
      </div>
    </div>
  )
}
