"use client"

import { AssistantWizard } from "@/components/assistants/assistant-wizard"

export default function NewAssistantPage() {
  return (
    <div className="h-full overflow-y-auto">
      <div className="container mx-auto py-8 px-4 max-w-4xl pb-16">
        <div className="mb-8">
          <h1 className="text-3xl font-medium mb-2">Create New Assistant</h1>
        </div>
        <AssistantWizard />
      </div>
    </div>
  )
}

