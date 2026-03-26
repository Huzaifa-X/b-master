# Assistants Chat Agent & Skill Documentation

This document explains how to use the custom agent and skill created for the Assistants Chat system.

## Quick Start

### Using the Agent

The **Assistants Chat Expert** agent is automatically available in your workspace. Invoke it for any work related to the chat system:

**Example prompts:**
```
@Assistants Chat Expert Fix the intent detection for invoice creation

@Assistants Chat Expert Add support for video attachments

@Assistants Chat Expert Optimize the streaming performance

@Assistants Chat Expert Why are messages being duplicated?
```

The agent will automatically:
- ✅ Read relevant files in the chat system
- ✅ Understand the AI SDK streaming architecture
- ✅ Apply best practices for model selection
- ✅ Make surgical edits to fix issues
- ✅ Test changes and verify no regressions

### Using the Skill

The **assistants-chat** skill provides on-demand best practices. Load it when you need guidance:

```
/assistants-chat How do I add a new tool?

/assistants-chat What's the best way to handle PDF attachments?

/assistants-chat Show me the streaming configuration pattern
```

The skill includes:
- 📚 Architecture overview
- 🎯 AI SDK patterns
- 🛠️ Tool definition examples
- 🎨 System prompt engineering
- ⚡ Performance optimization
- 🐛 Debugging strategies
- ✅ Testing guidelines

---

## Features

### Agent Capabilities

The agent is an expert in:

1. **AI SDK Integration**
   - streamText configuration
   - Model selection (gpt-5-nano, gpt-4.1, gpt-5)
   - Tool execution
   - Message format conversion

2. **Intent Detection**
   - Pattern-based classification
   - AI classifier integration
   - Auto-mode activation

3. **Attachment Processing**
   - Image → base64 conversion
   - PDF → Upstage extraction
   - Audio → Whisper transcription
   - Video handling

4. **Real-Time Updates**
   - Pusher integration
   - WebSocket fallback
   - Message subscription
   - Optimistic updates

5. **Performance Optimization**
   - Caching strategies
   - Query optimization
   - Streaming improvements

### Skill Coverage

The skill provides comprehensive guidance on:

- ✅ **Model Selection Strategy** — When to use each GPT model
- ✅ **Streaming Patterns** — AI SDK streamText best practices
- ✅ **Tool Development** — How to create custom tools with Zod
- ✅ **Intent Detection** — Two-stage classification approach
- ✅ **Attachment Handling** — Images, PDFs, audio, video processing
- ✅ **System Prompts** — Prompt engineering patterns
- ✅ **Message Persistence** — Database patterns with Prisma
- ✅ **Real-Time Updates** — Pusher event handling
- ✅ **Performance** — Caching, optimization strategies
- ✅ **Common Pitfalls** — BigInt, S3 URLs, race conditions
- ✅ **Testing** — Unit, integration, manual checklists
- ✅ **Debugging** — Logging, monitoring, troubleshooting
- ✅ **Refactoring** — When and how to extract code

---

## Architecture Overview

The Assistants Chat system uses:

```
┌─────────────────────────────────────────┐
│  Frontend (Next.js + React)             │
│  - components/assistants/               │
│  - hooks/use-assistant-chat.ts          │
│  - TanStack Query for state             │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│  API Layer (Next.js API Routes)         │
│  - app/api/chat/route.ts                │
│  - AI SDK streamText                    │
│  - Intent detection                     │
│  - Tool execution                       │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│  AI Models (OpenAI via AI SDK)          │
│  - gpt-5-nano (fast classification)     │
│  - gpt-4.1-mini (balanced tasks)        │
│  - gpt-4.1 (complex reasoning)          │
│  - gpt-5 (heavy coding)                 │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│  Storage & Services                     │
│  - Prisma ORM + PostgreSQL              │
│  - AWS S3 (attachments)                 │
│  - Upstage (document extraction)        │
│  - Pusher (real-time)                   │
└─────────────────────────────────────────┘
```

### Key Files

**Entry Point:**
- `app/api/chat/route.ts` — Main streaming endpoint (700+ lines)

**Components:**
- `components/assistants/chat-view.tsx` — Chat UI
- `components/assistants/chat-input.tsx` — Input with attachments
- `components/assistants/message-bubble.tsx` — Message rendering

**Hooks:**
- `hooks/use-assistant-chat.ts` — TanStack Query hooks
- `hooks/use-custom-chat.tsx` — AI SDK useChat wrapper

**Configuration:**
- `lib/ai-sdk.ts` — AI SDK OpenAI client
- `lib/openai.ts` — Native OpenAI client
- `lib/chat-tools.ts` — Tool definitions

**Utilities:**
- `utils/prompts.ts` — System prompt management
- `lib/services/geo-service.ts` — Context injection

---

## Common Tasks

### Adding a New Tool

1. Define the tool in `lib/chat-tools.ts`:

