"use client"

import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { AssistantFormData } from "../assistant-wizard"

interface BasicInformationStepProps {
  formData: AssistantFormData
  updateFormData: (data: Partial<AssistantFormData>) => void
}

export function BasicInformationStep({ formData, updateFormData }: BasicInformationStepProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Basic Information</h2>
        <p className="text-muted-foreground">
          Let's start with the essential details about your assistant
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">
            Assistant Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="name"
            placeholder="e.g., Marketing Assistant"
            value={formData.name}
            onChange={(e) => updateFormData({ name: e.target.value })}
            className="w-full"
          />
          <p className="text-sm text-muted-foreground">
            Give your assistant a memorable name
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="price">
            Price <span className="text-destructive">*</span>
          </Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              $
            </span>
            <Input
              id="price"
              type="number"
              placeholder="0.00"
              value={formData.price}
              onChange={(e) => updateFormData({ price: e.target.value })}
              className="pl-7"
              min="0"
              step="0.01"
            />
          </div>
          <p className="text-sm text-muted-foreground">
            Set the pricing for your assistant (per usage or subscription)
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">
            Description <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="description"
            placeholder="Describe what your assistant does and its key features..."
            value={formData.description}
            onChange={(e) => updateFormData({ description: e.target.value })}
            rows={6}
            className="resize-none"
          />
          <p className="text-sm text-muted-foreground">
            Provide a detailed description of your assistant's capabilities
          </p>
        </div>
      </div>
    </div>
  )
}

