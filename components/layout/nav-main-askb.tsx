"use client"

import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import {
    SidebarGroup,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from "@/components/ui/sidebar"
import { Plus } from "lucide-react"
import { useRouter } from "next/navigation"

export function NavMainAskB({ currentPath }: { currentPath: string }) {
    const router = useRouter();
    
    const handleBack = () => {
        router.push("/home");
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

                <SidebarMenuItem key={"New Chat"}>
                    <SidebarMenuButton asChild tooltip={"New Chat"} isActive={currentPath === "/ask-b/new-chat"}>
                        <Link href={"/ask-b"} className="group/nav-item">
                            <Plus className="text-primary transition-all duration-300 ease-in-out group-hover/nav-item:scale-110 group-hover/nav-item:rotate-3" />
                            <span className="transition-all duration-300 ease-in-out group-hover/nav-item:translate-x-1">New Chat</span>
                        </Link>
                    </SidebarMenuButton>
                </SidebarMenuItem>   

            </SidebarMenu>
        </SidebarGroup>
    )
}

