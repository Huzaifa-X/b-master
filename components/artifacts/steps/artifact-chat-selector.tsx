"use client"

import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Loader2 } from "lucide-react"
import { ChatHistoryItem } from "@/types/chat"

interface ArtifactChatSelectorProps {
  chats: ChatHistoryItem[]
  loadingChats: boolean
  chatError: Error | null
  selectedChatId: string | null
  onChatSelect: (chatId: string | null) => void
}

export function ArtifactChatSelector({
  chats,
  loadingChats,
  chatError,
  selectedChatId,
  onChatSelect,
}: ArtifactChatSelectorProps) {
  if (loadingChats) {
    return (
      <div className="space-y-2">
        <Label>Select Chat Context (Optional)</Label>
        <div className="flex items-center gap-2 p-3 border rounded-lg">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Loading chat history...</span>
        </div>
      </div>
    )
  }

  if (chatError) {
    return (
      <div className="space-y-2">
        <Label>Select Chat Context (Optional)</Label>
        <div className="p-3 border rounded-lg border-destructive/50 bg-destructive/10">
          <p className="text-sm text-destructive">Failed to load chat history</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <Label htmlFor="chat-select">
        Select Chat Context
      </Label>
      <p className="text-xs text-muted-foreground">
        Choose a chat conversation to provide context for artifact generation
      </p>
      <Select
        value={selectedChatId || "__none__"}
        onValueChange={(value) => {
          if (value === "__none__") {
            onChatSelect(null)
          } else {
            onChatSelect(value)
          }
        }}
      >
        <SelectTrigger id="chat-select" className="w-full">
          <SelectValue placeholder="No chat selected" />
        </SelectTrigger>
        <SelectContent className="cursor-pointer">
          <SelectItem value="__none__" className="focus:bg-muted focus:text-foreground">No chat selected</SelectItem>
          {chats.length === 0 ? (
            <SelectItem value="no-chats" disabled className="focus:bg-muted focus:text-foreground">
              No chats available
            </SelectItem>
          ) : (
            chats.map((chat) => (
              <SelectItem key={chat.id} value={chat.id} className="focus:bg-muted focus:text-foreground">
                <div className="flex flex-col gap-0.5">
                  <span className="font-medium text-sm">{chat.topic || "Untitled Chat"}</span>
                  {/* <span className="text-xs text-muted-foreground">{chat.timestamp}</span> */}
                </div>
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>
    </div>
  )
}

