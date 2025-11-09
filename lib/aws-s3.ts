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
    region: process.env.AWS_REGION!,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
    // Optional: Custom endpoint for S3-compatible services (DigitalOcean Spaces, MinIO, etc.)
    ...(process.env.AWS_S3_ENDPOINT && {
      endpoint: process.env.AWS_S3_ENDPOINT,
      forcePathStyle: true, // Required for some S3-compatible services
    }),
  })
  
  const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME!
  
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
        ACL: "public-read", // Make file publicly accessible
        // Optional: Add metadata
        Metadata: {
          uploadedAt: new Date().toISOString(),
        },
        // Optional: Add cache control
        CacheControl: "max-age=31536000", // Cache for 1 year
      })
  
      // Execute upload
      await s3Client.send(command)
  
      // Construct and return public URL
      const publicUrl = getPublicUrl(key)
      console.log(`✅ File uploaded successfully: ${publicUrl}`)
  
      return publicUrl
    } catch (error) {
      console.error("❌ S3 Upload Error:", error)
      throw new Error(`Failed to upload file to S3: ${error instanceof Error ? error.message : "Unknown error"}`)
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
    try {
      // Extract key from URL
      const key = extractKeyFromUrl(fileUrl)
  
      if (!key) {
        throw new Error("Invalid S3 URL or key")
      }
  
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
    } catch (error) {
      console.error("❌ S3 Delete Error:", error)
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
  function extractKeyFromUrl(fileUrl: string): string | null {
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
    if (process.env.AWS_S3_ENDPOINT) {
      return `${process.env.AWS_S3_ENDPOINT}/${BUCKET_NAME}/${key}`
    }
  
    // Standard AWS S3 URL format
    return `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`
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