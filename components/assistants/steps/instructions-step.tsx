"use client"

import { useState } from "react"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Bot } from "lucide-react"
import { InstructionsStepProps } from "@/types/assistant"
import { AIInstructionDialog } from "@/app/(dashboard)/assistants/_components/ai-instruction-dialog"

export function InstructionsStep({ formData, updateFormData }: InstructionsStepProps) {
  const [showAIDialog, setShowAIDialog] = useState(false)

  const handleInsertInstructions = (instructions: string) => {
    updateFormData({ instructions: instructions })
    setShowAIDialog(false)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Instructions</h2>
        <p className="text-muted-foreground">
          Add instructions for your assistant to follow
        </p>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="instructions">Instructions</Label>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAIDialog(true)}
            className="gap-2"
          >
            <Bot className="w-4 h-4" />
          </Button>
        </div>
        <Textarea
          id="instructions"
          placeholder="Enter instructions for your assistant..."
          value={formData.instructions}
          onChange={(e) => updateFormData({ instructions: e.target.value })}
          rows={20}
          className="resize-none overflow-y-auto"
          style={{ height: '400px' }}
        />
        <p className="text-sm text-muted-foreground">
          Provide clear instructions on how your assistant should behave and respond
        </p>
      </div>

      <AIInstructionDialog
        open={showAIDialog}
        onOpenChange={setShowAIDialog}
        onInsert={handleInsertInstructions}
      />
    </div>
  )
}

