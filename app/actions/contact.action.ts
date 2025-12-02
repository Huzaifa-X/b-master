"use server"

import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"

export interface AddContactParams {
  assistantId: string
  email: string
  role: "user" | "client" | "investor"
  description?: string
}

export interface UpdateContactParams {
  contactId: string
  role: "user" | "client" | "investor"
  description?: string
}

export interface ContactResult {
  success: boolean
  error?: string
  contact?: {
    id: string
    email: string
    name: string
    role: string
    description: string | null
  }
}

/**
 * Add a contact to an assistant by email
 * Checks if the user exists before adding
 */
export async function addContact({
  assistantId,
  email,
  role,
  description,
}: AddContactParams): Promise<ContactResult> {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return {
        success: false,
        error: "Authentication required",
      }
    }

    const userId = BigInt(session.user.id)
    const assistantIdBigInt = BigInt(assistantId)

    // Check if user can add contacts (only owners can add contacts)
    const { canAddContacts } = await import('@/lib/permissions/assistant-permissions')
    const canAdd = await canAddContacts(assistantIdBigInt, userId)

    if (!canAdd) {
      return {
        success: false,
        error: "Only the assistant owner can add contacts",
      }
    }

    // Check if user with this email exists
    const user = await prisma.user.findUnique({
      where: {
        email: email.trim().toLowerCase(),
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
    })

    if (!user) {
      return {
        success: false,
        error: "No user found with this email. Please enter a correct email address of a registered user.",
      }
    }

    const contactUserId = BigInt(user.id)

    // Check if user is trying to add the owner (owner is automatically included)
    const assistant = await prisma.assistant.findUnique({
      where: { id: assistantIdBigInt },
      select: { userId: true },
    })

    if (!assistant) {
      return {
        success: false,
        error: "Assistant not found",
      }
    }

    // Prevent adding the owner (owner is automatically included in AssistantContact)
    if (contactUserId === assistant.userId) {
      return {
        success: false,
        error: "The assistant owner is automatically included and cannot be added manually",
      }
    }

    // Check if contact already exists (including owner check)
    const existingContact = await prisma.assistantContact.findFirst({
      where: {
        assistantId: assistantIdBigInt,
        userId: contactUserId,
      },
    })

    if (existingContact) {
      return {
        success: false,
        error: "This user is already a contact for this assistant",
      }
    }

    // Create the contact
    const contact = await prisma.assistantContact.create({
      data: {
        assistantId: assistantIdBigInt,
        userId: contactUserId,
        role: role,
        description: description || null,
        access: "user", // Shared users get 'user' access (limited), not 'editor'
        permissions: JSON.stringify(["chat", "artifacts", "contacts", "newsfeed"]), // Default permissions
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    // Send notification to the shared user
    try {
      const notificationService = (await import('@/lib/services/notifactionService')).default
      await notificationService.notifyAssistantShared(
        assistantId,
        user.id.toString(),
        session.user.id
      )
    } catch (notificationError) {
      console.error('Error sending notification to shared user:', notificationError)
      // Don't fail the operation if notification fails
    }

    return {
      success: true,
      contact: {
        id: contact.id.toString(),
        email: contact.user.email,
        name: contact.user.name || "",
        role: contact.role || "user",
        description: contact.description,
      },
    }
  } catch (error) {
    console.error("Error adding contact:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to add contact",
    }
  }
}

/**
 * Update a contact's role and description
 */
export async function updateContact({
  contactId,
  role,
  description,
}: UpdateContactParams): Promise<ContactResult> {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return {
        success: false,
        error: "Authentication required",
      }
    }

    const userId = BigInt(session.user.id)
    const contactIdInt = parseInt(contactId)

    if (isNaN(contactIdInt)) {
      return {
        success: false,
        error: "Invalid contact ID",
      }
    }

    // Get the contact to find the assistant ID and check if it's the owner
    const contactRecord = await prisma.assistantContact.findUnique({
      where: { id: contactIdInt },
      include: {
        assistant: {
          select: {
            userId: true,
          },
        },
      },
    })

    if (!contactRecord) {
      return {
        success: false,
        error: "Contact not found",
      }
    }

    // Prevent updating the owner's contact record (owner is protected)
    if (contactRecord.userId === contactRecord.assistant.userId) {
      return {
        success: false,
        error: "The assistant owner's contact record cannot be modified",
      }
    }

    // Check if user is the assistant owner (only owners can update contacts)
    const { canPerformAdminActions } = await import('@/lib/permissions/assistant-permissions')
    const isOwner = await canPerformAdminActions(contactRecord.assistantId, userId)

    if (!isOwner) {
      return {
        success: false,
        error: "Only the assistant owner can update contacts",
      }
    }

    // Update the contact
    const updatedContact = await prisma.assistantContact.update({
      where: {
        id: contactIdInt,
      },
      data: {
        role: role,
        description: description || null,
        updatedAt: new Date(),
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    return {
      success: true,
      contact: {
        id: updatedContact.id.toString(),
        email: updatedContact.user.email,
        name: updatedContact.user.name || "",
        role: updatedContact.role || "user",
        description: updatedContact.description,
      },
    }
  } catch (error) {
    console.error("Error updating contact:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update contact",
    }
  }
}

/**
 * Delete a contact from an assistant
 */
export async function deleteContact(contactId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return {
        success: false,
        error: "Authentication required",
      }
    }

    const userId = BigInt(session.user.id)
    const contactIdInt = parseInt(contactId)

    if (isNaN(contactIdInt)) {
      return {
        success: false,
        error: "Invalid contact ID",
      }
    }

    // Get the contact to find the assistant ID and check if it's the owner
    const contactRecord = await prisma.assistantContact.findUnique({
      where: { id: contactIdInt },
      include: {
        assistant: {
          select: {
            userId: true,
          },
        },
      },
    })

    if (!contactRecord) {
      return {
        success: false,
        error: "Contact not found",
      }
    }

    // Prevent deleting the owner's contact record (owner is protected)
    if (contactRecord.userId === contactRecord.assistant.userId) {
      return {
        success: false,
        error: "The assistant owner's contact record cannot be deleted",
      }
    }

    // Check if user is the assistant owner (only owners can delete contacts)
    const { canPerformAdminActions } = await import('@/lib/permissions/assistant-permissions')
    const isOwner = await canPerformAdminActions(contactRecord.assistantId, userId)

    if (!isOwner) {
      return {
        success: false,
        error: "Only the assistant owner can delete contacts",
      }
    }

    // Delete the contact
    await prisma.assistantContact.delete({
      where: {
        id: contactIdInt,
      },
    })

    return {
      success: true,
    }
  } catch (error) {
    console.error("Error deleting contact:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete contact",
    }
  }
}

/**
 * Get all contacts for a specific assistant
 */
export async function getAssistantContacts(assistantId: string) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return {
        success: false,
        error: "Authentication required",
        contacts: [],
      }
    }

    const userId = BigInt(session.user.id)
    const assistantIdBigInt = BigInt(assistantId)

    // Verify user owns or has access to this assistant
    const assistant = await prisma.assistant.findFirst({
      where: {
        id: assistantIdBigInt,
        OR: [
          { userId: userId },
          {
            contacts: {
              some: {
                userId: userId,
              },
            },
          },
        ],
      },
    })

    if (!assistant) {
      return {
        success: false,
        error: "Assistant not found or access denied",
        contacts: [],
      }
    }

    // Fetch all contacts for this assistant (including owner - owner is now in AssistantContact)
    // Exclude the current user from the list
    const contacts = await prisma.assistantContact.findMany({
      where: {
        assistantId: assistantIdBigInt,
        userId: {
          not: userId, // Exclude current user
        },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            gender: true,
            address: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    // Get assistant owner ID for comparison
    const assistantOwnerId = assistant.userId

    const formattedContacts = contacts.map((contact) => ({
      id: contact.id.toString(),
      contactId: contact.id.toString(),
      userId: contact.user.id.toString(), // Include user ID for initiating chats
      name: contact.user.name || "Unknown User",
      email: contact.user.email,
      description: contact.description || "",
      avatar: contact.user.image || "",
      gender: contact.user.gender || "",
      role: (contact.role as "user" | "client" | "investor") || "user",
      address: contact.user.address || "",
      isOwner: contact.userId === assistantOwnerId, // Mark if this is the owner
      access: contact.access, // Include access level
      permissions: contact.permissions ? JSON.parse(contact.permissions) : [], // Include permissions
    }))

    return {
      success: true,
      contacts: formattedContacts,
    }
  } catch (error) {
    console.error("Error fetching assistant contacts:", error)
    return {
      success: false,
      error: "Failed to fetch contacts",
      contacts: [],
    }
  }
}

/**
 * Get all contacts across all assistants for the current user
 */
export async function getAllContacts() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return {
        success: false,
        error: "Authentication required",
        contacts: [],
      }
    }

    const userId = BigInt(session.user.id)

    // Fetch all contacts from assistants owned by or shared with the user
    const contacts = await prisma.assistantContact.findMany({
      where: {
        assistant: {
          OR: [
            { userId: userId },
            {
              contacts: {
                some: {
                  userId: userId,
                },
              },
            },
          ],
        },
        userId: {
          not: userId, // Exclude the current user
        },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            gender: true,
            address: true,
          },
        },
        assistant: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    // Deduplicate contacts by user ID - each user should appear only once
    const userContactMap = new Map<string, typeof contacts[0]>()

    // Keep the most recent contact for each user
    contacts.forEach((contact) => {
      const userId = contact.user.id.toString()
      const existing = userContactMap.get(userId)

      if (!existing || contact.createdAt > existing.createdAt) {
        userContactMap.set(userId, contact)
      }
    })

    // Convert to array and format
    const formattedContacts = Array.from(userContactMap.values()).map((contact) => ({
      id: contact.user.id.toString(), // Use user ID as the unique identifier
      contactId: contact.id.toString(),
      name: contact.user.name || "Unknown User",
      email: contact.user.email,
      description: contact.description || "",
      avatar: contact.user.image || "",
      gender: contact.user.gender || "",
      role: (contact.role as "user" | "client" | "investor") || "user",
      address: contact.user.address || "",
      assistantName: contact.assistant.name,
      assistantId: contact.assistant.id.toString(),
    }))

    return {
      success: true,
      contacts: formattedContacts,
    }
  } catch (error) {
    console.error("Error fetching all contacts:", error)
    return {
      success: false,
      error: "Failed to fetch contacts",
      contacts: [],
    }
  }
}

