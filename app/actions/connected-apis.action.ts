// app/actions/connected-apis.action.ts
"use server"

import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"

export interface ConnectedAPIOption {
  assistantId: string
  assistantName: string
}

/**
 * Get all assistants owned by the current user that have an active API configuration.
 * Optionally exclude a specific assistantId (e.g., the one currently open).
 */
export async function getUserAssistantsWithAPI(excludeAssistantId?: string): Promise<{
  success: boolean
  data: ConnectedAPIOption[]
  error?: string
}> {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return { success: false, data: [], error: "Unauthorized" }
    }

    const userId = BigInt(session.user.id)

    const assistants = await prisma.assistant.findMany({
      where: {
        userId,
        deletedAt: null,
        isDeleted: false,
        apiConfiguration: {
          isActive: true,
        },
      },
      select: {
        id: true,
        name: true,
      },
      orderBy: { createdAt: "desc" },
    })

    const data: ConnectedAPIOption[] = assistants.map((a) => ({
      assistantId: a.id.toString(),
      assistantName: a.name,
    }))

    return { success: true, data }
  } catch (error) {
    console.error("[getUserAssistantsWithAPI] Error:", error)
    return { success: false, data: [], error: "Failed to fetch API assistants" }
  }
}
