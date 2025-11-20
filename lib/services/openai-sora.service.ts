import { openai } from "@/lib/openai"

export interface SoraVideoParams {
  prompt: string
  model?: "sora-2" | "sora-2-pro"
  size?: "1280x720" | "1920x1080" | "720x1280"
  seconds?: "8" | "16"
  inputReference?: Buffer // Optional first frame image
}

export interface SoraVideoResult {
  videoId: string
  videoBuffer: Buffer
  thumbnailBuffer: Buffer
  metadata: {
    duration: number
    size: string
    model: string
    prompt: string
  }
}

class OpenAISoraService {
  /**
   * Generate video with OpenAI Sora
   */
  async generateVideo(params: SoraVideoParams): Promise<SoraVideoResult> {
    console.log(`[Sora] Starting video generation with prompt: "${params.prompt}"`)

    try {
      // Step 1: Create video generation job
      const video = await openai.videos.create({
        model: params.model || "sora-2",
        prompt: params.prompt,
        size: (params.size || "1280x720") as any,
        seconds: (params.seconds || "8") as any,
        ...(params.inputReference && {
          input_reference: params.inputReference
        })
      } as any)

      console.log(`[Sora] Video job created: ${video.id}`)

      // Step 2: Poll until completed
      let progress = 0
      let updatedVideo = video
      const maxAttempts = 60 // 3 minutes max (60 * 3 seconds)
      let attempts = 0

      while ((updatedVideo.status === "in_progress" || updatedVideo.status === "queued") && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 3000)) // Poll every 3 seconds
        
        updatedVideo = await openai.videos.retrieve(video.id)
        progress = updatedVideo.progress || 0
        attempts++
        
        console.log(`[Sora] Progress: ${progress}% - Status: ${updatedVideo.status} (Attempt ${attempts}/${maxAttempts})`)
        
        if (updatedVideo.status === "failed") {
          throw new Error(`Video generation failed: ${updatedVideo.error?.message || "Unknown error"}`)
        }
        
        if (updatedVideo.status === "completed") {
          break
        }
      }

      if (updatedVideo.status !== "completed") {
        throw new Error(`Video generation timed out or failed. Final status: ${updatedVideo.status}`)
      }

      console.log(`[Sora] Video generation completed: ${video.id}`)

      // Step 3: Download video content
      const videoContent = await openai.videos.downloadContent(video.id, { variant: "video" })
      const videoBuffer = Buffer.from(await videoContent.arrayBuffer())

      // Step 4: Download thumbnail
      const thumbnailContent = await openai.videos.downloadContent(video.id, { variant: "thumbnail" })
      const thumbnailBuffer = Buffer.from(await thumbnailContent.arrayBuffer())

      console.log(`[Sora] Video downloaded: ${videoBuffer.length} bytes, Thumbnail: ${thumbnailBuffer.length} bytes`)

      return {
        videoId: video.id,
        videoBuffer,
        thumbnailBuffer,
        metadata: {
          duration: parseInt(params.seconds || "8"),
          size: params.size || "1280x720",
          model: params.model || "sora-2",
          prompt: params.prompt
        }
      }
    } catch (error) {
      console.error("[Sora] Error generating video:", error)
      throw error instanceof Error ? error : new Error("Failed to generate video with Sora")
    }
  }

  /**
   * Generate video with remix (modify existing video)
   */
  async remixVideo(videoId: string, prompt: string, params?: {
    model?: "sora-2" | "sora-2-pro"
    size?: "1280x720" | "1920x1080" | "720x1280"
    seconds?: "8" | "16"
  }): Promise<SoraVideoResult> {
    console.log(`[Sora] Remixing video ${videoId} with prompt: "${prompt}"`)

    try {
      // Create remix job
      const video = await openai.videos.remix(videoId, {
        prompt,
        ...(params?.model && { model: params.model }),
        size: (params?.size || "1280x720") as any,
        seconds: (params?.seconds || "8") as any
      } as any)

      console.log(`[Sora] Remix job created: ${video.id}`)

      // Poll until completed (same logic as generateVideo)
      let progress = 0
      let updatedVideo = video
      const maxAttempts = 60
      let attempts = 0

      while ((updatedVideo.status === "in_progress" || updatedVideo.status === "queued") && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 3000))
        
        updatedVideo = await openai.videos.retrieve(video.id)
        progress = updatedVideo.progress || 0
        attempts++
        
        console.log(`[Sora] Remix progress: ${progress}% - Status: ${updatedVideo.status}`)
        
        if (updatedVideo.status === "failed") {
          throw new Error(`Video remix failed: ${updatedVideo.error?.message || "Unknown error"}`)
        }
        
        if (updatedVideo.status === "completed") {
          break
        }
      }

      if (updatedVideo.status !== "completed") {
        throw new Error(`Video remix timed out. Final status: ${updatedVideo.status}`)
      }

      // Download video and thumbnail
      const videoContent = await openai.videos.downloadContent(video.id, { variant: "video" })
      const videoBuffer = Buffer.from(await videoContent.arrayBuffer())

      const thumbnailContent = await openai.videos.downloadContent(video.id, { variant: "thumbnail" })
      const thumbnailBuffer = Buffer.from(await thumbnailContent.arrayBuffer())

      return {
        videoId: video.id,
        videoBuffer,
        thumbnailBuffer,
        metadata: {
          duration: parseInt(params?.seconds || "8"),
          size: params?.size || "1280x720",
          model: params?.model || "sora-2",
          prompt
        }
      }
    } catch (error) {
      console.error("[Sora] Error remixing video:", error)
      throw error instanceof Error ? error : new Error("Failed to remix video with Sora")
    }
  }
}

const openAISoraService = new OpenAISoraService()
export default openAISoraService

