"use server"

import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import pusher from "@/lib/pusher"
import notificationService from "@/lib/services/notifactionService"

// Types
export interface EditArtifactParams {
  artifactId: string
  instructions: string
  selectedUsers: Array<{ id: string; name: string; email: string }>
  apiConfigs: Array<{ key: string; value: string }>
  selectedChatId?: string | null
}

export interface EditArtifactResult {
  success: boolean
  error?: string
  artifact?: {
    id: string
    name: string
  }
}

export interface GetArtifactEditDataResult {
  success: boolean
  error?: string
  data?: {
    id: string
    name: string
    category: string
    instructions: string
    permissions: 'private' | 'team' | 'public'
    selectedUsers: Array<{ id: string; name: string; email: string; image: string | null }>
    apiConfigs: Array<{ key: string; value: string }>
    selectedChatId?: string | null
  }
}

/**
 * Get artifact data for editing
 */
export async function getArtifactEditData(artifactId: string): Promise<GetArtifactEditDataResult> {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return {
        success: false,
        error: 'Authentication required'
      }
    }

    const userId = BigInt(session.user.id)
    const artifactIdInt = parseInt(artifactId)

    // Fetch artifact with permissions
    const artifact = await prisma.assistantArtifact.findFirst({
      where: {
        id: artifactIdInt,
        deletedAt: null,
        OR: [
          { userId: userId }, // User is the owner
          {
            permissions: {
              some: {
                userId: userId,
                access: {
                  in: ['EDITOR', 'ADMIN'] // Only editors and admins can edit
                }
              }
            }
          }
        ]
      },
      include: {
        permissions: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true
              }
            }
          }
        }
      }
    })

    if (!artifact) {
      return {
        success: false,
        error: 'Artifact not found or you do not have edit permissions'
      }
    }

    // Determine permissions type
    let permissionsType: 'private' | 'team' | 'public' = 'private'
    if (artifact.isPublic) {
      permissionsType = 'public'
    } else if (artifact.permissions.length > 0) {
      permissionsType = 'team'
    }

    // Format selected users
    const selectedUsers = artifact.permissions.map(perm => ({
      id: perm.user.id.toString(),
      name: perm.user.name || 'Unknown User',
      email: perm.user.email,
      image: perm.user.image
    }))

    // Format API configs
    const apiConfigs: Array<{ key: string; value: string }> = []
    if (artifact.apiKeys) {
      const keys = artifact.apiKeys as Record<string, string>
      Object.entries(keys).forEach(([key, value]) => {
        apiConfigs.push({ key, value })
      })
    }

    // Extract selectedChatId from tools field
    let selectedChatId: string | null = null
    if (artifact.tools && typeof artifact.tools === 'object') {
      const toolsData = artifact.tools as any
      if (toolsData.selectedChatId) {
        selectedChatId = toolsData.selectedChatId
      }
    }

    return {
      success: true,
      data: {
        id: artifact.id.toString(),
        name: artifact.name || 'Untitled Artifact',
        category: artifact.category || 'others',
        instructions: artifact.instructions || '',
        permissions: permissionsType,
        selectedUsers,
        apiConfigs,
        selectedChatId
      }
    }

  } catch (error) {
    console.error('Error fetching artifact edit data:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch artifact data'
    }
  }
}

/**
 * Update artifact (instructions, contacts, APIs only)
 */
