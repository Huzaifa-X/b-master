import { AssistantWizard } from "@/app/(dashboard)/assistants/add/_components/assistant-wizard"

export default function NewAssistantPage() {
  return (
    <div className="h-full flex flex-col">
      {/* Fixed Header */}
      <div className="flex-shrink-0 bg-background">
        <div className="container mx-auto px-4 py-6 max-w-4xl">
          <h1 className="text-2xl font-medium">Create New Assistant</h1>
        </div>
      </div>
      
      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="container mx-auto px-4 py-8 max-w-4xl pb-16">
          <AssistantWizard />
        </div>
      </div>
    </div>
  )
}

