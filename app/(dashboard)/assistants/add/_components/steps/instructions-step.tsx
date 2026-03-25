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
import { useLocale } from "@/lib/i18n"

export function InstructionsStep({ formData, updateFormData }: InstructionsStepProps) {
  const { t } = useLocale()
  const [showAIDialog, setShowAIDialog] = useState(false)

  const handleInsertInstructions = (instructions: string) => {
    updateFormData({ instructions: instructions })
    setShowAIDialog(false)
  }

  const exampleInstructions = t("wizard.instructions.exampleContent")

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">{t("wizard.instructions.title")}</h2>
        <p className="text-muted-foreground">
          {t("wizard.instructions.description")}
        </p>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Label htmlFor="instructions">{t("wizard.instructions.label")}</Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-xs text-sm space-y-2 p-3">
                  <p className="font-semibold">{t("wizard.instructions.tooltipTitle")}</p>
                  <p>{t("wizard.instructions.tooltipDescription")}</p>
                  <p className="text-muted-foreground font-medium mt-1">{t("wizard.instructions.tooltipExample")}</p>
                  <pre className="text-xs bg-muted rounded p-2 whitespace-pre-wrap">{exampleInstructions}</pre>
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
            {t("wizard.instructions.generateWithAI")}
          </Button>
        </div>
        <Textarea
          id="instructions"
          placeholder={t("wizard.instructions.placeholder", { example: exampleInstructions })}
          value={formData.instructions}
          onChange={(e) => updateFormData({ instructions: e.target.value })}
          rows={20}
          className="resize-none overflow-y-auto"
          style={{ height: '400px' }}
        />
        <p className="text-sm text-muted-foreground">
          {t("wizard.instructions.hint")}
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

