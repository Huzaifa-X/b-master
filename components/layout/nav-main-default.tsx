"use client"

import { MessageCircle, Sparkles, Store, Users, Plus } from "lucide-react"

import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

// Custom icon component combining MessageCircle and Sparkles
function AskBIcon() {
  return (
    <div className="relative flex items-center justify-center text-primary">
      <MessageCircle className="h-4 w-4" />
      <Sparkles className="absolute -top-0.5 -right-0.5 h-3 w-3" />
    </div>
  )
}

const navItems = [
  {
    title: "Ask B",
    url: "/home",
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
              <a href={item.url}>
                <item.icon className="text-primary" />
                <span>{item.title}</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  )
}

