"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, Loader2, Lock, AlertTriangle } from "lucide-react"
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
import { useAssistantMutations } from "@/hooks/useAssistantMutations"
import { useSubscriptionLimits } from "@/hooks/useSubscriptionLimits"
import Link from "next/link"

interface AssistantWizardProps {
  assistantId?: string
  initialData?: AssistantFormData
  mode?: "create" | "edit"
}

export function AssistantWizard({ assistantId, initialData, mode = "create" }: AssistantWizardProps) {
  const router = useRouter()
  const currentStep = useWizardStore((state) => state.currentStep)
  const setCurrentStep = useWizardStore((state) => state.setCurrentStep)
  const addCompletedStep = useWizardStore((state) => state.addCompletedStep)
  const resetWizard = useWizardStore((state) => state.reset)

  // Assistant mutations
  const { createAssistant, updateAssistant, isCreating, isUpdating } = useAssistantMutations()
  const isSaving = isCreating || isUpdating

  // Plan limit check (create mode only)
  const { limits: subscriptionLimits, loading: limitsLoading } = useSubscriptionLimits()

  const [formData, setFormData] = useState<AssistantFormData>(
    initialData || {
      name: "",
      price: "",
      category: "Other",
      description: "",
      imagePreview: null, // For preview only (base64)
      imageURL: null, // S3 URL
      notes: [],
      urls: [],
      fileURLs: [], // Changed from files: File[] to fileURLs
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
      apiConfigs: [{ authenticationType: "none" as const }],
      permissionLevel: "private",
      sharedUsers: [],
      buyerPermissions: {
        chat: true,
        contact: false,
        messenger: false,
        artifact: false,
        newsFeed: false,
        library: false,
      },
    }
  )

  // Reset wizard when component mounts (only for create mode)
  useEffect(() => {
    if (mode === "create") {
      resetWizard()
      return () => {
        resetWizard()
      }
    }
  }, [resetWizard, mode])

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

    const params = {
      // Step 1: Basic Info
      name: formData.name,
      price: formData.price,
      category: formData.category,
      description: formData.description,

      // Step 2: Image (send S3 URL, not base64)
      imageURL: formData.imageURL,

      // Step 3: Knowledge Base (send S3 URLs, not File objects)
      notes: formData.notes,
      urls: formData.urls,
      fileURLs: formData.fileURLs, // Array of {url, fileName, fileSize}

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
      apiConfigs: formData.apiConfigs,

      // Step 6: Sharing
      permissionLevel: formData.permissionLevel,
      sharedUsers: formData.sharedUsers,
      buyerPermissions: formData.buyerPermissions,
    }

    let result
    if (mode === "edit" && assistantId) {
      result = await updateAssistant({ assistantId, ...params })
    } else {
      result = await createAssistant(params)
    }

    if (result.success) {
      toast.success(mode === "edit" ? "Assistant updated successfully!" : "Assistant created successfully!")
      addCompletedStep(6)

      // Show additional info for URLs being processed
      if (formData.urls.length > 0) {
        toast.info(
          `${formData.urls.length} URL${formData.urls.length > 1 ? 's are' : ' is'} being processed in the background.`,
          { duration: 5000 }
        )
      }

      // Redirect to assistant detail page or list
      if (mode === "edit" && assistantId) {
        router.push(`/assistants/${assistantId}`)
      } else {
        router.push('/assistants')
      }
    } else {
      toast.error(result.error || `Failed to ${mode === "edit" ? "update" : "create"} assistant`)
    }
  }

  // Plan limit gate — show before the wizard so users aren't surprised at step 6
  if (mode === "create" && limitsLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (mode === "create" && !limitsLoading && !subscriptionLimits.canCreateMore) {
    return (
      <Card className="flex flex-col items-center gap-6 p-10 text-center border border-border bg-muted/30">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
          <Lock className="h-8 w-8 text-destructive" />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-semibold">Assistant Limit Reached</h2>
          <p className="text-muted-foreground">
            Your <span className="font-medium text-foreground">{subscriptionLimits.planTitle || "current"}</span> plan allows up to{" "}
            <span className="font-medium text-foreground">{subscriptionLimits.assistantLimit}</span> assistant
            {subscriptionLimits.assistantLimit !== 1 ? "s" : ""}.{" "}
            You currently have{" "}
            <span className="font-medium text-foreground">{subscriptionLimits.currentAssistants}</span>.
          </p>
          <p className="text-sm text-muted-foreground">
            Upgrade your plan to create more assistants.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs">
          <Button asChild className="flex-1">
            <Link href="/pricing">Upgrade Plan</Link>
          </Button>
          <Button variant="outline" asChild className="flex-1">
            <Link href="/assistants">Back to Assistants</Link>
          </Button>
        </div>

        <div className="flex items-center gap-2 rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>Unlimited assistants are available on higher plans.</span>
        </div>
      </Card>
    )
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
          disabled={currentStep === 1 || isSaving}
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
            disabled={isSaving}
            className="flex items-center gap-2"
          >
            {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
            {mode === "edit" ? "Update Assistant" : "Create Assistant"}
          </Button>
        )}
      </div>
    </div>
  )
}