```typescript
import { tool } from "ai"
import { z } from "zod"

export const myNewTool = tool({
  description: "Describe what your tool does",
  parameters: z.object({
    param1: z.string().describe("Description of param1"),
    param2: z.number().optional(),
  }),
  execute: async ({ param1, param2 }) => {
    // Implement your tool logic
    return { result: "success" }
  }
})
```

2. Add to the tool set in `getChatTools()`:

```typescript
export function getChatTools() {
  return {
    existing_tool: existingTool,
    my_new_tool: myNewTool,  // Add here
  }
}
```

3. Update system prompt with usage instructions:

```typescript
systemPrompt += `\n\n## MY NEW TOOL\nYou have access to my_new_tool...`
```

4. Test with a user message that should invoke the tool.

### Changing the Model

Update the model string in `app/api/chat/route.ts`:

```typescript
const result = streamText({
  model: ai_sdk_openai("gpt-5-nano"),  // Change here
  // ...
})
```

**Model Options:**
- `"gpt-5-nano"` — Ultra-fast (100-300ms)
- `"gpt-4.1-mini"` — Balanced (500-1000ms)
- `"gpt-4.1"` — Complex reasoning (1-3s)
- `"gpt-5"` — Heavy coding (2-5s)

### Enhancing Intent Detection

Update the pattern matcher in `detectIntentFast()`:

```typescript
function detectIntentFast(message: string): UserIntent {
  const msg = message.toLowerCase().trim()
  
  // Add your new pattern
  if (/\b(your|new|keywords)\b/i.test(msg)) {
    return 'YOUR_NEW_INTENT'
  }
  
  // Existing patterns...
}
```

### Adding System Prompt Sections

```typescript
// Add conditional section based on user action
if (userWantsSpecialFeature) {
  systemPrompt += `\n\n## SPECIAL FEATURE\n- Instruction 1\n- Instruction 2`
}
```

---

## Best Practices

### 1. Model Selection

Use the fastest model that can handle the task:
- **Intent classification** → gpt-5-nano (saves 200-500ms)
- **Simple Q&A** → gpt-5-nano
- **Code generation** → gpt-4.1-mini or gpt-4.1
- **Artifact creation** → gpt-5

### 2. Streaming Configuration

Always use `streamText` for chat responses:
- ✅ Enables real-time token streaming
- ✅ Better UX (user sees response immediately)
- ✅ Can be interrupted mid-generation
- ✅ Lower perceived latency

### 3. System Prompt Engineering

Structure prompts clearly:
- Use section headers (`## HEADING`)
- Be explicit about capabilities
- Provide examples for complex formats
- Keep total prompt under 10,000 characters
- Inject context dynamically

### 4. Attachment Handling

Convert to base64 for AI vision:
- S3 URLs may not be accessible to AI models
- Base64 ensures the model can see the image
- Cache conversions to avoid re-fetching

### 5. Message Persistence

Check for duplicates before creating:
- User might double-click send
- Network retries can cause duplicates
- Check within last 60 seconds window

### 6. Real-Time Updates

Use Pusher for instant message delivery:
- Subscribe to `private-chat-${chatId}`
- Emit events after database save
- Update TanStack Query cache optimistically

---

## Troubleshooting

### Issue: Messages not streaming

**Check:**
1. Is `result.toDataStreamResponse()` returned?
2. Is the client using AI SDK's `useChat` hook?
3. Are there CORS issues?
4. Is the response Content-Type correct?

### Issue: Intent detection fails

**Check:**
1. Does the pattern match in `detectIntentFast()`?
2. Is the AI classifier model available?
3. Are there typos in the classification prompt?
4. Is the response being parsed correctly?

### Issue: Attachments not visible to AI

**Check:**
1. Are images converted to base64?
2. Is the mimeType correct?
3. Is the URL accessible?
4. Is the message part format correct?

### Issue: BigInt serialization error

**Solution:**
Convert BigInt to string or number:
```typescript
id: dbRecord.id.toString()  // or Number(dbRecord.id)
```

### Issue: Duplicate messages

**Solution:**
Add duplicate check:
```typescript
const existing = await prisma.message.findFirst({
  where: {
    chatId,
    role: "user",
    message: text,
    createdAt: { gte: new Date(Date.now() - 60000) }
  }
})
```

---

## Examples

### Example 1: Adding Image Generation Tool

```typescript
// In lib/chat-tools.ts
import { tool } from "ai"
import { z } from "zod"
import { openai } from "@/lib/openai"

export const imageGenerationTool = tool({
  description: "Generate an image using DALL-E based on a text prompt",
  parameters: z.object({
    prompt: z.string().describe("The image generation prompt"),
    size: z.enum(["1024x1024", "1024x1792", "1792x1024"]).optional()
  }),
  execute: async ({ prompt, size = "1024x1024" }) => {
    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt,
      size,
      n: 1
    })
    
    return {
      imageUrl: response.data[0].url,
      revisedPrompt: response.data[0].revised_prompt
    }
  }
})
```

### Example 2: Custom Intent Pattern

