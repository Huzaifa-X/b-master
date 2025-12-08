import { uploadToS3 } from "@/lib/aws-s3"

export interface VideoUploadResult {
  videoUrl: string
  thumbnailUrl: string
}

class S3VideoUploadService {
  /**
   * Upload video and thumbnail to S3
   */
  async uploadVideo(
    videoBuffer: Buffer,
    thumbnailBuffer: Buffer,
    assistantId: string | bigint,
    artifactName: string
  ): Promise<VideoUploadResult> {
    try {
      console.log(`[S3 Video] Uploading video for artifact: ${artifactName}`)

      // Sanitize artifact name for file names
      const sanitizedName = artifactName.replace(/[^a-zA-Z0-9.-]/g, "_")
      const timestamp = Date.now()

      // Upload video
      const videoFileName = `${sanitizedName}-${timestamp}.mp4`
      const videoUrl = await uploadToS3(
        videoBuffer,
        videoFileName,
        "video/mp4",
        `artifacts/videos/${assistantId}`
      )

      console.log(`[S3 Video] Video uploaded: ${videoUrl}`)

      // Upload thumbnail
      const thumbnailFileName = `${sanitizedName}-${timestamp}-thumbnail.jpg`
      const thumbnailUrl = await uploadToS3(
        thumbnailBuffer,
        thumbnailFileName,
        "image/jpeg",
        `artifacts/videos/${assistantId}/thumbnails`
      )

      console.log(`[S3 Video] Thumbnail uploaded: ${thumbnailUrl}`)

      return {
        videoUrl,
        thumbnailUrl
      }
    } catch (error) {
      console.error("[S3 Video] Error uploading video:", error)
      throw error instanceof Error ? error : new Error("Failed to upload video to S3")
    }
  }

  /**
   * Upload remixed video (for updates)
   */
  async uploadRemixedVideo(
    videoBuffer: Buffer,
    thumbnailBuffer: Buffer,
    assistantId: string | bigint,
    artifactName: string,
    originalVideoId?: string
  ): Promise<VideoUploadResult> {
    // Same logic as uploadVideo, but can include original video ID in naming if needed
    return this.uploadVideo(videoBuffer, thumbnailBuffer, assistantId, artifactName)
  }
}

const s3VideoUploadService = new S3VideoUploadService()
export default s3VideoUploadService

