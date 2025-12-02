"use client"

import { useState, useMemo } from "react"
import { useParams } from "next/navigation"
import { Plus, MessageSquare, MoreVertical, Trash2, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { SelectContactDialog } from "@/components/assistants/select-contact-dialog"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { useUserChats, useInitiateChat, useDeactivateChat } from "@/hooks/use-assistant-caht"
import { formatDistanceToNow } from "date-fns"
import { useSession } from "next-auth/react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { PresignedAvatarImage } from "@/components/ui/presigned-avatar-image"

interface MessagesSidebarProps {
    selectedConversationId: string | null
    onSelectConversation: (id: string) => void
}

export function MessagesSidebar({ selectedConversationId, onSelectConversation }: MessagesSidebarProps) {
    const params = useParams()
    const assistantId = params.id as string
    const { data: session } = useSession()
    const [selectContactOpen, setSelectContactOpen] = useState(false)
    const [searchQuery, setSearchQuery] = useState("")

    const {
        data: chatsData,
        isLoading: chatsLoading,
        fetchNextPage,
        hasNextPage
    } = useUserChats(assistantId)

    const { mutate: initiateChat } = useInitiateChat()
    const { mutate: deactivateChat } = useDeactivateChat()

    const allChats = chatsData?.pages.flatMap(page => page.chats || []) || []

    const handleNewConversation = () => {
        setSelectContactOpen(true)
    }

    const handleSelectContact = (contactId: string, contactName: string) => {
        initiateChat(
            {
                assistantId,
                participantId: contactId
            },
            {
                onSuccess: (data) => {
                    if (data.success && data.chat) {
                        toast.success(`Started conversation with ${contactName}`)
                        onSelectConversation(data.chat.id)
                        setSelectContactOpen(false)
                    }
                },
                onError: (error: Error) => {
                    toast.error(error.message || "Failed to start conversation")
                }
            }
        )
    }

    const handleDeleteConversation = (conversationId: string) => {
        deactivateChat(
            {
                assistantId,
                chatId: conversationId
            },
            {
                onSuccess: (data) => {
                    if (data.success) {
                        toast.success("Conversation deleted")
                        if (selectedConversationId === conversationId) {
                            onSelectConversation("")
                        }
                    }
                }
            }
        )
    }

    // Filter conversations based on search query
    const filteredConversations = useMemo(() => {
        if (!searchQuery.trim()) return allChats

        const query = searchQuery.toLowerCase()
        return allChats.filter((chat) => {
            const otherUser = chat.initiatorId === session?.user?.id
                ? chat.participant
                : chat.initiator
            const name = otherUser.name?.toLowerCase() || ""
            const lastMessage = chat.lastMessage?.message?.toLowerCase() || ""
            return name.includes(query) || lastMessage.includes(query)
        })
    }, [searchQuery, allChats, session?.user?.id])

    return (
        <>
            <div className="w-full md:w-80 h-full border-r bg-background flex flex-col">
                {/* Header */}
                <div className="p-3 border-b space-y-3">
                    <div className="flex items-center justify-between">
                        <h2 className="font-semibold">Messages</h2>
                        <Button
                            size="icon"
                            variant="ghost"
                            onClick={handleNewConversation}
                            title="New Conversation"
                            className="hover:bg-transparent hover:text-primary"
                        >
                            <Plus className="h-4 w-4" />
                        </Button>
                    </div>
                    
                    {/* Search Input */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            type="text"
                            placeholder="Search conversations..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 h-9"
                        />
                    </div>
                </div>

                {/* Conversations List */}
                <div className="flex-1 overflow-y-auto">
                    {chatsLoading && allChats.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-32 text-center p-4">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                        </div>
                    ) : filteredConversations.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-32 text-center p-4">
                            <MessageSquare className="h-8 w-8 text-muted-foreground mb-2" />
                            <p className="text-sm text-muted-foreground">
                                No conversations found
                            </p>
                        </div>
                    ) : (
                        filteredConversations.map((chat) => {
                            const otherUser = chat.initiatorId === session?.user?.id
                                ? chat.participant
                                : chat.initiator
                            
                            return (
                                <div
                                    key={chat.id}
                                    className="group relative"
                                >
                                    <button
                                        onClick={() => onSelectConversation(chat.id)}
                                        className={cn(
                                            "w-full flex items-start gap-3 p-3 hover:bg-muted transition-colors text-left border-b",
                                            selectedConversationId === chat.id && "bg-muted"
                                        )}
                                    >
                                        <Avatar className="h-10 w-10 shrink-0">
                                            <PresignedAvatarImage 
                                                src={otherUser.image || ""} 
                                            />
                                            <AvatarFallback>
                                                {otherUser.name?.slice(0, 2).toUpperCase() || "?"}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between gap-2 mb-1">
                                                <span className="font-medium truncate">
                                                    {otherUser.name || "Unknown User"}
                                                </span>
                                            </div>
                                            <p className="text-xs text-muted-foreground truncate">
                                                {chat.lastMessage?.message || "No messages yet"}
                                            </p>
                                            <div className="flex items-center justify-between gap-2">
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    {chat.lastMessage 
                                                        ? formatDistanceToNow(new Date(chat.lastMessage.createdAt), { addSuffix: true })
                                                        : ""
                                                    }
                                                </p>
                                                {chat.unreadCount && chat.unreadCount > 0 && (
                                                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground shrink-0">
                                                        {chat.unreadCount}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </button>

                                    {/* Delete Button - Shows on Hover */}
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                className="absolute top-3 right-2 opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 hover:bg-transparent hover:text-primary"
                                            >
                                                <MoreVertical className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem
                                                onClick={() => handleDeleteConversation(chat.id)}
                                                className="text-destructive focus:text-destructive focus:bg-destructive/10"
                                            >
                                                <Trash2 className="h-4 w-4 mr-2" />
                                                Delete
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            )
                        })
                    )}
                    {hasNextPage && (
                        <div className="p-4 text-center">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => fetchNextPage()}
                            >
                                Load More
                            </Button>
                        </div>
                    )}
                </div>
            </div>

            <SelectContactDialog
                open={selectContactOpen}
                onOpenChange={setSelectContactOpen}
                onSelectContact={handleSelectContact}
                assistantId={assistantId}
            />
        </>
    )
}

