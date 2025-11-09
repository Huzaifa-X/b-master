"use server"

import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { UserContact } from "@/types/user"

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
