// components/assistants/assistant-view.tsx
"use client"

import { useSetAssistantMode } from "@/hooks/useAssistant"
import { WelcomeChatbotPage } from "./welcome-chatbot-page"

interface AssistantViewProps {
  assistantId: string
}

export function AssistantView({ assistantId }: AssistantViewProps) {
  // Set assistant mode in header
  useSetAssistantMode(assistantId)

  return (
    <div className="h-full w-full flex items-center justify-center">
      <WelcomeChatbotPage 
        chatType="assistant" 
        assistantId={assistantId}
      />
    </div>
  )
}