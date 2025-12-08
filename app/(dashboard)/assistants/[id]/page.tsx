// app/assistants/[id]/page.tsx - Welcome page for assistant
import { AssistantView } from "@/components/assistants/assistant-view"

interface PageProps {
  params: Promise<{
    id: string
  }>
}

export default async function AssistantPage({ params }: PageProps) {
  const { id } = await params
  
  return <AssistantView assistantId={id} />
}