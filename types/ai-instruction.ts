// ================================================================
// AI INSTRUCTION DIALOG TYPES
// ================================================================

export interface PromptTemplate {
  title: string
  prompt: string
}

export interface AIInstructionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onInsert: (instructions: string) => void
}

// ================================================================
// INSTRUCTION GENERATION ACTION TYPES
// ================================================================

export type GenerationMode = 'basic' | 'detailed' | 'expert'

export interface GenerateInstructionsParams {
  prompt: string
  mode?: GenerationMode
}

export interface GenerateInstructionsResponse {
  success: boolean
  instructions?: string
  error?: string
}

