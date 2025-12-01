import { notFound } from "next/navigation"
import { Metadata } from "next"
import { SharedChatView } from "@/components/shared/shared-chat-view"
import prisma from "@/lib/prisma"

interface SharePageProps {
  params: {
    shareableId: string
  }
}

async function getSharedChat(shareableId: string) {
  try {
    if (!shareableId) {
      return { error: "Shareable ID is required", status: 400 }
    }

    // Find the chat by shareableId
    const chat = await prisma.assistantUserChat.findFirst({
      where: {
        shareableId,
        deletedAt: null, // Only show non-deleted chats
      },
      include: {
        assistant: {
          select: {
            id: true,
            name: true,
            instructions: true,
            description: true,
          }
        },
        messages: {
          where: {
            message: { not: null }, // Only include messages with content
          },
          orderBy: {
            createdAt: 'asc'
          },
          select: {
            id: true,
            role: true,
            message: true,
            documents: true,
            createdAt: true,
          }
        }
      }
    })

    if (!chat) {
      return { error: "Shared conversation not found", status: 404 }
    }

    // Transform the data for the frontend
    const sharedChat = {
      id: chat.id,
      topic: chat.topic,
      chatType: chat.chatType,
      createdAt: chat.createdAt.toISOString(), // Send as ISO string
      createdAtFormatted: chat.createdAt.toLocaleDateString('en-US'), // Consistent formatting
      shareableId: chat.shareableId,
      assistant: chat.assistant ? {
        name: chat.assistant.name,
        description: chat.assistant.description,
      } : null,
      messages: chat.messages.map(msg => ({
        id: msg.id.toString(),
        role: msg.role,
        content: msg.message || "",
        createdAt: msg.createdAt.toISOString(), // Send as ISO string
        createdAtFormatted: msg.createdAt.toLocaleString('en-US'), // Consistent formatting
        attachments: msg.documents ? JSON.parse(msg.documents) : undefined,
      }))
    }

    return { chat: sharedChat }
  } catch (error) {
    console.error("[getSharedChat] Error:", error)
    return { error: "Internal server error", status: 500 }
  }
}

// Generate metadata for SEO
export async function generateMetadata({ params }: SharePageProps): Promise<Metadata> {
  try {
    const { shareableId } = await params
    const result = await getSharedChat(shareableId)

    if (result.error || !result.chat) {
      return {
        title: "Shared Conversation Not Found",
        description: "The shared conversation you're looking for doesn't exist or has been removed."
      }
    }

    const chat = result.chat
    return {
      title: `Shared: ${chat.topic}`,
      description: `View this shared conversation${chat.assistant ? ` with ${chat.assistant.name}` : ''}`,
      openGraph: {
        title: `Shared: ${chat.topic}`,
        description: `View this shared conversation${chat.assistant ? ` with ${chat.assistant.name}` : ''}`,
        type: "website",
      },
    }
  } catch (error) {
    return {
      title: "Shared Conversation",
      description: "View this shared conversation"
    }
  }
}

export default async function SharePage({ params }: SharePageProps) {
  try {
    const { shareableId } = await params
    const result = await getSharedChat(shareableId)

    if (result.error || !result.chat) {
      notFound()
    }

    return <SharedChatView chat={result.chat} />
  } catch (error) {
    console.error("Error loading shared chat:", error)
    notFound()
  }
}
