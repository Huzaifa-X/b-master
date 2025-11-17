"use client"

import { use } from "react"
import { useState } from "react"
import { MessagesSidebar } from "@/components/assistants/messages-sidebar"
import { ChatView } from "@/components/assistants/chat-view"
import { useIsMobile } from "@/hooks/use-mobile"
import { useSetAssistantMode } from "@/hooks/useAssistant"

interface MessagesLayoutProps {
  children: React.ReactNode
  params: Promise<{ id: string }>
}

export default function MessagesLayout({ children, params }: MessagesLayoutProps) {
  const { id: assistantId } = use(params)
  
  // Set assistant mode in header (automatically handles fetching and cleanup)
  useSetAssistantMode(assistantId)
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null)
  const isMobile = useIsMobile()

  const handleBack = () => {
    setSelectedConversationId(null)
  }

  // Mobile view: show either sidebar or chat
  if (isMobile) {
    return (
      <div className="h-full w-full flex flex-col">
        {!selectedConversationId ? (
          // Show sidebar on mobile when no conversation selected
          <MessagesSidebar 
            selectedConversationId={selectedConversationId}
            onSelectConversation={setSelectedConversationId}
          />
        ) : (
          // Show chat with back button on mobile
          <ChatView 
            conversationId={selectedConversationId}
            onBack={handleBack}
          />
        )}
      </div>
    )
  }

  // Desktop view: show sidebar and chat side by side
  return (
    <div className="h-full w-full flex">
      <MessagesSidebar 
        selectedConversationId={selectedConversationId}
        onSelectConversation={setSelectedConversationId}
      />
      <div className="flex-1 flex flex-col">
        <ChatView conversationId={selectedConversationId} />
      </div>
    </div>
  )
}

