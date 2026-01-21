import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"

// ============================================
// S3 CLIENT CONFIGURATION
// ============================================

const s3Client = new S3Client({
  region: process.env.S3_AWS_S3_REGION_NAME!,
  credentials: {
    accessKeyId: process.env.S3_AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.S3_AWS_SECRET_ACCESS_KEY!,
  },
  maxAttempts: 3, // Auto-retry on network errors
  // Optional: Custom endpoint for S3-compatible services (DigitalOcean Spaces, MinIO, etc.)
  ...(process.env.S3_AWS_S3_ENDPOINT && {
    endpoint: process.env.S3_AWS_S3_ENDPOINT,
    forcePathStyle: true, // Required for some S3-compatible services
  }),
})

const BUCKET_NAME = process.env.S3_AWS_STORAGE_BUCKET_NAME!

// ============================================
// UPLOAD FILE TO S3
// ============================================

/**
 * Upload file to S3 and return public URL
 * @param file - Buffer containing file data
 * @param fileName - Name of the file (will be prefixed with folder structure)
 * @param contentType - MIME type of the file (e.g., 'image/jpeg', 'application/pdf')
 * @param folder - Optional folder path (default: 'assistants')
 * @returns Public URL of the uploaded file
 */
export async function uploadToS3(
  file: Buffer,
  fileName: string,
  contentType: string,
  folder: string = "assistants"
): Promise<string> {
  try {
    // Validate AWS configuration before attempting upload
    if (!BUCKET_NAME) {
      throw new Error("S3_AWS_STORAGE_BUCKET_NAME environment variable is not configured")
    }
    if (!process.env.S3_AWS_ACCESS_KEY_ID) {
      throw new Error("S3_AWS_ACCESS_KEY_ID environment variable is not configured")
    }
    if (!process.env.S3_AWS_SECRET_ACCESS_KEY) {
      throw new Error("S3_AWS_SECRET_ACCESS_KEY environment variable is not configured")
    }
    if (!process.env.S3_AWS_S3_REGION_NAME) {
      throw new Error("S3_AWS_S3_REGION_NAME environment variable is not configured")
    }

    // Generate unique key with timestamp to avoid collisions
    const timestamp = Date.now()
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_")
    const key = `${folder}/${timestamp}-${sanitizedFileName}`

    // Upload command
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: file,
      ContentType: contentType,
      // ACL: "public-read", // Make file publicly accessible
      // Optional: Add metadata
      Metadata: {
        uploadedAt: new Date().toISOString(),
      },
      // Optional: Add cache control
      CacheControl: "max-age=31536000", // Cache for 1 year
    })

    // Execute upload with extended timeout (120 seconds for large PDFs)
    const uploadPromise = s3Client.send(command)
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("S3 upload timeout after 120 seconds")), 120000)
    )

    await Promise.race([uploadPromise, timeoutPromise])

    // Construct and return public URL
    const publicUrl = getPublicUrl(key)
    console.log(`✅ File uploaded successfully: ${publicUrl}`)

    return publicUrl
  } catch (error: any) {
    console.error("❌ S3 Upload Error:", error)

    // Detailed error logging
    const errorDetails = {
      message: error.message,
      code: error.Code || error.code || error.name,
      statusCode: error.$metadata?.httpStatusCode,
      requestId: error.$metadata?.requestId,
      bucket: BUCKET_NAME,
      region: process.env.S3_AWS_S3_REGION_NAME,
      fileName: fileName,
      folder: folder
    }
    console.error("❌ S3 Upload Error Details:", JSON.stringify(errorDetails, null, 2))

    // Provide user-friendly error messages based on error type
    let userMessage = "Failed to upload file to cloud storage"

    if (error.code === 'ECONNRESET' || error.syscall === 'read') {
      userMessage = "Connection reset: Network connection to AWS S3 was interrupted. This is often temporary - please try again."
    } else if (error.code === 'NetworkingError' || error.message?.includes('timeout')) {
      userMessage = "Network error: Unable to connect to AWS S3. Please check your internet connection and try again."
    } else if (error.code === 'InvalidAccessKeyId' || error.code === 'SignatureDoesNotMatch') {
      userMessage = "AWS credentials error: Invalid access credentials. Please contact support."
    } else if (error.code === 'NoSuchBucket') {
      userMessage = "AWS configuration error: Storage bucket not found. Please contact support."
    } else if (error.code === 'AccessDenied' || error.code === 'Forbidden') {
      userMessage = "AWS permission error: Insufficient permissions to upload files. Please contact support."
    } else if (error.message?.includes('timeout')) {
      userMessage = "Upload timeout: The file upload took too long. Please try again or use a smaller file."
    }

    throw new Error(userMessage)
  }
}

