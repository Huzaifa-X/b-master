---
name: assistants-chat
description: "**On-demand workflow skill** for enhancing and refactoring the assistants chat system. Use when: working on chat streaming, AI SDK integration, message handling, intent detection, tool execution, attachment processing, or the complete chat conversation flow. Provides best practices for AI SDK patterns, model selection, prompt engineering, real-time updates, and performance optimization."
---

# Assistants Chat Development Skill

This skill provides best practices, patterns, and workflows for working with the assistants chat system — the core conversational AI interface built with Vercel AI SDK.

---

## When to Use This Skill

Invoke this skill when working on:

- 🔄 **Chat streaming** — AI SDK streamText, SSE, message chunks
- 🤖 **Model integration** — gpt-5-nano, gpt-4.1, gpt-5 configuration
- 💬 **Message handling** — Persistence, ordering, Pusher updates
- 🎯 **Intent detection** — Pattern-based + AI classification
- 🔧 **Tool execution** — Dynamic API tools, built-in tools
- 📎 **Attachment processing** — Images, PDFs, video, audio
- 🎨 **Canvas integration** — Auto-open, artifact creation
- ⚡ **Performance optimization** — Caching, model selection, streaming

---

## Core Architecture Overview

### Technology Stack

```
Frontend: Next.js 14 + React + TanStack Query + AI SDK
Backend: Next.js API Routes + Prisma ORM + PostgreSQL
AI: OpenAI GPT via AI SDK + Native OpenAI client
Real-time: Pusher (WebSocket fallback)
Storage: AWS S3 (attachments) + Upstage (document extraction)
```

### Key Directories

```
app/api/chat/          # Main chat API endpoints
components/assistants/ # Chat UI components
hooks/                 # Custom React hooks for chat
lib/                   # AI SDK config, tools, utilities
utils/prompts.ts       # System prompt management
```

---

## AI SDK Patterns

### 1. Model Selection Strategy

Use the right model for the job to optimize cost and latency:

```typescript
// Ultra-fast classification/extraction (100-300ms)
model: "gpt-5-nano"
// Use for: intent detection, entity extraction, simple Q&A

// Balanced coding tasks (500-1000ms)
model: "gpt-4.1-mini"
// Use for: medium complexity code, agent tasks

// Complex reasoning (1-3s)
model: "gpt-4.1"
// Use for: advanced coding, multi-tool orchestration

// Heavy lifting (2-5s)
model: "gpt-5"
// Use for: complex artifacts, multi-file refactoring
```

**Implementation:**
```typescript
import { ai_sdk_openai } from "@/lib/ai-sdk"

const result = streamText({
  model: ai_sdk_openai("gpt-5-nano"),
  // ...
})
```

### 2. Streaming Configuration

Always use AI SDK's streamText for chat responses:

```typescript
const result = streamText({
  model: ai_sdk_openai(model),
  system: systemPrompt,              // Full context prompt
  messages: conversationMessages,     // UIMessage[] format
  tools: toolSet,                    // Dynamic tools
  maxSteps: 10,                      // Multi-step reasoning
  temperature: 0.7,                  // Creativity balance
  onFinish: async (event) => {
    // Save to database
    // Emit Pusher event
    // Update UI optimistically
  }
})

// Return Response
return result.toDataStreamResponse()
```

**Critical:** Always return `result.toDataStreamResponse()` to enable client-side streaming.

### 3. Message Format (AI SDK UIMessage)

```typescript
interface UIMessage {
  id: string
  role: "user" | "assistant"
  parts: Array<
    | { type: "text"; text: string }
    | { type: "image"; image: string }  // base64 or URL
    | { type: "file"; data: string; mimeType: string }
  >
}
```

**Conversion from Prisma:**
```typescript
const conversationMessages: UIMessage[] = dbMessages.map(msg => ({
  id: msg.id.toString(),
  role: msg.role as "user" | "assistant",
  parts: [
    { type: "text", text: msg.message }
  ]
}))
```

