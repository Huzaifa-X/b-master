export interface ArtifactAIInstructionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onInsert: (instructions: string) => void
}

export interface GenerateArtifactInstructionsParams {
  prompt: string
}

export interface GenerateArtifactInstructionsResult {
  success: boolean
  instructions?: string
  error?: string
}

