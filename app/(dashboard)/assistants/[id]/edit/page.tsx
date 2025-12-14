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

        // Convert file URLs to File objects for pre-population
        const fileObjects: File[] = []
        if (assistant.files && Array.isArray(assistant.files) && assistant.files.length > 0) {
          try {
            console.log('Loading files:', assistant.files)
            
            // Fetch files and convert to File objects
            const filePromises = assistant.files.map(async (fileInfo: { url: string; name: string; type?: string; size?: number }) => {
              try {
                console.log(`Fetching file: ${fileInfo.name} from ${fileInfo.url}`)
                
                const response = await fetch(fileInfo.url, {
                  method: 'GET',
                  headers: {
                    'Cache-Control': 'no-cache',
                  },
                })
                
                if (!response.ok) {
                  console.warn(`Failed to fetch file: ${fileInfo.url} - Status: ${response.status}`)
                  return null
                }
                
                const blob = await response.blob()
                console.log(`File fetched successfully: ${fileInfo.name}, size: ${blob.size} bytes`)
                
                // Ensure clean file name without MIME type contamination
                let fileName = fileInfo.name || `file_${Date.now()}`
                
                // Remove any timestamp prefix patterns like "1765616734544-"
                fileName = fileName.replace(/^\d+-/, '')
                
                // Remove any MIME type suffixes that might have been added (e.g., ".application_pdf")
                fileName = fileName.replace(/\.(application|text|image|video|audio)_[a-z0-9]+$/i, '')
                
                // Determine proper MIME type
                const fileType = fileInfo.type || blob.type || 'application/octet-stream'
                
                // Create File object with clean name
                const file = new File([blob], fileName, { type: fileType })
                
                // Verify file was created correctly
                console.log(`File created: ${file.name}, type: ${file.type}, size: ${file.size}`)
                
                return file
              } catch (error) {
                console.error(`Error converting file ${fileInfo.url}:`, error)
                toast.error(`Failed to load file: ${fileInfo.name}`)
                return null
              }
            })
            
            const fetchedFiles = await Promise.all(filePromises)
            const validFiles = fetchedFiles.filter((f): f is File => f !== null)
            
            // console.log(`Successfully loaded ${validFiles.length} out of ${assistant.files.length} files`)
            
            if (validFiles.length > 0) {
              fileObjects.push(...validFiles)
              toast.success(`Loaded ${validFiles.length} file${validFiles.length > 1 ? 's' : ''}`)
            } else if (assistant.files.length > 0) {
              toast.warning('Some files could not be loaded')
            }
          } catch (error) {
            console.error('Error pre-loading files:', error)
            toast.error('Failed to load files')
            // Continue without files if there's an error
          }
        }

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
          files: fileObjects, // Pre-populated files
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
          buyerPermissions: assistant.buyerPermissions || {
            chat: false,
            contact: false,
            messenger: false,
            artifact: false,
            newsFeed: false,
          },
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