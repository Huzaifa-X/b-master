"use client"

import { useParams } from "next/navigation"
import { AssistantWizard } from "@/app/(dashboard)/assistants/add/_components/assistant-wizard"
import { useAssistantForEdit } from "@/hooks/useAssistant"
import { Loader2 } from "lucide-react"

export default function EditAssistantPage() {
  const params = useParams()
  const assistantId = params.id as string

  const { assistantData, isLoading, isError, error } = useAssistantForEdit(assistantId)

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading assistant data...</p>
        </div>
      </div>
    )
  }

  if (isError || !assistantData) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-semibold mb-2">Error</p>
          <p className="text-sm text-muted-foreground">{error?.message || "Failed to load assistant data"}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Fixed Header */}
      <div className="flex-shrink-0 bg-background">
        <div className="container mx-auto px-4 py-6 max-w-4xl">
          <h1 className="text-2xl font-medium">Edit Assistant</h1>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="container mx-auto px-4 py-8 max-w-4xl pb-16">
          <AssistantWizard
            assistantId={assistantId}
            initialData={assistantData}
            mode="edit"
          />
        </div>
      </div>
    </div>
  )
}