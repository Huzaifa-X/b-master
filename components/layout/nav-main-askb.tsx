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

import { useLocale } from "@/lib/i18n"

export function NavMainAskB({ currentPath }: { currentPath: string }) {
    const router = useRouter();
    const { t } = useLocale();
    
    const handleBack = () => {
        router.push("/home");
    };

    return (
        <SidebarGroup>
            <SidebarMenu>
                {/* Back Button */}
                <SidebarMenuItem>
                    <SidebarMenuButton asChild tooltip={t("common.back")}>
                        <div className="group/nav-item cursor-pointer" onClick={handleBack}>
                            <ArrowLeft className="text-primary transition-all duration-300 ease-in-out group-hover/nav-item:scale-110 group-hover/nav-item:rotate-3" />
                            <span className="transition-all duration-300 ease-in-out group-hover/nav-item:translate-x-1">{t("common.back")}</span>
                        </div>
                    </SidebarMenuButton>
                </SidebarMenuItem>

                <SidebarMenuItem key={"New Chat"}>
                    <SidebarMenuButton asChild tooltip={t("chat.newChat")} isActive={currentPath === "/ask-b/new-chat"}>
                        <Link href={"/ask-b"} className="group/nav-item">
                            <Plus className="text-primary transition-all duration-300 ease-in-out group-hover/nav-item:scale-110 group-hover/nav-item:rotate-3" />
                            <span className="transition-all duration-300 ease-in-out group-hover/nav-item:translate-x-1">{t("chat.newChat")}</span>
                        </Link>
                    </SidebarMenuButton>
                </SidebarMenuItem>   

            </SidebarMenu>
        </SidebarGroup>
    )
}

