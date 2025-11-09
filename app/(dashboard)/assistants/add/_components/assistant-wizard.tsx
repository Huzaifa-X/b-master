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

// Import all the multi-step actions
import {
  createAssistantBasic,
  uploadAssistantImageStep,
  createAssistantVectorStore,
  updateAssistantInstructions,
  updateAssistantApiConfig,
  updateAssistantSharing,
} from "@/app/actions/assistant.action"

export function AssistantWizard() {
  const router = useRouter()
  const currentStep = useWizardStore((state) => state.currentStep)
  const setCurrentStep = useWizardStore((state) => state.setCurrentStep)
  const addCompletedStep = useWizardStore((state) => state.addCompletedStep)
  const resetWizard = useWizardStore((state) => state.reset)

  // Track the created assistant ID
  const [assistantId, setAssistantId] = useState<string | null>(null)

  // Loading states for each step
  const [stepLoading, setStepLoading] = useState<Record<number, boolean>>({})

  const [formData, setFormData] = useState<AssistantFormData>({
    name: "",
    price: "",
    category: "Other",
    description: "",
    image: null, // For preview (base64)
    imageURL: null, // For uploaded URL
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

  // Step-specific submission functions
  const handleStep1Submit = async () => {
    if (!validateStep(1)) return

    setStepLoading(prev => ({ ...prev, 1: true }))

    try {
      const result = await createAssistantBasic({
        name: formData.name,
        price: formData.price,
        category: formData.category,
        description: formData.description,
      })

      if (result.success && result.assistantId) {
        setAssistantId(result.assistantId)
        toast.success("Basic information saved successfully!")
        addCompletedStep(1)
        setCurrentStep(2)
      } else {
        toast.error(result.error || "Failed to save basic information")
      }
    } catch (error) {
      console.error("Step 1 error:", error)
      toast.error("Failed to save basic information")
    } finally {
      setStepLoading(prev => ({ ...prev, 1: false }))
    }
  }

  const handleStep2Submit = async () => {
    if (!validateStep(2) || !assistantId) return

    setStepLoading(prev => ({ ...prev, 2: true }))

    try {
      // Only upload if there's an image to upload
      if (formData.image) {
        const result = await uploadAssistantImageStep({
          assistantId,
          imageData: formData.image,
        })

        if (!result.success) {
          toast.error(result.error || "Failed to upload image")
          return
        }
      }

      toast.success("Visual identity saved successfully!")
      addCompletedStep(2)
      setCurrentStep(3)
    } catch (error) {
      console.error("Step 2 error:", error)
      toast.error("Failed to save visual identity")
    } finally {
      setStepLoading(prev => ({ ...prev, 2: false }))
    }
  }

  const handleStep3Submit = async () => {
    if (!validateStep(3) || !assistantId) return

    setStepLoading(prev => ({ ...prev, 3: true }))

    try {
      const result = await createAssistantVectorStore({
        assistantId,
        notes: formData.notes,
        urls: formData.urls,
        files: formData.files,
      })

      if (result.success) {
        toast.success("Knowledge base created successfully!")
        addCompletedStep(3)
        setCurrentStep(4)
      } else {
        toast.error(result.error || "Failed to create knowledge base")
      }
    } catch (error) {
      console.error("Step 3 error:", error)
      toast.error("Failed to create knowledge base")
    } finally {
      setStepLoading(prev => ({ ...prev, 3: false }))
    }
  }

  const handleStep4Submit = async () => {
    if (!validateStep(4) || !assistantId) return

    setStepLoading(prev => ({ ...prev, 4: true }))

    try {
      const result = await updateAssistantInstructions({
        assistantId,
        instructions: formData.instructions,
      })

      if (result.success) {
        toast.success("Instructions saved successfully!")
        addCompletedStep(4)
        setCurrentStep(5)
      } else {
        toast.error(result.error || "Failed to save instructions")
      }
    } catch (error) {
      console.error("Step 4 error:", error)
      toast.error("Failed to save instructions")
    } finally {
      setStepLoading(prev => ({ ...prev, 4: false }))
    }
  }

  const handleStep5Submit = async () => {
    if (!validateStep(5) || !assistantId) return

    setStepLoading(prev => ({ ...prev, 5: true }))

    try {
      const result = await updateAssistantApiConfig({
        assistantId,
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
      })

      if (result.success) {
        toast.success("API configuration saved successfully!")
        addCompletedStep(5)
        setCurrentStep(6)
      } else {
        toast.error(result.error || "Failed to save API configuration")
      }
    } catch (error) {
      console.error("Step 5 error:", error)
      toast.error("Failed to save API configuration")
    } finally {
      setStepLoading(prev => ({ ...prev, 5: false }))
    }
  }

  const handleStep6Submit = async () => {
    if (!validateStep(6) || !assistantId) return

    setStepLoading(prev => ({ ...prev, 6: true }))

    try {
      const result = await updateAssistantSharing({
        assistantId,
        permissionLevel: formData.permissionLevel,
        sharedUsers: formData.sharedUsers,
      })

      if (result.success) {
        toast.success("Assistant created successfully!")
        addCompletedStep(6)
        // Redirect to assistants list
        router.push('/assistants')
      } else {
        toast.error(result.error || "Failed to save sharing settings")
      }
    } catch (error) {
      console.error("Step 6 error:", error)
      toast.error("Failed to save sharing settings")
    } finally {
      setStepLoading(prev => ({ ...prev, 6: false }))
    }
  }

  const handleBack = () => {
    setCurrentStep(Math.max(currentStep - 1, 1))
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
          disabled={currentStep === 1 || stepLoading[currentStep]}
          className="flex items-center gap-2 bg-background hover:bg-muted hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          Back
        </Button>

        {currentStep === 1 && (
          <Button
            onClick={handleStep1Submit}
            disabled={stepLoading[1]}
            className="flex items-center gap-2"
          >
            {stepLoading[1] && <Loader2 className="h-4 w-4 animate-spin" />}
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        )}

        {currentStep === 2 && (
          <Button
            onClick={handleStep2Submit}
            disabled={stepLoading[2] || !assistantId}
            className="flex items-center gap-2"
          >
            {stepLoading[2] && <Loader2 className="h-4 w-4 animate-spin" />}
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        )}

        {currentStep === 3 && (
          <Button
            onClick={handleStep3Submit}
            disabled={stepLoading[3] || !assistantId}
            className="flex items-center gap-2"
          >
            {stepLoading[3] && <Loader2 className="h-4 w-4 animate-spin" />}
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        )}

        {currentStep === 4 && (
          <Button
            onClick={handleStep4Submit}
            disabled={stepLoading[4] || !assistantId}
            className="flex items-center gap-2"
          >
            {stepLoading[4] && <Loader2 className="h-4 w-4 animate-spin" />}
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        )}

        {currentStep === 5 && (
          <Button
            onClick={handleStep5Submit}
            disabled={stepLoading[5] || !assistantId}
            className="flex items-center gap-2"
          >
            {stepLoading[5] && <Loader2 className="h-4 w-4 animate-spin" />}
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        )}

        {currentStep === 6 && (
          <Button
            onClick={handleStep6Submit}
            disabled={stepLoading[6] || !assistantId}
            className="flex items-center gap-2"
          >
            {stepLoading[6] && <Loader2 className="h-4 w-4 animate-spin" />}
            Create Assistant
          </Button>
        )}
      </div>
    </div>
  )
}


