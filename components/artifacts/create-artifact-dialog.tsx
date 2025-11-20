"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { toast } from "sonner"
import { TemplateSelectionStep } from "./steps/template-selection-step"
import { ArtifactCustomizationStep } from "./steps/artifact-customization-step"
import type { ArtifactFormData, Template, Contact } from "@/types/artifacts"
import { getAssistantContacts, createArtifact } from "@/app/actions/artifact.action"

interface CreateArtifactDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  assistantId: string
}

export function CreateArtifactDialog({ open, onOpenChange, assistantId }: CreateArtifactDialogProps) {
  const [step, setStep] = useState(1)
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loadingContacts, setLoadingContacts] = useState(false)

  const [formData, setFormData] = useState<ArtifactFormData>({
    templateId: "",
    name: "",
    instructions: "",
    permissions: "private",
    selectedUsers: [],
    apiConfigs: [],
    uploadedFiles: [],
    uploadedImages: [],
  })

  const [errors, setErrors] = useState<Partial<Record<keyof ArtifactFormData, string>>>({})

  // Fetch contacts when dialog opens
  useEffect(() => {
    const fetchContacts = async () => {
      if (open && assistantId) {
        setLoadingContacts(true)
        try {
          const result = await getAssistantContacts(assistantId)
          if (result.success) {
            setContacts(result.contacts)
          } else {
            console.error('Failed to fetch contacts:', result.error)
            toast.error('Failed to load contacts')
          }
        } catch (error) {
          console.error('Error fetching contacts:', error)
          toast.error('Failed to load contacts')
        } finally {
          setLoadingContacts(false)
        }
      }
    }

    fetchContacts()
  }, [open, assistantId])

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setStep(1)
        setSelectedTemplate(null)
        setFormData({
          templateId: "",
          name: "",
          instructions: "",
          permissions: "private",
          selectedUsers: [],
          apiConfigs: [],
          uploadedFiles: [],
          uploadedImages: [],
        })
        setErrors({})
        setContacts([])
      }, 200)
    }
  }, [open])

  // Pre-fill form when template is selected and moving to step 2
  useEffect(() => {
    if (step === 2 && selectedTemplate) {
      setFormData((prev) => ({
        ...prev,
        templateId: selectedTemplate.id,
        name: selectedTemplate.isCustom ? "" : `${selectedTemplate.name} - Copy`,
        instructions: selectedTemplate.prefilledInstructions,
      }))
    }
  }, [step, selectedTemplate])

  const handleTemplateSelect = (template: Template) => {
    setSelectedTemplate(template)
  }

  const handleNextStep = () => {
    if (step === 1) {
      setStep(2)
    }
  }

  const handleBackStep = () => {
    if (step === 2) {
      setStep(1)
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof ArtifactFormData, string>> = {}

    if (!formData.name.trim()) {
      newErrors.name = "Artifact name is required"
    }

    if (!formData.instructions.trim()) {
      newErrors.instructions = "Instructions are required"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async () => {
    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)
    toast.loading("Generating artifact with AI...", { id: "artifact-creation" })

    try {
      const result = await createArtifact({
        assistantId: assistantId,
        name: formData.name,
        instructions: formData.instructions,
        category: selectedTemplate?.category || 'others',
        permissions: formData.permissions,
        selectedUsers: formData.selectedUsers,
        apiConfigs: formData.apiConfigs.map(config => ({
          key: config.key,
          value: config.value
        })),
        uploadedFiles: formData.uploadedFiles,
        uploadedImages: formData.uploadedImages,
      })

      toast.dismiss("artifact-creation")

      if (result.success) {
        toast.success("Artifact created successfully!")
        onOpenChange(false)
      } else {
        toast.error(result.error || "Failed to create artifact")
      }
    } catch (error) {
      toast.dismiss("artifact-creation")
      console.error("Error creating artifact:", error)
      toast.error("An unexpected error occurred")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-[98vw] sm:!max-w-[98vw] w-full h-[98vh] p-0 flex flex-col overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-2xl">Create Artifact</DialogTitle>
              <DialogDescription className="mt-1">
                Step {step} of 2
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          {step === 1 && (
            <TemplateSelectionStep
              selectedTemplate={selectedTemplate}
              onTemplateSelect={handleTemplateSelect}
            />
          )}

          {step === 2 && selectedTemplate && (
            <ArtifactCustomizationStep
              selectedTemplate={selectedTemplate}
              formData={formData}
              setFormData={setFormData}
              errors={errors}
              setErrors={setErrors}
              onBack={handleBackStep}
              contacts={contacts}
              loadingContacts={loadingContacts}
            />
          )}
        </div>

        <DialogFooter className="px-6 py-4 border-t flex-shrink-0">
          {step === 1 ? (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)} className="hover:text-primary hover:bg-transparent">
                Cancel
              </Button>
              <Button
                onClick={handleNextStep}
                disabled={!selectedTemplate}
              >
                {selectedTemplate?.isCustom ? "Customize Template" : "Select Custom Template"}
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={handleBackStep} className="hover:text-primary hover:bg-transparent">
                <ChevronLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <Button onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? "Creating..." : "Create Artifact"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
