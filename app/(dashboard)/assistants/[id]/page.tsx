import { AssistantView } from "@/components/assistants/assistant-view"

export default async function AssistantPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  return <AssistantView />
}