import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ shareableId: string }> }
) {
  try {
    const { shareableId } = await params

    if (!shareableId) {
      return NextResponse.json(
        { error: "Shareable ID is required" },
        { status: 400 }
      )
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
      return NextResponse.json(
        { error: "Shared conversation not found" },
        { status: 404 }
      )
    }

    // Transform the data for the frontend
    const sharedChat = {
      id: chat.id,
      topic: chat.topic,
      chatType: chat.chatType,
      createdAt: chat.createdAt,
      assistant: chat.assistant ? {
        name: chat.assistant.name,
        description: chat.assistant.description,
      } : null,
      messages: chat.messages.map(msg => ({
        id: msg.id.toString(),
        role: msg.role,
        content: msg.message || "",
        createdAt: msg.createdAt,
        attachments: msg.documents ? JSON.parse(msg.documents) : undefined,
      }))
    }

    return NextResponse.json({ chat: sharedChat })

  } catch (error) {
    console.error("[API] Error fetching shared chat:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
