"use client"

import { useState } from "react"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Cpu, HelpCircle } from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { InstructionsStepProps } from "@/types/assistant"
import { AIInstructionDialog } from "@/app/(dashboard)/assistants/add/_components/ai-instruction-dialog"

const EXAMPLE_INSTRUCTIONS = `You are a helpful customer support agent for Acme Corp.
- Always greet users politely and ask how you can help.
- Only answer questions related to Acme Corp products.
- If you don't know an answer, say so honestly and offer to escalate.
- Keep responses concise and professional.`

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
          <div className="flex items-center gap-1.5">
            <Label htmlFor="instructions">Instructions</Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-xs text-sm space-y-2 p-3">
                  <p className="font-semibold">What are instructions?</p>
                  <p>Instructions define your assistant&apos;s personality, role, and behaviour. Think of it as a system prompt.</p>
                  <p className="text-muted-foreground font-medium mt-1">Example:</p>
                  <pre className="text-xs bg-muted rounded p-2 whitespace-pre-wrap">{EXAMPLE_INSTRUCTIONS}</pre>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAIDialog(true)}
            className="gap-2"
          >
            <Cpu className="w-4 h-4" />
            Generate with AI
          </Button>
        </div>
        <Textarea
          id="instructions"
          placeholder={`Describe how your assistant should behave. For example:\n\n${EXAMPLE_INSTRUCTIONS}`}
          value={formData.instructions}
          onChange={(e) => updateFormData({ instructions: e.target.value })}
          rows={20}
          className="resize-none overflow-y-auto"
          style={{ height: '400px' }}
        />
        <p className="text-sm text-muted-foreground">
          Provide clear instructions on how your assistant should behave and respond. You can also use the AI generator above to create a starting point.
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

