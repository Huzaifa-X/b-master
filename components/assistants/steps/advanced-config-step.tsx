"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AssistantFormData } from "../assistant-wizard"
import { Slider } from "@/components/ui/slider"

interface AdvancedConfigStepProps {
  formData: AssistantFormData
  updateFormData: (data: Partial<AssistantFormData>) => void
}

export function AdvancedConfigStep({ formData, updateFormData }: AdvancedConfigStepProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Advanced Configuration</h2>
        <p className="text-muted-foreground">
          Configure API settings and model parameters for your assistant
        </p>
      </div>

      <div className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="apiEndpoint">Custom API Endpoint</Label>
          <Input
            id="apiEndpoint"
            type="url"
            placeholder="https://api.example.com/v1/chat"
            value={formData.apiEndpoint}
            onChange={(e) => updateFormData({ apiEndpoint: e.target.value })}
          />
          <p className="text-sm text-muted-foreground">
            Optional: Use a custom API endpoint instead of the default
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="apiKey">API Key</Label>
          <Input
            id="apiKey"
            type="password"
            placeholder="sk-..."
            value={formData.apiKey}
            onChange={(e) => updateFormData({ apiKey: e.target.value })}
          />
          <p className="text-sm text-muted-foreground">
            Your API key for authentication (stored securely)
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="modelName">Model Name</Label>
          <Input
            id="modelName"
            placeholder="gpt-4"
            value={formData.modelName}
            onChange={(e) => updateFormData({ modelName: e.target.value })}
          />
          <p className="text-sm text-muted-foreground">
            Specify which AI model to use
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="temperature">
            Temperature: {formData.temperature.toFixed(1)}
          </Label>
          <Slider
            id="temperature"
            min={0}
            max={2}
            step={0.1}
            value={[formData.temperature]}
            onValueChange={([value]) => updateFormData({ temperature: value })}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>More Focused</span>
            <span>More Creative</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Controls randomness in responses. Lower values are more deterministic.
          </p>
        </div>
      </div>
    </div>
  )
}

