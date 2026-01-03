# Database Migration Plan

## Overview
This document outlines the database schema changes needed to implement the complete API tool management system.

---

## Current Schema Analysis

### AssistantApiConfiguration (Current)
```prisma
model AssistantApiConfiguration {
  id          Int    @id @default(autoincrement())
  assistantId BigInt @unique

  // Auth type
  authenticationType String @default("none") @db.VarChar(50)

  // API Key fields
  apiKey           String? @db.Text
  authType         String? @db.VarChar(50)
  customHeaderName String? @db.VarChar(255)

  // OAuth fields
  clientId            String? @db.VarChar(255)
  clientSecret        String? @db.Text
  authorizationUrl    String? @db.Text
  tokenUrl            String? @db.Text
  scope               String? @db.Text
  tokenExchangeMethod String? @db.VarChar(50)

  // Schema storage
  schemaText String? @db.Text
  schema     Json?

  // Metadata
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  assistant Assistant @relation(fields: [assistantId], references: [id], onDelete: Cascade)

  @@map("assistant_api_configurations")
}
```

**Issues:**
1. ❌ Missing `tools` field to store parsed tool definitions
2. ⚠️ OAuth fields are for client credentials only, not full user delegation
3. ⚠️ No token refresh mechanism

---

## Required Changes

### Migration 1: Add `tools` Field
**Goal:** Store parsed tool definitions to avoid re-parsing schema on every request

**Changes:**
```prisma
model AssistantApiConfiguration {
  // ... existing fields ...

  // NEW: Parsed tool definitions
  tools Json? // Array of tool objects with executor metadata

  // ... rest of fields ...
}
```

**Migration File:** `prisma/migrations/YYYYMMDD_add_tools_field/migration.sql`
```sql
-- AddToolsField
ALTER TABLE "assistant_api_configurations" ADD COLUMN "tools" JSONB;
```

**Tool Structure Example:**
```json
[
  {
    "name": "get_user",
    "type": "function",
    "description": "Get user by ID",
    "parameters": {
      "type": "object",
      "properties": {
        "id": { "type": "string", "description": "User ID" }
      },
      "required": ["id"]
    },
    "metadata": {
      "method": "GET",
      "path": "/users/{id}",
      "baseUrl": "https://api.example.com",
      "operationId": "getUser"
    },
    "auth": {
      "required": true,
      "location": "header"
    }
  }
]
```

---

### Migration 2: Add OAuth Token Storage (Optional)
**Goal:** Support full OAuth authorization code flow with refresh tokens

**Decision Point:** Do you need user-delegated OAuth or just client credentials?

#### Option A: Extend AssistantApiConfiguration (Simple)
**For:** Client credentials only (current approach)
**Add:**
```prisma
model AssistantApiConfiguration {
  // ... existing fields ...

  // OAuth runtime tokens (client credentials flow)
  accessToken  String?   @db.Text  // Encrypted, runtime only
  tokenExpiry  DateTime?           // When access token expires

  // ... rest of fields ...
}
```

**Migration:**
```sql
ALTER TABLE "assistant_api_configurations" ADD COLUMN "accessToken" TEXT;
ALTER TABLE "assistant_api_configurations" ADD COLUMN "tokenExpiry" TIMESTAMP;
```

---

#### Option B: Create Connector Model (Advanced)
**For:** User-delegated OAuth with refresh tokens
**Add New Model:**
```prisma
model Connector {
  id                  String   @id @default(cuid())
  userId              BigInt
  assistantId         BigInt?  // Optional: can be shared across assistants

  // Provider info
  provider            String   @db.VarChar(100)        // e.g., "google", "github"
  providerAccountId   String?  @db.VarChar(255)       // User's ID at provider
  providerEmail       String?  @db.VarChar(255)       // User's email at provider

  // OAuth tokens
  accessToken         String   @db.Text               // Encrypted
  refreshToken        String?  @db.Text               // Encrypted
  tokenExpiry         DateTime?

  // OAuth config (can override assistant config)
  clientId            String   @db.VarChar(255)
  clientSecret        String   @db.Text               // Encrypted
  authorizationUrl    String   @db.Text
  tokenUrl            String   @db.Text
  scope               String?  @db.Text

  // Status
  status              String   @default("active") @db.VarChar(50)
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt

  // Relations
  user      User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  assistant Assistant? @relation(fields: [assistantId], references: [id], onDelete: Cascade)

  @@unique([userId, provider, providerAccountId])
  @@index([userId, assistantId])
  @@map("connectors")
}

// Add to User model
model User {
  // ... existing fields ...
  connectors Connector[]
}

// Add to Assistant model
model Assistant {
  // ... existing fields ...
  connectors Connector[]
}
```

