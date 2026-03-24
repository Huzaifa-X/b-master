"use client"

import { ComponentProps, useState, useRef, useMemo } from "react"
import { Loader2, AlertCircle, RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"

interface PresignedVideoProps extends Omit<ComponentProps<"video">, "src"> {
  src?: string | null
  enabled?: boolean
}

/**
 * Extract S3 key from a full S3 URL
 */
function extractS3Key(url: string | null | undefined): string | null {
  if (!url) return null

  try {
    // If it's already a relative path or API route, return as-is
    if (url.startsWith("/")) return url

    // Check if it's an S3 URL
    const isS3Url = url.includes("s3") || url.includes("amazonaws.com")
    if (!isS3Url) return null

    // Parse URL and extract pathname (the S3 key)
    const parsed = new URL(url)
    // Remove leading slash from pathname
    return parsed.pathname.substring(1)
  } catch {
    return null
  }
}

/**
 * Video component that streams videos through an API proxy to avoid CORS issues
 */
export function PresignedVideo({
  src,
  enabled = true,
  className,
  ...props
}: PresignedVideoProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const [errorDetails, setErrorDetails] = useState<string>("")
  const videoRef = useRef<HTMLVideoElement>(null)

  // Convert S3 URL to proxy API URL
  const videoUrl = useMemo(() => {
    if (!src || !enabled) return null

    const s3Key = extractS3Key(src)
    if (s3Key) {
      // Use the proxy API route
      return `/api/media/${s3Key}`
    }

    // For non-S3 URLs, use directly
    return src
  }, [src, enabled])

  const handleRetry = () => {
    setHasError(false)
    setIsLoading(true)
    setErrorDetails("")
    // Force reload by updating the video source
    if (videoRef.current) {
      videoRef.current.load()
    }
  }

  // Show loading state while URL is being prepared
  if (!videoUrl) {
    return (
      <div className={cn("flex items-center justify-center bg-muted/50 rounded-lg aspect-video", className)}>
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // Show error state if video failed to load
  if (hasError) {
    return (
      <div className={cn("flex flex-col items-center justify-center bg-muted/50 rounded-lg aspect-video gap-2 p-4", className)}>
        <AlertCircle className="h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Failed to load video</p>
        {errorDetails && (
          <p className="text-xs text-muted-foreground/70">{errorDetails}</p>
        )}
        <button
          onClick={handleRetry}
          className="flex items-center gap-1 text-xs text-primary hover:underline mt-2"
        >
          <RefreshCw className="h-3 w-3" />
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="relative">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/50 rounded-lg z-10">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}
      <video
        ref={videoRef}
        key={videoUrl}
        src={videoUrl}
        controls
        playsInline
        preload="metadata"
        onLoadedData={() => setIsLoading(false)}
        onCanPlay={() => setIsLoading(false)}
        onError={(e) => {
          const video = e.currentTarget
          const error = video.error
          let details = ""

          if (error) {
            switch (error.code) {
              case MediaError.MEDIA_ERR_ABORTED:
                details = "Video loading was aborted"
                break
              case MediaError.MEDIA_ERR_NETWORK:
                details = "Network error while loading video"
                break
              case MediaError.MEDIA_ERR_DECODE:
                details = "Video format not supported (try MP4)"
                break
              case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
                details = "Video source not supported"
                break
              default:
                details = error.message || "Unknown error"
            }
          }

          console.error("Video load error:", {
            src: videoUrl,
            errorCode: error?.code,
            errorMessage: error?.message,
            details
          })

          setErrorDetails(details)
          setIsLoading(false)
          setHasError(true)
        }}
        className={cn(
          "w-full rounded-lg bg-black block",
          className,
          isLoading && "opacity-0"
        )}
        {...props}
      />
    </div>
  )
}
