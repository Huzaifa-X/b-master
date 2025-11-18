"use client"

import { AvatarImage } from "./avatar"
import { usePresignedImage } from "@/hooks/usePresignedImage"
import { ComponentProps } from "react"

interface PresignedAvatarImageProps extends Omit<ComponentProps<typeof AvatarImage>, 'src'> {
  src?: string | null
  enabled?: boolean
}

/**
 * AvatarImage component that automatically uses presigned URLs for S3 images
 */
export function PresignedAvatarImage({
  src,
  enabled = true,
  ...props
}: PresignedAvatarImageProps) {
  const presignedUrl = usePresignedImage(src, enabled)

  return <AvatarImage src={presignedUrl || undefined} {...props} />
}