// ============================================
// DELETE FILE FROM S3
// ============================================

/**
 * Delete file from S3 using its URL or key
 * @param fileUrl - Full URL or S3 key of the file to delete
 */
export async function deleteFromS3(fileUrl: string): Promise<void> {
  // Extract key from URL (do this outside try block so it's accessible in catch)
  const key = extractKeyFromUrl(fileUrl)

  if (!key) {
    throw new Error("Invalid S3 URL or key")
  }

  try {
    // Check if file exists before attempting delete
    const exists = await checkFileExists(key)
    if (!exists) {
      console.warn(`⚠️ File not found in S3: ${key}`)
      return // Don't throw error, just return
    }

    // Delete command
    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    })

    // Execute delete
    await s3Client.send(command)
    console.log(`✅ File deleted successfully: ${key}`)
  } catch (error: any) {
    console.error("❌ S3 Delete Error:", error)

    // Check if it's an access denied error
    if (error.name === 'AccessDenied' || error.Code === 'AccessDenied') {
      console.warn(`⚠️ S3 DeleteObject permission missing. File not deleted: ${key}`)
      console.warn(`⚠️ Please add s3:DeleteObject permission to your IAM user policy`)
      // Don't throw error - just warn and continue
      // This prevents blocking the user experience
      return
    }

    throw new Error(`Failed to delete file from S3: ${error instanceof Error ? error.message : "Unknown error"}`)
  }
}

// ============================================
// GET SIGNED URL (for private files)
// ============================================

/**
 * Generate a signed URL for private file access
 * @param key - S3 key of the file
 * @param expiresIn - URL expiration time in seconds (default: 1 hour)
 * @returns Signed URL
 */
export async function getSignedS3Url(
  key: string,
  expiresIn: number = 3600
): Promise<string> {
  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    })

    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn })
    return signedUrl
  } catch (error) {
    console.error("❌ Get Signed URL Error:", error)
    throw new Error(`Failed to generate signed URL: ${error instanceof Error ? error.message : "Unknown error"}`)
  }
}

// ============================================
// CHECK IF FILE EXISTS
// ============================================

/**
 * Check if a file exists in S3
 * @param key - S3 key of the file
 * @returns true if file exists, false otherwise
 */
