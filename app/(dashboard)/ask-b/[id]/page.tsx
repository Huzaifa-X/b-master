// app/ask-b/[id]/page.tsx
import { ChatPageView } from "@/components/assistants/chat-page-view"

interface PageProps {
  params: Promise<{
    id: string
  }>
}

export default async function ChatPage({ params }: PageProps) {
  const { id } = await params

  return <ChatPageView chatId={id} mode="ask-b" />
}