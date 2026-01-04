"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  ChevronDown,
  Settings,
  Plus,
  Trash2,
  Cpu,
  FileText,
  X,
  Loader2,
  Upload,
  Image as ImageIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { UserSelectTable, type SelectedUser } from "@/components/shared/user-select-table"
import { ICON_MAP } from "./constants"
import type { Template, ArtifactFormData, ApiConfig, Contact, UploadedFile, UploadedImage, BookingConfig } from "@/types/artifacts"
import { ArtifactAIInstructionDialog } from "./artifact-ai-instruction-dialog"
import { deleteArtifactFile } from "@/app/actions/artifact.action"
import { ChatHistoryItem } from "@/types/chat"
import { ArtifactChatSelector } from "./artifact-chat-selector"
import { GoogleConnector } from "@/components/connectors/google-connector"
import { BookingConfigForm } from "@/components/artifacts/booking-config-form"

interface ArtifactCustomizationStepProps {
  selectedTemplate: Template
  formData: ArtifactFormData
  setFormData: (data: ArtifactFormData | ((prev: ArtifactFormData) => ArtifactFormData)) => void
  errors: Partial<Record<keyof ArtifactFormData, string>>
  setErrors: (errors: Partial<Record<keyof ArtifactFormData, string>>) => void
  onBack: () => void
  contacts: Contact[]
  loadingContacts: boolean
  isEditMode?: boolean // NEW: Flag to indicate edit mode
  chats: ChatHistoryItem[]
  loadingChats: boolean
  chatError: Error | null
}

