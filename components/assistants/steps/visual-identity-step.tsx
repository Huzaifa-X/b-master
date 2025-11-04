"use client"

import { Label } from "@/components/ui/label"
import { ImageUploadField } from "@/components/ui/image-uploader"
import { VisualIdentityStepProps } from "@/types/assistant"

export function VisualIdentityStep({ formData, updateFormData }: VisualIdentityStepProps) {
  const handleImageChange = (value: File | string | null) => {
    if (value instanceof File) {
      // Create preview when a file is selected
      const reader = new FileReader()
      reader.onloadend = () => {
        updateFormData({
          image: value,
          imagePreview: reader.result as string,
        })
      }
      reader.readAsDataURL(value)
    } else {
      // Clear image if null
      updateFormData({ image: null, imagePreview: null })
    }
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
            value={formData.image}
            onChange={handleImageChange}
            aspectRatio={1}
            maxSize={5 * 1024 * 1024}
            className="w-full"
          />
        </div>

        {formData.image && (
          <p className="text-sm text-muted-foreground text-center">
            {formData.image.name}
          </p>
        )}

        <p className="text-sm text-muted-foreground text-center">
          This image will be used as the avatar for your assistant
        </p>
      </div>
    </div>
  )
}

