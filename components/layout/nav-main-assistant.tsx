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
import { useRouter } from "next/navigation"

export function NavMainAssistant({ currentPath }: { currentPath: string }) {
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

                <SidebarMenuItem key={"Contacts"}>
                    <SidebarMenuButton asChild tooltip={"Contact"} isActive={currentPath === "/assistants/[id]/contact"}>
                        <Link href={"/assistants/[id]/contact"} className="group/nav-item">
                            <MessageCircle className="text-primary transition-all duration-300 ease-in-out group-hover/nav-item:scale-110 group-hover/nav-item:rotate-3" />
                            <span className="transition-all duration-300 ease-in-out group-hover/nav-item:translate-x-1">Contact</span>
                        </Link>
                    </SidebarMenuButton>
                </SidebarMenuItem>

                <SidebarMenuItem key={"Messages"}>
                    <SidebarMenuButton asChild tooltip={"Messages"} isActive={currentPath === "/assistants/[id]/messages"}>
                        <Link href={"/assistants/[id]/messages"} className="group/nav-item">
                            <MessageCircle className="text-primary transition-all duration-300 ease-in-out group-hover/nav-item:scale-110 group-hover/nav-item:rotate-3" />
                            <span className="transition-all duration-300 ease-in-out group-hover/nav-item:translate-x-1">Messages</span>
                        </Link>
                    </SidebarMenuButton>
                </SidebarMenuItem>

                <SidebarMenuItem key={"News Feed"}>
                    <SidebarMenuButton asChild tooltip={"News Feed"} isActive={currentPath === "/assistants/[id]/news"}>
                        <Link href={"/assistants/[id]/news"} className="group/nav-item">
                            <MessageCircle className="text-primary transition-all duration-300 ease-in-out group-hover/nav-item:scale-110 group-hover/nav-item:rotate-3" />
                            <span className="transition-all duration-300 ease-in-out group-hover/nav-item:translate-x-1">News Feed</span>
                        </Link>
                    </SidebarMenuButton>
                </SidebarMenuItem>

                <SidebarMenuItem key={"Artifacts"}>
                    <SidebarMenuButton asChild tooltip={"Artifacts"} isActive={currentPath === "/assistants/[id]/artifacts"}>
                        <Link href={"/assistants/[id]/artifacts"} className="group/nav-item">
                            <MessageCircle className="text-primary transition-all duration-300 ease-in-out group-hover/nav-item:scale-110 group-hover/nav-item:rotate-3" />
                            <span className="transition-all duration-300 ease-in-out group-hover/nav-item:translate-x-1">Artifacts</span>
                        </Link>
                    </SidebarMenuButton>
                </SidebarMenuItem>
            </SidebarMenu>
        </SidebarGroup>
    )
}