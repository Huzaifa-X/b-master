"use server"

import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { uploadToS3, deleteFromS3 } from "@/lib/aws-s3"
import prisma from "@/lib/prisma"

export type UploadImageResult =
    | { success: true; url: string; message: string }
    | { success: false; error: string }

/**
 * Upload assistant image to S3
 */
export async function uploadAssistantImage(
    assistantId: string,
    imageData: string // Base64 data URL
): Promise<UploadImageResult> {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return { success: false, error: "Unauthorized" }
        }

        // Verify ownership
        const assistant = await prisma.assistant.findFirst({
            where: {
                id: BigInt(assistantId),
                userId: BigInt(session.user.id),
            },
        })

        if (!assistant) {
            return { success: false, error: "Assistant not found" }
        }

        // Validate base64 data
        if (!imageData.startsWith("data:image/")) {
            return { success: false, error: "Invalid image data" }
        }

        // Extract mime type and base64 data
        const matches = imageData.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/)
        if (!matches || matches.length !== 3) {
            return { success: false, error: "Invalid image format" }
        }

        const mimeType = matches[1]
        const base64Data = matches[2]

        // Validate mime type
        const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"]
        if (!allowedTypes.includes(mimeType)) {
            return {
                success: false,
                error: "Invalid image type. Allowed: JPEG, PNG, GIF, WEBP",
            }
        }

        // Convert base64 to buffer
        const buffer = Buffer.from(base64Data, "base64")

        // Validate file size (5MB max)
        if (buffer.length > 5 * 1024 * 1024) {
            return { success: false, error: "Image must be less than 5MB" }
        }

        // Generate filename
        const extension = mimeType.split("/")[1]
        const filename = `assistant-${assistantId}-${Date.now()}.${extension}`

        // Delete old image if exists
        if (assistant.image) {
            try {
                await deleteFromS3(assistant.image)
            } catch (error) {
                console.error("Failed to delete old image:", error)
                // Continue anyway - not critical
            }
        }

        // Upload to S3
        const imageUrl = await uploadToS3(buffer, filename, mimeType)

        // Update assistant with new image URL
        await prisma.assistant.update({
            where: { id: BigInt(assistantId) },
            data: { image: imageUrl },
        })

        return {
            success: true,
            url: imageUrl,
            message: "Image uploaded successfully",
        }
    } catch (error) {
        console.error("Upload image error:", error)
        return {
            success: false,
            error: "Failed to upload image",
        }
    }
}

/**
 * Delete assistant image from S3
 */
export async function deleteAssistantImage(
    assistantId: string
): Promise<UploadImageResult> {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return { success: false, error: "Unauthorized" }
        }

        // Verify ownership
        const assistant = await prisma.assistant.findFirst({
            where: {
                id: BigInt(assistantId),
                userId: BigInt(session.user.id),
            },
        })

        if (!assistant) {
            return { success: false, error: "Assistant not found" }
        }

        if (!assistant.image) {
            return { success: false, error: "No image to delete" }
        }

        // Delete from S3
        try {
            await deleteFromS3(assistant.image)
        } catch (error) {
            console.error("Failed to delete from S3:", error)
            // Continue to update DB anyway
        }

        // Update assistant - remove image URL
        await prisma.assistant.update({
            where: { id: BigInt(assistantId) },
            data: { image: null },
        })

        return {
            success: true,
            url: "",
            message: "Image deleted successfully",
        }
    } catch (error) {
        console.error("Delete image error:", error)
        return {
            success: false,
            error: "Failed to delete image",
        }
    }
}

/**
 * Update assistant image (replaces existing)
 */
export async function updateAssistantImage(
    assistantId: string,
    imageData: string
): Promise<UploadImageResult> {
    // This is essentially the same as uploadAssistantImage
    // since it automatically deletes the old image
    return uploadAssistantImage(assistantId, imageData)
}

/**
 * Get presigned URL for viewing an S3 image
 * @param imageUrl - Full S3 URL or S3 key
 * @param expiresIn - URL expiration time in seconds (default: 1 hour)
 * @returns Presigned URL or original URL if not an S3 URL
 */
export async function getPresignedImageUrl(
    imageUrl: string | null | undefined,
    expiresIn: number = 3600
): Promise<{ success: true; url: string } | { success: false; error: string }> {
    try {
        if (!imageUrl || typeof imageUrl !== "string") {
            return { success: false, error: "No image URL provided" }
        }

        // Validate URL format to prevent issues
        if (imageUrl.trim() === "") {
            return { success: false, error: "Empty image URL" }
        }

        // Import here to avoid circular dependencies
        const { getSignedS3Url, extractKeyFromUrl } = await import("@/lib/aws-s3")
        
        // Extract S3 key from URL
        const key = extractKeyFromUrl(imageUrl)
        
        if (!key) {
            // If it's not an S3 URL, return the original URL
            return { success: true, url: imageUrl }
        }

        // Generate presigned URL
        const presignedUrl = await getSignedS3Url(key, expiresIn)
        
        // Validate the presigned URL
        if (!presignedUrl || typeof presignedUrl !== "string") {
            console.error("Invalid presigned URL generated")
            return { success: true, url: imageUrl }
        }
        
        return { success: true, url: presignedUrl }
    } catch (error) {
        console.error("Get presigned image URL error:", error)
        // Fallback to original URL if presigned URL generation fails
        return { success: true, url: imageUrl || "" }
    }
}