### 4. Tool Definition Pattern

Define tools with Zod schemas:

```typescript
import { tool } from "ai"
import { z } from "zod"

export const myTool = tool({
  description: "What this tool does (be specific)",
  parameters: z.object({
    param1: z.string().describe("What param1 represents"),
    param2: z.number().optional().describe("Optional parameter"),
  }),
  execute: async ({ param1, param2 }) => {
    // Implement tool logic
    return { result: "data" }
  }
})
```

**Tool Set Assembly:**
```typescript
const toolSet: ToolSet = {
  web_search: webSearchTool,
  image_generation: imageGenTool,
  ...dynamicApiTools
}
```

---

## Intent Detection Best Practices

### Fast Pattern-Based Detection (Stage 1)

**Always try pattern matching first** before calling AI classifier:

```typescript
function detectIntentFast(message: string): UserIntent {
  const msg = message.toLowerCase().trim()
  
  // Priority 1: Image generation
  if (/\b(draw|sketch|image of|picture of|photo of)/i.test(msg)) {
    return 'CREATE_IMAGE'
  }
  
  // Priority 2: Canvas creation
  if (/^(create|make|build|design)\s+(a|an|me)?\s*(quote|invoice|dashboard)/i.test(msg)) {
    return 'CREATE_CANVAS'
  }
  
  // Priority 3: Questions
  if (msg.endsWith('?') || /^(what|how|why|when)/i.test(msg)) {
    return 'QUESTION'
  }
  
  return 'UNCLEAR'
}
```

### AI Classifier (Stage 2 - Only if Unclear)

```typescript
if (fastIntent === 'UNCLEAR') {
  const intentResponse = await openaiClient.responses.create({
    model: "gpt-5-nano",  // Fast model
    input: [
      {
        role: "system",
        content: "Classify intent as exactly one of: QUESTION, CREATE_CANVAS, CREATE_IMAGE. Respond with just the category name."
      },
      { role: "user", content: userMessage }
    ],
  })
  
  userIntent = intentResponse.output_text?.trim().toUpperCase()
}
```

**Why This Approach:**
- ✅ Saves API calls (60-80% of intents match patterns)
- ✅ Reduces latency (pattern match = 0ms vs 100-300ms API)
- ✅ More predictable behavior
- ✅ Easier to debug and adjust

---

## Attachment Handling

### Image Conversion to Base64

**Always convert S3 URLs to base64 for AI vision:**

```typescript
async function fetchAsBase64(url: string, mimeType: string): Promise<string | null> {
  try {
    const response = await fetch(url)
    if (!response.ok) return null
    
    const arrayBuffer = await response.arrayBuffer()
    const base64 = Buffer.from(arrayBuffer).toString('base64')
    return `data:${mimeType};base64,${base64}`
  } catch (error) {
    console.error("Failed to fetch image:", error)
    return null
  }
}
```

**Usage in message parts:**
```typescript
if (mimeType?.startsWith('image/')) {
  const base64Data = await fetchAsBase64(url, mimeType)
  if (base64Data) {
    parts.push({
      type: "image" as const,
      image: base64Data,
    })
  }
}
```

### PDF Processing

Use Upstage for document extraction:

```typescript
if (mimeType === 'application/pdf') {
  // 1. Try native file part first
  const base64Data = await fetchAsBase64(url, mimeType)
  if (base64Data) {
    parts.push({
      type: "file" as const,
      data: base64Data,
      mimeType: "application/pdf" as const,
    })
  }
  
  // 2. Fallback to Upstage extraction
  const extracted = await upstageService.extractFromUrl(url)
  if (extracted.text) {
    systemPrompt += `\n\n--- PDF Content: ${filename} ---\n${extracted.text}\n`
  }
}
```

### Audio Transcription

```typescript
if (mimeType?.startsWith('audio/')) {
  const transcription = await fetch('/api/transcribe', {
    method: 'POST',
    body: JSON.stringify({ audioUrl: url })
  })
  
  const { text } = await transcription.json()
  userMessage += `\n[Audio transcription: ${text}]`
}
```

