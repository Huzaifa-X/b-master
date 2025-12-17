"use client"

import { usePresignedImage } from "@/hooks/usePresignedImage"
import Image from "next/image"
import { ComponentProps } from "react"

interface PresignedNextImageProps extends Omit<ComponentProps<typeof Image>, 'src'> {
  src?: string | null
  enabled?: boolean
}

/**
 * Next.js Image component that automatically uses presigned URLs for S3 images
 */
export function PresignedNextImage({
  src,
  enabled = true,
  ...props
}: PresignedNextImageProps) {
  const presignedUrl = usePresignedImage(src, enabled)

  return <Image src={presignedUrl || "/bmaster-icon.png"} {...props} />
}
