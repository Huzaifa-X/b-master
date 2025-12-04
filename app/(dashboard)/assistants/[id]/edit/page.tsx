"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { AssistantWizard } from "@/app/(dashboard)/assistants/add/_components/assistant-wizard"
import { getAssistantForEdit } from "@/app/actions/assistant.action"
import { AssistantFormData } from "@/types/assistant"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

export default function EditAssistantPage() {
  const params = useParams()
  const assistantId = params.id as string
  const [initialData, setInitialData] = useState<AssistantFormData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchAssistantData = async () => {
      if (!assistantId) {
        setError("Assistant ID is required")
        setIsLoading(false)
        return
      }

      try {
        setIsLoading(true)
        const result = await getAssistantForEdit(assistantId)

        if (!result.success || !result.assistant) {
          setError(result.error || "Failed to load assistant data")
          toast.error(result.error || "Failed to load assistant data")
          setIsLoading(false)
          return
        }

        const assistant = result.assistant

        // Map the fetched data to AssistantFormData format
        const formData: AssistantFormData = {
          name: assistant.name,
          price: assistant.price,
          category: assistant.category as any,
          description: assistant.description,
          image: null, // Will be loaded from imageURL if needed
          imageURL: assistant.imageURL,
          notes: assistant.notes || [],
          urls: assistant.urls || [],
          files: [], // Files can't be pre-populated, user needs to re-upload
          instructions: assistant.instructions || "",
          authenticationType: (assistant.apiConfiguration?.authenticationType || "none") as "none" | "api_key" | "oauth",
          apiKey: assistant.apiConfiguration?.apiKey || "",
          authType: (assistant.apiConfiguration?.authType || "basic") as "basic" | "bearer" | "custom" | undefined,
          customHeaderName: assistant.apiConfiguration?.customHeaderName || "",
          clientId: assistant.apiConfiguration?.clientId || "",
          clientSecret: assistant.apiConfiguration?.clientSecret || "",
          authorizationUrl: assistant.apiConfiguration?.authorizationUrl || "",
          tokenUrl: assistant.apiConfiguration?.tokenUrl || "",
          scope: assistant.apiConfiguration?.scope || "",
          tokenExchangeMethod: (assistant.apiConfiguration?.tokenExchangeMethod || "post") as "post" | "basic_auth" | undefined,
          schema: assistant.apiConfiguration?.schema || null,
          schemaText: assistant.apiConfiguration?.schemaText || "",
          permissionLevel: (assistant.permissionLevel === "public" ? "public" : "private") as "private" | "public",
          sharedUsers: assistant.sharedUsers || [],
        }

        setInitialData(formData)
      } catch (err) {
        console.error("Error fetching assistant:", err)
        setError("Failed to load assistant data")
        toast.error("Failed to load assistant data")
      } finally {
        setIsLoading(false)
      }
    }

    fetchAssistantData()
  }, [assistantId])

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

  if (error || !initialData) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-semibold mb-2">Error</p>
          <p className="text-sm text-muted-foreground">{error || "Failed to load assistant data"}</p>
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
            initialData={initialData}
            mode="edit"
          />
        </div>
      </div>
    </div>
  )
}