export async function checkFileExists(key: string): Promise<boolean> {
  try {
    const command = new HeadObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    })

    await s3Client.send(command)
    return true
  } catch (error: any) {
    if (error.name === "NotFound" || error.$metadata?.httpStatusCode === 404) {
      return false
    }
    throw error
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Extract S3 key from full URL
 * @param fileUrl - Full S3 URL or just the key
 * @returns S3 key
 */
export function extractKeyFromUrl(fileUrl: string): string | null {
  try {
    // If it's already just a key (doesn't start with http)
    if (!fileUrl.startsWith("http")) {
      return fileUrl
    }

    // Parse URL and extract pathname
    const url = new URL(fileUrl)
    // Remove leading slash
    const key = url.pathname.substring(1)

    return key
  } catch (error) {
    console.error("Failed to extract key from URL:", error)
    return null
  }
}

/**
 * Construct public URL from S3 key
 * @param key - S3 key
 * @returns Public URL
 */
function getPublicUrl(key: string): string {
  // If custom endpoint is provided
  if (process.env.S3_AWS_S3_ENDPOINT) {
    return `${process.env.S3_AWS_S3_ENDPOINT}/${BUCKET_NAME}/${key}`
  }

  // Standard AWS S3 URL format
  // Use AWS_S3_REGION_NAME to match the S3Client configuration
  const region = process.env.S3_AWS_S3_REGION_NAME || process.env.S3_AWS_REGION
  if (!region) {
    throw new Error('AWS region is not configured. Please set S3_AWS_S3_REGION_NAME or S3_AWS_REGION environment variable.')
  }

  return `https://${BUCKET_NAME}.s3.${region}.amazonaws.com/${key}`
}

// ============================================
// BATCH OPERATIONS
// ============================================

/**
 * Upload multiple files to S3
 * @param files - Array of file data with metadata
 * @returns Array of public URLs
 */
export async function uploadMultipleToS3(
  files: Array<{
    buffer: Buffer
    fileName: string
    contentType: string
  }>,
  folder: string = "assistants"
): Promise<string[]> {
  try {
    const uploadPromises = files.map((file) =>
      uploadToS3(file.buffer, file.fileName, file.contentType, folder)
    )

    const urls = await Promise.all(uploadPromises)
    console.log(`✅ ${files.length} files uploaded successfully`)

    return urls
  } catch (error) {
    console.error("❌ Batch Upload Error:", error)
    throw new Error(`Failed to upload multiple files: ${error instanceof Error ? error.message : "Unknown error"}`)
  }
}

/**
 * Delete multiple files from S3
 * @param fileUrls - Array of file URLs or keys to delete
 */
export async function deleteMultipleFromS3(fileUrls: string[]): Promise<void> {
  try {
    const deletePromises = fileUrls.map((url) => deleteFromS3(url))
    await Promise.all(deletePromises)

    console.log(`✅ ${fileUrls.length} files deleted successfully`)
  } catch (error) {
    console.error("❌ Batch Delete Error:", error)
    throw new Error(`Failed to delete multiple files: ${error instanceof Error ? error.message : "Unknown error"}`)
  }
}

// ============================================
// FILE SIZE VALIDATION
// ============================================

/**
 * Validate file size before upload
 * @param buffer - File buffer
 * @param maxSizeMB - Maximum file size in megabytes
 * @returns true if valid, throws error if too large
 */
export function validateFileSize(buffer: Buffer, maxSizeMB: number = 5): boolean {
  const fileSizeMB = buffer.length / (1024 * 1024)

  if (fileSizeMB > maxSizeMB) {
    throw new Error(`File size (${fileSizeMB.toFixed(2)}MB) exceeds maximum allowed size (${maxSizeMB}MB)`)
  }

  return true
}

// ============================================
// CONTENT TYPE VALIDATION
// ============================================

/**
 * Validate content type
 * @param contentType - MIME type
 * @param allowedTypes - Array of allowed MIME types
 * @returns true if valid, throws error if invalid
 */
export function validateContentType(
  contentType: string,
  allowedTypes: string[]
): boolean {
  if (!allowedTypes.includes(contentType)) {
    throw new Error(`Content type ${contentType} is not allowed. Allowed types: ${allowedTypes.join(", ")}`)
  }

  return true
}

// ============================================
// SAFE UPLOAD (NON-BLOCKING)
// ============================================

/**
 * Safe upload that won't block the main operation if AWS fails
 * Returns { success: boolean, url?: string, error?: string }
 * Use this for non-critical uploads like images where the main operation should succeed even if upload fails
 */
export async function safeUploadToS3(
  file: Buffer,
  fileName: string,
  contentType: string,
  folder: string = "assistants"
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const url = await uploadToS3(file, fileName, contentType, folder)
    return { success: true, url }
  } catch (error: any) {
    console.error("⚠️ Safe upload failed (non-blocking):", error.message)
    return {
      success: false,
      error: error.message || "Unknown upload error"
    }
  }
}