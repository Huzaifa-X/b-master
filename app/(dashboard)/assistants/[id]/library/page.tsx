"use client"

import { use } from "react"
import { useSetAssistantMode } from "@/hooks/useAssistant"
import { AssistantLibrary } from "@/components/assistants/assistant-library"
import { useAssistantPermissions } from "@/hooks/usePermissions"

interface LibraryPageProps {
  params: Promise<{ id: string }>
}

export default function LibraryPage({ params }: LibraryPageProps) {
  const { id: assistantId } = use(params)

  // Set assistant mode in header
  useSetAssistantMode(assistantId)

  // Only owners can upload/delete
  const { permissions } = useAssistantPermissions(assistantId)
  const isOwner = permissions?.isOwner ?? false

  return (
    <div className="flex flex-col h-full">
      <div className="flex-shrink-0 border-b px-6 py-4">
        <h1 className="text-xl font-semibold">Library</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Files and URLs in this assistant&apos;s knowledge base
        </p>
      </div>

      <div className="flex-1 overflow-hidden">
        <AssistantLibrary
          assistantId={assistantId}
          readonly={!isOwner}
        />
      </div>
    </div>
  )
}
