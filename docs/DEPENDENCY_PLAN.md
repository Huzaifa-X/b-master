# Dependency Management Plan

## Current Dependency Audit

### ✅ Already Installed & Required (Keep All)

#### Core Validation & Parsing
```json
"js-yaml": "^4.1.0"           // ✅ Parse YAML schemas - KEEP
"zod": "^4.1.12"              // ✅ Schema validation - KEEP (alternative to Ajv)
```

#### HTTP & API
```json
"openai": "^6.8.1"            // ✅ OpenAI SDK - KEEP
"node-fetch": "^3.3.2"        // ✅ HTTP requests - KEEP
"axios": "^1.13.2"            // ✅ Alternative HTTP client - KEEP
```

#### Utilities
```json
"nanoid": "^5.1.6"            // ✅ Generate OAuth state tokens - KEEP
"bcryptjs": "^3.0.3"          // ✅ Password hashing (not for API keys) - KEEP
```

#### Next.js & React
```json
"next": "15.5.4"              // ✅ Framework - KEEP
"react": "19.1.0"             // ✅ UI library - KEEP
"@radix-ui/*"                 // ✅ UI components - KEEP (for forms)
```

**Status:** All current dependencies are useful. Zero bloat!

---

## 📦 Dependencies to ADD

### Option 1: Minimal Additions (Recommended)
**Philosophy:** Use what you already have (Zod), add only essentials

```bash
npm install openapi-schema-validator
```

**Why:**
- ✅ You already have `zod` for validation (no need for Ajv)
- ✅ You already have `@radix-ui` components (build custom forms)
- ✅ `openapi-schema-validator` ensures OpenAPI 3.x compliance

**Total new dependencies:** 1

---

### Option 2: Full Stack (If You Want Pre-built Solutions)
**Philosophy:** Use industry-standard tools for everything

```bash
# Schema validation
npm install ajv ajv-formats

# OpenAPI validation
npm install openapi-schema-validator

# UI form generation
npm install @rjsf/core @rjsf/validator-ajv8 @rjsf/utils @rjsf/mui

# Optional: Better OpenAPI parsing
npm install swagger-parser
```

**Total new dependencies:** 8

---

## 🎯 Recommended Approach: Option 1 (Minimal)

### Why Stick with What You Have?

1. **Zod vs Ajv:**
   - You already use Zod across the codebase
   - Zod has better TypeScript integration
   - Can validate JSON Schema too
   - No need to add Ajv

2. **Custom Forms vs RJSF:**
   - You already have `@radix-ui` components
   - Building custom forms gives you full control
   - RJSF adds 200KB+ to bundle
   - Your forms are simple (text inputs, selects)

3. **Your Parser vs Swagger-Parser:**
   - Your `openapi-parser.ts` is excellent
   - Swagger-parser is 500KB+
   - Adds unnecessary complexity

---

## 📥 INSTALLATION COMMANDS

### Minimal Install (Recommended)
```bash
npm install openapi-schema-validator
npm install --save-dev @types/js-yaml  # Already installed ✅
```

### Full Install (If you choose Option 2)
```bash
npm install ajv ajv-formats openapi-schema-validator @rjsf/core @rjsf/validator-ajv8 @rjsf/utils
```

---

## 🔧 Usage Examples

### Using openapi-schema-validator
```typescript
// lib/openapi-validator.ts
import { OpenAPISchemaValidator } from 'openapi-schema-validator'

export function validateOpenAPIv3(schema: any) {
  const validator = new OpenAPISchemaValidator({ version: 3 })
  const result = validator.validate(schema)

  if (result.errors.length > 0) {
    return {
      valid: false,
      errors: result.errors.map(e => e.message)
    }
  }

  return { valid: true, errors: [] }
}
```

---

### Using Zod for Parameter Validation (Instead of Ajv)
```typescript
// lib/parameter-validator.ts
import { z } from 'zod'

export function createZodSchemaFromJsonSchema(jsonSchema: any) {
  // Convert JSON Schema to Zod schema
  if (jsonSchema.type === 'string') {
    let schema = z.string()
    if (jsonSchema.minLength) schema = schema.min(jsonSchema.minLength)
    if (jsonSchema.maxLength) schema = schema.max(jsonSchema.maxLength)
    if (jsonSchema.pattern) schema = schema.regex(new RegExp(jsonSchema.pattern))
    return schema
  }

  if (jsonSchema.type === 'number') {
    let schema = z.number()
    if (jsonSchema.minimum) schema = schema.min(jsonSchema.minimum)
    if (jsonSchema.maximum) schema = schema.max(jsonSchema.maximum)
    return schema
  }

  // Add other types...
  return z.any()
}

export function validateWithZod(value: any, jsonSchema: any) {
  const zodSchema = createZodSchemaFromJsonSchema(jsonSchema)
  return zodSchema.safeParse(value)
}
```

---

