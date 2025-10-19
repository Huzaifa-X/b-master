"use client"

import { MessageSquare, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { AIInput } from "@/components/ui/ai-input"

interface Message {
  id: string
  sender: "me" | "them"
  content: string
  timestamp: string
}

const MOCK_MESSAGES: { [key: string]: Message[] } = {
  "1": [
    { id: "1", sender: "them", content: "Hey! How are you?", timestamp: "10:30 AM" },
    { id: "2", sender: "me", content: "I'm good, thanks! How about you?", timestamp: "10:32 AM" },
    { id: "3", sender: "them", content: "Thanks for the update!", timestamp: "10:35 AM" },
  ],
  "2": [
    { id: "1", sender: "them", content: "Can we schedule a meeting?", timestamp: "9:15 AM" },
  ],
  "3": [
    { id: "1", sender: "them", content: "What do you think about the proposal?", timestamp: "Yesterday" },
    { id: "2", sender: "me", content: "Sounds good to me", timestamp: "Yesterday" },
  ],
}

interface ChatViewProps {
  conversationId: string | null
  onBack?: () => void
}

export function ChatView({ conversationId, onBack }: ChatViewProps) {
  const messages = conversationId ? MOCK_MESSAGES[conversationId] || [] : []

  const handleSendMessage = (message: string) => {
    console.log("Sending message:", message)
    // TODO: Implement message sending logic
  }

  const handleFileUpload = (files: FileList) => {
    console.log("Files uploaded:", Array.from(files).map(f => f.name))
    // TODO: Implement file upload logic
  }

  if (!conversationId) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <MessageSquare className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">No conversation selected</h3>
          <p className="text-sm text-muted-foreground">
            Select a conversation from the sidebar or start a new one
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      {/* Chat Header */}
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        {onBack && (
          <Button
            size="icon"
            variant="ghost"
            onClick={onBack}
            className="mr-2"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            {/* <AvatarImage src="/bmaster-icon.png" /> */}
            <AvatarFallback>JD</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-semibold text-sm">John Doe</p>
          </div>
        </div>
      </header>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.sender === "me" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                message.sender === "me"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted"
              }`}
            >
              <p className="text-sm">{message.content}</p>
              <p className={`text-xs mt-1 ${
                message.sender === "me" 
                  ? "text-primary-foreground/70" 
                  : "text-muted-foreground"
              }`}>
                {message.timestamp}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Message Input */}
      <div className="shrink-0 border-t">
        <AIInput
          placeholder="Type a message..."
          onSubmit={handleSendMessage}
          onFileUpload={handleFileUpload}
          minHeight={52}
          maxHeight={200}
        />
      </div>
    </div>
  )
}

