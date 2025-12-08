/**
 * Assistant Permission Helper
 * 
 * This module provides utilities to check user permissions for assistants.
 * It enforces the permission system where:
 * - Owners, creators, and purchasers get 'admin' access with all permissions
 * - Shared users get 'user' access with custom permissions
 */

import prisma from '@/lib/prisma';

export type AssistantPermission = 'chat' | 'contacts' | 'messenger' | 'newsfeed' | 'artifacts';
export type AssistantAccess = 'admin' | 'user' | 'none';

export interface AssistantPermissionResult {
  hasAccess: boolean;
  access: AssistantAccess;
  permissions: AssistantPermission[];
  isOwner: boolean;
  isPurchaser: boolean;
  isShared: boolean;
}

/**
 * Get user's access level and permissions for an assistant
 */
export async function getUserAssistantPermissions(
  assistantId: bigint,
  userId: bigint
): Promise<AssistantPermissionResult> {
  // Check if user is the owner
  const assistant = await prisma.assistant.findUnique({
    where: { id: assistantId },
    select: {
      userId: true,
    },
  });

  if (!assistant) {
    return {
      hasAccess: false,
      access: 'none',
      permissions: [],
      isOwner: false,
      isPurchaser: false,
      isShared: false,
    };
  }

  const isOwner = assistant.userId === userId;

  // If owner, return admin access with all permissions
  if (isOwner) {
    return {
      hasAccess: true,
      access: 'admin',
      permissions: ['chat', 'contacts', 'messenger', 'newsfeed', 'artifacts'],
      isOwner: true,
      isPurchaser: false,
      isShared: false,
    };
  }

  // Check if user purchased the assistant
  const purchase = await prisma.assistantPurchase.findFirst({
    where: {
      assistantId,
      buyerId: userId,
      status: 'completed',
    },
  });

  const isPurchaser = !!purchase;

  // If purchaser, return admin access with all permissions
  if (isPurchaser) {
    return {
      hasAccess: true,
      access: 'admin',
      permissions: ['chat', 'contacts', 'messenger', 'newsfeed', 'artifacts'],
      isOwner: false,
      isPurchaser: true,
      isShared: false,
    };
  }

  // Check if user has shared access
  const contact = await prisma.assistantContact.findFirst({
    where: {
      assistantId,
      userId,
    },
    select: {
      access: true,
      permissions: true,
    },
  });

  if (!contact) {
    return {
      hasAccess: false,
      access: 'none',
      permissions: [],
      isOwner: false,
      isPurchaser: false,
      isShared: false,
    };
  }

  // Parse permissions from JSON string
  let permissions: AssistantPermission[] = [];
  if (contact.permissions) {
    try {
      const parsed = JSON.parse(contact.permissions);
      if (Array.isArray(parsed)) {
        permissions = parsed.filter((p): p is AssistantPermission =>
          ['chat', 'contacts', 'messenger', 'newsfeed', 'artifacts'].includes(p)
        );
      }
    } catch (error) {
      console.error('Error parsing permissions:', error);
    }
  }

  // If access is 'admin', grant all permissions
  if (contact.access === 'admin') {
    permissions = ['chat', 'contacts', 'messenger', 'newsfeed', 'artifacts'];
  }

  return {
    hasAccess: true,
    access: contact.access === 'admin' ? 'admin' : 'user',
    permissions,
    isOwner: false,
    isPurchaser: false,
    isShared: true,
  };
}

/**
 * Check if user has a specific permission for an assistant
 */
export async function hasAssistantPermission(
  assistantId: bigint,
  userId: bigint,
  requiredPermission: AssistantPermission
): Promise<boolean> {
  const result = await getUserAssistantPermissions(assistantId, userId);
  
  if (!result.hasAccess) {
    return false;
  }

  // Admin access has all permissions
  if (result.access === 'admin') {
    return true;
  }

  // Check if user has the specific permission
  return result.permissions.includes(requiredPermission);
}

/**
 * Check if user can perform admin actions (owner, creator, or purchaser)
 */
export async function canPerformAdminActions(
  assistantId: bigint,
  userId: bigint
): Promise<boolean> {
  const result = await getUserAssistantPermissions(assistantId, userId);
  return result.access === 'admin';
}

/**
 * Check if user can add contacts (requires 'contacts' permission OR admin access)
 * Note: Only owners can actually add contacts, but we check permissions for consistency
 */
export async function canAddContacts(
  assistantId: bigint,
  userId: bigint
): Promise<boolean> {
  const result = await getUserAssistantPermissions(assistantId, userId);
  
  // Only owners can add contacts
  return result.isOwner;
}

/**
 * Check if user can create artifacts (requires 'artifacts' permission OR admin access)
 * Note: Only owners can actually create artifacts, but we check permissions for consistency
 */
export async function canCreateArtifacts(
  assistantId: bigint,
  userId: bigint
): Promise<boolean> {
  const result = await getUserAssistantPermissions(assistantId, userId);
  
  // Only owners can create artifacts
  return result.isOwner;
}

/**
 * Check if user can create newsfeed posts (requires 'newsfeed' permission OR admin access)
 */
export async function canCreateNewsfeedPosts(
  assistantId: bigint,
  userId: bigint
): Promise<boolean> {
  const result = await getUserAssistantPermissions(assistantId, userId);
  
  if (!result.hasAccess) {
    return false;
  }

  // Admin has all permissions
  if (result.access === 'admin') {
    return true;
  }

  // Check if user has 'newsfeed' permission
  return result.permissions.includes('newsfeed');
}

/**
 * Check if user can use chat (requires 'chat' permission OR admin access)
 */
export async function canUseChat(
  assistantId: bigint,
  userId: bigint
): Promise<boolean> {
  const result = await getUserAssistantPermissions(assistantId, userId);
  
  if (!result.hasAccess) {
    return false;
  }

  // Admin has all permissions
  if (result.access === 'admin') {
    return true;
  }

  // Check if user has 'chat' permission
  return result.permissions.includes('chat');
}

/**
 * Check if user can use messenger (requires 'messenger' permission OR admin access)
 */
export async function canUseMessenger(
  assistantId: bigint,
  userId: bigint
): Promise<boolean> {
  const result = await getUserAssistantPermissions(assistantId, userId);
  
  if (!result.hasAccess) {
    return false;
  }

  // Admin has all permissions
  if (result.access === 'admin') {
    return true;
  }

  // Check if user has 'messenger' permission
  return result.permissions.includes('messenger');
}

/**
 * Check if user can manage contacts (requires 'contacts' permission OR admin access)
 */
export async function canManageContacts(
  assistantId: bigint,
  userId: bigint
): Promise<boolean> {
  const result = await getUserAssistantPermissions(assistantId, userId);
  
  if (!result.hasAccess) {
    return false;
  }

  // Admin has all permissions
  if (result.access === 'admin') {
    return true;
  }

  // Check if user has 'contacts' permission
  return result.permissions.includes('contacts');
}

