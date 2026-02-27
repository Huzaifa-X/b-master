"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  LayoutDashboard, FileText, Megaphone, BarChart3,
  MessageSquare, Users, CreditCard, Shield, LogOut,
} from "lucide-react"
import { logoutSuperAdmin } from "@/app/actions/super-admin.action"
import { cn } from "@/lib/utils"

const navItems = [
  { href: "/super-admin/dashboard",  label: "Dashboard",   icon: LayoutDashboard },
  { href: "/super-admin/users",      label: "Users",        icon: Users },
  { href: "/super-admin/plans",      label: "Plans",        icon: CreditCard },
  { href: "/super-admin/prompts",    label: "Prompts",      icon: FileText },
  { href: "/super-admin/analytics",  label: "Analytics",    icon: BarChart3 },
  { href: "/super-admin/messages",   label: "Messages",     icon: MessageSquare },
  { href: "/super-admin/banners",    label: "Banners",      icon: Megaphone },
]

export function SaNav() {
  const pathname = usePathname()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const handleLogout = () => {
    startTransition(async () => {
      await logoutSuperAdmin()
      router.push("/super-admin/login")
    })
  }

  return (
    <aside className="w-56 min-h-screen bg-sidebar border-r border-sidebar-border flex flex-col shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-2 px-5 py-5 border-b border-sidebar-border">
        <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
          <Shield className="w-4 h-4 text-primary" />
        </div>
        <div>
          <p className="text-sidebar-foreground font-semibold text-sm leading-tight">B-Master</p>
          <p className="text-muted-foreground text-xs">Super Admin</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {navItems.map((item) => {
          const active = pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
              )}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Logout */}
      <div className="px-3 pb-4 border-t border-sidebar-border pt-3">
        <button
          onClick={handleLogout}
          disabled={isPending}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          {isPending ? "Logging out…" : "Logout"}
        </button>
      </div>
    </aside>
  )
}