export function ArtifactCustomizationStep({
  selectedTemplate,
  formData,
  setFormData,
  errors,
  setErrors,
  onBack,
  contacts,
  loadingContacts,
  isEditMode = false, // Default to false
  chats,
  loadingChats,
  chatError,
}: ArtifactCustomizationStepProps) {
  const [apiSectionOpen, setApiSectionOpen] = useState(false)
  const [aiDialogOpen, setAiDialogOpen] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<string>("")

  // Get available contacts (not yet added)
  const availableContacts = contacts.filter(
    (contact) => !formData.selectedUsers.some((user) => user.id === contact.id)
  )

  // User Select Handlers
  const handleAddUser = (userId: string) => {
    const contact = contacts.find((c) => c.id === userId)
    if (contact) {
      const newUser: SelectedUser = {
        id: contact.id,
        name: contact.name,
        email: contact.email,
      }
      setFormData((prev) => ({
        ...prev,
        selectedUsers: [...prev.selectedUsers, newUser],
        // Automatically set permissions to 'team' when users are added
        permissions: 'team',
      }))
    }
  }

  const handleRemoveUser = (userId: string) => {
    setFormData((prev) => {
      const newSelectedUsers = prev.selectedUsers.filter((user) => user.id !== userId)
      return {
        ...prev,
        selectedUsers: newSelectedUsers,
        // If no users left, set back to private
        permissions: newSelectedUsers.length > 0 ? 'team' : 'private',
      }
    })
  }

  // API Config Handlers
  const handleAddApiConfig = () => {
    const newConfig: ApiConfig = {
      id: Date.now().toString(),
      key: "",
      value: "",
    }
    setFormData((prev) => ({
      ...prev,
      apiConfigs: [...prev.apiConfigs, newConfig],
    }))
  }

  const handleRemoveApiConfig = (configId: string) => {
    setFormData((prev) => ({
      ...prev,
      apiConfigs: prev.apiConfigs.filter((config) => config.id !== configId),
    }))
  }

  const handleUpdateApiConfig = (configId: string, field: "key" | "value", newValue: string) => {
    setFormData((prev) => ({
      ...prev,
      apiConfigs: prev.apiConfigs.map((config) =>
        config.id === configId ? { ...config, [field]: newValue } : config
      ),
    }))
  }

  // AI Instruction Handler
  const handleAIInstructionInsert = (instructions: string) => {
    setFormData((prev) => ({
      ...prev,
      instructions: instructions,
    }))
    if (errors.instructions) {
      setErrors({ ...errors, instructions: undefined })
    }
  }

  // Check if OPENAI_API_KEY is provided for video generation
  const hasOpenAIApiKey = formData.apiConfigs.some(
    (config) => config.key === "OPENAI_API_KEY" && config.value.trim() !== ""
  )

  // Check if this is video generation category
  const isVideoGeneration = selectedTemplate.category === "video_generation"

  // Check if this is booking category
  const isBookingCategory = selectedTemplate.category === "booking"

  // State for Google connection
  const [isGoogleConnected, setIsGoogleConnected] = useState(false)

  // State for booking configuration
  const [bookingConfig, setBookingConfig] = useState<BookingConfig>({
    duration: 30,
    bufferTime: 5,
    timezone: "America/New_York",
    availability: {
      timezone: "America/New_York",
      schedule: {
        Monday: [{ start: "09:00", end: "17:00" }],
        Tuesday: [{ start: "09:00", end: "17:00" }],
        Wednesday: [{ start: "09:00", end: "17:00" }],
        Thursday: [{ start: "09:00", end: "17:00" }],
        Friday: [{ start: "09:00", end: "17:00" }],
        Saturday: [],
        Sunday: []
      }
    },
    eventTitle: "30-min Meeting",
    eventDescription: "Book a time to meet with me"
  })

  // Initialize booking config in formData for booking artifacts
  useEffect(() => {
    if (isBookingCategory && !isEditMode && !formData.bookingConfig) {
      // Use artifact name for event title if available
      const eventTitle = formData.name || "30-min Meeting"
      const updatedConfig = {
        ...bookingConfig,
        eventTitle: eventTitle,
        eventDescription: `Book a time to meet - ${eventTitle}`
      }

      setBookingConfig(updatedConfig)
      setFormData((prev) => ({
        ...prev,
        bookingConfig: updatedConfig
      }))
    }
  }, [isBookingCategory, isEditMode, formData.name]) // React to name changes

  // File Upload Handler
  const handleFileUpload = async (file: File, type: "image" | "document") => {
    setIsUploading(true)
    setUploadProgress(`Uploading ${file.name}...`)

    try {
      const uploadFormData = new FormData()
      uploadFormData.append("file", file)
      uploadFormData.append("type", type)

      const response = await fetch("/api/artifact/upload", {
        method: "POST",
        body: uploadFormData,
      })

      const result = await response.json()

      if (result.success) {
        if (type === "image") {
          setFormData((prev) => ({
            ...prev,
            uploadedImages: [...(prev.uploadedImages || []), result.file],
          }))
          toast.success(`Image uploaded: ${file.name}`)
        } else {
          setFormData((prev) => ({
            ...prev,
            uploadedFiles: [...(prev.uploadedFiles || []), result.file],
          }))

          if (result.file.extractionError) {
            toast.warning(`Uploaded ${file.name}, but content extraction failed`)
          } else {
            toast.success(`Document processed: ${file.name}`)
          }
        }
      } else {
        toast.error(result.error || "Upload failed")
      }
    } catch (error) {
      console.error("Upload error:", error)
      toast.error("Upload failed")
    } finally {
      setIsUploading(false)
      setUploadProgress("")
    }
  }

  const removeFile = async (index: number) => {
    const file = formData.uploadedFiles?.[index]
    if (!file) return

    // Delete from S3 first
    try {
      const result = await deleteArtifactFile(file.url)
      if (!result.success) {
        toast.error(result.error || "Failed to delete file from storage")
        return
      }
    } catch (error) {
      console.error("Error deleting file:", error)
      toast.error("Failed to delete file from storage")
      return
    }

    // Remove from state
    setFormData((prev) => ({
      ...prev,
      uploadedFiles: prev.uploadedFiles?.filter((_, i) => i !== index) || [],
    }))
    // toast.success(`File removed: ${file.name}`)
  }

  const removeImage = async (index: number) => {
    const image = formData.uploadedImages?.[index]
    if (!image) return

    // Delete from S3 first
    try {
      const result = await deleteArtifactFile(image.url)
      if (!result.success) {
        toast.error(result.error || "Failed to delete image from storage")
        return
      }
    } catch (error) {
      console.error("Error deleting image:", error)
      toast.error("Failed to delete image from storage")
      return
    }

    // Remove from state
    setFormData((prev) => ({
      ...prev,
      uploadedImages: prev.uploadedImages?.filter((_, i) => i !== index) || [],
    }))
    // toast.success(`Image removed: ${image.name}`)
  }

  return (
    <ScrollArea className="h-full">
      <div className="space-y-6 p-6 max-w-3xl mx-auto">
        {/* Selected Template Display - Hide in edit mode */}
        {!isEditMode && (
          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-background">
                {(() => {
                  const Icon = ICON_MAP[selectedTemplate.icon]
                  return <Icon className="h-5 w-5" />
                })()}
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Selected Template</p>
                <p className="font-semibold">{selectedTemplate.name}</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={onBack}>
              Change Template
            </Button>
          </div>
        )}

        {/* Basic Information */}
        <div className="space-y-4">
          {/* Show artifact name in edit mode but make it read-only */}
          {isEditMode ? (
            <div>
              <Label htmlFor="name">Artifact Name</Label>
              <Input
                id="name"
                value={formData.name}
                disabled
                className="mt-2 bg-muted cursor-not-allowed"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Artifact name cannot be changed
              </p>
            </div>
          ) : (
            <div>
              <Label htmlFor="name">
                Artifact Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => {
                  setFormData({ ...formData, name: e.target.value })
                  if (errors.name) setErrors({ ...errors, name: undefined })
                }}
                placeholder="Enter artifact name"
                className="mt-2"
              />
              {errors.name && <p className="text-xs text-destructive mt-1">{errors.name}</p>}
            </div>
          )}

          {/* Video Duration Selector - Only for video generation and not in edit mode */}
          {isVideoGeneration && !isEditMode && (
            <div>
              <Label htmlFor="video-duration">
                Video Duration <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.videoDuration || "8"}
                onValueChange={(value: "4" | "8" | "12") => {
                  setFormData({ ...formData, videoDuration: value })
                  if (errors.videoDuration) {
                    setErrors({ ...errors, videoDuration: undefined })
                  }
                }}
              >
                <SelectTrigger id="video-duration" className="mt-2 w-full">
                  <SelectValue placeholder="Select duration" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="4">4 seconds</SelectItem>
                  <SelectItem value="8">8 seconds</SelectItem>
                  <SelectItem value="12">12 seconds</SelectItem>
                </SelectContent>
              </Select>
              {errors.videoDuration && (
                <p className="text-xs text-destructive mt-1">{errors.videoDuration}</p>
              )}
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label htmlFor="instructions">
                Instructions <span className="text-destructive">*</span>
              </Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setAiDialogOpen(true)}
                className="h-8 gap-2"
              >
                <Cpu className="h-3.5 w-3.5" />
              </Button>
            </div>
            <Textarea
              id="instructions"
              value={formData.instructions}
              onChange={(e) => {
                setFormData({ ...formData, instructions: e.target.value })
                if (errors.instructions) setErrors({ ...errors, instructions: undefined })
              }}
              placeholder="Describe what this artifact should do..."
              className="min-h-[120px]"
              rows={5}
            />
            {errors.instructions && (
              <p className="text-xs text-destructive mt-1">{errors.instructions}</p>
            )}
          </div>
        </div>

        {/* File Upload Section - Now editable in edit mode */}
        <div className="space-y-4">
          <div>
            <Label className="text-base font-semibold">Documents & Images</Label>
            <p className="text-sm text-muted-foreground mt-1">
              {isEditMode 
                ? "Manage documents and images for your artifact"
                : "Upload documents (PDF, Word) or images to include in your artifact"
              }
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Document Upload */}
            <div className="border-2 border-dashed rounded-lg p-6 hover:border-primary/50 transition-colors">
              <div className="flex flex-col items-center text-center space-y-2">
                <FileText className="h-10 w-10 text-muted-foreground" />
                <div>
                  <Label
                    htmlFor="document-upload"
                    className="cursor-pointer text-sm font-medium text-primary hover:underline"
                  >
                    Click to upload document
                  </Label>
                  <Input
                    id="document-upload"
                    type="file"
                    accept=".pdf,.docx,.doc,.txt"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) handleFileUpload(file, "document")
                      e.target.value = "" // Reset input
                    }}
                    disabled={isUploading}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    PDF, Word, or text files
                  </p>
                </div>
              </div>
            </div>
            {/* Image Upload */}
            <div className="border-2 border-dashed rounded-lg p-6 hover:border-primary/50 transition-colors">
              <div className="flex flex-col items-center text-center space-y-2">
                <ImageIcon className="h-10 w-10 text-muted-foreground" />
                <div>
                  <Label
                    htmlFor="image-upload"
                    className="cursor-pointer text-sm font-medium text-primary hover:underline"
                  >
                    Click to upload images
                  </Label>
                  <Input
                    id="image-upload"
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      const files = Array.from(e.target.files || [])
                      files.forEach((file) => handleFileUpload(file, "image"))
                      e.target.value = "" // Reset input
                    }}
                    disabled={isUploading}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    PNG, JPG, WebP, etc.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Upload Progress */}
          {isUploading && (
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">{uploadProgress}</span>
            </div>
          )}

          {/* Uploaded Files List */}
          {formData.uploadedFiles && formData.uploadedFiles.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Uploaded Documents ({formData.uploadedFiles.length})
              </Label>
              <div className="space-y-2">
                {formData.uploadedFiles.map((file, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-3 p-3 bg-muted rounded-lg group"
                  >
                    <FileText className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(file.size / 1024).toFixed(1)} KB
                        {file.extractedContent && (
                          <span className="ml-2">
                            • {file.extractedContent.metadata?.pages || 0} pages
                            • {file.extractedContent.text.length.toLocaleString()} characters
                          </span>
                        )}
                        {/* {file.extractionError && (
                          <span className="ml-2 text-destructive">• Extraction failed</span>
                        )} */}
                      </p>
                      {/* {file.extractedContent?.tables && file.extractedContent.tables.length > 0 && (
                        <p className="text-xs text-muted-foreground mt-1">
                          📊 Contains {file.extractedContent.tables.length} table(s)
                        </p>
                      )} */}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(idx)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Uploaded Images Grid */}
          {formData.uploadedImages && formData.uploadedImages.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Uploaded Images ({formData.uploadedImages.length})
              </Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {formData.uploadedImages.map((img, idx) => (
                  <div key={idx} className="relative group aspect-square">
                    <img
                      src={img.url}
                      alt={img.name}
                      className="w-full h-full object-cover rounded-lg border-2 border-border"
                    />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => removeImage(idx)}
                      >
                        <X className="h-4 w-4 mr-1" />
                        Remove
                      </Button>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 bg-black/75 text-white text-xs p-1 truncate rounded-b-lg">
                      {img.name}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Chat Selection */}
        <ArtifactChatSelector
          chats={chats}
          loadingChats={loadingChats}
          chatError={chatError}
          selectedChatId={formData.selectedChatId || null}
          onChatSelect={(chatId) => {
            setFormData({ ...formData, selectedChatId: chatId })
          }}
        />

        {/* Google Calendar Integration - Only for booking artifacts */}
        {isBookingCategory && !isEditMode && (
          <div className="space-y-4">
            <GoogleConnector
              returnUrl={typeof window !== 'undefined' ? window.location.href : undefined}
              onConnectionChange={setIsGoogleConnected}
            />
            {!isGoogleConnected && (
              <div className="p-3 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg">
                <p className="text-sm text-amber-900 dark:text-amber-100">
                  💡 Connect your Google account to enable automatic calendar events and email confirmations for bookings.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Booking Configuration - Only for booking artifacts */}
        {isBookingCategory && !isEditMode && (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-2">Booking Configuration</h3>
              <p className="text-sm text-muted-foreground">
                Configure your availability schedule and booking settings
              </p>
            </div>
            <BookingConfigForm
              config={bookingConfig}
              onChange={(config) => {
                setBookingConfig(config)
                setFormData({ ...formData, bookingConfig: config })
              }}
            />
          </div>
        )}

        {/* Sharing & Permissions */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Sharing & Permissions</h3>
            <Badge variant={formData.permissions === 'team' ? 'default' : 'secondary'}>
              {formData.permissions === 'team' ? '🔓 Team Access' : '🔒 Private'}
            </Badge>
          </div>
          {loadingContacts ? (
            <div className="text-center py-8 border rounded-lg border-dashed">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Loading contacts...</p>
            </div>
          ) : (
            <UserSelectTable
              selectedUsers={formData.selectedUsers}
              availableContacts={availableContacts}
              onAddUser={handleAddUser}
              onRemoveUser={handleRemoveUser}
            />
          )}
        </div>

        {/* API Configuration */}
        <Collapsible open={apiSectionOpen} onOpenChange={setApiSectionOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" className="w-full justify-between hover:text-primary hover:bg-transparent">
              <div className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                <span>Advanced: API Configuration</span>
                {formData.apiConfigs.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {formData.apiConfigs.length}
                  </Badge>
                )}
                {isVideoGeneration && !hasOpenAIApiKey && (
                  <Badge variant="destructive" className="ml-2">
                    OPENAI_API_KEY Required
                  </Badge>
                )}
              </div>
              <ChevronDown
                className={cn("h-4 w-4 transition-transform", apiSectionOpen && "rotate-180")}
              />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-4 space-y-4">
            {isVideoGeneration && (
              <div className="p-3 bg-muted rounded-lg border border-primary/20">
                <p className="text-sm font-medium text-primary mb-1">
                  ⚠️ OPENAI_API_KEY Required for Video Generation
                </p>
                <p className="text-xs text-muted-foreground">
                  You must provide an OPENAI_API_KEY in the API Configuration section below to generate videos.
                </p>
                {errors.apiConfigs && (
                  <p className="text-xs text-destructive mt-2">{errors.apiConfigs}</p>
                )}
              </div>
            )}
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Add API key-value pairs to configure external integrations
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddApiConfig}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Config
              </Button>
            </div>

            {formData.apiConfigs.length > 0 ? (
              <div className="space-y-3">
                {formData.apiConfigs.map((config) => (
                  <div key={config.id} className="flex gap-2 items-start p-3 border rounded-lg">
                    <div className="flex-1 grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs text-muted-foreground">Key</Label>
                        <Input
                          value={config.key}
                          onChange={(e) => handleUpdateApiConfig(config.id, "key", e.target.value)}
                          placeholder="API_KEY"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Value</Label>
                        <Input
                          value={config.value}
                          onChange={(e) => handleUpdateApiConfig(config.id, "value", e.target.value)}
                          placeholder="your-api-key-value"
                          type="password"
                          className="mt-1"
                        />
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveApiConfig(config.id)}
                      className="hover:bg-destructive/10 hover:text-destructive mt-6"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 border rounded-lg border-dashed">
                <Settings className="h-10 w-10 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">No API configurations added</p>
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* AI Instruction Dialog */}
      <ArtifactAIInstructionDialog
        open={aiDialogOpen}
        onOpenChange={setAiDialogOpen}
        onInsert={handleAIInstructionInsert}
      />
    </ScrollArea>
  )
}
