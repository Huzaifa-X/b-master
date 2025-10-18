"use client"

import { ChatHistoryCard, type ChatHistoryItem } from "./chat-history-card"
import { Skeleton } from "@/components/ui/skeleton"
import { MessageSquare } from "lucide-react"

interface ChatHistoryListProps {
  chats?: ChatHistoryItem[]
  isLoading?: boolean
  onSelectChat?: (chatId: string) => void
  onRenameChat?: (chatId: string) => void
  onArchiveChat?: (chatId: string) => void
  onDeleteChat?: (chatId: string) => void
}

export function ChatHistoryList({
  chats = [],
  isLoading = false,
  onSelectChat,
  onRenameChat,
  onArchiveChat,
  onDeleteChat,
}: ChatHistoryListProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <ChatHistoryCardSkeleton key={i} />
        ))}
      </div>
    )
  }

  if (chats.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="rounded-full bg-muted p-6 mb-4">
          <MessageSquare className="h-10 w-10 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2">No chat history</h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          Start a new conversation to see your chat history here.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {chats.map((chat) => (
        <ChatHistoryCard
          key={chat.id}
          chat={chat}
          onSelect={onSelectChat}
          onRename={onRenameChat}
          onArchive={onArchiveChat}
          onDelete={onDeleteChat}
        />
      ))}
    </div>
  )
}

function ChatHistoryCardSkeleton() {
  return (
    <div className="rounded-xl border bg-card p-6 shadow">
      <div className="flex items-start gap-3 mb-3">
        <Skeleton className="h-9 w-9 rounded-lg" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
      <Skeleton className="h-4 w-full mb-2" />
      <Skeleton className="h-4 w-5/6" />
    </div>
  )
}

