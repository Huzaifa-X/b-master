"use client"

import { MessageCircle, ChevronLeft, ArrowLeft, Users, Megaphone, Layers } from "lucide-react"
import Link from "next/link"
import { ThreadListNew } from "@/components/assistant-ui/thread-list"
import {
    SidebarGroup,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from "@/components/ui/sidebar"
import { useAssistantRuntime } from "@assistant-ui/react"
import { useRouter, useParams } from "next/navigation"

export function NavMainAssistant({ currentPath }: { currentPath: string }) {
    const runtime = useAssistantRuntime();
    const router = useRouter();
    const params = useParams();
    const assistantId = params?.id as string || "";
    
    const handleBack = () => {
        runtime.switchToNewThread();
        router.push("/assistants");
    };

    return (
        <SidebarGroup>
            <SidebarMenu>
                {/* Back Button */}
                <SidebarMenuItem>
                    <SidebarMenuButton asChild tooltip="Back">
                        <div className="group/nav-item cursor-pointer" onClick={handleBack}>
                            <ArrowLeft className="text-primary transition-all duration-300 ease-in-out group-hover/nav-item:scale-110 group-hover/nav-item:rotate-3" />
                            <span className="transition-all duration-300 ease-in-out group-hover/nav-item:translate-x-1">Back</span>
                        </div>
                    </SidebarMenuButton>
                </SidebarMenuItem>

                {/* Navigation Items */}
                <ThreadListNew />

                <SidebarMenuItem key={"Contacts"}>
                    <SidebarMenuButton asChild tooltip={"Contact"} isActive={currentPath.includes("/contacts")}>
                        <Link href={`/assistants/${assistantId}/contacts`} className="group/nav-item">
                            <Users className="text-primary transition-all duration-300 ease-in-out group-hover/nav-item:scale-110 group-hover/nav-item:rotate-3" />
                            <span className="transition-all duration-300 ease-in-out group-hover/nav-item:translate-x-1">Contacts</span>
                        </Link>
                    </SidebarMenuButton>
                </SidebarMenuItem>

                <SidebarMenuItem key={"Messages"}>
                    <SidebarMenuButton asChild tooltip={"Messages"} isActive={currentPath.includes("/messages")}>
                        <Link href={`/assistants/${assistantId}/messages`} className="group/nav-item">
                            <MessageCircle className="text-primary transition-all duration-300 ease-in-out group-hover/nav-item:scale-110 group-hover/nav-item:rotate-3" />
                            <span className="transition-all duration-300 ease-in-out group-hover/nav-item:translate-x-1">Messages</span>
                        </Link>
                    </SidebarMenuButton>
                </SidebarMenuItem>

                <SidebarMenuItem key={"News Feed"}>
                    <SidebarMenuButton asChild tooltip={"News Feed"} isActive={currentPath.includes("/news")}>
                        <Link href={`/assistants/${assistantId}/news`} className="group/nav-item">
                            <Megaphone className="text-primary transition-all duration-300 ease-in-out group-hover/nav-item:scale-110 group-hover/nav-item:rotate-3" />
                            <span className="transition-all duration-300 ease-in-out group-hover/nav-item:translate-x-1">News Feed</span>
                        </Link>
                    </SidebarMenuButton>
                </SidebarMenuItem>

                <SidebarMenuItem key={"Artifacts"}>
                    <SidebarMenuButton asChild tooltip={"Artifacts"} isActive={currentPath.includes("/artifacts")}>
                        <Link href={`/assistants/${assistantId}/artifacts`} className="group/nav-item">
                            <Layers className="text-primary transition-all duration-300 ease-in-out group-hover/nav-item:scale-110 group-hover/nav-item:rotate-3" />
                            <span className="transition-all duration-300 ease-in-out group-hover/nav-item:translate-x-1">Artifacts</span>
                        </Link>
                    </SidebarMenuButton>
                </SidebarMenuItem>
            </SidebarMenu>
        </SidebarGroup>
    )
}