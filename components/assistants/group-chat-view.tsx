"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { useParams } from "next/navigation"
import {
  ArrowLeft,
  Users,
  ChevronDown,
  UserPlus,
  UserMinus,
  Trash2,
  MoreVertical
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { AIInput, PendingAttachment } from "@/components/ui/ai-input"
import { MessageBubble } from "./message-bubble"
import { PresignedAvatarImage } from "@/components/ui/presigned-avatar-image"
import { useSession } from "next-auth/react"
import { useUploadFileToS3 } from "@/hooks/useUpload"
import { toast } from "sonner"
import {
  useGroupChatMessages,
  useGroupChats,
  useSendGroupMessage,
  useRemoveGroupMember,
  useDeactivateGroupChat,
  useGroupMessageSubscription,
  GroupChatMessage,
  GroupChat
} from "@/hooks/use-assistant-group-chat"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog"
import { SelectContactDialog } from "./select-contact-dialog"
import { useAddGroupMember } from "@/hooks/use-assistant-group-chat"
import { useQueryClient } from "@tanstack/react-query"

interface GroupChatViewProps {
  groupId: string | null
  onBack?: () => void
}

export function GroupChatView({ groupId, onBack }: GroupChatViewProps) {
  const params = useParams()
  const assistantId = params.id as string
  const { data: session } = useSession()
  const queryClient = useQueryClient()

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const hasScrolledRef = useRef(false)

  const [showScrollButton, setShowScrollButton] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showLeaveDialog, setShowLeaveDialog] = useState(false)
  const [showAddMemberDialog, setShowAddMemberDialog] = useState(false)
  const [memberToRemove, setMemberToRemove] = useState<{ id: string; name: string } | null>(null)

  const { groups } = useGroupChats(assistantId)
  const currentGroup: GroupChat | undefined = groups.find(g => g.id === groupId)

  const {
    allMessages,
    isLoading: messagesLoading,
    fetchNextPage,
    hasNextPage
  } = useGroupChatMessages(assistantId, groupId)

  const { mutate: sendMessage, isPending: isSending } = useSendGroupMessage(
    assistantId,
    groupId ?? ""
  )
  const { mutate: addMember } = useAddGroupMember(assistantId)
  const { mutate: removeMember } = useRemoveGroupMember(assistantId)
  const { mutate: deactivateGroup, isPending: isDeleting } = useDeactivateGroupChat(assistantId)
  const { uploadFileAsync, isUploading } = useUploadFileToS3()

  // Real-time subscription
  const handleNewMessage = useCallback(
    (msg: GroupChatMessage) => {
      queryClient.setQueryData<any>(
        ["group-chat-messages", assistantId, groupId],
        (old: any) => {
          if (!old) return old
          const allMsgs = old.pages.flatMap((p: any) => p.messages ?? [])
          const exists = allMsgs.some((m: any) => m.id === msg.id)
          if (exists) return old
          return {
            ...old,
            pages: old.pages.map((page: any, i: number) =>
              i === 0
                ? { ...page, messages: [msg, ...(page.messages ?? [])] }
                : page
            )
          }
        }
      )
      queryClient.invalidateQueries({ queryKey: ["group-chats", assistantId] })
    },
    [queryClient, assistantId, groupId]
  )

  useGroupMessageSubscription(assistantId, groupId, handleNewMessage)

  // Scroll management
  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior })
  }

  useEffect(() => {
    if (!messagesLoading && allMessages.length > 0 && !hasScrolledRef.current) {
      scrollToBottom("instant")
      hasScrolledRef.current = true
    }
  }, [messagesLoading, allMessages.length])

  useEffect(() => {
    if (allMessages.length > 0) scrollToBottom()
  }, [allMessages.length])

  useEffect(() => {
    hasScrolledRef.current = false
  }, [groupId])

  const handleScroll = () => {
    const el = containerRef.current
    if (!el) return
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    setShowScrollButton(distFromBottom > 200)
  }

  // Helpers
  const isImageFile = (fileName: string, contentType?: string): boolean => {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.ico']
    const imageMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'image/bmp']
    const extension = fileName.toLowerCase().substring(fileName.lastIndexOf('.'))
    return imageExtensions.includes(extension) || (contentType ? imageMimeTypes.includes(contentType) : false)
  }

  const handleSend = async (message: string, attachment?: PendingAttachment) => {
    if (!groupId || (!message.trim() && !attachment)) return

    if (attachment?.type === "file" && attachment.file) {
      if (attachment.file.size > 10 * 1024 * 1024) {
        toast.error("File size must be less than 10MB")
        return
      }
      try {
        const formData = new FormData()
        formData.append("file", attachment.file)
        formData.append("folder", "attachments")
        const uploadResult = await uploadFileAsync(formData)
        const isImage = isImageFile(attachment.file.name, attachment.file.type)
        sendMessage({
          message: message.trim() || (isImage ? "" : `[File: ${attachment.file.name}]`),
          messageType: isImage ? "image" : "file",
          attachmentUrl: uploadResult.url,
          attachmentName: uploadResult.fileName,
          attachmentSize: uploadResult.fileSize
        })
      } catch {
        toast.error("Failed to upload file")
      }
    } else if (attachment?.type === "url" && attachment.url) {
      sendMessage({
        message: message.trim(),
        messageType: "url",
        attachmentUrl: attachment.url,
        attachmentName: attachment.url
      })
    } else {
      sendMessage({ message: message.trim(), messageType: "text" })
    }
  }

  const handleAddMember = (userId: string, name: string) => {
    if (!groupId) return
    addMember(
      { groupChatId: groupId, userId },
      {
        onSuccess: (res) => {
          if (res.success) toast.success(`${name} added to group`)
          else toast.error(res.error || "Failed to add member")
        }
      }
    )
  }

  const handleRemoveMember = (userId: string) => {
    if (!groupId) return
    removeMember(
      { groupChatId: groupId, userId },
      {
        onSuccess: (res) => {
          if (res.success) {
            toast.success("Member removed")
            setMemberToRemove(null)
          } else toast.error(res.error || "Failed to remove member")
        }
      }
    )
  }

  const handleLeaveGroup = () => {
    if (!groupId || !session?.user?.id) return
    removeMember(
      { groupChatId: groupId, userId: session.user.id },
      {
        onSuccess: (res) => {
          if (res.success) {
            toast.success("You left the group")
            onBack?.()
          } else toast.error(res.error || "Failed to leave group")
        }
      }
    )
  }

  const handleDeleteGroup = () => {
    if (!groupId) return
    deactivateGroup(groupId, {
      onSuccess: () => {
        toast.success("Group deleted")
        onBack?.()
      }
    })
  }

  const isAdmin =
    !!currentGroup &&
    !!session?.user?.id &&
    currentGroup.members.some(
      (m) => m.userId === session.user.id && m.role === "admin" && !m.leftAt
    )

  if (!groupId) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <Users className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">No group selected</h3>
          <p className="text-sm text-muted-foreground">
            Select a group from the sidebar or create a new one
          </p>
        </div>
      </div>
    )
  }

  if (!currentGroup && !messagesLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  const activeMembers = currentGroup?.members.filter((m) => !m.leftAt) ?? []

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        {onBack && (
          <Button size="icon" variant="ghost" onClick={onBack} className="mr-1">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}

        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <Users className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-sm truncate">
              {currentGroup?.name ?? "Loading..."}
            </p>
            <p className="text-xs text-muted-foreground">
              {activeMembers.length} member{activeMembers.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        {/* Actions menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="icon" variant="ghost">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {/* Member list tooltip — simple info */}
            <div className="px-2 py-1.5">
              <p className="text-xs font-medium text-muted-foreground mb-1">Members</p>
              <div className="space-y-1 max-h-36 overflow-y-auto">
                {activeMembers.map((m) => (
                  <div key={m.userId} className="flex items-center gap-2 text-xs">
                    <Avatar className="h-5 w-5">
                      <PresignedAvatarImage src={m.user?.image ?? ""} />
                      <AvatarFallback className="text-[9px]">
                        {m.user?.name?.slice(0, 2).toUpperCase() ?? "?"}
                      </AvatarFallback>
                    </Avatar>
                    <span className="truncate max-w-[120px]">{m.user?.name ?? m.user?.email}</span>
                    {m.role === "admin" && (
                      <span className="text-primary text-[9px] font-semibold">admin</span>
                    )}
                    {isAdmin && m.userId !== session?.user?.id && (
                      <button
                        className="ml-auto text-destructive hover:opacity-80"
                        onClick={() =>
                          setMemberToRemove({ id: m.userId, name: m.user?.name ?? "Member" })
                        }
                      >
                        <UserMinus className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {isAdmin && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setShowAddMemberDialog(true)}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add Member
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => setShowDeleteDialog(true)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Group
                </DropdownMenuItem>
              </>
            )}

            {!isAdmin && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => setShowLeaveDialog(true)}
                >
                  Leave Group
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      {/* Messages */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 space-y-4 chat-scrollbar relative"
      >
        {messagesLoading && allMessages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : (
          <>
            {hasNextPage && (
              <div className="text-center py-2">
                <Button variant="ghost" size="sm" onClick={() => fetchNextPage()}>
                  Load Previous Messages
                </Button>
              </div>
            )}

            {allMessages
              .slice()
              .reverse()
              .map((message) => {
                const isOwn = message.senderId === session?.user?.id

                return (
                  <div key={message.id} className={`flex items-end gap-2 ${isOwn ? "justify-end" : "justify-start"}`}>
                    {!isOwn && (
                      <Avatar className="h-7 w-7 shrink-0 self-end">
                        <PresignedAvatarImage src={message.sender?.image ?? ""} />
                        <AvatarFallback className="text-[10px]">
                          {message.sender?.name?.slice(0, 2).toUpperCase() ?? "?"}
                        </AvatarFallback>
                      </Avatar>
                    )}
                    <MessageBubble
                      message={message.message}
                      messageType={message.messageType}
                      attachmentUrl={message.attachmentUrl}
                      attachmentName={message.attachmentName}
                      createdAt={message.createdAt}
                      isOwn={isOwn}
                      senderName={!isOwn ? (message.sender?.name ?? message.sender?.email ?? "Unknown") : undefined}
                    />

                  </div>
                )
              })}
            <div ref={messagesEndRef} />
          </>
        )}

        {showScrollButton && (
          <button
            onClick={() => scrollToBottom()}
            className="absolute bottom-4 right-4 bg-background border rounded-full p-2 shadow-md hover:bg-muted transition-colors"
          >
            <ChevronDown className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Input */}
      <div className="shrink-0 border-t">
        <AIInput
          placeholder={isSending || isUploading ? "Sending..." : "Type a message..."}
          onSubmit={handleSend}
          minHeight={52}
          maxHeight={200}
        />
      </div>

      {/* Dialogs */}
      <SelectContactDialog
        open={showAddMemberDialog}
        onOpenChange={setShowAddMemberDialog}
        assistantId={assistantId}
        onSelectContact={handleAddMember}
      />

      <AlertDialog open={!!memberToRemove} onOpenChange={() => setMemberToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {memberToRemove?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove them from the group chat.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => memberToRemove && handleRemoveMember(memberToRemove.id)}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave Group?</AlertDialogTitle>
            <AlertDialogDescription>
              You will no longer receive messages from this group.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={handleLeaveGroup}
            >
              Leave
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Group?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the group and all its messages. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={handleDeleteGroup}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
