"use server"

import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { uploadToS3, deleteFromS3 } from "@/lib/aws-s3"

/**
 * Upload a single image file to S3 (for assistant images, profile pictures, etc.)
 * Accepts base64 data URL from client
 */
export async function uploadImageToS3(params: {
  base64Data: string
  fileName: string
  folder?: string
}): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    // Authentication check
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return {
        success: false,
        error: "Authentication required"
      }
    }

    const { base64Data, fileName, folder = "assistants" } = params

    // Validate base64 data
    if (!base64Data.startsWith("data:image/")) {
      return {
        success: false,
        error: "Invalid image data format"
      }
    }

    // Extract base64 content and MIME type
    const matches = base64Data.match(/^data:image\/(\w+);base64,(.+)$/)
    if (!matches) {
      return {
        success: false,
        error: "Invalid image data format"
      }
    }

    const extension = matches[1]
    const base64Content = matches[2]

    // Convert base64 to buffer
    const buffer = Buffer.from(base64Content, "base64")

    // Validate file size (5MB max)
    const fileSizeMB = buffer.length / (1024 * 1024)
    if (fileSizeMB > 5) {
      return {
        success: false,
        error: `File size (${fileSizeMB.toFixed(2)}MB) exceeds maximum allowed size (5MB)`
      }
    }

    // Generate unique filename
    const timestamp = Date.now()
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_")
    const finalFileName = `${timestamp}_${sanitizedFileName}.${extension}`

    // Upload to S3
    const url = await uploadToS3(
      buffer,
      finalFileName,
      `image/${extension}`,
      folder
    )

    console.log(`✅ Image uploaded successfully: ${url}`)

    return {
      success: true,
      url
    }
  } catch (error: any) {
    console.error("❌ Image upload error:", error)
    return {
      success: false,
      error: error.message || "Failed to upload image"
    }
  }
}

/**
 * Upload a single file to S3 (for knowledge base files)
 * Accepts file as FormData
 */
export async function uploadFileToS3(formData: FormData): Promise<{
  success: boolean
  url?: string
  fileName?: string
  fileSize?: number
  error?: string
}> {
  try {
    // Authentication check
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return {
        success: false,
        error: "Authentication required"
      }
    }

    // Extract file from FormData
    const file = formData.get("file") as File
    if (!file) {
      return {
        success: false,
        error: "No file provided"
      }
    }

    // Validate file size (50MB max for knowledge base files)
    const fileSizeMB = file.size / (1024 * 1024)
    if (fileSizeMB > 50) {
      return {
        success: false,
        error: `File size (${fileSizeMB.toFixed(2)}MB) exceeds maximum allowed size (50MB)`
      }
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Get folder from FormData or use default
    const folder = (formData.get("folder") as string) || "knowledge-base"

    // Upload to S3
    const url = await uploadToS3(buffer, file.name, file.type, folder)

    console.log(`✅ File uploaded successfully: ${file.name} -> ${url}`)

    return {
      success: true,
      url,
      fileName: file.name,
      fileSize: file.size
    }
  } catch (error: any) {
    console.error("❌ File upload error:", error)
    return {
      success: false,
      error: error.message || "Failed to upload file"
    }
  }
}

/**
 * Upload multiple files to S3 in batch
 * Accepts files as FormData with multiple file entries
 */
export async function uploadMultipleFilesToS3(formData: FormData): Promise<{
  success: boolean
  results?: Array<{
    fileName: string
    url: string
    size: number
  }>
  errors?: Array<{
    fileName: string
    error: string
  }>
  error?: string
}> {
  try {
    // Authentication check
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return {
        success: false,
        error: "Authentication required"
      }
    }

    // Extract all files from FormData
    const files = formData.getAll("files") as File[]
    if (!files || files.length === 0) {
      return {
        success: false,
        error: "No files provided"
      }
    }

    const folder = (formData.get("folder") as string) || "knowledge-base"
    const results: Array<{ fileName: string; url: string; size: number }> = []
    const errors: Array<{ fileName: string; error: string }> = []

    // Upload each file
    for (const file of files) {
      try {
        // Validate file size (50MB max)
        const fileSizeMB = file.size / (1024 * 1024)
        if (fileSizeMB > 50) {
          errors.push({
            fileName: file.name,
            error: `File size (${fileSizeMB.toFixed(2)}MB) exceeds 50MB limit`
          })
          continue
        }

        // Convert to buffer
        const arrayBuffer = await file.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)

        // Upload to S3
        const url = await uploadToS3(buffer, file.name, file.type, folder)

        results.push({
          fileName: file.name,
          url,
          size: file.size
        })

        console.log(`✅ File uploaded: ${file.name}`)
      } catch (fileError: any) {
        console.error(`❌ Error uploading ${file.name}:`, fileError)
        errors.push({
          fileName: file.name,
          error: fileError.message || "Upload failed"
        })
      }
    }

    return {
      success: results.length > 0,
      results,
      errors: errors.length > 0 ? errors : undefined
    }
  } catch (error: any) {
    console.error("❌ Batch upload error:", error)
    return {
      success: false,
      error: error.message || "Failed to upload files"
    }
  }
}

/**
 * Delete a file from S3 using its URL
 * Used when user removes a file/image before submitting the form
 */
export async function deleteFileFromS3(fileUrl: string): Promise<{
  success: boolean
  error?: string
}> {
  try {
    // Authentication check
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return {
        success: false,
        error: "Authentication required"
      }
    }

    if (!fileUrl) {
      return {
        success: false,
        error: "File URL is required"
      }
    }

    // Delete from S3
    await deleteFromS3(fileUrl)

    console.log(`✅ File deleted from S3: ${fileUrl}`)

    return {
      success: true
    }
  } catch (error: any) {
    console.error("❌ File deletion error:", error)
    return {
      success: false,
      error: error.message || "Failed to delete file"
    }
  }
}
