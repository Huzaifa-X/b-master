export type Category =
  | "accounting"
  | "invoice"
  | "payment"
  | "documentation"
  | "analytics"
  | "presentation"
  | "booking"
  | "video_generation"
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
  uploadedFiles?: UploadedFile[];
  uploadedImages?: UploadedImage[];
  videoDuration?: "4" | "8" | "12";
  selectedChatId?: string | null;
}

// types/artifacts.ts

export interface UploadedFile {
  url: string;
  name: string;
  type: string;
  size: number;
  uploadedAt: string;
  extractedContent?: {
    text: string;
    html: string;
    tables?: Array<{
      base64: string;
      page: number;
    }>;
    metadata?: {
      pages: number;
      model: string;
    };
  };
  extractedImages?: Array<{
    id: string;
    page: number;
    coordinates?: any;
  }>;
  extractionError?: string;
}

export interface UploadedImage {
  url: string;
  name: string;
  type: string;
  size: number;
  uploadedAt: string;
}
