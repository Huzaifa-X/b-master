"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  FileText,
  MessageSquare,
  BarChart3,
  Users,
  CreditCard,
  Megaphone,
  Settings,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useState } from "react"

const navigation = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    name: "Prompts",
    href: "/dashboard/prompts",
    icon: FileText,
  },
  {
    name: "Users",
    href: "/dashboard/users",
    icon: Users,
  },
  {
    name: "Analytics",
    href: "/dashboard/analytics",
    icon: BarChart3,
  },
  {
    name: "User & AI Messages",
    href: "/dashboard/messages",
    icon: MessageSquare,
  },
  {
    name: "Banners",
    href: "/dashboard/banners",
    icon: Megaphone,
  },
  // {
  //   name: "Plans",
  //   href: "/dashboard/plans",
  //   icon: CreditCard,
  // },
  // {
  //   name: "Settings",
  //   href: "/dashboard/settings",
  //   icon: Settings,
  // },
]

export function Sidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div
      className={cn(
        "border-r bg-card transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex h-16 items-center border-b px-4">
          {!collapsed && (
            <Link href="/dashboard" className="flex items-center space-x-2">
              <div className="h-8 w-8 rounded-lg bg-primary" />
              <span className="text-lg font-bold">Admin</span>
            </Link>
          )}
          <Button
            variant="ghost"
            size="icon"
            className={cn("ml-auto", collapsed && "mx-auto")}
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 p-4">
          {navigation.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                {!collapsed && <span>{item.name}</span>}
              </Link>
            )
          })}
        </nav>

        {/* User Section */}
        {!collapsed && (
          <div className="border-t p-4">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-primary" />
              <div className="flex-1 text-sm">
                <p className="font-medium">Admin User</p>
                <p className="text-xs text-muted-foreground">admin@example.com</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
