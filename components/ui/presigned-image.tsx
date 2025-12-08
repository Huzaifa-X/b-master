"use client"

import { usePresignedImage } from "@/hooks/usePresignedImage"
import { ComponentProps } from "react"

interface PresignedImageProps extends Omit<ComponentProps<"img">, "src"> {
  src?: string | null
  enabled?: boolean
}

/**
 * Image component that automatically uses presigned URLs for S3 images
 */
export function PresignedImage({
  src,
  enabled = true,
  ...props
}: PresignedImageProps) {
  const presignedUrl = usePresignedImage(src, enabled)

  return <img src={presignedUrl || undefined} {...props} />
}

