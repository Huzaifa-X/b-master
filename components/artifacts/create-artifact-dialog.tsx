"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, Loader2, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { TemplateSelectionStep } from "./steps/template-selection-step"
import { ArtifactCustomizationStep } from "./steps/artifact-customization-step"
import type { ArtifactFormData, Template, Contact } from "@/types/artifacts"
import { useArtifactEditData, useUpdateArtifactMutation, useCreateArtifact, useDeleteArtifact } from "@/hooks/useArtifact"
import { useAssistantContacts } from "@/hooks/useContacts"
import { useChatHistory } from "@/hooks/useChatHistory"

interface CreateArtifactDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  assistantId: string
  editArtifactId?: string // NEW: Optional artifact ID for edit mode
}

export function CreateArtifactDialog({ open, onOpenChange, assistantId, editArtifactId }: CreateArtifactDialogProps) {
  const router = useRouter()
  const isEditMode = Boolean(editArtifactId)
  const [step, setStep] = useState(isEditMode ? 2 : 1) // Start at step 2 for edit mode
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null)
  const [templateHtml, setTemplateHtml] = useState<string>("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const { chats, isLoading: isLoadingChatwithAssistant, error: chatError } = useChatHistory({ mode: "assistant", assistantId: assistantId })

  // Fetch contacts using the hook
  const { contacts, isLoading: loadingContacts } = useAssistantContacts(assistantId, { enabled: open })

  const [formData, setFormData] = useState<ArtifactFormData>({
    templateId: "",
    name: "",
    instructions: "",
    permissions: "private",
    selectedUsers: [],
    apiConfigs: [],
    uploadedFiles: [],
    uploadedImages: [],
    videoDuration: "8",
    selectedChatId: null,
  })

  const [errors, setErrors] = useState<Partial<Record<keyof ArtifactFormData, string>>>({})

  // Fetch edit data if in edit mode
  const { editData, isLoading: isLoadingEditData } = useArtifactEditData(
    editArtifactId || "",
    { enabled: open && isEditMode && Boolean(editArtifactId) }
  )

  // Create artifact mutation
  const { createArtifactAsync, isCreating } = useCreateArtifact({
    onSuccess: (artifactId) => {
      onOpenChange(false)
      // Navigate to the artifact page to see streaming generation
      if (selectedTemplate?.category !== "video_generation") {
        router.push(`/assistants/${assistantId}/artifacts/${artifactId}`)
      }
    }
  })

  // Update artifact mutation for edit mode
  const { updateArtifact, isLoading: isUpdating } = useUpdateArtifactMutation({
    onSuccess: () => {
      onOpenChange(false)
      // No need to navigate - we're already on the artifact page
      // The cache invalidation will trigger a refetch automatically
    }
  })

  // Delete artifact mutation for edit mode
  const { deleteArtifact, isDeleting } = useDeleteArtifact({
    onSuccess: () => {
      onOpenChange(false)
      setShowDeleteConfirm(false)
      // Navigate back to artifacts list
      router.push(`/assistants/${assistantId}/artifacts`)
    }
  })

  // Load edit data into form when available (after contacts are loaded)
  useEffect(() => {
    if (isEditMode && editData && open && !loadingContacts) {
      console.log("[Edit Dialog] Loading edit data:", editData)
      console.log("[Edit Dialog] Selected users from edit data:", editData.selectedUsers)
      console.log("[Edit Dialog] Available contacts:", contacts.length)
      console.log("[Edit Dialog] Uploaded files:", editData.uploadedFiles?.length || 0)
      console.log("[Edit Dialog] Uploaded images:", editData.uploadedImages?.length || 0)

      setFormData((prev) => ({
        ...prev,
        name: editData.name,
        instructions: editData.instructions,
        permissions: editData.permissions,
        // Map selectedUsers to match the SelectedUser interface (without image field)
        selectedUsers: editData.selectedUsers.map(user => ({
          id: user.id,
          name: user.name,
          email: user.email,
        })),
        apiConfigs: editData.apiConfigs.map(config => ({
          ...config,
          id: `${config.key}-${Date.now()}`
        })),
        selectedChatId: editData.selectedChatId || null,
        // Load existing uploaded files and images
        uploadedFiles: editData.uploadedFiles || [],
        uploadedImages: editData.uploadedImages || [],
      }))

      // Create a dummy template for edit mode
      setSelectedTemplate({
        id: 'edit-mode',
        name: editData.name,
        category: editData.category as any,
        icon: "FileCode",
        description: "Edit existing artifact",
        prefilledInstructions: editData.instructions,
        isCustom: false,
      })
    }
  }, [isEditMode, editData, open, loadingContacts, contacts.length])


  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setStep(isEditMode ? 2 : 1)
        if (!isEditMode) {
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
            videoDuration: "8",
            selectedChatId: null,
          })
        }
        setErrors({})
      }, 200)
    } else if (open && isEditMode) {
      // When opening in edit mode, prepare for edit data load
      console.log("[Dialog] Opening in edit mode")
    }
  }, [open, isEditMode])

  // Pre-fill form when template is selected and moving to step 2
  useEffect(() => {
    if (step === 2 && selectedTemplate) {
      setFormData((prev) => ({
        ...prev,
        templateId: selectedTemplate.id,
        name: selectedTemplate.isCustom ? "" : `${selectedTemplate.name} - Copy`,
        instructions: selectedTemplate.prefilledInstructions,
        // Set default video duration for video generation
        videoDuration: selectedTemplate.category === "video_generation" ? "8" : prev.videoDuration,
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

    // In edit mode, name is not editable but still required
    if (!isEditMode && !formData.name.trim()) {
      newErrors.name = "Artifact name is required"
    }

    if (!formData.instructions.trim()) {
      newErrors.instructions = "Instructions are required"
    }

    // Validate video generation requirements (only for create mode)
    if (!isEditMode && selectedTemplate?.category === "video_generation") {
      if (!formData.videoDuration) {
        newErrors.videoDuration = "Video duration is required"
      }

      const hasOpenAIApiKey = formData.apiConfigs.some(
        (config) => config.key === "OPENAI_API_KEY" && config.value.trim() !== ""
      )

      if (!hasOpenAIApiKey) {
        newErrors.apiConfigs = "OPENAI_API_KEY is required for video generation"
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async () => {
    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)

    try {
      if (isEditMode && editArtifactId) {
        // Edit mode - update artifact
        updateArtifact({
          artifactId: editArtifactId,
          instructions: formData.instructions,
          selectedUsers: formData.selectedUsers,
          apiConfigs: formData.apiConfigs.map(config => ({
            key: config.key,
            value: config.value
          })),
          selectedChatId: formData.selectedChatId || null,
          uploadedFiles: formData.uploadedFiles,
          uploadedImages: formData.uploadedImages,
        })
      } else {
        // Create mode - create new artifact
        toast.loading("Generating artifact...", { id: "artifact-creation" })

        await createArtifactAsync({
          assistantId: assistantId,
          name: formData.name,
          instructions: formData.instructions,
          category: selectedTemplate?.category || 'others',
          permissions: formData.permissions as "private" | "team" | "public",
          selectedUsers: formData.selectedUsers,
          apiConfigs: formData.apiConfigs.map(config => ({
            key: config.key,
            value: config.value
          })),
          uploadedFiles: formData.uploadedFiles || [],
          uploadedImages: formData.uploadedImages || [],
          videoDuration: selectedTemplate?.category === "video_generation" ? formData.videoDuration as "4" | "8" | "12" : undefined,
          selectedChatId: formData.selectedChatId || null,
          templateHtml: templateHtml || undefined,
          bookingConfig: formData.bookingConfig,
        })

        toast.dismiss("artifact-creation")
      }
    } catch (error) {
      toast.dismiss("artifact-creation")
      console.error(`Error ${isEditMode ? 'updating' : 'creating'} artifact:`, error)
      // Error toast is already shown by the hook
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteArtifact = () => {
    if (editArtifactId) {
      deleteArtifact(editArtifactId)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-[98vw] sm:!max-w-[98vw] w-full h-[98vh] p-0 flex flex-col overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-2xl">
                {isEditMode ? "Edit Artifact" : "Create Artifact"}
              </DialogTitle>
              <DialogDescription className="mt-1">
                {isEditMode ? "Update instructions, contacts, and API configurations" : `Step ${step} of 2`}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          {/* Loading state for edit mode */}
          {isEditMode && isLoadingEditData ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
                <p className="text-sm text-muted-foreground">Loading artifact data...</p>
              </div>
            </div>
          ) : (
            <>
              {/* Step 1: Template Selection (only in create mode) */}
              {!isEditMode && step === 1 && (
                <TemplateSelectionStep
                  selectedTemplate={selectedTemplate}
                  onTemplateSelect={handleTemplateSelect}
                  templateHtml={templateHtml}
                  setTemplateHtml={setTemplateHtml}
                />
              )}

              {/* Step 2: Customization */}
              {step === 2 && selectedTemplate && (
                <ArtifactCustomizationStep
                  selectedTemplate={selectedTemplate}
                  formData={formData}
                  setFormData={setFormData}
                  errors={errors}
                  setErrors={setErrors}
                  onBack={handleBackStep}
                  contacts={contacts}
                  chats={chats}
                  loadingChats={isLoadingChatwithAssistant}
                  chatError={chatError}
                  loadingContacts={loadingContacts}
                  isEditMode={isEditMode} // Pass edit mode flag
                />
              )}
            </>
          )}
        </div>

        <DialogFooter className="px-6 py-4 border-t flex-shrink-0">
          {isEditMode ? (
            // Edit mode footer
            <div className="flex items-center justify-between w-full">
              <Button
                variant="destructive"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={isSubmitting || isUpdating || isDeleting || isLoadingEditData}
                className="mr-auto"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Artifact
              </Button>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  className="hover:text-primary hover:bg-transparent"
                  disabled={isSubmitting || isUpdating || isDeleting}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting || isUpdating || isDeleting || isLoadingEditData}
                >
                  {isSubmitting || isUpdating ? "Updating..." : "Update Artifact"}
                </Button>
              </div>
            </div>
          ) : (
            // Create mode footer
            <>
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
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Delete Confirmation Dialog */}
    <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Artifact?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete this artifact, all its versions, permissions, and related data.
            This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDeleteArtifact}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Deleting...
              </>
            ) : (
              "Delete Artifact"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  )
}
