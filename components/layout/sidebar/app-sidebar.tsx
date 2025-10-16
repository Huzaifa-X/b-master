"use client"

import * as React from "react"

import { NavMain } from "@/components/layout/nav-main"
import { NavList } from "@/components/layout/nav-list"
import { NavUser } from "@/components/layout/nav-user"
import { Header } from "@/components/layout/sidebar-header"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"

// This is sample data.
const data = {
  user: {
    name: "Huzaifa Tahir",
    email: "huzaifatahir7524@gmail.com",
  },
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <Header />
      </SidebarHeader>
      <SidebarContent>
        <NavMain />
        <NavList />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
