"use client"

import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Bookmark } from "lucide-react"
import { PromptTemplate } from "@/types/ai-instruction"

interface PromptInputSectionProps {
  prompt: string
  onPromptChange: (prompt: string) => void
  showTemplates: boolean
  onToggleTemplates: () => void
  onUseTemplate: (templatePrompt: string) => void
}

const PROMPT_TEMPLATES: PromptTemplate[] = [
  {
    title: "Customer Service Bot",
    prompt: "Create instructions for a customer service assistant that helps with product inquiries, order tracking, and returns."
  },
  {
    title: "Knowledge Base Assistant",
    prompt: "Create instructions for an assistant that acts as a knowledge base for our company, answering FAQ and providing information about our products."
  },
  {
    title: "Sales Assistant",
    prompt: "Create instructions for a sales assistant that helps qualify leads, answer product questions, and guide users through the purchase process."
  },
  {
    title: "Technical Support",
    prompt: "Create instructions for a technical support assistant that troubleshoots common issues, provides step-by-step solutions, and escalates complex problems."
  },
  {
    title: "Coding Helper",
    prompt: "Create instructions for an assistant that helps developers with code snippets, debugging, and explaining programming concepts."
  }
]

export function PromptInputSection({
  prompt,
  onPromptChange,
  showTemplates,
  onToggleTemplates,
  onUseTemplate
}: PromptInputSectionProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">
          What type of assistant do you want to create?
        </label>
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleTemplates}
          className="h-8"
        >
          <Bookmark className="w-4 h-4 mr-1" />
          Templates
        </Button>
      </div>

      {showTemplates && (
        <div className="p-3 bg-muted/50 rounded-lg border max-h-40 overflow-y-auto">
          <p className="text-sm font-medium mb-2">Choose a template:</p>
          <div className="flex flex-wrap gap-2">
            {PROMPT_TEMPLATES.map((template, index) => (
              <Badge
                key={index}
                variant="outline"
                className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                onClick={() => onUseTemplate(template.prompt)}
              >
                {template.title}
              </Badge>
            ))}
          </div>
        </div>
      )}

      <div className="relative">
        <Textarea
          value={prompt}
          onChange={(e) => onPromptChange(e.target.value)}
          placeholder="Describe the assistant you want to create..."
          rows={10}
          style={{ height: '150px' }}
          className="resize-none overflow-y-auto"
        />
      </div>
    </div>
  )
}
