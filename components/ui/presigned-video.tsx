"use client"

import { usePresignedImage } from "@/hooks/usePresignedImage"
import { ComponentProps } from "react"

interface PresignedVideoProps extends Omit<ComponentProps<"video">, "src"> {
  src?: string | null
  enabled?: boolean
}

/**
 * Video component that automatically uses presigned URLs for S3-hosted videos
 */
export function PresignedVideo({
  src,
  enabled = true,
  ...props
}: PresignedVideoProps) {
  const presignedUrl = usePresignedImage(src, enabled)

  return (
    <video
      src={presignedUrl || undefined}
      controls
      preload="metadata"
      {...props}
    />
  )
}
