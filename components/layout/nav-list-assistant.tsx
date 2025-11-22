// components/nav-list-assistant.tsx
"use client"

import { useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useChatHistory } from "@/hooks/useChatHistory"
import { useAssistantStore } from "@/lib/stores/assistant-store"
import {
  MoreHorizontal,
  Trash2,
  Pencil,
  MessageSquare,
  Loader2,
  PlusIcon,
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
import { cn } from "@/lib/utils"

export function NavListAssistant() {
  const { isMobile } = useSidebar()
  const router = useRouter()
  const pathname = usePathname()
  const assistantStore = useAssistantStore()

  // All hooks must be called before any conditional returns
  const assistantId = assistantStore.currentAssistantId || ""
  
  const { 
    chats, 
    isLoading, 
    deleteChat, 
    renameChat,
    isDeleting,
    isRenaming
  } = useChatHistory({ 
    mode: "assistant", 
    assistantId: assistantId || undefined 
  })

  const [renamingChatId, setRenamingChatId] = useState<string | null>(null)
  const [deletingChatId, setDeletingChatId] = useState<string | null>(null)
  const [newChatName, setNewChatName] = useState("")

  // Only show if in assistant mode (after all hooks)
  if (!assistantStore.isAssistantMode || !assistantStore.currentAssistantId) {
    return null
  }

  // Extract current chat ID from pathname
  const pathParts = pathname.split("/")
  const currentChatId = pathParts.length >= 4 && pathParts[1] === "assistants" 
    ? pathParts[3] 
    : null

  const handleNewChat = () => {
    router.push(`/assistants/${assistantId}`)
  }

  const handleSelectChat = (chatId: string) => {
    router.push(`/assistants/${assistantId}/${chatId}`)
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
        router.push(`/assistants/${assistantId}`)
      }
    }
  }

  if (isLoading) {
    return (
      <SidebarGroup className="group-data-[collapsible=icon]:hidden">
        <SidebarGroupLabel>
          {assistantStore.assistantName || "Assistant"} Chats
        </SidebarGroupLabel>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton disabled>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Loading chats...</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroup>
    )
  }

  return (
    <>
      <SidebarGroup className="group-data-[collapsible=icon]:hidden">
        <SidebarGroupLabel>
          Chats
        </SidebarGroupLabel>
        <SidebarMenu>

          {/* Chat History */}
          {chats.length === 0 ? (
            <SidebarMenuItem>
              <SidebarMenuButton disabled className="text-muted-foreground">
                <MessageSquare className="h-4 w-4" />
                <span className="text-xs">No chats yet</span>
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
                      {chat.topic === "New Chat" || (chat.topic && chat.topic.length > 60) ? (
                        <Skeleton className="h-4 w-24 mb-1" />
                      ) : (
                        <div className="truncate">{chat.topic}</div>
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
                      <span>Rename</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive focus:!text-destructive focus:!bg-muted cursor-pointer"
                      onClick={(e) => handleDelete(chat.id, e)}
                    >
                      <Trash2 className="h-4 w-4" />
                      <span>Delete</span>
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
            <DialogTitle>Rename Chat</DialogTitle>
            <DialogDescription>
              Enter a new name for this conversation
            </DialogDescription>
          </DialogHeader>
          <Input
            value={newChatName}
            onChange={(e) => setNewChatName(e.target.value)}
            placeholder="Chat name"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") handleRenameConfirm()
              if (e.key === "Escape") setRenamingChatId(null)
            }}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenamingChatId(null)}>
              Cancel
            </Button>
            <Button 
              onClick={handleRenameConfirm} 
              disabled={!newChatName.trim() || isRenaming}
            >
              {isRenaming ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingChatId} onOpenChange={(open) => !open && setDeletingChatId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Chat</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this chat? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}