---

## System Prompt Engineering

### Prompt Structure

Build system prompts in sections for maintainability:

```typescript
let systemPrompt = await getSystemPrompt()  // Base prompt

// 1. Context injection
systemPrompt = getGeoSystemContext(userContext) + "\n\n" + systemPrompt

// 2. Tool-specific instructions
systemPrompt += `\n\n## IMAGE GENERATION\n**YOU HAVE IMAGE GENERATION CAPABILITY**...`

// 3. Mode-specific instructions
if (research) {
  systemPrompt += `\n\nIMPORTANT: Conduct thorough research...`
}

// 4. Assistant-specific instructions
if (chat.assistant?.instructions) {
  systemPrompt += `\n\n## Assistant Instructions\n${chat.assistant.instructions}`
}

// 5. Attachment context
if (extractedTexts.length > 0) {
  systemPrompt += `\n\n${extractedTexts.join("\n\n")}`
}
```

### Prompt Best Practices

**DO:**
- ✅ Use clear section headers (`## IMAGE GENERATION`)
- ✅ Be explicit about capabilities ("YOU HAVE" not "You might")
- ✅ Provide examples for complex formats
- ✅ Use bullet points for rules
- ✅ Inject current date/time context
- ✅ Add geo-location awareness

**DON'T:**
- ❌ Ask AI to "try" or "if possible" (be directive)
- ❌ Mix multiple concerns in one section
- ❌ Use vague language ("handle appropriately")
- ❌ Exceed 10,000 characters total
- ❌ Include confidential information

### Dynamic Prompt Sections

**Mentioned Users:**
```typescript
if (mentionedUsers?.length > 0) {
  systemPrompt += `\n\n## Mentioned Users\nThe user has @mentioned:\n${
    mentionedUsers.map(u => `- ${u.name} <${u.email}>`).join("\n")
  }\nYou have their email — don't ask for it.`
}
```

**Canvas Mode:**
```typescript
if (canvas || isCanvasIntent) {
  systemPrompt += `\n\n## CANVAS MODE\nGenerate valid HTML...`
}
```

---

## Message Persistence Patterns

### Saving User Messages

```typescript
// Check for duplicate (within last 60 seconds)
const existing = await prisma.assistantUserChatMessage.findFirst({
  where: {
    assistantUserChatId: chatId,
    role: "user",
    message: messageText,
    createdAt: { gte: new Date(Date.now() - 60000) }
  },
  orderBy: { createdAt: 'desc' }
})

if (existing) {
  // Update status
  await prisma.assistantUserChatMessage.update({
    where: { id: existing.id },
    data: { status: "PROCESSING" }
  })
} else {
  // Create new
  const userMsg = await prisma.assistantUserChatMessage.create({
    data: {
      assistantUserChatId: chatId,
      role: "user",
      message: messageText,
      userId: BigInt(session.user.id),
      assistantId: assistantId ? BigInt(assistantId) : null,
      status: "PROCESSING",
      documents: JSON.stringify({ attachments, mentionedUsers })
    }
  })
}
```

### Saving Assistant Messages

```typescript
onFinish: async (event) => {
  const fullText = event.text
  
  await prisma.assistantUserChatMessage.create({
    data: {
      assistantUserChatId: chatId,
      role: "assistant",
      message: fullText,
      userId: BigInt(session.user.id),
      assistantId: BigInt(assistantId),
      status: "SUCCESS",
      openaiResponseId: event.response?.id || null,
      hasImages: /!\[.*\]\(.*\)/i.test(fullText),  // Detect markdown images
    }
  })
  
  // Emit Pusher event
  await pusher.trigger(`private-chat-${chatId}`, 'new-message', {
    message: fullText,
    role: 'assistant'
  })
}
```

---

## Real-Time Updates (Pusher)

### Channel Naming Convention

```typescript
// User-specific channel (all their chats)
const userChannel = `private-user-${userId}`

