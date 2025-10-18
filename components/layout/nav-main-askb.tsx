"use client"

import { MessageCircle, ChevronLeft, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { ThreadListNew } from "@/components/assistant-ui/thread-list"
import {
    SidebarGroup,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from "@/components/ui/sidebar"
import { useAssistantRuntime } from "@assistant-ui/react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"

export function NavMainAskB({ currentPath }: { currentPath: string }) {
    const runtime = useAssistantRuntime();
    const router = useRouter();
    
    const handleBack = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        runtime.switchToNewThread();
        router.push("/home");
    };

    return (
        <SidebarGroup>
            <SidebarMenu>
                {/* Back Button */}
                <SidebarMenuItem>
                    <SidebarMenuButton asChild tooltip="Back" onClick={(e) => handleBack(e)}>
                        <div className="group/nav-item cursor-pointer">
                            <ArrowLeft className="text-primary transition-all duration-300 ease-in-out group-hover/nav-item:scale-110 group-hover/nav-item:rotate-3" />
                            <span className="transition-all duration-300 ease-in-out group-hover/nav-item:translate-x-1">Back</span>
                        </div>
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

