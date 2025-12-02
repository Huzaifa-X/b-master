import { useState } from 'react'
import { toast } from 'sonner'

export function useFileUpload() {
  const [uploading, setUploading] = useState(false)

  const uploadFile = async (file: File): Promise<string> => {
    setUploading(true)
    try {
      // Step 1: Get presigned URL
      const response = await fetch('/api/s3/presigned-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file.name,
          fileType: file.type
        })
      })

      if (!response.ok) {
        throw new Error('Failed to get upload URL')
      }

      const { url, publicUrl } = await response.json()

      // Step 2: Upload to S3
      const uploadResponse = await fetch(url, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type
        }
      })

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload file')
      }

      // Step 3: Return the public URL
      return publicUrl
    } catch (error) {
      console.error('Upload error:', error)
      toast.error('Failed to upload file')
      throw error
    } finally {
      setUploading(false)
    }
  }

  return { uploadFile, uploading }
}

