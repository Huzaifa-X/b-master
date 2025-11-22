// app/assistants/[id]/[chatId]/page.tsx
import { ChatPageView } from "@/components/assistants/chat-page-view"

interface PageProps {
  params: Promise<{
    id: string
    chatId: string
  }>
}

export default async function AssistantChatPage({ params }: PageProps) {
  const { id, chatId } = await params

  return (
    <ChatPageView 
      chatId={chatId} 
      mode="assistant" 
      assistantId={id}
    />
  )
}