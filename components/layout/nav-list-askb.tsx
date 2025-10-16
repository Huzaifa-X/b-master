"use client"

import { ThreadList } from "@/components/assistant-ui/thread-list"
import {
    SidebarGroup,
    SidebarGroupLabel,
    SidebarMenuButton,
    SidebarMenuItem,
} from "@/components/ui/sidebar"
import { MoreHorizontal } from "lucide-react"

export function NavListAskB() {
    return (
        <SidebarGroup className="group-data-[collapsible=icon]:hidden">
            <SidebarGroupLabel>Chats</SidebarGroupLabel>
            <ThreadList />
            <SidebarMenuItem>
                <SidebarMenuButton className="text-sidebar-foreground/70">
                    <MoreHorizontal className="text-sidebar-foreground/70" />
                    <span>All Chats</span>
                </SidebarMenuButton>
            </SidebarMenuItem>
        </SidebarGroup>
    )
}

