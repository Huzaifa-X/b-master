import prisma from "@/lib/prisma"

/**
 * Delete user messages that don't have a corresponding assistant response
 * Only deletes messages older than the grace period to avoid deleting messages
 * that are still waiting for streaming to complete
 * 
 * @param chatId - The chat ID to clean up
 * @param gracePeriodMinutes - Don't delete messages newer than this (default: 2 minutes)
 */
export async function cleanupOrphanedMessages(
  chatId: string,
  gracePeriodMinutes: number = 2
) {
  const chatIdInt = parseInt(chatId)

  if (isNaN(chatIdInt)) {
    console.error("[Cleanup] Invalid chatId:", chatId)
    return { deleted: 0, error: "Invalid chatId" }
  }

  try {
    // Different timeouts for different statuses
    const pendingTimeout = 2 * 60 * 1000 // 2 minutes for pending messages
    const processingTimeout = 10 * 60 * 1000 // 10 minutes for processing (research mode)
    
    const pendingCutoff = new Date(Date.now() - pendingTimeout)
    const processingCutoff = new Date(Date.now() - processingTimeout)

    console.log(`[Cleanup] Checking for abandoned messages in chat ${chatId}`)

    // Find truly abandoned messages:
    // 1. PENDING messages older than 2 minutes without response
    // 2. PROCESSING messages older than 10 minutes without response
    const abandonedMessages = await prisma.assistantUserChatMessage.findMany({
      where: {
        assistantUserChatId: chatIdInt,
        role: 'user',
        OR: [
          {
            // PENDING messages older than 2 minutes
            status: 'PENDING',
            createdAt: { lt: pendingCutoff }
          },
          {
            // PROCESSING messages older than 10 minutes (research timeout)
            status: 'PROCESSING',
            createdAt: { lt: processingCutoff }
          }
        ]
      },
      select: {
        id: true,
        status: true,
        createdAt: true
      }
    })

    if (abandonedMessages.length === 0) {
      console.log(`[Cleanup] No abandoned messages found`)
      return { deleted: 0 }
    }

    // Check each abandoned message to ensure it has no response
    const orphanedUserMessages: number[] = []

    for (const msg of abandonedMessages) {
      // Check if there's an assistant message after it
      const allMessagesAfter = await prisma.assistantUserChatMessage.findMany({
        where: {
          assistantUserChatId: chatIdInt,
          role: 'assistant',
          createdAt: { gt: msg.createdAt },
          message: {
            not: null
          }
        },
        select: {
          id: true,
          message: true
        }
      })
      
      // Filter out empty messages
      const hasResponse = allMessagesAfter.some(m => m.message && m.message.trim().length > 0)

      if (!hasResponse) {
        orphanedUserMessages.push(msg.id)
        console.log(`[Cleanup] Found abandoned ${msg.status} message from ${msg.createdAt.toISOString()}`)
      }
    }

    // Delete orphaned messages
    if (orphanedUserMessages.length > 0) {
      await prisma.assistantUserChatMessage.deleteMany({
        where: {
          id: { in: orphanedUserMessages }
        }
      })
      console.log(`[Cleanup] ✅ Deleted ${orphanedUserMessages.length} abandoned messages from chat ${chatId}`)
    } else {
      console.log(`[Cleanup] No orphaned messages found`)
    }

    return { deleted: orphanedUserMessages.length }
  } catch (error) {
    console.error("[Cleanup] Error:", error)
    return { deleted: 0, error: String(error) }
  }
}

