"use client";

import { useAssistantState } from "@assistant-ui/react";
import {
    SidebarGroup,
    SidebarGroupLabel,
    SidebarMenuButton,
    SidebarMenuItem,
} from "@/components/ui/sidebar";
import { MoreHorizontal } from "lucide-react";
import Link from "next/link";
import { ThreadListSkeleton, ThreadList } from "@/components/assistant-ui/thread-list";

export function NavListAssistant() {
    const threadCount = useAssistantState(
        ({ threads }) => threads.threadItems.length
    );
    const isLoading = useAssistantState(
        ({ threads }) => threads.isLoading
    );

    return (
        <SidebarGroup className="group-data-[collapsible=icon]:hidden">
            {threadCount > 1 && (
                <>
                    <SidebarGroupLabel>Chats</SidebarGroupLabel>

                    {isLoading ? (
                        <ThreadListSkeleton />
                    ) : (
                        <ThreadList />
                    )}
                    
                </>
            )}
        </SidebarGroup>
    );
}