// Chat-specific channel (all participants)
const chatChannel = `private-chat-${chatId}`
```

### Event Types

```typescript
// New message in chat
pusher.trigger(chatChannel, 'new-message', {
  id: messageId,
  role: 'assistant',
  message: text,
  createdAt: new Date().toISOString()
})

// Message updated (edit/regenerate)
pusher.trigger(chatChannel, 'message-updated', {
  id: messageId,
  message: newText
})

// Typing indicator
pusher.trigger(chatChannel, 'typing-indicator', {
  userId: session.user.id,
  isTyping: true
})
```

### Client-Side Subscription

```typescript
const { pusher } = usePusher()

useEffect(() => {
  if (!pusher || !chatId) return
  
  const channel = pusher.subscribe(`private-chat-${chatId}`)
  
  channel.bind('new-message', (data: any) => {
    queryClient.setQueryData(
      ['chat-messages', assistantId, chatId],
      (old: any) => ({
        ...old,
        pages: old.pages.map((page: any, idx: number) => 
          idx === 0 
            ? { ...page, messages: [...page.messages, data] }
            : page
        )
      })
    )
  })
  
  return () => {
    channel.unbind_all()
    pusher.unsubscribe(`private-chat-${chatId}`)
  }
}, [pusher, chatId])
```

---

## Performance Optimization

### 1. Caching Strategies

**Intent Classification Memoization:**
```typescript
const intentCache = new Map<string, UserIntent>()

function detectIntentCached(message: string): UserIntent {
  const cacheKey = message.toLowerCase().trim()
  if (intentCache.has(cacheKey)) {
    return intentCache.get(cacheKey)!
  }
  
  const intent = detectIntentFast(message)
  intentCache.set(cacheKey, intent)
  return intent
}
```

**Attachment Conversion Cache:**
```typescript
const attachmentCache = new Map<string, string>()

async function fetchAsBase64Cached(url: string, mimeType: string) {
  if (attachmentCache.has(url)) {
    return attachmentCache.get(url)!
  }
  
  const base64 = await fetchAsBase64(url, mimeType)
  if (base64) {
    attachmentCache.set(url, base64)
  }
  return base64
}
```

### 2. Database Query Optimization

**Use Selective Includes:**
```typescript
// ❌ Bad: Fetches all messages unnecessarily
const chat = await prisma.assistantUserChat.findFirst({
  where: { id: chatId },
  include: {
    assistant: true,
    messages: true,  // Could be 1000s of messages
  }
})

// ✅ Good: Fetch only what you need
const chat = await prisma.assistantUserChat.findFirst({
  where: { id: chatId },
  include: {
    assistant: {
      select: {
        id: true,
        name: true,
        instructions: true,
        vectorStoreId: true
      }
    }
  }
})
```

**Use Pagination:**
```typescript
// Client already has messages from AI SDK
// Only fetch metadata from DB when needed
const lastMessage = await prisma.assistantUserChatMessage.findFirst({
  where: { assistantUserChatId: chatId },
  orderBy: { createdAt: 'desc' },
  select: { openaiResponseId: true, hasImages: true }
})
```

### 3. Streaming Optimization

**Reduce Token Count:**
```typescript
// Remove redundant whitespace
systemPrompt = systemPrompt.replace(/\n{3,}/g, '\n\n')

