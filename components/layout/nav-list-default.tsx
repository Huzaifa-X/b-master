"use client"

import {
  MoreHorizontal,
  Pin,
} from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import Link from "next/link"
import { usePinnedAssistants } from "@/hooks/usePinnedAssistants"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { PresignedAvatarImage } from "@/components/ui/presigned-avatar-image"
import { Skeleton } from "@/components/ui/skeleton"

export function NavListDefault() {
  const { isMobile } = useSidebar()
  const { assistants, loading, unpinAssistant } = usePinnedAssistants()

  const handleUnpin = async (assistantId: string, e: React.MouseEvent) => {
    e.preventDefault()
    unpinAssistant(assistantId)
  }

  if (loading) {
    return (
      <SidebarGroup className="group-data-[collapsible=icon]:hidden">
        <SidebarGroupLabel>Assistants</SidebarGroupLabel>
        <SidebarMenu>
          {/* Show 3 skeleton items while loading */}
          {Array.from({ length: 3 }).map((_, i) => (
            <SidebarMenuItem key={i}>
              <SidebarMenuButton disabled>
                <Skeleton className="h-5 w-5 rounded-full" />
                <Skeleton className="h-4 flex-1" />
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroup>
    )
  }

  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <SidebarGroupLabel>Assistants</SidebarGroupLabel>
      <SidebarMenu>
        {assistants.length === 0 ? (
          <SidebarMenuItem>
            <SidebarMenuButton disabled className="text-muted-foreground">
              <span className="text-xs">No pinned assistants</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ) : (
          assistants.map((assistant) => (
            <SidebarMenuItem key={assistant.id}>
              <SidebarMenuButton asChild>
                <Link href={`/assistants/${assistant.id}`}>
                  {assistant.image && (
                    <Avatar className="h-5 w-5">
                      <PresignedAvatarImage src={assistant.image} alt={assistant.name} />
                      <AvatarFallback className="text-xs">
                        {assistant.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <span className="truncate">{assistant.name}</span>
                </Link>
              </SidebarMenuButton>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuAction showOnHover>
                    <MoreHorizontal />
                  </SidebarMenuAction>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className="w-48 rounded-lg"
                  side={isMobile ? "bottom" : "right"}
                  align={isMobile ? "end" : "start"}
                >
                  <DropdownMenuItem
                    className="text-muted-foreground focus:!text-muted-foreground focus:!bg-muted cursor-pointer"
                    onClick={(e) => handleUnpin(assistant.id, e)}
                  >
                    <Pin className="text-muted-foreground" />
                    <span>Unpin</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          ))
        )}
        <SidebarMenuItem>
          <SidebarMenuButton className="text-sidebar-foreground/70" asChild>
            <Link href="/assistants">
              <MoreHorizontal className="text-sidebar-foreground/70" />
              <span>All Assistants</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarGroup>
  )
}
