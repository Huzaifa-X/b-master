"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react"
import { BasicInformationStep } from "@/app/(dashboard)/assistants/add/_components/steps/basic-information-step"
import { VisualIdentityStep } from "@/app/(dashboard)/assistants/add/_components/steps/visual-identity-step"
import { KnowledgeBaseStep } from "@/app/(dashboard)/assistants/add/_components/steps/knowledge-base-step"
import { InstructionsStep } from "@/app/(dashboard)/assistants/add/_components/steps/instructions-step"
import { AdvancedConfigStep } from "@/app/(dashboard)/assistants/add/_components/steps/advanced-config-step"
import { SharingPermissionsStep } from "@/app/(dashboard)/assistants/add/_components/steps/sharing-permissions-step"
import { toast } from "sonner"
import { useWizardStore } from "@/lib/stores/wizard-store"
import { AssistantFormData } from "@/types/assistant"
import { useRouter } from "next/navigation"
import { createCompleteAssistant } from "@/app/actions/assistant.action"

export function AssistantWizard() {
  const router = useRouter()
  const currentStep = useWizardStore((state) => state.currentStep)
  const setCurrentStep = useWizardStore((state) => state.setCurrentStep)
  const addCompletedStep = useWizardStore((state) => state.addCompletedStep)
  const resetWizard = useWizardStore((state) => state.reset)

  // Loading state for final submission
  const [isCreating, setIsCreating] = useState(false)

  const [formData, setFormData] = useState<AssistantFormData>({
    name: "",
    price: "",
    category: "Other",
    description: "",
    image: null, // For preview (base64)
    imageURL: null,
    notes: [],
    urls: [],
    files: [],
    instructions: "",
    authenticationType: "none",
    apiKey: "",
    authType: "basic",
    clientId: "",
    clientSecret: "",
    authorizationUrl: "",
    tokenUrl: "",
    scope: "",
    tokenExchangeMethod: "post",
    schema: null,
    schemaText: "",
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
        // Instructions are optional
        return true

      case 5:
        // All fields are optional in advanced config
        return true

      case 6:
        // Permission level is already set with default
        return true

      default:
        return true
    }
  }

  const handleNext = () => {
    if (!validateStep(currentStep)) return
    
    addCompletedStep(currentStep)
    setCurrentStep(currentStep + 1)
  }

  const handleBack = () => {
    setCurrentStep(Math.max(currentStep - 1, 1))
  }

  const handleFinalSubmit = async () => {
    if (!validateStep(6)) return

    setIsCreating(true)

    try {
      const result = await createCompleteAssistant({
        // Step 1: Basic Info
        name: formData.name,
        price: formData.price,
        category: formData.category,
        description: formData.description,
        
        // Step 2: Image
        imageData: formData.image,
        
        // Step 3: Knowledge Base
        notes: formData.notes,
        urls: formData.urls,
        files: formData.files,
        
        // Step 4: Instructions
        instructions: formData.instructions,
        
        // Step 5: API Config
        authenticationType: formData.authenticationType,
        apiKey: formData.apiKey,
        authType: formData.authType,
        customHeaderName: formData.customHeaderName,
        clientId: formData.clientId,
        clientSecret: formData.clientSecret,
        authorizationUrl: formData.authorizationUrl,
        tokenUrl: formData.tokenUrl,
        scope: formData.scope,
        tokenExchangeMethod: formData.tokenExchangeMethod,
        schemaText: formData.schemaText,
        schema: formData.schema,
        
        // Step 6: Sharing
        permissionLevel: formData.permissionLevel,
        sharedUsers: formData.sharedUsers,
      })

      if (result.success) {
        toast.success("Assistant created successfully!")
        addCompletedStep(6)
        
        // Show additional info for URLs being processed
        if (formData.urls.length > 0) {
          toast.info(
            `${formData.urls.length} URL${formData.urls.length > 1 ? 's are' : ' is'} being processed in the background.`,
            { duration: 5000 }
          )
        }
        
        // Redirect to assistants list
        router.push('/assistants')
      } else {
        toast.error(result.error || "Failed to create assistant")
      }
    } catch (error) {
      console.error("Error creating assistant:", error)
      toast.error("Failed to create assistant")
    } finally {
      setIsCreating(false)
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
          <InstructionsStep formData={formData} updateFormData={updateFormData} />
        )}
        {currentStep === 5 && (
          <AdvancedConfigStep formData={formData} updateFormData={updateFormData} />
        )}
        {currentStep === 6 && (
          <SharingPermissionsStep formData={formData} updateFormData={updateFormData} />
        )}
      </Card>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between pt-4">
        <Button
          variant="outline"
          onClick={handleBack}
          disabled={currentStep === 1 || isCreating}
          className="flex items-center gap-2 bg-background hover:bg-muted hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          Back
        </Button>

        {currentStep < 6 ? (
          <Button
            onClick={handleNext}
            className="flex items-center gap-2"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            onClick={handleFinalSubmit}
            disabled={isCreating}
            className="flex items-center gap-2"
          >
            {isCreating && <Loader2 className="h-4 w-4 animate-spin" />}
            Create Assistant
          </Button>
        )}
      </div>
    </div>
  )
}