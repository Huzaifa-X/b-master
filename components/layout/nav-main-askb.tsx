"use client"

import { MessageCircle, ChevronLeft } from "lucide-react"
import Link from "next/link"
import { ThreadListNew } from "@/components/assistant-ui/thread-list"
import {
    SidebarGroup,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from "@/components/ui/sidebar"

export function NavMainAskB({ currentPath }: { currentPath: string }) {
    return (
        <SidebarGroup>
            <SidebarMenu>
                {/* Back Button */}
                <SidebarMenuItem>
                    <SidebarMenuButton asChild tooltip="Back">
                        <Link href="/home" className="group/nav-item">
                            <ChevronLeft className="text-muted-foreground transition-all duration-300 ease-in-out group-hover/nav-item:scale-110 group-hover/nav-item:-translate-x-1" />
                            <span className="text-muted-foreground transition-all duration-300 ease-in-out group-hover/nav-item:translate-x-0.5">Back</span>
                        </Link>
                    </SidebarMenuButton>
                </SidebarMenuItem>

                {/* Navigation Items */}
                <ThreadListNew />

                <SidebarMenuItem key={"Chats"}>
                    <SidebarMenuButton asChild tooltip={"Chats"} isActive={currentPath === "/ask-b/chats"}>
                        <Link href={"/ask-b/chats"} className="group/nav-item">
                            <MessageCircle className="text-primary transition-all duration-300 ease-in-out group-hover/nav-item:scale-110 group-hover/nav-item:rotate-3" />
                            <span className="transition-all duration-300 ease-in-out group-hover/nav-item:translate-x-1">Chats</span>
                        </Link>
                    </SidebarMenuButton>
                </SidebarMenuItem>

            </SidebarMenu>
        </SidebarGroup>
    )
}

