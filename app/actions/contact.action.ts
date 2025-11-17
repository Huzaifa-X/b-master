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
                access: {
                  in: ["admin", "editor"],
                },
              },
            },
          },
        ],
      },
    })

    if (!assistant) {
      return {
        success: false,
        error: "Assistant not found or you don't have permission to add contacts",
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

    // Check if user is trying to add themselves
    if (contactUserId === userId) {
      return {
        success: false,
        error: "You cannot add yourself as a contact",
      }
    }

    // Check if contact already exists
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
        access: "editor", // Default access level
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

    // Verify user owns or has admin access to the assistant
    const contact = await prisma.assistantContact.findFirst({
      where: {
        id: contactIdInt,
        assistant: {
          OR: [
            { userId: userId },
            {
              contacts: {
                some: {
                  userId: userId,
                  access: "admin",
                },
              },
            },
          ],
        },
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

    if (!contact) {
      return {
        success: false,
        error: "Contact not found or you don't have permission to update it",
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

    // Verify user owns or has admin access to the assistant
    const contact = await prisma.assistantContact.findFirst({
      where: {
        id: contactIdInt,
        assistant: {
          OR: [
            { userId: userId },
            {
              contacts: {
                some: {
                  userId: userId,
                  access: "admin",
                },
              },
            },
          ],
        },
      },
    })

    if (!contact) {
      return {
        success: false,
        error: "Contact not found or you don't have permission to delete it",
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

    // Fetch all contacts for this assistant (excluding the current user/owner)
    const contacts = await prisma.assistantContact.findMany({
      where: {
        assistantId: assistantIdBigInt,
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
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    const formattedContacts = contacts.map((contact) => ({
      id: contact.id.toString(),
      contactId: contact.id.toString(),
      name: contact.user.name || "Unknown User",
      email: contact.user.email,
      description: contact.description || "",
      avatar: contact.user.image || "",
      gender: contact.user.gender || "",
      role: (contact.role as "user" | "client" | "investor") || "user",
      address: contact.user.address || "",
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