export async function updateArtifact({
  artifactId,
  instructions,
  selectedUsers,
  apiConfigs,
  selectedChatId
}: EditArtifactParams): Promise<EditArtifactResult> {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return {
        success: false,
        error: 'Authentication required'
      }
    }

    const userId = BigInt(session.user.id)
    const artifactIdInt = parseInt(artifactId)

    // Verify permissions
    const artifact = await prisma.assistantArtifact.findFirst({
      where: {
        id: artifactIdInt,
        deletedAt: null,
        OR: [
          { userId: userId }, // User is the owner
          {
            permissions: {
              some: {
                userId: userId,
                access: {
                  in: ['EDITOR', 'ADMIN']
                }
              }
            }
          }
        ]
      },
      include: {
        assistant: true
      }
    })

    if (!artifact) {
      return {
        success: false,
        error: 'Artifact not found or you do not have edit permissions'
      }
    }

    // Prepare API keys JSON
    const apiKeysJson = apiConfigs.length > 0
      ? apiConfigs.reduce((acc, config) => {
        if (config.key && config.value) {
          acc[config.key] = config.value
        }
        return acc
      }, {} as Record<string, string>)
      : null

    // Prepare tools JSON with selectedChatId
    const toolsJson = selectedChatId ? { selectedChatId: selectedChatId } : undefined

    // Update artifact in a transaction
    await prisma.$transaction(async (tx) => {
      // Update artifact
      await tx.assistantArtifact.update({
        where: { id: artifactIdInt },
        data: {
          instructions,
          apiKeys: apiKeysJson || undefined,
          tools: toolsJson ? (toolsJson as any) : undefined,
          updatedAt: new Date()
        }
      })

      // Update permissions (remove old ones, add new ones)
      console.log('[Artifact Update] Updating permissions - Selected users:', selectedUsers.length)
      
      // First, remove all existing permissions
      await tx.artifactPermission.deleteMany({
        where: { artifactId: artifactIdInt }
      })
      console.log('[Artifact Update] Old permissions deleted')

      // Add new permissions if there are selected users
      if (selectedUsers.length > 0) {
        console.log('[Artifact Update] Creating new permissions for users:', selectedUsers.map(u => u.email))
        await tx.artifactPermission.createMany({
          data: selectedUsers.map(user => ({
            userId: BigInt(user.id),
            assistantId: artifact.assistantId,
            artifactId: artifactIdInt,
            access: 'EDITOR' // Default access level
          }))
        })
        console.log('[Artifact Update] ✅ New artifact permissions created successfully')
      } else {
        console.log('[Artifact Update] ⚠️ No users selected, no permissions created')
      }
    })

    // Get updater information
    const updater = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true
      }
    })

    // Send notifications to all users with access (excluding the updater)
    if (selectedUsers.length > 0 && updater) {
      console.log('[Artifact Update] Sending notifications to shared users...')
      
      // Filter out the current user
      const usersToNotify = selectedUsers.filter(user => user.id !== updater.id.toString())

      for (const user of usersToNotify) {
        try {
          await notificationService.createNotification({
            userId: user.id,
            title: '📝 Artifact Updated',
            message: `${updater.name || 'Someone'} updated "${artifact.name || 'Untitled Artifact'}"`,
            type: 'artifact_updated',
            relatedId: artifact.id.toString(),
            relatedType: 'artifact',
            data: {
              artifactId: artifact.id.toString(),
              artifactName: artifact.name || 'Untitled Artifact',
              updaterId: updater.id.toString(),
              updaterName: updater.name,
              assistantId: artifact.assistantId.toString()
            }
          })
          console.log(`[Artifact Update] Notification sent to user: ${user.email}`)
        } catch (notificationError) {
          console.error(`[Artifact Update] Failed to send notification to ${user.email}:`, notificationError)
          // Continue with other users even if one fails
        }
      }

      // Trigger Pusher event for real-time updates
      try {
        await pusher.trigger('global-artifact-updates', 'artifact-updated', {
          artifactId: artifact.id.toString(),
          artifactName: artifact.name || 'Untitled Artifact',
          updaterId: updater.id.toString(),
          updaterName: updater.name,
          assistantId: artifact.assistantId.toString(),
          timestamp: new Date().toISOString(),
          notifiedUserIds: usersToNotify.map(u => u.id)
        })
        console.log('[Artifact Update] Pusher event triggered for artifact update')
      } catch (pusherError) {
        console.error('[Artifact Update] Pusher error:', pusherError)
        // Don't fail the request if Pusher fails
      }
    }

    return {
      success: true,
      artifact: {
        id: artifact.id.toString(),
        name: artifact.name || 'Untitled Artifact'
      }
    }

  } catch (error) {
    console.error('Error updating artifact:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update artifact'
    }
  }
}
