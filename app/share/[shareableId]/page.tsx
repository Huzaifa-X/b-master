import { notFound } from "next/navigation"
import { Metadata } from "next"
import { SharedChatView } from "@/components/shared/shared-chat-view"
import prisma from "@/lib/prisma"

interface SharePageProps {
  params: {
    shareableId: string
  }
}

async function getSharedContent(shareableId: string) {
  try {
    if (!shareableId) {
      return { error: "Shareable ID is required", status: 400, type: null }
    }

    // First, try to find artifact by shareableId
    const artifact = await prisma.assistantArtifact.findFirst({
      where: {
        shareableId,
        deletedAt: null,
      },
      include: {
        assistant: {
          select: {
            id: true,
            name: true,
          }
        },
        activeVersion: {
          select: {
            code: true,
            versionNumber: true,
          }
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          }
        }
      }
    })

    if (artifact) {
      return {
        type: 'artifact',
        artifact: {
          id: artifact.id.toString(),
          name: artifact.name || 'Untitled Artifact',
          category: artifact.category || 'others',
          htmlContent: artifact.activeVersion?.code || '',
          instructions: artifact.instructions || '',
          createdAt: artifact.createdAt.toISOString(),
          assistant: artifact.assistant ? {
            id: artifact.assistant.id.toString(),
            name: artifact.assistant.name,
          } : null,
          creator: {
            name: artifact.user.name || 'Unknown User',
            email: artifact.user.email,
            image: artifact.user.image,
          }
        }
      }
    }

    // If not an artifact, try to find chat by shareableId
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
      return { error: "Shared content not found", status: 404, type: null }
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
        description: chat.assistant.description || undefined,
      } : null,
      messages: chat.messages.map(msg => ({
        id: msg.id.toString(),
        role: msg.role as "user" | "assistant",
        content: msg.message || "",
        createdAt: msg.createdAt.toISOString(), // Send as ISO string
        createdAtFormatted: msg.createdAt.toLocaleString('en-US'), // Consistent formatting
        attachments: msg.documents ? JSON.parse(msg.documents) as Array<{ name: string; url: string; type: string; size: number }> : undefined,
      }))
    }

    return { type: 'chat', chat: sharedChat }
  } catch (error) {
    console.error("[getSharedContent] Error:", error)
    return { error: "Internal server error", status: 500, type: null }
  }
}

// Generate metadata for SEO
export async function generateMetadata({ params }: SharePageProps): Promise<Metadata> {
  try {
    const { shareableId } = await params
    const result = await getSharedContent(shareableId)

    if (result.error) {
      return {
        title: "Shared Content Not Found",
        description: "The shared content you're looking for doesn't exist or has been removed."
      }
    }

    if (result.type === 'artifact' && result.artifact) {
      const artifact = result.artifact
      return {
        title: `Shared Artifact: ${artifact.name}`,
        description: `View this shared artifact${artifact.assistant ? ` from ${artifact.assistant.name}` : ''}`,
        openGraph: {
          title: `Shared Artifact: ${artifact.name}`,
          description: `View this shared artifact${artifact.assistant ? ` from ${artifact.assistant.name}` : ''}`,
          type: "website",
        },
      }
    }

    if (result.type === 'chat' && result.chat) {
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
    }

    return {
      title: "Shared Content",
      description: "View this shared content"
    }
  } catch (error) {
    return {
      title: "Shared Content",
      description: "View this shared content"
    }
  }
}

export default async function SharePage({ params }: SharePageProps) {
  try {
    const { shareableId } = await params
    const result = await getSharedContent(shareableId)

    if (result.error) {
      notFound()
    }

    // Render artifact view
    if (result.type === 'artifact' && result.artifact) {
      const artifact = result.artifact
      return (
        <div className="h-screen w-full flex flex-col bg-background">
          <div className="border-b px-4 py-3 bg-muted/50">
            <div className="max-w-7xl mx-auto">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-xl font-bold">{artifact.name}</h1>
                  <p className="text-sm text-muted-foreground">
                    Shared by {artifact.creator.name}
                    {artifact.assistant && ` • ${artifact.assistant.name}`}
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div className="flex-1 overflow-hidden">
            <iframe
              srcDoc={artifact.htmlContent}
              className="w-full h-full border-0"
              sandbox="allow-scripts allow-same-origin"
              title={artifact.name}
            />
          </div>
        </div>
      )
    }

    // Render chat view
    if (result.type === 'chat' && result.chat) {
      return <SharedChatView chat={result.chat} />
    }

    notFound()
  } catch (error) {
    console.error("Error loading shared content:", error)
    notFound()
  }
}
