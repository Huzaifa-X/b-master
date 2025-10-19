"use client"

import { useState } from "react"
import { ChatHistoryList } from "@/components/assistant-ui/chat-history-list"
import type { ChatHistoryItem } from "@/components/assistant-ui/chat-history-card"
import { InputGroup, InputGroupInput, InputGroupAddon } from "@/components/ui/input-group"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Search, Plus } from "lucide-react"
import { useAssistantRuntime } from "@assistant-ui/react"

// Mock data - replace with actual data fetching
const mockChats: ChatHistoryItem[] = [
  {
    id: "1",
    title: "How to use React Hooks",
    timestamp: "2 hours ago",
    messageCount: 12,
  },
  {
    id: "2",
    title: "Next.js App Router Guide",
    timestamp: "Yesterday",
    messageCount: 8,
  },
  {
    id: "3",
    title: "TypeScript Generic Types",
    timestamp: "3 days ago",
    messageCount: 15,
  },
  {
    id: "4",
    title: "Database Schema Design",
    timestamp: "1 week ago",
    messageCount: 20,
  },
  {
    id: "5",
    title: "API Authentication with JWT",
    timestamp: "2 weeks ago",
    messageCount: 18,
  },
]

export default function ChatsPage() {
  const router = useRouter()
  const runtime = useAssistantRuntime()
  const [searchQuery, setSearchQuery] = useState("")

  const handleSelectChat = (chatId: string) => {
    // Navigate to the specific chat
    router.push(`/ask-b?chat=${chatId}`)
  }

  const handleRenameChat = (chatId: string) => {
    // Implement rename functionality
    toast.info("Rename functionality coming soon!")
    console.log("Rename chat:", chatId)
  }

  const handleArchiveChat = (chatId: string) => {
    // Implement archive functionality
    toast.success("Chat archived successfully")
    console.log("Archive chat:", chatId)
  }

  const handleDeleteChat = (chatId: string) => {
    // Implement delete functionality
    toast.success("Chat deleted successfully")
    console.log("Delete chat:", chatId)
  }

  const handleNewChat = () => {
    // Create a new thread using runtime
    runtime.switchToNewThread()
    // Navigate to ask-b page
    router.push("/ask-b")
  }

  // Filter chats based on search query
  const filteredChats = mockChats.filter((chat) =>
    chat.title.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="h-full overflow-y-auto">
      <div className="container mx-auto py-4 px-4 max-w-4xl pb-16">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-medium mb-2">Your Chat History</h1>
            <Button
              onClick={handleNewChat}
              className="flex items-center gap-2 whitespace-nowrap"
              size="default"
            >
              <Plus className="h-4 w-4" />
              New Chat
            </Button>
          </div>

          {/* Search and New Chat Button */}
          <div className="flex items-center gap-4 mt-6">
            <InputGroup className="flex-1">
              <InputGroupAddon>
                <Search className="h-4 w-4" />
              </InputGroupAddon>
              <InputGroupInput
                placeholder="Search chats..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <InputGroupAddon align="inline-end">
                  {filteredChats.length} {filteredChats.length === 1 ? 'result' : 'results'}
                </InputGroupAddon>
              )}
            </InputGroup>
          </div>
        </div>

        <ChatHistoryList
          chats={filteredChats}
          onSelectChat={handleSelectChat}
          onRenameChat={handleRenameChat}
          onArchiveChat={handleArchiveChat}
          onDeleteChat={handleDeleteChat}
        />
      </div>
    </div>
  )
}