// Truncate long extracted texts
if (extractedText.length > 50000) {
  extractedText = extractedText.substring(0, 50000) + "\n...(truncated)"
}
```

**Parallel Tool Execution:**
```typescript
// AI SDK handles this automatically
// Tools defined in parallel can execute concurrently
const toolSet = {
  web_search: webSearchTool,     // Can run in parallel
  image_generation: imageGenTool, // with other tools
}
```

---

## Common Pitfalls & Solutions

### 1. BigInt Serialization Error

**Problem:**
```typescript
// ❌ Breaks JSON.stringify
return Response.json({ chatId: dbChat.id })  // BigInt not serializable
```

**Solution:**
```typescript
// ✅ Convert to string or number
return Response.json({ chatId: dbChat.id.toString() })
// or
return Response.json({ chatId: Number(dbChat.id) })
```

### 2. S3 URL Access Issues

**Problem:**
```typescript
// ❌ AI model can't access S3 URL directly
parts.push({ type: "image", image: s3Url })
```

**Solution:**
```typescript
// ✅ Convert to base64
const base64 = await fetchAsBase64(s3Url, mimeType)
parts.push({ type: "image", image: base64 })
```

### 3. Message Order Consistency

**Problem:**
```typescript
// ❌ TanStack Query updates can cause race conditions
queryClient.setQueryData(['messages'], newMessages)
```

**Solution:**
```typescript
// ✅ Use functional updates
queryClient.setQueryData(['messages'], (old: any) => ({
  ...old,
  pages: old.pages.map((page: any, idx: number) => 
    idx === 0 
      ? { ...page, messages: [...page.messages, newMsg] }
      : page
  )
}))
```

### 4. Duplicate Message Prevention

**Problem:**
```typescript
// ❌ User clicks send twice quickly
// Result: Duplicate messages in DB
```

**Solution:**
```typescript
// ✅ Check for recent duplicates (within 60 seconds)
const existing = await prisma.assistantUserChatMessage.findFirst({
  where: {
    assistantUserChatId: chatId,
    role: "user",
    message: messageText,
    createdAt: { gte: new Date(Date.now() - 60000) }
  }
})

if (existing) {
  // Update instead of create
}
```

---

## Testing Guidelines

### Unit Testing Tools

```typescript
import { test, expect, vi } from 'vitest'

test('detectIntentFast classifies image requests', () => {
  expect(detectIntentFast('draw me a cat')).toBe('CREATE_IMAGE')
  expect(detectIntentFast('create an invoice')).toBe('CREATE_CANVAS')
  expect(detectIntentFast('what is AI?')).toBe('QUESTION')
})
```

### Integration Testing Flow

```typescript
test('chat streaming end-to-end', async () => {
  const response = await fetch('/api/chat', {
    method: 'POST',
    body: JSON.stringify({
      chatId: '1',
      assistantId: '1',
      messages: [{ role: 'user', content: 'Hello' }]
    })
  })
  
  expect(response.ok).toBe(true)
  
  const reader = response.body?.getReader()
  const chunks: string[] = []
  
  while (true) {
    const { done, value } = await reader!.read()
    if (done) break
    chunks.push(new TextDecoder().decode(value))
  }
  
  expect(chunks.length).toBeGreaterThan(0)
})
```

### Manual Testing Checklist

Before deploying:
- [ ] Send simple text message
- [ ] Upload and send image
- [ ] Upload and send PDF
- [ ] Test @mention functionality
- [ ] Trigger canvas intent ("create invoice")
- [ ] Trigger image intent ("draw a cat")
- [ ] Test web search mode
- [ ] Test research mode
- [ ] Verify Pusher real-time updates
- [ ] Check message persistence
- [ ] Test mobile responsiveness
- [ ] Verify accessibility (keyboard nav)

---

## Debugging Strategies

### Enable Verbose Logging

```typescript
console.log('[Chat] Processing request:', { chatId, assistantId })
console.log('[Chat] Intent detected:', userIntent)
console.log('[Chat] System prompt length:', systemPrompt.length)
console.log('[Chat] Tool set:', Object.keys(toolSet))
```

### Inspect AI SDK Events

```typescript
const result = streamText({
  // ...
  onChunk: ({ chunk }) => {
    console.log('[Chunk]', chunk)
  },
  onFinish: ({ text, usage, finishReason }) => {
    console.log('[Finish]', { textLength: text.length, usage, finishReason })
  }
})
```

### Monitor Database Queries

```typescript
// Add query logging in prisma.ts
const prisma = new PrismaClient({
  log: ['query', 'error', 'warn'],
})
```

### Pusher Debug Mode

```typescript
Pusher.logToConsole = true

