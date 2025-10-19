"use client"

import { useState, useMemo } from "react"
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

interface Conversation {
    id: string
    contactName: string
    lastMessage: string
    timestamp: string
    unread: number
}

const CONVERSATIONS: Conversation[] = [
    {
        id: "1",
        contactName: "John Doe",
        lastMessage: "Thanks for the update!",
        timestamp: "2m ago",
        unread: 2,
    },
    {
        id: "2",
        contactName: "Jane Smith",
        lastMessage: "Can we schedule a meeting?",
        timestamp: "1h ago",
        unread: 0,
    },
    {
        id: "3",
        contactName: "Mike Johnson",
        lastMessage: "Sounds good to me",
        timestamp: "3h ago",
        unread: 1,
    },
    {
        id: "4",
        contactName: "Sarah Williams",
        lastMessage: "I'll send the documents tomorrow",
        timestamp: "1d ago",
        unread: 0,
    },
]

interface MessagesSidebarProps {
    selectedConversationId: string | null
    onSelectConversation: (id: string) => void
}

export function MessagesSidebar({ selectedConversationId, onSelectConversation }: MessagesSidebarProps) {
    const [selectContactOpen, setSelectContactOpen] = useState(false)
    const [searchQuery, setSearchQuery] = useState("")

    const handleNewConversation = () => {
        setSelectContactOpen(true)
    }

    const handleSelectContact = (contactId: string, contactName: string) => {
        console.log("Creating conversation with:", contactId, contactName)
        toast.success(`Started conversation with ${contactName}`)
        // Here you would create a new conversation and set it as selected
        // For now, we'll just close the dialog
    }

    const handleDeleteConversation = (conversationId: string) => {
        toast.success("Conversation deleted")
        console.log("Delete conversation:", conversationId)
    }

    // Filter conversations based on search query
    const filteredConversations = useMemo(() => {
        if (!searchQuery.trim()) return CONVERSATIONS

        const query = searchQuery.toLowerCase()
        return CONVERSATIONS.filter(
            (conversation) =>
                conversation.contactName.toLowerCase().includes(query) ||
                conversation.lastMessage.toLowerCase().includes(query)
        )
    }, [searchQuery])

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
                    {filteredConversations.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-32 text-center p-4">
                            <MessageSquare className="h-8 w-8 text-muted-foreground mb-2" />
                            <p className="text-sm text-muted-foreground">
                                No conversations found
                            </p>
                        </div>
                    ) : (
                        filteredConversations.map((conversation) => (
                        <div
                            key={conversation.id}
                            className="group relative"
                        >
                            <button
                                onClick={() => onSelectConversation(conversation.id)}
                                className={cn(
                                    "w-full flex items-start gap-3 p-3 hover:bg-muted transition-colors text-left border-b",
                                    selectedConversationId === conversation.id && "bg-muted"
                                )}
                            >
                                <MessageSquare className="h-5 w-5 mt-1 shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-2 mb-1">
                                        <span className="font-medium truncate">{conversation.contactName}</span>
                                    </div>
                                    <p className="text-xs text-muted-foreground truncate">
                                        {conversation.lastMessage}
                                    </p>
                                    <div className="flex items-center justify-between gap-2">
                                        <p className="text-xs text-muted-foreground mt-1">
                                            {conversation.timestamp}
                                        </p>
                                        {conversation.unread > 0 && (
                                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground shrink-0">
                                                {conversation.unread}
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
                                        onClick={() => handleDeleteConversation(conversation.id)}
                                        className="text-destructive focus:text-destructive focus:bg-destructive/10"
                                    >
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        Delete
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                             </DropdownMenu>
                        </div>
                    )))}
                </div>
            </div>

            <SelectContactDialog
                open={selectContactOpen}
                onOpenChange={setSelectContactOpen}
                onSelectContact={handleSelectContact}
            />
        </>
    )
}

