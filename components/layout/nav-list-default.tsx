"use client"

import { useState } from "react"
import {
  MoreHorizontal,
  Pin,
  Pencil,
  Trash2,
  Loader2,
} from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
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
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { usePinnedAssistants, type PinnedAssistant } from "@/hooks/usePinnedAssistants"
import { useHardDeleteAssistant } from "@/hooks/useAssistantMutations"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { PresignedAvatarImage } from "@/components/ui/presigned-avatar-image"
import { Skeleton } from "@/components/ui/skeleton"

export function NavListDefault() {
  const { isMobile } = useSidebar()
  const { data: session } = useSession()
  const router = useRouter()
  const { assistants, loading, unpinAssistant } = usePinnedAssistants()
  const [deleteTarget, setDeleteTarget] = useState<PinnedAssistant | null>(null)

  const { deleteAssistant, isDeleting } = useHardDeleteAssistant({
    onSuccess: () => {
      setDeleteTarget(null)
    },
  })

  const handleUnpin = async (assistantId: string, e: React.MouseEvent) => {
    e.preventDefault()
    unpinAssistant(assistantId)
  }

  const handleDeleteConfirm = () => {
    if (deleteTarget) {
      deleteAssistant(deleteTarget.id)
    }
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
    <>
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
            assistants.map((assistant) => {
              const isOwner = session?.user?.id === assistant.userId

              return (
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

                      {isOwner && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="cursor-pointer"
                            onClick={() => router.push(`/assistants/${assistant.id}/edit`)}
                          >
                            <Pencil className="h-4 w-4" />
                            <span>Edit</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer"
                            onClick={() => setDeleteTarget(assistant)}
                          >
                            <Trash2 className="h-4 w-4" />
                            <span>Delete</span>
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </SidebarMenuItem>
              )
            })
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

      {/* Delete confirmation dialog */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && !isDeleting && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete assistant?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{deleteTarget?.name}&rdquo; will be permanently deleted along
              with all its chats, files, and data. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  Deleting…
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
