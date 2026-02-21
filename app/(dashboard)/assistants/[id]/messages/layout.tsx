"use client"

import { use } from "react"
import { useState } from "react"
import { MessagesSidebar } from "@/components/assistants/messages-sidebar"
import { ChatView } from "@/components/assistants/chat-view"
import { GroupChatView } from "@/components/assistants/group-chat-view"
import { useIsMobile } from "@/hooks/use-mobile"
import { useSetAssistantMode } from "@/hooks/useAssistant"

interface MessagesLayoutProps {
  children: React.ReactNode
  params: Promise<{ id: string }>
}

export default function MessagesLayout({ children, params }: MessagesLayoutProps) {
  const { id: assistantId } = use(params)

  useSetAssistantMode(assistantId)

  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null)
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null)
  const isMobile = useIsMobile()

  const handleSelectConversation = (id: string | null) => {
    setSelectedConversationId(id)
    // Clear group selection when DM is selected
    if (id) setSelectedGroupId(null)
  }

  const handleSelectGroup = (id: string) => {
    setSelectedGroupId(id)
    // Clear DM selection when group is selected
    setSelectedConversationId(null)
  }

  const handleBack = () => {
    setSelectedConversationId(null)
    setSelectedGroupId(null)
  }

  // Determine which view to show on the right
  const showGroup = !!selectedGroupId
  const showDm = !!selectedConversationId && !showGroup

  // Mobile view
  if (isMobile) {
    const hasSelection = !!selectedConversationId || !!selectedGroupId
    return (
      <div className="h-full w-full flex flex-col">
        {!hasSelection ? (
          <MessagesSidebar
            selectedConversationId={selectedConversationId}
            onSelectConversation={handleSelectConversation}
            selectedGroupId={selectedGroupId}
            onSelectGroup={handleSelectGroup}
          />
        ) : showGroup ? (
          <GroupChatView groupId={selectedGroupId} onBack={handleBack} />
        ) : (
          <ChatView conversationId={selectedConversationId} onBack={handleBack} />
        )}
      </div>
    )
  }

  // Desktop view
  return (
    <div className="h-full w-full flex">
      <MessagesSidebar
        selectedConversationId={selectedConversationId}
        onSelectConversation={handleSelectConversation}
        selectedGroupId={selectedGroupId}
        onSelectGroup={handleSelectGroup}
      />
      <div className="flex-1 flex flex-col">
        {showGroup ? (
          <GroupChatView groupId={selectedGroupId} />
        ) : (
          <ChatView conversationId={selectedConversationId} />
        )}
      </div>
    </div>
  )
}
