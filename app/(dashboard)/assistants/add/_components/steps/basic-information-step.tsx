"use client"

import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { InputGroup, InputGroupAddon, InputGroupText, InputGroupInput } from "@/components/ui/input-group"
import { AssistantCategory, BasicInformationStepProps } from "@/types/assistant"

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
          <Label htmlFor="category">
            Category <span className="text-destructive">*</span>
          </Label>
          <Select
            value={formData.category}
            onValueChange={(value) => updateFormData({ category: value as AssistantCategory })}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Education" className="focus:bg-muted focus:text-foreground">Education</SelectItem>
              <SelectItem value="Travelling" className="focus:bg-muted focus:text-foreground capitalize">Travelling</SelectItem>
              <SelectItem value="Programming" className="focus:bg-muted focus:text-foreground capitalize">Programming</SelectItem>
              <SelectItem value="Markteting" className="focus:bg-muted focus:text-foreground capitalize">Markteting</SelectItem>
              <SelectItem value="Analysis" className="focus:bg-muted focus:text-foreground capitalize">Analysis</SelectItem>
              <SelectItem value="Booking" className="focus:bg-muted focus:text-foreground capitalize">Booking</SelectItem>
              <SelectItem value="Other" className="focus:bg-muted focus:text-foreground capitalize">Other</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground">
            Select the category that best describes your assistant
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="price">
            Price <span className="text-destructive">*</span>
          </Label>
          <InputGroup>
            <InputGroupAddon>
              <InputGroupText>CHF</InputGroupText>
            </InputGroupAddon>
            <InputGroupInput
              placeholder="0.00"
              value={formData.price}
              onChange={(e) => updateFormData({ price: e.target.value })}
              type="number"
              min="0"
              step="0.01"
            />
          </InputGroup>
          <p className="text-sm text-muted-foreground">
            Set the pricing for your assistant.
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

