export type Category =
  | "accounting"
  | "invoice"
  | "payment"
  | "documentation"
  | "analytics"
  | "presentation"
  | "booking"
  | "others"

export type Permission = "private" | "team" | "public"

export interface Template {
  id: string
  name: string
  description: string
  category: Category
  icon: string
  prefilledInstructions: string
  isCustom?: boolean
}

export interface ApiConfig {
  id: string
  key: string
  value: string
}

export interface SelectedUser {
  id: string
  name: string
  email: string
}

export interface Contact {
  id: string
  name: string
  email: string
  image?: string | null
}

export interface ArtifactFormData {
  templateId: string
  name: string
  instructions: string
  permissions: Permission
  selectedUsers: SelectedUser[]
  apiConfigs: ApiConfig[]
}

