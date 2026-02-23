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
import { useLocale } from "@/lib/i18n"

// Custom icon component combining MessageCircle and Sparkles
function AskBIcon({ className }: { className?: string }) {
  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      <MessageCircle className="h-4 w-4 transition-all duration-300" />
      <Sparkles className="absolute -top-0.5 -right-0.5 h-3 w-3 transition-all duration-300" />
    </div>
  )
}

export function NavMainDefault({ currentPath }: { currentPath: string }) {
  const { t } = useLocale()

  const navItems = [
    { titleKey: "nav.askB",         url: "/ask-b",          icon: AskBIcon, dataTour: "ask-b" },
    { titleKey: "nav.store",        url: "/store",          icon: Store,    dataTour: "store" },
    { titleKey: "nav.contacts",     url: "/contacts",       icon: Users,    dataTour: "contacts" },
    { titleKey: "nav.addAssistants",url: "/assistants/add", icon: Plus,     dataTour: "add-assistant" },
  ]

  return (
    <SidebarGroup>
      <SidebarMenu>
        {navItems.map((item) => (
          <SidebarMenuItem key={item.titleKey}>
            <SidebarMenuButton asChild tooltip={t(item.titleKey)} isActive={currentPath === item.url}>
              <Link href={item.url} className="group/nav-item" data-tour={item.dataTour}>
                <item.icon className="text-primary transition-all duration-300 ease-in-out group-hover/nav-item:scale-110 group-hover/nav-item:rotate-3" />
                <span className="transition-all duration-300 ease-in-out group-hover/nav-item:translate-x-1">{t(item.titleKey)}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  )
}

