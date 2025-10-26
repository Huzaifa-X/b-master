export type AssistantCategory = "Education" | "Travelling" | "Programming" | "Markteting" | "Analysis" | "Booking" | "Other"

export interface AssistantFormData {
    // Step 1: Basic Information
    name: string
    price: string
    category: AssistantCategory
    description: string

    // Step 2: Visual Identity
    image: File | null
    imagePreview: string | null

    // Step 3: Knowledge Base
    notes: string
    urls: string[]
    files: File[]

    // Step 4: Advanced Configuration
    apiEndpoint: string
    apiKey: string
    modelName: string
    temperature: number

    // Step 5: Sharing & Permissions
    permissionLevel: "private" | "public"
    sharedUsers: {
        id: string
        name: string
        email: string
        permissions: {
            chat: boolean
            contact: boolean
            messenger: boolean
            artifact: boolean
        }
    }[]
}

export interface BasicInformationStepProps {
    formData: AssistantFormData
    updateFormData: (data: Partial<AssistantFormData>) => void
}

export interface KnowledgeBaseStepProps {
    formData: AssistantFormData
    updateFormData: (data: Partial<AssistantFormData>) => void
}
