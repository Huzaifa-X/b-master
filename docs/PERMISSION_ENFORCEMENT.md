# Permission Enforcement Implementation

## Overview

This document describes the permission enforcement system implemented to secure backend actions and prevent unauthorized access.

## ✅ Implemented

### 1. Permission Helper Utility

**File**: `lib/permissions/assistant-permissions.ts`

Created a comprehensive permission checking utility with the following functions:

- `getUserAssistantPermissions()` - Get user's full access level and permissions
- `hasAssistantPermission()` - Check if user has a specific permission
- `canPerformAdminActions()` - Check if user can perform admin actions
- `canAddContacts()` - Check if user can add contacts (owners only)
- `canCreateArtifacts()` - Check if user can create artifacts (owners only)
- `canCreateNewsfeedPosts()` - Check if user can create newsfeed posts
- `canUseChat()` - Check if user can use chat features
- `canUseMessenger()` - Check if user can use messenger features
- `canManageContacts()` - Check if user can manage contacts

### 2. Updated Actions

#### ✅ Contact Actions (`app/actions/contact.action.ts`)
- **`addContact`**: Now checks if user is owner before allowing contact addition
- Uses `canAddContacts()` helper
- Only owners can add contacts (not shared users, even with 'contacts' permission)

#### ✅ Artifact Actions (`app/actions/artifact.action.ts`)
- **`createArtifact`**: Now checks if user is owner before allowing artifact creation
- Uses `canCreateArtifacts()` helper
- Only owners can create artifacts (not shared users, even with 'artifacts' permission)

## ⚠️ Still Needs Implementation

### 1. Newsfeed Actions

**Status**: Not found in codebase (may be in API routes or not yet implemented)

**Required Checks**:
- Create newsfeed post → Check `canCreateNewsfeedPosts()`
- Add comment → Check `canCreateNewsfeedPosts()` (or separate comment permission)
- Like post → Check `canCreateNewsfeedPosts()` or view permission

**Implementation Needed**:
```typescript
// When creating a newsfeed post
const { canCreateNewsfeedPosts } = await import('@/lib/permissions/assistant-permissions')
const canCreate = await canCreateNewsfeedPosts(assistantIdBigInt, userId)

if (!canCreate) {
  return {
    success: false,
    error: 'You do not have permission to create newsfeed posts'
  }
}
```

### 2. Chat/Messenger Actions

**Status**: May be handled by `@assistant-ui/react` library or API routes

**Required Checks**:
- Create chat → Check `canUseChat()`
- Send message → Check `canUseChat()`
- Use messenger → Check `canUseMessenger()`

**Implementation Needed**:
```typescript
// When creating/using chat
const { canUseChat } = await import('@/lib/permissions/assistant-permissions')
const canChat = await canUseChat(assistantIdBigInt, userId)

if (!canChat) {
  return {
    success: false,
    error: 'You do not have permission to use chat features'
  }
}
```

### 3. Contact Management Actions

**Status**: Partially implemented

**Required Checks**:
- Update contact → Check `canManageContacts()` OR owner
- Delete contact → Check owner only
- View contacts → Check `canManageContacts()` OR owner

**Current State**: `addContact` is secured, but update/delete may need checks

## Permission Rules Summary

| Action | Who Can Do It | Permission Check |
|--------|---------------|------------------|
| Add Contacts | Owner only | `canAddContacts()` → `isOwner` |
| Create Artifacts | Owner only | `canCreateArtifacts()` → `isOwner` |
| Create Newsfeed Posts | Owner OR user with 'newsfeed' permission | `canCreateNewsfeedPosts()` |
| Add Comments | Owner OR user with 'newsfeed' permission | `canCreateNewsfeedPosts()` |
| Use Chat | Owner OR user with 'chat' permission | `canUseChat()` |
| Use Messenger | Owner OR user with 'messenger' permission | `canUseMessenger()` |
| Manage Contacts | Owner OR user with 'contacts' permission | `canManageContacts()` |

## Access Level Hierarchy

1. **Owner** (`isOwner: true`)
   - Access: `'admin'`
   - Permissions: All (`['chat', 'contacts', 'messenger', 'newsfeed', 'artifacts']`)
   - Can: Everything

2. **Purchaser** (`isPurchaser: true`)
   - Access: `'admin'`
   - Permissions: All (`['chat', 'contacts', 'messenger', 'newsfeed', 'artifacts']`)
   - Can: Everything (same as owner)

3. **Shared User** (`isShared: true`)
   - Access: `'user'`
   - Permissions: Custom (based on what owner granted)
   - Can: Only features based on granted permissions

4. **No Access** (`hasAccess: false`)
   - Access: `'none'`
   - Permissions: None
   - Can: Nothing

## Next Steps

1. **Find and secure newsfeed actions**:
   - Search for newsfeed post creation endpoints
   - Add permission checks using `canCreateNewsfeedPosts()`
   - Add permission checks for comments

2. **Find and secure chat/messenger actions**:
   - Search for chat/messenger API routes
   - Add permission checks using `canUseChat()` and `canUseMessenger()`

3. **Review all assistant-related actions**:
   - Ensure all actions check permissions before allowing operations
   - Use the permission helper functions consistently

4. **Add permission checks to API routes**:
   - If newsfeed/chat are in API routes, add permission middleware
   - Ensure all routes validate permissions

5. **Test permission enforcement**:
   - Test that shared users can only access features they have permissions for
   - Test that owners/purchasers have full access
   - Test that unauthorized users are blocked

## Usage Example

```typescript
import { canCreateNewsfeedPosts } from '@/lib/permissions/assistant-permissions'

export async function createNewsfeedPost(data: { assistantId: string, content: string }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return { success: false, error: 'Authentication required' }
  }

  const userId = BigInt(session.user.id)
  const assistantIdBigInt = BigInt(data.assistantId)

  // Check permission
  const canCreate = await canCreateNewsfeedPosts(assistantIdBigInt, userId)
  if (!canCreate) {
    return {
      success: false,
      error: 'You do not have permission to create newsfeed posts for this assistant'
    }
  }

  // Proceed with creation...
}
```