```typescript
// In app/api/chat/route.ts
function detectIntentFast(message: string): UserIntent {
  const msg = message.toLowerCase().trim()
  
  // Detect booking requests
  if (/\b(book|schedule|appointment|meeting)\b/i.test(msg)) {
    return 'BOOKING'
  }
  
  // Detect invoice requests (avoiding payment intents)
  if (/\bcreate.*invoice\b/i.test(msg) && 
      !/\b(send|email|payment|charge)\b/i.test(msg)) {
    return 'CREATE_CANVAS'
  }
  
  // Other patterns...
  return 'UNCLEAR'
}
```

### Example 3: Custom System Prompt Section

```typescript
// Add booking instructions when booking intent detected
if (userIntent === 'BOOKING') {
  systemPrompt += `
## BOOKING MODE
You are in booking mode. Follow these steps:
1. Confirm the service/meeting type
2. Check availability using the calendar_check tool
3. Suggest 3 available time slots
4. Create the booking using the booking_create tool
5. Send confirmation email

Available time slots: ${availableTimes.join(", ")}
`
}
```

---

## Testing

### Unit Tests

```typescript
import { describe, it, expect } from 'vitest'
import { detectIntentFast } from './intent-detector'

describe('Intent Detection', () => {
  it('detects image generation intent', () => {
    expect(detectIntentFast('draw me a cat')).toBe('CREATE_IMAGE')
    expect(detectIntentFast('generate an image of mountains')).toBe('CREATE_IMAGE')
  })
  
  it('detects canvas creation intent', () => {
    expect(detectIntentFast('create an invoice')).toBe('CREATE_CANVAS')
    expect(detectIntentFast('build a dashboard')).toBe('CREATE_CANVAS')
  })
  
  it('detects questions', () => {
    expect(detectIntentFast('what is AI?')).toBe('QUESTION')
    expect(detectIntentFast('how does this work?')).toBe('QUESTION')
  })
})
```

### Integration Tests

```typescript
import { describe, it, expect } from 'vitest'

describe('/api/chat', () => {
  it('streams chat response', async () => {
    const response = await fetch('http://localhost:3000/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chatId: '1',
        assistantId: '1',
        messages: [{ role: 'user', content: 'Hello' }]
      })
    })
    
    expect(response.ok).toBe(true)
    expect(response.headers.get('content-type')).toContain('text/plain')
    
    // Read stream
    const reader = response.body!.getReader()
    const chunks: string[] = []
    
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      chunks.push(new TextDecoder().decode(value))
    }
    
    expect(chunks.length).toBeGreaterThan(0)
  })
})
```

### Manual Testing Checklist

- [ ] Send text message → Receives streamed response
- [ ] Upload image → Image visible in message, AI can see it
- [ ] Upload PDF → Content extracted and used in response
- [ ] Use @mention → Mentioned user info available to AI
- [ ] Trigger canvas intent → Panel opens with artifact
- [ ] Trigger image intent → AI uses image_generation tool
- [ ] Enable web search → Search results included
- [ ] Check Pusher → Real-time message appears
- [ ] Verify database → Messages saved correctly
- [ ] Test mobile → Responsive layout works

---

## Additional Resources

### Documentation
- [AI SDK Docs](https://sdk.vercel.ai/docs) — Official Vercel AI SDK documentation
- [OpenAI API Reference](https://platform.openai.com/docs) — OpenAI API documentation
- [Prisma Docs](https://www.prisma.io/docs) — Database ORM documentation
- [TanStack Query](https://tanstack.com/query) — Data fetching library
- [Pusher Docs](https://pusher.com/docs) — Real-time WebSocket service

### Related Files
- `.github/agents/assistants-chat.agent.md` — Custom agent definition
- `.github/skills/assistants-chat/SKILL.md` — Comprehensive skill guide
- `app/api/chat/route.ts` — Main chat endpoint (study this first)
- `components/assistants/chat-view.tsx` — Chat UI component
- `hooks/use-assistant-chat.ts` — React hooks for chat

### Example Agents in This Workspace
- **Artifact Generator** — Working with artifact system
- **B-Coder** — WebContainer and code generation
- **Canvas Enhancer** — Artifact panel and canvas mode

---

## Feedback & Contributions

If you find issues or have suggestions for improving the agent or skill:

1. **Test the agent** with various prompts
2. **Try the skill** for different tasks
3. **Document** what works well and what doesn't
4. **Update** the agent/skill files as you learn more
5. **Share** your findings with the team

The agent and skill will improve as you use them!

---

## Summary

You now have:
- ✅ **Custom Agent** — Expert assistant for chat system work
- ✅ **Skill File** — Comprehensive best practices guide
- ✅ **Documentation** — How to use both effectively
- ✅ **Examples** — Real-world code patterns
- ✅ **Testing** — Quality assurance guidelines

**Next Steps:**
1. Try the agent: `@Assistants Chat Expert Show me the chat architecture`
2. Load the skill: `/assistants-chat What are the AI SDK patterns?`
3. Build something: Add a feature using the patterns you learned
4. Share feedback: Update this documentation with your learnings

Happy coding! 🚀
