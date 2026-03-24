"use client"

import { useState, useEffect, useRef } from "react"
import { getPresignedImageUrl } from "@/app/actions/image.actions"

/**
 * Hook to get presigned URL for an S3 image
 * @param imageUrl - S3 URL or regular image URL
 * @param enabled - Whether to fetch the presigned URL (default: true)
 * @returns Presigned URL or original URL
 */
export function usePresignedImage(
  imageUrl: string | null | undefined,
  enabled: boolean = true
): string | null {
  const [presignedUrl, setPresignedUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (!enabled || !imageUrl) {
      setPresignedUrl(imageUrl || null)
      return
    }

    // Validate imageUrl is a string
    if (typeof imageUrl !== "string" || imageUrl.trim() === "") {
      setPresignedUrl(null)
      return
    }

    // Check if it's already a presigned URL (contains signature query params)
    if (imageUrl.includes("X-Amz-Signature") || imageUrl.includes("AWSAccessKeyId")) {
      setPresignedUrl(imageUrl)
      return
    }

    // Check if it's a data URL (base64 image)
    if (imageUrl.startsWith("data:")) {
      setPresignedUrl(imageUrl)
      return
    }

    // Check if it's a relative path (starts with /)
    if (imageUrl.startsWith("/")) {
      setPresignedUrl(imageUrl)
      return
    }

    // Check if it's not an S3 URL (external URLs that aren't S3)
    const isS3Url = imageUrl.includes("s3") || imageUrl.includes("amazonaws.com")
    
    if (!isS3Url) {
      // For non-S3 URLs, use as-is
      setPresignedUrl(imageUrl)
      return
    }

    // Fetch presigned URL for S3 URLs with a small delay to prevent overwhelming the server
    setIsLoading(true)
    let cancelled = false

    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    // Add a small delay to batch requests and prevent conflicts with NextAuth
    timeoutRef.current = setTimeout(() => {
      if (cancelled) return

      getPresignedImageUrl(imageUrl)
        .then((result) => {
          if (cancelled) return
          
          if (result.success && result.url) {
            setPresignedUrl(result.url)
          } else {
            // Fallback to original URL
            setPresignedUrl(imageUrl)
          }
        })
        .catch((error) => {
          if (cancelled) return
          // Silently fail to prevent console spam - just use original URL
          setPresignedUrl(imageUrl)
        })
        .finally(() => {
          if (!cancelled) {
            setIsLoading(false)
          }
        })
    }, 50) // Small delay to batch requests

    return () => {
      cancelled = true
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [imageUrl, enabled])

  return presignedUrl
}

