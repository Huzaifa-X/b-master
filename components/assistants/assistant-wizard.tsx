"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { BasicInformationStep } from "@/components/assistants/steps/basic-information-step"
import { VisualIdentityStep } from "@/components/assistants/steps/visual-identity-step"
import { KnowledgeBaseStep } from "@/components/assistants/steps/knowledge-base-step"
import { AdvancedConfigStep } from "@/components/assistants/steps/advanced-config-step"
import { SharingPermissionsStep } from "@/components/assistants/steps/sharing-permissions-step"
import { toast } from "sonner"
import { useWizardStore } from "@/lib/stores/wizard-store"

export interface AssistantFormData {
  // Step 1: Basic Information
  name: string
  price: string
  description: string

  // Step 2: Visual Identity
  image: File | null
  imagePreview: string | null

  // Step 3: Knowledge Base
  notes: string
  urls: string[]
  files: File[]

  // Step 4: Advanced Configuration
  apiEndpoint: string
  apiKey: string
  modelName: string
  temperature: number

  // Step 5: Sharing & Permissions
  permissionLevel: "private" | "public"
  sharedUsers: {
    id: string
    name: string
    email: string
    permissions: {
      chat: boolean
      contact: boolean
      messenger: boolean
      artifact: boolean
    }
  }[]
}

export function AssistantWizard() {
  const currentStep = useWizardStore((state) => state.currentStep)
  const completedSteps = useWizardStore((state) => state.completedSteps)
  const setCurrentStep = useWizardStore((state) => state.setCurrentStep)
  const addCompletedStep = useWizardStore((state) => state.addCompletedStep)
  const resetWizard = useWizardStore((state) => state.reset)

  const [formData, setFormData] = useState<AssistantFormData>({
    name: "",
    price: "",
    description: "",
    image: null,
    imagePreview: null,
    notes: "",
    urls: [],
    files: [],
    apiEndpoint: "",
    apiKey: "",
    modelName: "gpt-4",
    temperature: 0.7,
    permissionLevel: "private",
    sharedUsers: [],
  })

  // Reset wizard when component mounts
  useEffect(() => {
    resetWizard()
    return () => {
      resetWizard()
    }
  }, [resetWizard])

  const updateFormData = (data: Partial<AssistantFormData>) => {
    setFormData((prev) => ({ ...prev, ...data }))
  }

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        if (!formData.name.trim()) {
          toast.error("Please enter a name")
          return false
        }
        if (!formData.price.trim()) {
          toast.error("Please enter a price")
          return false
        }
        if (!formData.description.trim()) {
          toast.error("Please enter a description")
          return false
        }
        return true

      case 2:
        // Image is optional
        return true

      case 3:
        // All fields are optional in knowledge base
        return true

      case 4:
        // All fields are optional in advanced config
        return true

      case 5:
        // Permission level is already set with default
        return true

      default:
        return true
    }
  }

  const handleNext = () => {
    if (validateStep(currentStep)) {
      addCompletedStep(currentStep)
      setCurrentStep(Math.min(currentStep + 1, 5))
    }
  }

  const handleBack = () => {
    setCurrentStep(Math.max(currentStep - 1, 1))
  }

  const handleSubmit = () => {
    if (validateStep(currentStep)) {
      console.log("Form submitted with data:", formData)
      toast.success("AI Assistant created successfully!")
      addCompletedStep(currentStep)
      // Here you would typically send the data to your API
      // After successful submission, you might want to redirect
      // router.push('/assistants')
    }
  }

  return (
    <div className="space-y-6">

      {/* Step Content */}
      <Card className="p-0 border-none bg-transparent">
        {currentStep === 1 && (
          <BasicInformationStep formData={formData} updateFormData={updateFormData} />
        )}
        {currentStep === 2 && (
          <VisualIdentityStep formData={formData} updateFormData={updateFormData} />
        )}
        {currentStep === 3 && (
          <KnowledgeBaseStep formData={formData} updateFormData={updateFormData} />
        )}
        {currentStep === 4 && (
          <AdvancedConfigStep formData={formData} updateFormData={updateFormData} />
        )}
        {currentStep === 5 && (
          <SharingPermissionsStep formData={formData} updateFormData={updateFormData} />
        )}
      </Card>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between pt-4">
        <Button
          variant="outline"
          onClick={handleBack}
          disabled={currentStep === 1}
          className="flex items-center gap-2"
        >
          <ChevronLeft className="h-4 w-4" />
          Back
        </Button>

        {currentStep === 5 ? (
          <Button onClick={handleSubmit} className="flex items-center gap-2">
            Create Assistant
          </Button>
        ) : (
          <Button onClick={handleNext} className="flex items-center gap-2">
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  )
}


