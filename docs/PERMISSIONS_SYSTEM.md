# Permission System Documentation

## Overview

This document describes the permission system for assistants and artifacts in the B Master platform.

## 1. Assistant-Level Permissions (AssistantContact)

### Access Types

The `access` field in `AssistantContact` determines the user's access level:

- **`'admin'`** - Full control
  - Automatically assigned to: assistant creator, assistant owner, users who purchased the assistant
  - Has ALL permissions: `['chat', 'contacts', 'messenger', 'newsfeed', 'artifacts']`
  - Can: Create, update, delete, share, manage everything

- **`'user'`** - Limited access
  - Assigned when sharing with specific users
  - Permissions: Custom array based on what the owner grants
  - Can: Only access features based on granted permissions

### Available Permissions

When sharing an assistant, you can grant any combination of these permissions:

1. **`'chat'`** - Access to chat with the assistant
2. **`'contacts'`** - Access to manage contacts
3. **`'messenger'`** - Access to messenger/chat features
4. **`'newsfeed'`** - Access to news feed posts
5. **`'artifacts'`** - Access to artifacts

### Permission Storage

Permissions are stored as a JSON string array in the `permissions` field:
- Example: `'["chat", "newsfeed", "artifacts"]'`
- Admin users: `'["chat", "contacts", "messenger", "newsfeed", "artifacts"]'` (all permissions)

### Permission Determination Flow

1. Check if user is owner → Admin access (all permissions)
2. Check if user purchased → Admin access (all permissions)
3. Check if user has shared permission → User access with custom permissions
4. Otherwise → No access

## 2. Artifact-Level Permissions (ArtifactPermission)

### Access Types

1. **`'admin'`** - Full control over the artifact
2. **`'editor'`** - Can edit the artifact
3. **`'viewer'`** - Can only view the artifact

### Who Can Manage Artifact Permissions

- Artifact creator
- Assistant owner

## 3. Marketplace Visibility

An assistant appears in the marketplace when **ALL** of these conditions are met:

1. ✅ `public: true` - Must be marked as public
2. ✅ Not owned by the viewing user - Won't show their own assistants
3. ✅ Not already purchased by the viewing user - Won't show assistants they already own

**Note:** There is NO `specialAssistant` field in the schema. All assistants with `public: true` that meet the above criteria will appear in the marketplace.

## 4. Permission Flow Examples

### Scenario 1: Creating an Assistant

- Creator gets `access: 'admin'` with all permissions automatically
- If shared during creation, shared users get `access: 'user'` with specified permissions
- If `public: true`, it appears in the marketplace

### Scenario 2: Sharing an Assistant

- Owner shares with User A: `["chat", "newsfeed"]`
- Owner shares with User B: `["chat", "contacts", "messenger", "newsfeed", "artifacts"]`
- Each user gets only their assigned permissions

### Scenario 3: Purchasing from Marketplace

- Buyer purchases assistant → Gets `access: 'admin'` automatically
- Receives all permissions regardless of original sharing settings
- Purchase grants full admin rights

### Scenario 4: Updating Permissions

- Owner can update shared user permissions
- Old permissions are removed and replaced with new ones
- Only newly added users receive notifications

## 5. Special Cases

### System Admins

- Users with `role: 'admin'` (if implemented) get admin access to any assistant
- Bypass permission checks

## 6. Database Schema

### AssistantContact Table

```prisma
model AssistantContact {
  id          Int      @id @default(autoincrement())
  assistantId BigInt
  userId      BigInt
  description String?  @db.Text
  role        String?  @db.VarChar(255)
  access      String   @default("admin") @db.VarChar(50) // 'admin' or 'user'
  permissions String?  @db.Text // JSON: ["chat", "contacts", "messenger", "newsfeed", "artifacts"]
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

### ArtifactPermission Table

```prisma
model ArtifactPermission {
  id          Int      @id @default(autoincrement())
  artifactId  Int
  userId      BigInt
  access      String   @db.VarChar(50) // 'admin', 'editor', or 'viewer'
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

## 7. Permission Validation

When checking permissions:

1. **Owner Check**: `assistant.userId === userId` → Admin access
2. **Purchase Check**: `AssistantPurchase` exists for user → Admin access
3. **Shared Check**: `AssistantContact` exists → User access with custom permissions
4. **Default**: No access

## 8. Common Issues & Solutions

### Issue: Access field values don't match description

**Problem**: Schema allows "viewer", "editor", "admin" but description says "admin" or "user"

**Solution**: 
- Use `'admin'` for full access (owner, creator, purchaser)
- Use `'user'` for limited access (shared users)
- Remove "viewer" and "editor" from assistant-level permissions (these are for artifacts only)

### Issue: Permission field names inconsistent

**Problem**: Code uses different names than description

**Solution**: Standardize to:
- `chat`
- `contacts` (not `contact`)
- `messenger`
- `newsfeed` (not `newsFeed`)
- `artifacts` (not `artifact`)

### Issue: specialAssistant field doesn't exist

**Problem**: Description mentions `specialAssistant: false` for marketplace visibility

**Solution**: Remove this check. Marketplace visibility is determined by:
- `public: true`
- Not owned by viewing user
- Not already purchased by viewing user

