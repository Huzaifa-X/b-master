"use client"

import { useState } from "react"
import { Label } from "@/components/ui/label"
import { ImageUploadField } from "@/components/ui/image-uploader"
import { VisualIdentityStepProps } from "@/types/assistant"
import { Button } from "@/components/ui/button"
import { Trash2 } from "lucide-react"

export function VisualIdentityStep({
  formData,
  updateFormData
}: VisualIdentityStepProps) {
  const [pendingImage, setPendingImage] = useState<string | null>(null)

  const handleImageChange = async (value: File | string | null) => {
    if (value instanceof File) {
      // Create preview and store file for later upload
      const reader = new FileReader()
      reader.onloadend = async () => {
        const base64Data = reader.result as string
        setPendingImage(base64Data)

        // Store base64 for preview and file for later S3 upload
        updateFormData({
          image: base64Data, // For preview
        })
        setPendingImage(null)
      }
      reader.readAsDataURL(value)
    } else if (value === null) {
      // User wants to remove image
      updateFormData({
        image: null, // Clear preview
      })
      setPendingImage(null)
    }
  }

  const handleRemoveImage = () => {
    updateFormData({
      image: null, // Clear preview
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Visual Identity</h2>
        <p className="text-muted-foreground">
          Upload an image to represent your AI assistant
        </p>
      </div>

      <div className="space-y-4">
        <div className="max-w-xs mx-auto">
          <ImageUploadField
            value={formData.image || pendingImage}
            onChange={handleImageChange}
            aspectRatio={1}
            maxSize={5 * 1024 * 1024}
            className="w-full"
          />
        </div>

        

        <p className="text-sm text-muted-foreground text-center">
          This image will be used as the avatar for your assistant
        </p>
      </div>
    </div>
  )
}