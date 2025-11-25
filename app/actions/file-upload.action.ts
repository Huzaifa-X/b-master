"use server"

import { uploadMultipleToS3, validateFileSize } from "@/lib/aws-s3"

export interface FileUploadData {
  fileName: string
  fileData: string // base64 encoded file data (data URL format)
  contentType: string
}

export interface UploadedFile {
  name: string
  url: string
  type: string
  size: number
}

export type UploadFilesResult =
  | { success: true; files: UploadedFile[] }
  | { success: false; error: string }

/**
 * Upload files to S3 and return permanent URLs
 * Uses existing uploadMultipleToS3 function from lib/aws-s3.ts
 */
export async function uploadFilesToS3(
  files: FileUploadData[]
): Promise<UploadFilesResult> {
  try {
    if (!files || files.length === 0) {
      return { success: false, error: "No files provided" }
    }

    // Convert base64 data URLs to Buffers
    const filesToUpload = await Promise.all(
      files.map(async (file) => {
        // Extract base64 data (handle both data:type;base64,data and plain base64)
        const base64Data = file.fileData.includes(",")
          ? file.fileData.split(",")[1]
          : file.fileData

        const buffer = Buffer.from(base64Data, "base64")

        // Validate file size (10MB max for attachments)
        validateFileSize(buffer, 10)

        return {
          buffer,
          fileName: file.fileName,
          contentType: file.contentType,
        }
      })
    )

    // Use existing uploadMultipleToS3 function from lib/aws-s3.ts
    const urls = await uploadMultipleToS3(filesToUpload, "attachments")

    // Map to UploadedFile format
    const uploadedFiles: UploadedFile[] = filesToUpload.map((file, index) => ({
      name: file.fileName,
      url: urls[index],
      type: file.contentType,
      size: file.buffer.length,
    }))

    return { success: true, files: uploadedFiles }
  } catch (error) {
    console.error("Failed to upload files:", error)
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to upload files. Please try again.",
    }
  }
}