### Custom Form Generation (Using Your Radix UI)
```typescript
// components/JsonSchemaForm.tsx
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'

interface JsonSchemaFormProps {
  schema: {
    type: 'object'
    properties: Record<string, any>
    required?: string[]
  }
  values: Record<string, any>
  onChange: (name: string, value: any) => void
}

export function JsonSchemaForm({ schema, values, onChange }: JsonSchemaFormProps) {
  return (
    <div className="space-y-4">
      {Object.entries(schema.properties).map(([name, propSchema]) => {
        const isRequired = schema.required?.includes(name)

        if (propSchema.type === 'string' && propSchema.enum) {
          return (
            <div key={name}>
              <Label>{name} {isRequired && '*'}</Label>
              <Select
                value={values[name]}
                onValueChange={(val) => onChange(name, val)}
              >
                {propSchema.enum.map((opt: string) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </Select>
              {propSchema.description && (
                <p className="text-sm text-muted-foreground">{propSchema.description}</p>
              )}
            </div>
          )
        }

        return (
          <div key={name}>
            <Label>{name} {isRequired && '*'}</Label>
            <Input
              type={propSchema.type === 'number' ? 'number' : 'text'}
              value={values[name] || ''}
              onChange={(e) => onChange(name, e.target.value)}
              placeholder={propSchema.example}
            />
            {propSchema.description && (
              <p className="text-sm text-muted-foreground">{propSchema.description}</p>
            )}
          </div>
        )
      })}
    </div>
  )
}
```

---

## 📊 Bundle Size Impact

### Minimal Approach (Option 1)
| Package | Size (gzipped) | Impact |
|---------|----------------|--------|
| openapi-schema-validator | ~15KB | Minimal |
| **Total Added** | **~15KB** | ✅ Excellent |

### Full Approach (Option 2)
| Package | Size (gzipped) | Impact |
|---------|----------------|--------|
| ajv | ~50KB | Medium |
| ajv-formats | ~10KB | Small |
| openapi-schema-validator | ~15KB | Small |
| @rjsf/* | ~200KB | Large |
| **Total Added** | **~275KB** | ⚠️ Significant |

**Recommendation:** Option 1 keeps bundle lean

---

## 🗑️ Dependencies to REMOVE

### None! ✅

All current dependencies serve a purpose:
- No duplicate validation libraries (Zod is your only validator)
- No unused UI frameworks
- No deprecated packages
- No security vulnerabilities detected

**Action Required:** Zero removals needed

---

## 🔒 Security Audit

### Encryption
**Current:** ✅ You have custom encryption (`lib/encryption.ts`)
**Status:** Good, but ensure it's used everywhere

### Environment Variables Required
```env
ENCRYPTION_KEY=<32-byte-hex-string>  # For encrypting API keys/secrets
```

### No Additional Crypto Libraries Needed
- ✅ Node.js crypto module is sufficient
- ✅ Your AES-256-GCM implementation is secure

---

## 📋 Implementation Checklist

### Phase 1: Install Essentials
- [ ] `npm install openapi-schema-validator`
- [ ] Verify `js-yaml` and `zod` are working
- [ ] No removals needed

### Phase 2: Update Code
- [ ] Add OpenAPI 3.x validation using `openapi-schema-validator`
- [ ] Keep using Zod for parameter validation
- [ ] Build custom form components with Radix UI

### Phase 3: Testing
- [ ] Test schema validation with various OpenAPI files
- [ ] Test parameter validation with edge cases
- [ ] Test form generation with complex schemas

---

## 🎯 Final Recommendation

**Install Only:**
```bash
npm install openapi-schema-validator
```

**Why This is Enough:**
1. ✅ Zod handles all validation needs (better than Ajv for TypeScript)
2. ✅ Radix UI handles all form needs (no need for RJSF)
3. ✅ Your parser is excellent (no need for swagger-parser)
4. ✅ Minimal bundle size increase (~15KB)
5. ✅ Maintains consistency with existing codebase

**Total Investment:** 1 new package, 15KB added

---

## 📝 Alternative: Pure Zod Approach (Zero Dependencies!)

If you want to avoid even `openapi-schema-validator`, you can validate OpenAPI structure with Zod:

```typescript
import { z } from 'zod'

const OpenAPIv3Schema = z.object({
  openapi: z.string().regex(/^3\./),
  info: z.object({
    title: z.string(),
    version: z.string(),
  }),
  paths: z.record(z.any()),
  servers: z.array(z.object({
    url: z.string()
  })).optional(),
  components: z.object({
    securitySchemes: z.record(z.any()).optional()
  }).optional()
})

export function validateOpenAPI(schema: any) {
  return OpenAPIv3Schema.safeParse(schema)
}
```

**Total new dependencies:** 0 ✅

---

## 🏁 Summary

| Approach | New Deps | Bundle Size | Complexity | Recommendation |
|----------|----------|-------------|------------|----------------|
| **Pure Zod** | 0 | 0KB | Low | ⭐⭐⭐ Good |
| **Minimal** | 1 | 15KB | Low | ⭐⭐⭐⭐⭐ Best |
| **Full Stack** | 8 | 275KB | High | ⭐⭐ Overkill |

**Winner:** Minimal Approach (add `openapi-schema-validator` only)
