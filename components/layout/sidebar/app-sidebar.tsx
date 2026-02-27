"use client"

import * as React from "react"

import { NavMain } from "@/components/layout/nav-main"
import { NavList } from "@/components/layout/nav-list"
import { NavUser } from "@/components/layout/nav-user"
import { Header } from "@/components/layout/sidebar-header"
import { SidebarPromotion } from "@/components/layout/sidebar/sidebar-promotion"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"
import { useSession } from "next-auth/react"
import { redirect } from "next/navigation"
import { NavUserType } from "@/types/user"

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { data: session } = useSession()

  if (!session?.user) {
    redirect("/login")
  }
  
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <Header />
      </SidebarHeader>
      <SidebarContent className="flex flex-col overflow-hidden">
        <div className="flex-shrink-0">
          <NavMain />
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto">
          <NavList />
        </div>
      </SidebarContent>
      <SidebarPromotion />
      <SidebarFooter>
        <NavUser user={session?.user as NavUserType} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
