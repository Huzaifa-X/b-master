"use client"

import { MessageCircle, Sparkles, Store, Users, Plus } from "lucide-react"
import Link from "next/link"

import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

// Custom icon component combining MessageCircle and Sparkles
function AskBIcon({ className }: { className?: string }) {
  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      <MessageCircle className="h-4 w-4 transition-all duration-300" />
      <Sparkles className="absolute -top-0.5 -right-0.5 h-3 w-3 transition-all duration-300" />
    </div>
  )
}

const navItems = [
  {
    title: "Ask B",
    url: "/ask-b",
    icon: AskBIcon,
  },
  {
    title: "Bmaster Store",
    url: "/store",
    icon: Store,
  },
  {
    title: "Contacts",
    url: "/contacts",
    icon: Users,
  },
  {
    title: "Add Assistants",
    url: "/assistants/add",
    icon: Plus,
  },
]

export function NavMainDefault({ currentPath }: { currentPath: string }) {
  return (
    <SidebarGroup>
      <SidebarMenu>
        {navItems.map((item) => (
          <SidebarMenuItem key={item.title}>
            <SidebarMenuButton asChild tooltip={item.title} isActive={currentPath === item.url}>
              <Link href={item.url} className="group/nav-item">
                <item.icon className="text-primary transition-all duration-300 ease-in-out group-hover/nav-item:scale-110 group-hover/nav-item:rotate-3" />
                <span className="transition-all duration-300 ease-in-out group-hover/nav-item:translate-x-1">{item.title}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  )
}

