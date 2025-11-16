"use client"

import {
  MoreHorizontal,
  Pin,
  Loader2,
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

export function NavListDefault() {
  const { isMobile } = useSidebar()
  const { assistants, loading, unpinAssistant } = usePinnedAssistants()

  const handleUnpin = async (assistantId: string, e: React.MouseEvent) => {
    e.preventDefault()
    await unpinAssistant(assistantId)
  }

  if (loading) {
    return (
      <SidebarGroup className="group-data-[collapsible=icon]:hidden">
        <SidebarGroupLabel>Assistants</SidebarGroupLabel>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton disabled>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Loading...</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
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
                      <AvatarImage src={assistant.image} alt={assistant.name} />
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
