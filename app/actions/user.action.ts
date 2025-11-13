"use server"

import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { UserContact } from "@/types/user"
import { uploadToS3, deleteFromS3, validateFileSize, validateContentType } from "@/lib/aws-s3"

// ============================================
// GET CURRENT USER PROFILE
// ============================================
export async function getCurrentUser() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return {
        success: false,
        error: "Authentication required",
      }
    }

    const userId = BigInt(session.user.id)

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        organization: true,
        gender: true,
        address: true,
        isEmailVerified: true,
        status: true,
        createdAt: true,
      },
    })

    if (!user) {
      return {
        success: false,
        error: "User not found",
      }
    }

    return {
      success: true,
      user: {
        id: user.id.toString(),
        name: user.name || "",
        email: user.email,
        image: user.image || "",
        organization: user.organization || "",
        gender: user.gender || "",
        address: user.address || "",
        isEmailVerified: user.isEmailVerified,
        status: user.status,
        createdAt: user.createdAt,
      },
    }
  } catch (error) {
    console.error("Error fetching current user:", error)
    return {
      success: false,
      error: "Failed to fetch user profile",
    }
  }
}

// ============================================
// UPDATE USER PROFILE
// ============================================
export async function updateUserProfile(data: {
  name?: string
  email?: string
  organization?: string
  gender?: string
  address?: string
  image?: string
}) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return {
        success: false,
        error: "Authentication required",
      }
    }

    const userId = BigInt(session.user.id)

    // Get current user data to check for old image
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { image: true },
    })

    let imageUrl = data.image

    // Handle image upload if new image is provided
    if (data.image && data.image.startsWith("data:")) {
      try {
        // Extract base64 data and metadata
        const matches = data.image.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/)
        
        if (!matches || matches.length !== 3) {
          return {
            success: false,
            error: "Invalid image format",
          }
        }

        const contentType = matches[1]
        const base64Data = matches[2]
        const buffer = Buffer.from(base64Data, "base64")

        // Validate file size (max 5MB)
        validateFileSize(buffer, 5)

        // Validate content type (only images)
        const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"]
        validateContentType(contentType, allowedTypes)

        // Generate filename
        const fileExtension = contentType.split("/")[1]
        const fileName = `profile-${userId}-${Date.now()}.${fileExtension}`

        // Upload to S3
        imageUrl = await uploadToS3(buffer, fileName, contentType, "profiles")

        // Delete old image if exists and is from S3
        if (currentUser?.image && currentUser.image.includes("s3")) {
          try {
            await deleteFromS3(currentUser.image)
          } catch (deleteError) {
            console.warn("Failed to delete old profile image:", deleteError)
            // Don't fail the update if old image deletion fails
          }
        }
      } catch (uploadError) {
        console.error("Error uploading profile image:", uploadError)
        return {
          success: false,
          error: uploadError instanceof Error ? uploadError.message : "Failed to upload image",
        }
      }
    }

    // Update user profile
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.email !== undefined && { email: data.email }),
        ...(data.organization !== undefined && { organization: data.organization }),
        ...(data.gender !== undefined && { gender: data.gender }),
        ...(data.address !== undefined && { address: data.address }),
        ...(imageUrl !== undefined && { image: imageUrl }),
      },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        organization: true,
        gender: true,
        address: true,
      },
    })

    return {
      success: true,
      message: "Profile updated successfully",
      user: {
        id: updatedUser.id.toString(),
        name: updatedUser.name || "",
        email: updatedUser.email,
        image: updatedUser.image || "",
        organization: updatedUser.organization || "",
        gender: updatedUser.gender || "",
        address: updatedUser.address || "",
      },
    }
  } catch (error) {
    console.error("Error updating user profile:", error)
    return {
      success: false,
      error: "Failed to update profile",
    }
  }
}

// ============================================
// GET AVAILABLE CONTACTS
// ============================================
export async function getAvailableContacts(): Promise<UserContact[]> {
  try {
    // Get current authenticated user
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      throw new Error("Authentication required")
    }

    const currentUserId = BigInt(session.user.id)

    // Fetch all users except the current user
    const users = await prisma.user.findMany({
      where: {
        id: {
          not: currentUserId
        },
        deletedAt: null, // Only active users
        status: "active" // Only active users
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
      orderBy: {
        name: 'asc' // Sort by name
      }
    })

    // Convert BigInt ids to strings for frontend compatibility
    return users.map(user => ({
      id: user.id.toString(),
      name: user.name,
      email: user.email,
    }))
  } catch (error) {
    console.error("Error fetching available contacts:", error)
    throw new Error("Failed to fetch available contacts")
  }
}