const pusher = new Pusher(key, {
  cluster,
  forceTLS: true,
  enabledTransports: ['ws', 'wss']
})
```

---

## Refactoring Guidelines

### When to Extract a Function

Extract when:
- Logic is used in multiple places
- Function exceeds 50 lines
- Logic is complex and needs testing in isolation
- Code becomes hard to understand

```typescript
// ❌ Before: Inline spaghetti
if (attachments?.length > 0) {
  for (const attachment of attachments) {
    if (upstageService.isSupportedFileType(attachment.type)) {
      try {
        const extracted = await upstageService.extractFromUrl(attachment.url)
        if (extracted.text) {
          extractedTexts.push(`--- ${attachment.name} ---\n${extracted.text}`)
        }
      } catch (error) {
        console.error("Extraction failed:", error)
      }
    }
  }
}

// ✅ After: Clean extraction
async function extractAttachmentTexts(attachments: Attachment[]): Promise<string[]> {
  const results: string[] = []
  
  for (const attachment of attachments) {
    if (!upstageService.isSupportedFileType(attachment.type)) continue
    
    try {
      const extracted = await upstageService.extractFromUrl(attachment.url)
      if (extracted.text) {
        results.push(`--- ${attachment.name} ---\n${extracted.text}`)
      }
    } catch (error) {
      console.error(`Failed to extract ${attachment.name}:`, error)
    }
  }
  
  return results
}
```

### When to Split a File

Split when:
- File exceeds 500 lines
- Multiple concerns handled in one file
- Difficult to find specific functionality
- Import list gets long

**Example Structure:**
```
app/api/chat/
  route.ts              # Main endpoint routing
  intent-detector.ts    # Intent classification logic
  attachment-handler.ts # File processing
  system-prompt.ts      # Prompt building
  message-persister.ts  # Database operations
```

---

## Quick Reference

### Model Selection

| Task | Model | Why |
|------|-------|-----|
| Intent classification | gpt-5-nano | Ultra-fast, cheap |
| Simple Q&A | gpt-5-nano | Fast enough |
| Code generation | gpt-4.1-mini | Good balance |
| Complex reasoning | gpt-4.1 | Higher quality |
| Artifact creation | gpt-5 | Best quality |

### Attachment Formats

| Type | Processing | Best Practice |
|------|-----------|---------------|
| Images (jpg, png) | Convert to base64 | Always convert for AI vision |
| PDFs | Upstage extraction | Cache extracted text |
| Audio | Whisper transcription | Include in message text |
| Video | Upstage extraction | Extract keyframes + transcript |

### Common Errors

| Error | Cause | Fix |
|-------|-------|-----|
| `cannot serialize BigInt` | Returning BigInt in JSON | Convert with `.toString()` |
| `stream closed prematurely` | Network timeout | Increase maxDuration |
| `tool not found` | Missing tool definition | Check getChatTools() |
| `unauthorized` | Missing session | Verify auth middleware |

---

## Next Steps

After mastering this skill:
1. **Explore AI SDK advanced features** — Multi-step reasoning, custom providers
2. **Optimize prompt engineering** — A/B test different prompt formats
3. **Build custom tools** — Add domain-specific capabilities
4. **Implement advanced features** — Voice mode, multi-modal inputs
5. **Monitor production metrics** — Token usage, latency, error rates

---

## Resources

- **AI SDK Docs:** https://sdk.vercel.ai/docs
- **OpenAI API Reference:** https://platform.openai.com/docs
- **Prisma Docs:** https://www.prisma.io/docs
- **TanStack Query:** https://tanstack.com/query
- **Pusher Docs:** https://pusher.com/docs

---

You now have the knowledge to build, enhance, and optimize the assistants chat system. Apply these patterns consistently, test thoroughly, and ship with confidence.
