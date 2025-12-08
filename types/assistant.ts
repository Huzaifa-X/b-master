// ================================================================
// ASSISTANT CREATION TYPES
// ================================================================

export type AssistantCategory = 
  | "Education" 
  | "Travelling" 
  | "Programming" 
  | "Markteting" 
  | "Analysis" 
  | "Booking" 
  | "Other"

export type AuthenticationType = "none" | "api_key" | "oauth"
export type AuthType = "basic" | "bearer" | "custom"
export type TokenExchangeMethod = "post" | "basic_auth"
export type PermissionLevel = "private" | "public"
export type PermissionType = "chat" | "contact" | "messenger" | "artifact" | "newsFeed"

// ================================================================
// ASSISTANT FORM DATA INTERFACE
// ================================================================

export interface AssistantFormData {
  // Step 1: Basic Information
  name: string
  price: string
  category: AssistantCategory
  description: string

  // Step 2: Visual Identity
  image: string | null // For preview (base64)
  imageURL: string | null // For uploaded URL

  // Step 3: Knowledge Base
  notes: string[]
  urls: string[]
  files: File[]

  // Step 4: Instructions
  instructions: string

  // Step 5: Advanced Configuration - API Configuration
  authenticationType: AuthenticationType
  
  // API Key Authentication fields
  apiKey?: string
  authType?: AuthType
  customHeaderName?: string
  
  // OAuth Authentication fields
  clientId?: string
  clientSecret?: string
  authorizationUrl?: string
  tokenUrl?: string
  scope?: string
  tokenExchangeMethod?: TokenExchangeMethod
  
  // OpenAPI Schema
  schema?: any // JSON object
  schemaText?: string // Raw schema text for editing

  // Step 6: Sharing & Permissions
  permissionLevel: PermissionLevel
  sharedUsers: SharedUser[]
}

// ================================================================
// SHARED USER INTERFACE
// ================================================================

export interface SharedUser {
  id: string
  name: string
  email: string
  permissions: UserPermissions
}

export interface UserPermissions {
  chat: boolean
  contact: boolean
  messenger: boolean
  artifact: boolean
  newsFeed: boolean
}

// ================================================================
// STEP PROPS INTERFACES
// ================================================================

export interface BasicInformationStepProps {
  formData: AssistantFormData
  updateFormData: (data: Partial<AssistantFormData>) => void
}

export interface VisualIdentityStepProps {
  formData: AssistantFormData
  updateFormData: (data: Partial<AssistantFormData>) => void
}

export interface KnowledgeBaseStepProps {
  formData: AssistantFormData
  updateFormData: (data: Partial<AssistantFormData>) => void
}

export interface InstructionsStepProps {
  formData: AssistantFormData
  updateFormData: (data: Partial<AssistantFormData>) => void
}

export interface AdvancedConfigStepProps {
  formData: AssistantFormData
  updateFormData: (data: Partial<AssistantFormData>) => void
}

export interface SharingPermissionsStepProps {
  formData: AssistantFormData
  updateFormData: (data: Partial<AssistantFormData>) => void
}

// ================================================================
// HELPER TYPES
// ================================================================

export type StepNumber = 1 | 2 | 3 | 4 | 5 | 6

export interface StepComponent {
  component: React.ComponentType<{
    formData: AssistantFormData
    updateFormData: (data: Partial<AssistantFormData>) => void
  }>
  title: string
  description: string
}