**Migration:**
```sql
-- CreateConnectorTable
CREATE TABLE "connectors" (
    "id" TEXT NOT NULL,
    "userId" BIGINT NOT NULL,
    "assistantId" BIGINT,
    "provider" VARCHAR(100) NOT NULL,
    "providerAccountId" VARCHAR(255),
    "providerEmail" VARCHAR(255),
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT,
    "tokenExpiry" TIMESTAMP,
    "clientId" VARCHAR(255) NOT NULL,
    "clientSecret" TEXT NOT NULL,
    "authorizationUrl" TEXT NOT NULL,
    "tokenUrl" TEXT NOT NULL,
    "scope" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL,

    CONSTRAINT "connectors_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "connectors_userId_provider_providerAccountId_key"
ON "connectors"("userId", "provider", "providerAccountId");

CREATE INDEX "connectors_userId_assistantId_idx"
ON "connectors"("userId", "assistantId");

ALTER TABLE "connectors" ADD CONSTRAINT "connectors_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "connectors" ADD CONSTRAINT "connectors_assistantId_fkey"
FOREIGN KEY ("assistantId") REFERENCES "assistants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
```

**Benefits:**
- ✅ Reusable OAuth connections across assistants
- ✅ User can manage their connections separately
- ✅ Supports refresh tokens
- ✅ Can track token expiry and auto-refresh

**Trade-offs:**
- ⚠️ More complex implementation
- ⚠️ Requires OAuth callback endpoints
- ⚠️ Need UI for connection management

---

## Recommended Migration Path

### Phase 1: Essential (Do Now)
**Migration:** Add `tools` field only
```bash
npx prisma migrate dev --name add_tools_field
```

**Why:**
- ✅ Immediate performance improvement (no re-parsing)
- ✅ Zero breaking changes
- ✅ Simple implementation
- ✅ Enables proper testing

**Schema Change:**
```prisma
model AssistantApiConfiguration {
  // ... all existing fields unchanged ...
  tools Json? // NEW
}
```

---

### Phase 2: OAuth Enhancement (Do Later if Needed)
**Decision:** Choose Option A or B based on requirements

**Option A** (Simple - Client Credentials Only):
```bash
npx prisma migrate dev --name add_oauth_tokens
```

**Option B** (Advanced - Full OAuth):
```bash
npx prisma migrate dev --name add_connector_model
```

---

## Migration Commands

### Step 1: Update schema.prisma
```prisma
// Add to AssistantApiConfiguration
model AssistantApiConfiguration {
  id          Int    @id @default(autoincrement())
  assistantId BigInt @unique
  authenticationType String @default("none") @db.VarChar(50)
  apiKey           String? @db.Text
  authType         String? @db.VarChar(50)
  customHeaderName String? @db.VarChar(255)
  clientId            String? @db.VarChar(255)
  clientSecret        String? @db.Text
  authorizationUrl    String? @db.Text
  tokenUrl            String? @db.Text
  scope               String? @db.Text
  tokenExchangeMethod String? @db.VarChar(50)
  schemaText String? @db.Text
  schema     Json?
  tools      Json?  // ← ADD THIS LINE
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  assistant Assistant @relation(fields: [assistantId], references: [id], onDelete: Cascade)

  @@map("assistant_api_configurations")
}
```

### Step 2: Run migration
```bash
npx prisma migrate dev --name add_tools_field
```

### Step 3: Generate Prisma client
```bash
npx prisma generate
```

### Step 4: Verify migration
```bash
npx prisma studio  # Visual inspection
```

---

## Data Migration Strategy

### Backfilling Existing Records
**Problem:** Existing assistants have `schema` but no `tools`

**Solution:** Create a migration script

