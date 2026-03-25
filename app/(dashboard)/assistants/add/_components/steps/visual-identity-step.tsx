"use client"

import { useState } from "react"
import { Label } from "@/components/ui/label"
import { ImageUploadField } from "@/components/ui/image-uploader"
import { VisualIdentityStepProps } from "@/types/assistant"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { uploadImageToS3, deleteFileFromS3 } from "@/app/actions/upload.action"
import { useLocale } from "@/lib/i18n"

export function VisualIdentityStep({
  formData,
  updateFormData
}: VisualIdentityStepProps) {
  const { t } = useLocale()
  const [isUploading, setIsUploading] = useState(false)

  const handleImageChange = async (value: File | string | null) => {
    if (value instanceof File) {
      setIsUploading(true)

      try {
        // Delete old image from S3 if it exists
        if (formData.imageURL) {
          const deleteResult = await deleteFileFromS3(formData.imageURL)
          if (!deleteResult.success) {
            console.warn("Failed to delete old image from S3:", deleteResult.error)
            // Continue anyway - don't block new upload
          }
        }

        // Create preview first (for immediate UI feedback)
        const reader = new FileReader()
        reader.onloadend = async () => {
          const base64Data = reader.result as string

          // Set preview immediately
          updateFormData({
            imagePreview: base64Data,
            imageURL: null // Clear previous URL while uploading
          })

          // Upload to S3 in the background
          const uploadResult = await uploadImageToS3({
            base64Data,
            fileName: value.name,
            folder: "assistants"
          })

          if (uploadResult.success && uploadResult.url) {
            // Update with S3 URL
            updateFormData({
              imagePreview: base64Data, // Keep preview for UI
              imageURL: uploadResult.url // Store S3 URL for backend
            })
            toast.success(t("wizard.visualIdentity.uploadSuccess"))
          } else {
            // Upload failed - clear preview and show error
            updateFormData({
              imagePreview: null,
              imageURL: null
            })
            toast.error(uploadResult.error || t("wizard.visualIdentity.uploadError"))
          }

          setIsUploading(false)
        }
        reader.readAsDataURL(value)
      } catch (error: any) {
        console.error("Image upload error:", error)
        updateFormData({
          imagePreview: null,
          imageURL: null
        })
        toast.error(error.message || t("wizard.visualIdentity.uploadError"))
        setIsUploading(false)
      }
    } else if (value === null) {
      // User wants to remove image - delete from S3 first
      handleRemoveImage()
    }
  }

  const handleRemoveImage = async () => {
    // Delete from S3 if URL exists
    if (formData.imageURL) {
      try {
        const deleteResult = await deleteFileFromS3(formData.imageURL)
        if (deleteResult.success) {
          toast.success(t("wizard.visualIdentity.removeSuccess"))
        } else {
          console.warn("Failed to delete image from S3:", deleteResult.error)
          toast.warning(t("wizard.visualIdentity.removeWarning"))
        }
      } catch (error) {
        console.error("Error deleting image:", error)
        toast.warning(t("wizard.visualIdentity.removeWarning"))
      }
    }

    // Clear from form data
    updateFormData({
      imagePreview: null,
      imageURL: null
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">{t("wizard.visualIdentity.title")}</h2>
        <p className="text-muted-foreground">
          {t("wizard.visualIdentity.description")}
        </p>
      </div>

      <div className="space-y-4">
        <div className="max-w-xs mx-auto relative">
          <ImageUploadField
            value={formData.imagePreview}
            onChange={handleImageChange}
            aspectRatio={1}
            maxSize={5 * 1024 * 1024}
            className="w-full"
            disabled={isUploading}
          />
          {isUploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-lg">
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">{t("wizard.visualIdentity.uploading")}</p>
              </div>
            </div>
          )}
        </div>

        <p className="text-sm text-muted-foreground text-center">
          {isUploading
            ? t("wizard.visualIdentity.uploadingToCloud")
            : t("wizard.visualIdentity.avatarHint")
          }
        </p>
      </div>
    </div>
  )
}