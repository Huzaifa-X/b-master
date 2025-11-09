import { useState } from "react"
import { uploadAssistantImage, deleteAssistantImage } from "@/app/actions/image.actions"
import { toast } from "sonner"

export function useImageUpload() {
  const [isUploading, setIsUploading] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const uploadImage = async (assistantId: string, imageData: string) => {
    setIsUploading(true)
    try {
      const result = await uploadAssistantImage(assistantId, imageData)

      if (result.success) {
        toast.success(result.message)
        return result.url
      } else {
        toast.error(result.error)
        return null
      }
    } catch (error) {
      toast.error("Failed to upload image")
      return null
    } finally {
      setIsUploading(false)
    }
  }

  const deleteImage = async (assistantId: string) => {
    setIsDeleting(true)
    try {
      const result = await deleteAssistantImage(assistantId)

      if (result.success) {
        toast.success(result.message)
        return true
      } else {
        toast.error(result.error)
        return false
      }
    } catch (error) {
      toast.error("Failed to delete image")
      return false
    } finally {
      setIsDeleting(false)
    }
  }

  return {
    uploadImage,
    deleteImage,
    isUploading,
    isDeleting,
  }
}