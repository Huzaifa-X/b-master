// components/nav-list-ask-b.tsx
"use client"

import { useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useChatHistory } from "@/hooks/useChatHistory"
import {
  MoreHorizontal,
  Trash2,
  Pencil,
  MessageSquare,
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
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useLocale } from "@/lib/i18n"
import { cn } from "@/lib/utils"

export function NavListAskB() {
  const { isMobile } = useSidebar()
  const router = useRouter()
  const pathname = usePathname()
  const { t } = useLocale()

  const {
    chats,
    isLoading,
    deleteChat,
    renameChat,
    isDeleting,
    isRenaming
  } = useChatHistory({ mode: "ask-b" })

  const [renamingChatId, setRenamingChatId] = useState<string | null>(null)
  const [deletingChatId, setDeletingChatId] = useState<string | null>(null)
  const [newChatName, setNewChatName] = useState("")

  // Extract current chat ID from pathname
  const currentChatId = pathname.startsWith("/ask-b/")
    ? pathname.split("/ask-b/")[1]
    : null

  const handleNewChat = () => {
    router.push("/ask-b")
  }

  const handleSelectChat = (chatId: string) => {
    router.push(`/ask-b/${chatId}`)
  }

  const handleRename = (chatId: string, currentName: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setRenamingChatId(chatId)
    setNewChatName(currentName)
  }

  const handleRenameConfirm = () => {
    if (renamingChatId && newChatName.trim()) {
      renameChat(renamingChatId, newChatName.trim())
      setRenamingChatId(null)
      setNewChatName("")
    }
  }

  const handleDelete = (chatId: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDeletingChatId(chatId)
  }

  const handleDeleteConfirm = () => {
    if (deletingChatId) {
      deleteChat(deletingChatId)
      setDeletingChatId(null)

      // If deleting current chat, navigate to welcome page
      if (deletingChatId === currentChatId) {
        router.push("/ask-b")
      }
    }
  }

  if (isLoading) {
    return (
      <SidebarGroup className="group-data-[collapsible=icon]:hidden">
        <SidebarGroupLabel>{t("chat.history")}</SidebarGroupLabel>
        <SidebarMenu>
          {/* Show 5 skeleton items while loading */}
          {Array.from({ length: 5 }).map((_, i) => (
            <SidebarMenuItem key={i}>
              <SidebarMenuButton disabled>
                <Skeleton className="h-4 w-4 rounded" />
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
        <SidebarGroupLabel>{t("chat.history")}</SidebarGroupLabel>
        <SidebarMenu>

          {/* Chat History */}
          {chats.length === 0 ? (
            <SidebarMenuItem>
              <SidebarMenuButton disabled className="text-muted-foreground">
                <MessageSquare className="h-4 w-4" />
                <span className="text-xs">{t("chat.noChats")}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ) : (
            chats.map((chat) => (
              <SidebarMenuItem key={chat.id}>
                <SidebarMenuButton
                  asChild
                  className={cn(
                    "cursor-pointer",
                    currentChatId === chat.id && "bg-sidebar-accent text-sidebar-accent-foreground"
                  )}
                >
                  <div onClick={() => handleSelectChat(chat.id)}>
                    <div className="flex-1 min-w-0">
                      {chat.topic === t("chat.newChat") || (chat.topic && chat.topic.length > 60) ? (
                        <div className="truncate">{t("chat.newChat")}</div>
                      ) : (
                        <div className="truncate">{chat.topic || t("common.untitled")}</div>
                      )}
                    </div>
                  </div>
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
                      onClick={(e) => handleRename(chat.id, chat.topic, e)}
                    >
                      <Pencil className="h-4 w-4" />
                      <span>{t("common.edit")}</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive focus:!text-destructive focus:!bg-muted cursor-pointer"
                      onClick={(e) => handleDelete(chat.id, e)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                      <span>{t("common.delete")}</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </SidebarMenuItem>
            ))
          )}
        </SidebarMenu>
      </SidebarGroup>

      {/* Rename Dialog */}
      <Dialog open={!!renamingChatId} onOpenChange={(open) => !open && setRenamingChatId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("chat.rename")}</DialogTitle>
            <DialogDescription>
              {t("chat.renameDescription")}
            </DialogDescription>
          </DialogHeader>
          <Input
            value={newChatName}
            onChange={(e) => setNewChatName(e.target.value)}
            placeholder={t("chat.namePlaceholder")}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") handleRenameConfirm()
              if (e.key === "Escape") setRenamingChatId(null)
            }}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenamingChatId(null)}>
              {t("common.cancel")}
            </Button>
            <Button
              onClick={handleRenameConfirm}
              disabled={!newChatName.trim() || isRenaming}
            >
              {isRenaming ? t("common.saving") : t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingChatId} onOpenChange={(open) => !open && setDeletingChatId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("chat.delete")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("chat.deleteDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
            >
              {isDeleting ? t("common.deleting") : t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}