```typescript
// scripts/backfill-tools.ts
import { PrismaClient } from '@prisma/client'
import { convertToOpenAITools } from '@/lib/openapi-tool-converter'

const prisma = new PrismaClient()

async function backfillTools() {
  const configs = await prisma.assistantApiConfiguration.findMany({
    where: {
      schema: { not: null },
      tools: null // Only process records without tools
    }
  })

  console.log(`Found ${configs.length} configurations to backfill`)

  for (const config of configs) {
    try {
      if (!config.schema) continue

      // Build auth config
      const authConfig = {
        type: config.authenticationType,
        apiKey: config.apiKey,
        authType: config.authType,
        customHeaderName: config.customHeaderName,
        clientId: config.clientId,
        clientSecret: config.clientSecret,
        tokenUrl: config.tokenUrl
      }

      // Convert schema to tools
      const tools = await convertToOpenAITools(config.schema as any, authConfig)

      // Store tools array (just the definitions, not executors)
      const toolDefinitions = tools.map(t => ({
        name: t.openaiTool.name,
        type: t.openaiTool.type,
        description: t.openaiTool.description,
        parameters: t.openaiTool.parameters,
        metadata: t.metadata
      }))

      await prisma.assistantApiConfiguration.update({
        where: { id: config.id },
        data: { tools: toolDefinitions }
      })

      console.log(`✅ Backfilled tools for assistant ${config.assistantId}`)
    } catch (error) {
      console.error(`❌ Failed for assistant ${config.assistantId}:`, error)
    }
  }

  console.log('Backfill complete!')
}

backfillTools()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
```

**Run:**
```bash
npx tsx scripts/backfill-tools.ts
```

---

## Rollback Plan

### If Migration Fails
```bash
# Rollback to previous migration
npx prisma migrate resolve --rolled-back <migration_name>

# Reset database (DANGER: loses all data)
npx prisma migrate reset
```

### Safe Rollback (Keep Data)
```sql
-- Remove tools column
ALTER TABLE "assistant_api_configurations" DROP COLUMN "tools";
```

---

## Testing Plan

### Before Migration
1. ✅ Backup database: `pg_dump database_name > backup.sql`
2. ✅ Test migration in development first
3. ✅ Verify existing data integrity

### After Migration
1. ✅ Run backfill script
2. ✅ Test tool loading with existing assistants
3. ✅ Test creating new assistant with tools
4. ✅ Verify JSON data structure in `tools` field
5. ✅ Test API calls with backfilled tools

---

## Performance Considerations

### Before (Without `tools` field)
- Schema parsed on every chat message ❌
- ~50-200ms parsing overhead per request
- Redundant computation

### After (With `tools` field)
- Schema parsed once on save ✅
- Tools loaded from DB in ~5ms
- 10-40x performance improvement

---

## Security Considerations

### Encryption Enforcement
**After adding `tools` field, ensure encryption is used:**

```typescript
// In app/actions/assistant.action.ts
import { encrypt } from '@/lib/encryption'

// Before saving
const apiConfigData = {
  apiKey: params.apiKey ? encrypt(params.apiKey) : null,  // ← ADD
  clientSecret: params.clientSecret ? encrypt(params.clientSecret) : null,  // ← ADD
  // ... other fields
}
```

### Field-Level Encryption Status
| Field | Should Encrypt | Currently Encrypted |
|-------|----------------|---------------------|
| apiKey | ✅ Yes | ❌ No (FIX NEEDED) |
| clientSecret | ✅ Yes | ❌ No (FIX NEEDED) |
| accessToken | ✅ Yes | N/A (not implemented) |
| refreshToken | ✅ Yes | N/A (not implemented) |
| schema | ❌ No | N/A |
| tools | ❌ No | N/A |

---

## Summary & Recommendations

### Immediate Action (Phase 1)
```bash
# 1. Add tools field
npx prisma migrate dev --name add_tools_field

# 2. Generate client
npx prisma generate

# 3. Run backfill
npx tsx scripts/backfill-tools.ts

# 4. Test
npm run dev
```

### Future Action (Phase 2 - If Needed)
- Decide on OAuth strategy (A or B)
- Implement Connector model if needed
- Add encryption enforcement

### Skip (Not Needed)
- ❌ No need to remove any existing fields
- ❌ No need to change data types
- ❌ No breaking changes to existing code

**Estimated Time:**
- Migration: 5 minutes
- Backfill script: 30 minutes
- Testing: 1 hour
- **Total: ~2 hours**
