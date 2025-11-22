"use client"

import { MessageCircle, ChevronLeft, ArrowLeft, Users, Megaphone, Layers, Plus } from "lucide-react"
import Link from "next/link"
import {
    SidebarGroup,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from "@/components/ui/sidebar"
import { useRouter, useParams } from "next/navigation"
import { useAssistantPermissions } from "@/hooks/usePermissions"

export function NavMainAssistant({ currentPath }: { currentPath: string }) {
    const router = useRouter();
    const params = useParams();
    const assistantId = params?.id as string || "";
    const { permissions, isLoading } = useAssistantPermissions(assistantId);

    const handleBack = () => {
        router.push("/assistants");
    };

    // Show all features while loading (to prevent flicker)
    // Once loaded, filter based on permissions
    const canViewChat = isLoading || !permissions ? true : permissions.hasAccess && (permissions.access === 'admin' || permissions.permissions.includes('chat'));
    const canViewContacts = isLoading || !permissions ? true : permissions.hasAccess && (permissions.access === 'admin' || permissions.permissions.includes('contacts'));
    const canViewMessenger = isLoading || !permissions ? true : permissions.hasAccess && (permissions.access === 'admin' || permissions.permissions.includes('messenger'));
    const canViewNewsfeed = isLoading || !permissions ? true : permissions.hasAccess && (permissions.access === 'admin' || permissions.permissions.includes('newsfeed'));
    const canViewArtifacts = isLoading || !permissions ? true : permissions.hasAccess && (permissions.access === 'admin' || permissions.permissions.includes('artifacts'));

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
                {canViewChat && (
                    <SidebarMenuItem key={"New Chat"}>
                        <SidebarMenuButton asChild tooltip={"New Chat"} isActive={currentPath === `/assistants/${assistantId}`}>
                            <Link href={`/assistants/${assistantId}`} className="group/nav-item">
                                <Plus className="text-primary transition-all duration-300 ease-in-out group-hover/nav-item:scale-110 group-hover/nav-item:rotate-3" />
                                <span className="transition-all duration-300 ease-in-out group-hover/nav-item:translate-x-1">New Chat</span>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                )}

                {canViewContacts && (
                    <SidebarMenuItem key={"Contacts"}>
                        <SidebarMenuButton asChild tooltip={"Contact"} isActive={currentPath.includes("/contacts")}>
                            <Link href={`/assistants/${assistantId}/contacts`} className="group/nav-item">
                                <Users className="text-primary transition-all duration-300 ease-in-out group-hover/nav-item:scale-110 group-hover/nav-item:rotate-3" />
                                <span className="transition-all duration-300 ease-in-out group-hover/nav-item:translate-x-1">Contacts</span>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                )}

                {canViewMessenger && (
                    <SidebarMenuItem key={"Messages"}>
                        <SidebarMenuButton asChild tooltip={"Messages"} isActive={currentPath.includes("/messages")}>
                            <Link href={`/assistants/${assistantId}/messages`} className="group/nav-item">
                                <MessageCircle className="text-primary transition-all duration-300 ease-in-out group-hover/nav-item:scale-110 group-hover/nav-item:rotate-3" />
                                <span className="transition-all duration-300 ease-in-out group-hover/nav-item:translate-x-1">Messages</span>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                )}

                {canViewNewsfeed && (
                    <SidebarMenuItem key={"News Feed"}>
                        <SidebarMenuButton asChild tooltip={"News Feed"} isActive={currentPath.includes("/news")}>
                            <Link href={`/assistants/${assistantId}/news`} className="group/nav-item">
                                <Megaphone className="text-primary transition-all duration-300 ease-in-out group-hover/nav-item:scale-110 group-hover/nav-item:rotate-3" />
                                <span className="transition-all duration-300 ease-in-out group-hover/nav-item:translate-x-1">News Feed</span>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                )}

                {canViewArtifacts && (
                    <SidebarMenuItem key={"Artifacts"}>
                        <SidebarMenuButton asChild tooltip={"Artifacts"} isActive={currentPath.includes("/artifacts")}>
                            <Link href={`/assistants/${assistantId}/artifacts`} className="group/nav-item">
                                <Layers className="text-primary transition-all duration-300 ease-in-out group-hover/nav-item:scale-110 group-hover/nav-item:rotate-3" />
                                <span className="transition-all duration-300 ease-in-out group-hover/nav-item:translate-x-1">Artifacts</span>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                )}
            </SidebarMenu>
        </SidebarGroup>
    )
}