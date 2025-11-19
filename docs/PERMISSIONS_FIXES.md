# Permission System Fixes

## Issues Identified and Resolved

### 1. ✅ Fixed: Access Field Values

**Problem**: 
- Code was using `access: 'editor'` for shared users
- Schema allows "viewer", "editor", "admin" but description says it should be "admin" or "user"

**Solution**:
- Changed shared users to use `access: 'user'` (limited access with custom permissions)
- Owners, creators, and purchasers get `access: 'admin'` (full access with all permissions)
- Removed confusion between assistant-level and artifact-level permissions

**Files Changed**:
- `app/actions/assistant.action.ts` - Line 446: Changed from `'editor'` to `'user'`
- `app/actions/contact.action.ts` - Line 132: Changed from `"editor"` to `"user"`

### 2. ✅ Fixed: Permission Field Names Standardization

**Problem**:
- Code uses inconsistent field names: `contact` vs `contacts`, `newsFeed` vs `newsfeed`, `artifact` vs `artifacts`

**Solution**:
- Standardized to match description: `chat`, `contacts`, `messenger`, `newsfeed`, `artifacts`
- Added conversion logic in `assistant.action.ts` to map from frontend format to standardized format

**Files Changed**:
- `app/actions/assistant.action.ts` - Lines 436-440: Added conversion from frontend format to standardized permission array

### 3. ✅ Confirmed: No specialAssistant Field

**Problem**:
- Description mentioned `specialAssistant: false` for marketplace visibility
- This field doesn't exist in the schema

**Solution**:
- Removed any references to `specialAssistant` (none found in codebase)
- Marketplace visibility is determined by:
  - `public: true`
  - Not owned by viewing user
  - Not already purchased by viewing user

### 4. ✅ Documented: Permission System

**Created**:
- `docs/PERMISSIONS_SYSTEM.md` - Comprehensive documentation of the permission system

## Current Permission System

### Assistant-Level Permissions (AssistantContact)

**Access Types**:
- `'admin'` - Full control (owner, creator, purchaser)
  - All permissions: `['chat', 'contacts', 'messenger', 'newsfeed', 'artifacts']`
- `'user'` - Limited access (shared users)
  - Custom permissions based on what owner grants

**Available Permissions**:
1. `'chat'` - Access to chat with the assistant
2. `'contacts'` - Access to manage contacts
3. `'messenger'` - Access to messenger/chat features
4. `'newsfeed'` - Access to news feed posts
5. `'artifacts'` - Access to artifacts

### Artifact-Level Permissions (ArtifactPermission)

**Access Types**:
- `'admin'` - Full control over the artifact
- `'editor'` - Can edit the artifact
- `'viewer'` - Can only view the artifact

## Next Steps

1. **Update Schema Documentation**: Ensure Prisma schema comments reflect the correct access values
2. **Add Permission Helpers**: Create utility functions to check permissions consistently
3. **Update Marketplace Queries**: Ensure marketplace queries don't reference non-existent fields
4. **Add Permission Validation**: Create middleware/helpers to validate permissions before allowing actions

## Testing Checklist

- [ ] Verify shared users get `access: 'user'` with correct permissions
- [ ] Verify owners/creators/purchasers get `access: 'admin'` with all permissions
- [ ] Verify permission field names are standardized (`contacts`, `newsfeed`, `artifacts`)
- [ ] Verify marketplace shows only `public: true` assistants (not owned/purchased by user)
- [ ] Verify permission checks work correctly for all features (chat, contacts, messenger, newsfeed, artifacts)

