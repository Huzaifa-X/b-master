// app/api/chat/route.ts
import { NextRequest } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { openai as openaiClient } from "@/lib/openai"
import { ai_sdk_openai } from "@/lib/ai-sdk"
import upstageService from "@/lib/services/upstageService"
import { getSystemPrompt, getArtifactUpdateCodingPrompt } from "@/utils/prompts"
import { safeUploadToS3 } from "@/lib/aws-s3"
import { OpenAPITool } from "@/lib/openapi-tool-converter"
import { executeAPITool, loadAPITools } from "@/lib/api-tools-loader"
import { decrypt } from "@/lib/encryption"
import { swissQRInvoiceInstructions } from "@/lib/templates/swiss-qr-invoice"
import { getChatTools } from "@/lib/chat-tools"
import { buildUserContext, getGeoSystemContext } from "@/lib/services/geo-service"
import {
    streamText,
    convertToModelMessages,
    type UIMessage,
    type ToolSet,
    stepCountIs
} from "ai"
import { z } from "zod"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 300

/**
 * Fetch a file from URL and convert to base64 data URL
 * This is needed because S3 URLs are not publicly accessible to AI models
 */
async function fetchAsBase64(url: string, mimeType: string): Promise<string | null> {
    try {
        console.log(`[Chat] Fetching file for base64 conversion: ${url.substring(0, 100)}...`)
        const response = await fetch(url)
        if (!response.ok) {
            console.error(`[Chat] Failed to fetch file: ${response.statusText}`)
            return null
        }
        const arrayBuffer = await response.arrayBuffer()
        const base64 = Buffer.from(arrayBuffer).toString('base64')
        const dataUrl = `data:${mimeType};base64,${base64}`
        console.log(`[Chat] ✅ Converted to base64 (${Math.round(base64.length / 1024)}KB)`)
        return dataUrl
    } catch (error) {
        console.error(`[Chat] Error fetching file for base64:`, error)
        return null
    }
}


/**
 * POST /api/chat - Stream chat responses using AI SDK
 */
export async function POST(req: NextRequest) {
    let chatIdInt: number | null = null

    try {
        // Check authentication
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })
        }

        const body = await req.json()
        const {
            chatId,
            assistantId,
            chatType,
            webSearch,
            research,
            chatWithAPI,
            connectedApiIds,
            attachments,
            artifact,
            dropbox,
            canvas,
            mentionedUsers,
            messages: clientMessages, // Messages from AI SDK useChat
        } = body

        console.log("[Chat] Processing request for chatId:", chatId)
        console.log("[Chat] Received", clientMessages?.length || 0, "messages from client")

        chatIdInt = parseInt(chatId)
        if (isNaN(chatIdInt)) {
            return new Response(JSON.stringify({ error: "Invalid chatId" }), { status: 400 })
        }

        // Get chat with context (without messages - we use client messages)
        const chat = await prisma.assistantUserChat.findFirst({
            where: { id: chatIdInt },
            include: {
                assistant: {
                    select: {
                        id: true,
                        name: true,
                        instructions: true,
                        description: true,
                        vectorStoreId: true,
                        knowledgebases: {
                            where: { type: "text" },
                            select: { note: true }
                        }
                    }
                }
            }
        })

        if (!chat) {
            return new Response(JSON.stringify({ error: "Chat not found" }), { status: 404 })
        }

        // Extract the last user message from client messages
        const lastClientUserMessage = clientMessages
            ?.filter((m: any) => m.role === 'user')
            .slice(-1)[0]

        let lastUserMessage = ""
        let lastUserMessageRecord: any = null

        if (lastClientUserMessage) {
            // Extract text content from the message
            const messageContent = typeof lastClientUserMessage.content === 'string'
                ? lastClientUserMessage.content
                : lastClientUserMessage.parts?.find((p: any) => p.type === 'text')?.text || ""

            lastUserMessage = messageContent

            // Check if this message already exists in DB (by checking recent messages)
            const existingMessage = await prisma.assistantUserChatMessage.findFirst({
                where: {
                    assistantUserChatId: chatIdInt,
                    role: "user",
                    message: messageContent,
                    createdAt: { gte: new Date(Date.now() - 60000) } // Within last minute
                },
                orderBy: { createdAt: 'desc' }
            })

            if (existingMessage) {
                // Message exists, update status to PROCESSING
                lastUserMessageRecord = existingMessage
                if (existingMessage.status === "PENDING") {
                    await prisma.assistantUserChatMessage.update({
                        where: { id: existingMessage.id },
                        data: { status: "PROCESSING" }
                    })
                    console.log("[Chat] Updated existing user message status to PROCESSING")
                }
            } else {
                // Save new user message to DB (server-side save)
                const documentsData: any = {}
                if (mentionedUsers?.length > 0) {
                    documentsData.mentionedUsers = mentionedUsers
                }
                if (attachments?.length > 0) {
                    documentsData.attachments = attachments
                }
                // Store options for potential retry
                documentsData.options = { webSearch, research, chatWithAPI, dropbox, artifact }

                lastUserMessageRecord = await prisma.assistantUserChatMessage.create({
                    data: {
                        assistantUserChatId: chatIdInt,
                        role: "user",
                        message: messageContent,
                        userId: BigInt(session.user.id),
                        assistantId: assistantId ? BigInt(assistantId) : null,
                        status: "PROCESSING",
                        documents: Object.keys(documentsData).length > 0 ? JSON.stringify(documentsData) : null,
                    }
                })
                console.log("[Chat] Saved new user message to DB:", lastUserMessageRecord.id)
            }
        }

        // Convert client messages to UIMessage format for AI SDK
        // For the LAST user message, include attachments as image/file parts
        const conversationMessages: UIMessage[] = await Promise.all((clientMessages || []).map(async (msg: any, msgIndex: number) => {
            let textContent = ""
            if (typeof msg.content === 'string') {
                textContent = msg.content
            } else if (msg.parts) {
                const textPart = msg.parts.find((p: any) => p.type === 'text')
                textContent = textPart?.text || ""
            }

            // Add mentioned users context for user messages
            if (msg.role === "user" && mentionedUsers?.length > 0) {
                const mentionsList = mentionedUsers
                    .map((u: { name: string; email: string }) => `${u.name} <${u.email}>`)
                    .join(', ')
                textContent = `[This message mentions: ${mentionsList}]\n\n${textContent}`
            }

            // Build parts array
            const parts: any[] = [
                {
                    type: "text" as const,
                    text: textContent
                }
            ]

            // For the LAST user message, add image and file attachments as native parts
            const isLastMessage = msgIndex === (clientMessages || []).length - 1

            if (msg.role === "user" && isLastMessage && attachments?.length > 0) {
                console.log(`[Chat] Adding ${attachments.length} attachments to user message`)

                for (const attachment of attachments) {
                    const { url, type: mimeType, name } = attachment

                    if (!url) continue

                    // Handle images - convert to base64 so AI model can access them
                    if (mimeType?.startsWith('image/')) {
                        console.log(`[Chat] Converting image attachment to base64: ${name}`)
                        const base64Data = await fetchAsBase64(url, mimeType)
                        if (base64Data) {
                            parts.push({
                                type: "image" as const,
                                image: base64Data,
                            })
                            console.log(`[Chat] ✅ Added image attachment: ${name}`)
                        } else {
                            console.warn(`[Chat] ⚠️ Failed to convert image, falling back to URL: ${name}`)
                            parts.push({
                                type: "image" as const,
                                image: url,
                            })
                        }
                    }
                    // Handle PDFs - convert to base64 so AI model can access them
                    else if (mimeType === 'application/pdf') {
                        console.log(`[Chat] Converting PDF attachment to base64: ${name}`)
                        const base64Data = await fetchAsBase64(url, mimeType)
                        if (base64Data) {
                            parts.push({
                                type: "file" as const,
                                data: base64Data,
                                mimeType: "application/pdf" as const,
                            })
                            console.log(`[Chat] ✅ Added PDF attachment: ${name}`)
                        } else {
                            console.warn(`[Chat] ⚠️ Failed to convert PDF, relying on Upstage extraction: ${name}`)
                        }
                    }
                    // Handle other document types that might be viewable
                    else if (mimeType?.includes('document') || mimeType?.includes('text')) {
                        console.log(`[Chat] Document attachment: ${name} (${mimeType}) - relying on Upstage extraction`)
                    }
                }
            }

            return {
                id: msg.id || crypto.randomUUID(),
                role: msg.role as "user" | "assistant",
                parts
            }
        }))

        const userIp = req.headers.get("x-forwarded-for")?.split(",")[0] || "8.8.8.8"
        const userContext = await buildUserContext(userIp)

        // Build system prompt
        let systemPrompt = await getSystemPrompt()

        // Inject location and time context
        systemPrompt = getGeoSystemContext(userContext) + "\n\n" + systemPrompt

        // Force image generation tool usage
        systemPrompt += `\n\n## IMAGE GENERATION CAPABILITIES\n**YOU HAVE THE CAPABILITY TO GENERATE IMAGES.**\n- If the user asks for an image, visual, or photo, you **MUST** use the \`image_generation\` tool.\n- **NEVER** say "I can't generate images" or "I can't render bitmap images". YOU CAN.\n- **NEVER** offer to generate an SVG or text description instead. JUST USE THE TOOL.\n- The tool will return a public S3 URL of the generated image.\n- **CRITICAL**: You MUST display the generated image using markdown syntax: \`![Generated Image](url)\` in your response so the user can see it.\n- Trust the tool.`

        // Add mentioned users context
        if (mentionedUsers?.length > 0) {
            systemPrompt += `\n\n## Mentioned Users\nWhen you see "[This message mentions: Name <email>]" at the start of a user message, those are people the user has specifically mentioned using @ mentions. You have their full contact information (name and email). Use this information when relevant.\n\n## Mentioned Users\n${mentionedUsers.map((user: { name: string; email: string }) => `- ${user.name} <${user.email}>`).join("\n")}`
        }

        if (research) {
            systemPrompt += `\n\nIMPORTANT: The user has requested research mode. Please conduct thorough research using both web search and file search.`
        } else if (webSearch) {
            systemPrompt += `\n\nIMPORTANT: The user has requested web search.`
        } else if (chatWithAPI) {
            systemPrompt += `\n\nIMPORTANT: The user has requested chat with API.`
        }

        if (dropbox) {
            systemPrompt += `\n\nIMPORTANT: The user has enabled Dropbox integration.`
        }

        // Canvas mode system prompt is injected after intent detection (see below)

        // STRIPE CONNECT INSTRUCTIONS
        systemPrompt += `\n\n## 💳 IMPORTANT: Stripe Connect Invoice Creation\n\n**CRITICAL: Use the create_stripe_connect_invoice FUNCTION to create invoices (NOT Stripe MCP).**\n\nWhen creating invoices, call the create_stripe_connect_invoice function with:\n- customerName (required)\n- customerEmail (required)\n- amount (required - in dollars, e.g., 100.50)\n- description (required)\n- currency (optional - defaults to "chf")\n- daysUntilDue (optional - defaults to 7)\n\n**What happens:**\n1. Checks if user has connected Stripe account\n2. Creates invoice on THEIR connected account\n3. Returns both Stripe payment link AND PDF\n\n**Key Points:**\n- Invoices created on USER's Stripe Connect account\n- If no Stripe Connect, prompts user to connect\n- Always gather ALL required info before calling`

        if (chatType === "ASSISTANT" && chat.assistant?.instructions) {
            systemPrompt += `\n\n## Assistant-Specific Instructions\n${chat.assistant.instructions}`
        }

        if (attachments?.length > 0) {
            systemPrompt += `\n\n## User Attachments Handling Rules\n\nThe user may attach files. Follow these rules:\n- **Images**: If user asks to use, use the URL directly. Otherwise ignore.\n- **PDFs/Docs**: Extract text content if user requests. Use URL if referencing file.\n- **Other files**: Follow explicit instructions or use URL.\n\nOnly use attachments when user explicitly indicates. Never hallucinate contents.`

            const extractedTexts: string[] = []
            for (const attachment of attachments) {
                if (upstageService.isSupportedFileType(attachment.type) && attachment.url) {
                    try {
                        const extracted = await upstageService.extractFromUrl(attachment.url)
                        if (extracted.text) {
                            extractedTexts.push(`\n\n--- Content from ${attachment.name}\nurl: ${attachment.url}\ntype: ${attachment.type} ---\n${extracted.text}\n--- End ---\n`)
                        }
                    } catch (error) {
                        console.error(`[Chat] Failed to extract from ${attachment.name}:`, error)
                    }
                }
            }

            if (extractedTexts.length > 0) {
                systemPrompt += `\n\n${extractedTexts.join("\n\n")}`
            }
        }

        // Check for image edit intent - query DB for last assistant message with response ID
        const lastAssistantMessage = await prisma.assistantUserChatMessage.findFirst({
            where: {
                assistantUserChatId: chatIdInt,
                role: "assistant",
                openaiResponseId: { not: null }
            },
            orderBy: { createdAt: 'desc' },
            select: {
                openaiResponseId: true,
                hasImages: true,
            }
        })

        const previousResponseId = lastAssistantMessage?.openaiResponseId || null

        // ============================================
        // FAST INTENT DETECTION (Pattern-based, no API call)
        // ============================================
        type UserIntent = 'QUESTION' | 'CREATE_CANVAS' | 'CREATE_IMAGE' | 'UNCLEAR';

        function detectIntentFast(message: string): UserIntent {
            const msg = message.toLowerCase().trim()

            // Obvious questions - has question mark or starts with question words
            if (msg.endsWith('?') || /^(what|how|why|when|where|who|is |are |can you explain|tell me about)/i.test(msg)) {
                return 'QUESTION'
            }

            // Obvious image creation
            if (/\b(draw|sketch|image of|picture of|photo of|generate.*image|create.*image|make.*image|design.*logo|illustrat)/i.test(msg)) {
                return 'CREATE_IMAGE'
            }

            // STRIPE INVOICE DETECTION - Don't auto-canvas for payment invoices
            // If message mentions payment-related terms with invoice, let AI handle with Stripe tool
            if (/invoice/i.test(msg) && /(\$|€|£|\d+\s*(dollars?|euros?|chf|usd|eur)|payment|charge|bill|send.*to|email.*to|customer)/i.test(msg)) {
                return 'QUESTION' // Let AI decide - it will use Stripe tool
            }

            // Obvious canvas/visual creation (excluding payment invoices handled above)
            if (/^(create|make|build|design|draft|generate|write me)\s+(a |an |me )?(quote|invoice|contract|proposal|dashboard|landing page|webpage|website|page|document|letter|report|presentation|form|calculator|app|tool)/i.test(msg)) {
                return 'CREATE_CANVAS'
            }

            // Strong creation signals without specific type
            if (/^(create|make|build|design|draft|generate)\s+(a |an |me )/i.test(msg)) {
                return 'CREATE_CANVAS' // Default creation to canvas
            }

            return 'UNCLEAR'
        }

        // Use fast detection first
        const fastIntent = detectIntentFast(lastUserMessage)
        let userIntent: UserIntent = fastIntent

        // Only call classifier if unclear (saves API calls and time)
        if (fastIntent === 'UNCLEAR') {
            try {
                const intentResponse = await openaiClient.responses.create({
                    model: "gpt-5-nano",
                    input: [
                        {
                            role: "system",
                            content: "Classify intent as exactly one of: QUESTION, CREATE_CANVAS, CREATE_IMAGE. Respond with just the category name."
                        },
                        { role: "user", content: lastUserMessage }
                    ],
                })
                const classifiedIntent = intentResponse.output_text?.trim().toUpperCase()
                if (['QUESTION', 'CREATE_CANVAS', 'CREATE_IMAGE'].includes(classifiedIntent || '')) {
                    userIntent = classifiedIntent as UserIntent
                }
            } catch (e) {
                console.log('[Chat] Intent classifier failed, defaulting to QUESTION')
                userIntent = 'QUESTION'
            }
        }

        console.log(`[Chat] Detected intent: ${userIntent} (fast: ${fastIntent})`)

        // Determine effective modes based on intent
        const isCanvasIntent = userIntent === 'CREATE_CANVAS'
        const isImageIntentFromPattern = userIntent === 'CREATE_IMAGE'

        // Auto-enable canvas for canvas creation intents (unless manually disabled)
        const effectiveCanvasMode = canvas || isCanvasIntent

        // ============================================
        // IMAGE INTENT (existing classifier for iterative editing)
        // ============================================
        // Classify image edit intent
        const classifierResponse = await openaiClient.responses.create({
            model: "gpt-5-nano",
            input: [
                {
                    role: "system",
                    content: "You are a classifier. Respond ONLY with 'true' if the user wants to edit or modify an image or create a new image. Otherwise respond ONLY with 'false'."
                },
                {
                    role: "user",
                    content: lastUserMessage
                }
            ],
        })

        const hasImageIntent = classifierResponse.output_text?.trim().toLowerCase() === "true" || isImageIntentFromPattern
        const hasImageAttachments = attachments?.some((att: { type: string }) => att.type.startsWith('image/'))
        const shouldUseIterativeEditing = hasImageIntent && previousResponseId && lastAssistantMessage?.hasImages && !hasImageAttachments

        // Final intent determination for headers
        const finalCanvasIntent = isCanvasIntent && !hasImageIntent // Canvas only if not image

        // ============================================
        // CANVAS MODE SYSTEM PROMPT (manual or auto-detected)
        // ============================================
        if (effectiveCanvasMode) {
            if (isCanvasIntent) {
                // ── VISUAL CREATION: force full HTML output ──────────────────
                systemPrompt += `\n\n## 🎨 CANVAS MODE IS ACTIVE - HTML VISUAL OUTPUT

**⚠️ THIS IS A HARD REQUIREMENT - YOU MUST FOLLOW THESE RULES:**

${!canvas ? '**Note: Canvas mode was auto-enabled based on your creation request.**\n\n' : ''}The user wants a VISUAL HTML output, NOT a text explanation.

**ABSOLUTE RULES (NO EXCEPTIONS):**
1. You MUST ALWAYS output a complete, self-contained HTML page - NO MATTER WHAT the user asks
2. Even if the request seems simple (like "make a small contract"), you MUST create it as a beautifully designed HTML page
3. NEVER respond with just text when Canvas mode is active
4. NEVER say "here's a template" and provide plain text - create the HTML version instead
5. Wrap the HTML in a markdown code block: \`\`\`html ... \`\`\`

**TECHNICAL REQUIREMENTS:**
- Start with <!DOCTYPE html>
- Include ALL CSS inline within <style> tags in the <head>
- Include ALL JavaScript inline within <script> tags before </body>
- Do NOT use external CDN links - write custom CSS
- Make it visually appealing with proper styling, colors, spacing, and typography

**OUTPUT FORMAT (follow exactly):**
\`\`\`html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Title</title>
  <style>
    /* Beautiful, modern CSS styling here */
    body { font-family: system-ui, sans-serif; }
  </style>
</head>
<body>
  <!-- Your beautifully designed content here -->
</body>
</html>
\`\`\`

**REMEMBER: Canvas mode = HTML output for visual creation. No exceptions. Even for documents, contracts, letters, etc. - create them as styled HTML pages.**

${swissQRInvoiceInstructions}`
            } else {
                // ── TEXT / QUESTION CANVAS: output rich markdown in a canvas block ──
                systemPrompt += `\n\n## 🖊️ CANVAS MODE IS ACTIVE - MARKDOWN CANVAS OUTPUT

The user has enabled the Canvas panel. Your response will be displayed there as rendered markdown.

**RULES:**
1. Write your ENTIRE response inside a single \`\`\`canvas ... \`\`\` fenced block
2. Use rich markdown formatting: # headings, **bold**, *italic*, bullet lists, numbered lists, tables, code blocks etc.
3. Do NOT output anything outside the \`\`\`canvas\`\`\` block
4. Provide the full, well-structured answer — the canvas panel has plenty of space

**OUTPUT FORMAT (follow exactly):**
\`\`\`canvas
# Title of Your Response

Your full, well-formatted response here…
\`\`\``
            }
        }

        // Add artifact context
        if (artifact) {
            systemPrompt += `\n\n## 🎨 Artifact Context & Update Capability\n\n**The user has shared an artifact named "${artifact.name}".**\n\n### Artifact Content:\n\`\`\`html\n${artifact.htmlContent}\n\`\`\`\n${artifact.instructions ? `\n### Original Instructions:\n${artifact.instructions}\n` : ''}\n\n### Your Role:\n\n**CRITICAL: Understand User Intent First**\n\n1. **Information Questions**: DO NOT modify - just explain\n2. **Modification Requests**: Use update_artifact function\n3. **Debugging**: Analyze first, ask before updating\n4. **General Conversation**: Respond naturally\n\n### Updating:\nCall \`update_artifact\` with:\n- \`updatedCode\`: Complete HTML\n- \`changeDescription\`: Detailed explanation\n- \`changeSummary\`: One-line summary\n\n${await getArtifactUpdateCodingPrompt()}`
        } else {
            systemPrompt += `\n\n## 🎨 Artifact Context & Update Capability\n\n**The user has not shared an artifact.**`
        }

        // Load API tools if needed
        let apiTools: OpenAPITool[] = []
        let oauthRequired = false
        let oauthConfig: any = null

        if (chatWithAPI && assistantId) {
            const toolsResult = await loadAPITools(assistantId.toString())
            if (toolsResult.success) {
                apiTools = toolsResult.tools
                console.log(`[Chat] Loaded ${apiTools.length} API tools`)
            } else if (toolsResult.oauthRequired) {
                oauthRequired = true
                oauthConfig = toolsResult.oauthConfig
                console.log(`[Chat] OAuth required for assistant ${assistantId}`)
            }
        }

        // Load tools from additionally connected API assistants (max 2)
        if (Array.isArray(connectedApiIds) && connectedApiIds.length > 0) {
            const idsToLoad = connectedApiIds.slice(0, 2)
            for (const cId of idsToLoad) {
                if (!cId) continue
                const extraResult = await loadAPITools(cId.toString())
                if (extraResult.success && extraResult.tools) {
                    apiTools.push(...extraResult.tools)
                    console.log(`[Chat] Loaded ${extraResult.tools.length} extra API tools from assistant ${cId}`)
                }
            }
        }

        if (apiTools.length > 0) {
            systemPrompt += `\n\n## Available External APIs\nYou have access to the following external API tools:\n\n`
            apiTools.forEach(tool => {
                systemPrompt += `### ${tool.openaiTool.name}\n- **Description**: ${tool.openaiTool.description}\n- **Method**: ${tool.metadata.method}\n- **Endpoint**: ${tool.metadata.baseUrl}${tool.metadata.path}\n`
                const params = tool.openaiTool.parameters
                if (params.properties && Object.keys(params.properties).length > 0) {
                    systemPrompt += `- **Parameters**:\n`
                    for (const [name, prop] of Object.entries(params.properties)) {
                        const required = params.required?.includes(name) ? '(required)' : '(optional)'
                        const propAny = prop as any
                        systemPrompt += `  - \`${name}\` ${required}: ${propAny.description || propAny.type}\n`
                    }
                }
            })
        }

        // 🔐 Check OAuth requirement BEFORE building tools
        if (oauthRequired && oauthConfig) {
            console.log("[Chat] 🔐 OAuth connection required")

            if (lastUserMessageRecord) {
                await prisma.assistantUserChatMessage.update({
                    where: { id: lastUserMessageRecord.id },
                    data: { status: "COMPLETED" }
                })
            }

            const { buildAuthorizationUrl } = await import('@/lib/oauth-helper')
            const state = require('crypto').randomBytes(32).toString('hex')

            await prisma.oAuthState.create({
                data: {
                    state,
                    userId: BigInt(session.user.id),
                    provider: 'api',
                    data: { assistantId: assistantId.toString() },
                    expiresAt: new Date(Date.now() + 10 * 60 * 1000),
                }
            })

            const origin = req.headers.get('origin') || req.headers.get('referer')?.split('/').slice(0, 3).join('/') || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
            const redirectUri = `${origin}/api/oauth/callback`

            const authUrl = buildAuthorizationUrl(
                oauthConfig.authorizationUrl,
                oauthConfig.clientId,
                redirectUri,
                state,
                oauthConfig.scope
            )

            // Return OAuth requirement as UI message
            return new Response(
                JSON.stringify({
                    type: "oauth_required",
                    authUrl,
                    assistantId,
                    message: "To use this API, please connect your account first."
                }),
                {
                    status: 200,
                    headers: { "Content-Type": "application/json" }
                }
            )
        }

        // ============================================
        // CONFIGURE TOOLS (Using ChatTools library)
        // ============================================

        const tools: ToolSet = getChatTools({
            userId: BigInt(session.user.id),
            chatIdInt: chatIdInt || 0,
            assistantId,
            artifact,
            apiTools
        })

        // Add special SDK-specific tools
        if (webSearch || research) {
            tools.web_search = ai_sdk_openai.tools.webSearch() as any
        }

        let model = "gpt-5"

        // ============================================
        // CONFIGURE OPENAI PROVIDER OPTIONS
        // ============================================

        const providerOptions: any = {}

        // Web search tool
        if (chatType === "ASK_B" || webSearch || research) {
            providerOptions.openai = {
                ...providerOptions.openai,
                // AI SDK will handle web_search through provider options
            }
        }

        // Image generation (handled by OpenAI provider)
        // Will be available automatically through gpt-5.2 model

        // File search
        if (chatType === "ASK_B") {
            providerOptions.openai = {
                ...providerOptions.openai,
                fileSearch: {
                    vectorStoreIds: [process.env.ASKB_VECTOR_STORE_ID || ""]
                }
            }
        } else if (assistantId && chat.assistant?.vectorStoreId) {
            providerOptions.openai = {
                ...providerOptions.openai,
                fileSearch: {
                    vectorStoreIds: [chat.assistant.vectorStoreId]
                }
            }
        }

        // Dropbox MCP
        if (dropbox) {
            try {
                const dropboxConnector = await prisma.connector.findFirst({
                    where: {
                        userId: BigInt(session.user.id),
                        provider: 'DROPBOX',
                        status: 'ACTIVE',
                        deletedAt: null
                    }
                })

                if (dropboxConnector?.accessToken) {
                    const accessToken = decrypt(dropboxConnector.accessToken)
                    providerOptions.openai = {
                        ...providerOptions.openai,
                        mcp: [
                            {
                                serverLabel: "Dropbox",
                                connectorId: `connector_dropbox`,
                                authorization: accessToken,
                                requireApproval: "never",
                            }
                        ]
                    }
                    console.log(`[Chat] Added Dropbox MCP tool`)
                }
            } catch (error) {
                console.error("[Chat] Failed to add Dropbox MCP:", error)
            }
        }

        // Iterative editing
        if (shouldUseIterativeEditing && previousResponseId) {
            providerOptions.openai = {
                ...providerOptions.openai,
                previousResponseId
            }
        }

        // Store option and conditional reasoning
        // Only enable extended thinking for complex tasks (canvas, research, artifacts)
        const needsReasoning = canvas || research || artifact

        providerOptions.openai = {
            ...providerOptions.openai,
            store: true,
            metadata: {
                chatId: chatIdInt.toString(),
                userId: session.user.id
            },
            // Only add reasoning options for complex tasks
            ...(needsReasoning && {
                reasoningSummary: 'auto',
                reasoningEffort: 'medium', // Use 'low' even for complex tasks for faster responses
            })
        }

        // ============================================
        // STREAM TEXT WITH AI SDK
        // ============================================

        // Track partial content for abort handling
        let partialContent = ""
        let partialReasoning = ""
        let streamAborted = false

        const result = streamText({
            model: ai_sdk_openai(model),
            system: systemPrompt,
            messages: await convertToModelMessages(conversationMessages),
            tools,
            providerOptions,
            stopWhen: stepCountIs(5),
            abortSignal: req.signal, // Pass abort signal from request
            experimental_telemetry: {
                isEnabled: true,
                functionId: 'stream-text',
            },
            // Track content as it streams for abort recovery
            onChunk: async ({ chunk }) => {
                if (chunk.type === 'text-delta') {
                    partialContent += chunk.text
                } else if (chunk.type === 'reasoning-delta') {
                    partialReasoning += (chunk as any).text || ""
                }
            },
        })

        // Handle abort signal - save partial content when user navigates away
        req.signal.addEventListener('abort', async () => {
            streamAborted = true
            console.log("[Chat] Stream aborted by client, saving partial content...")

            if (partialContent.trim() && chatIdInt) {
                try {
                    // Check if response already exists (race condition protection)
                    const existingResponse = await prisma.assistantUserChatMessage.findFirst({
                        where: {
                            assistantUserChatId: chatIdInt,
                            role: "assistant",
                            createdAt: { gt: lastUserMessageRecord?.createdAt || new Date(0) }
                        }
                    })

                    if (!existingResponse) {
                        await prisma.assistantUserChatMessage.create({
                            data: {
                                assistantUserChatId: chatIdInt,
                                role: "assistant",
                                message: partialContent,
                                userId: null,
                                assistantId: assistantId ? BigInt(assistantId) : null,
                                openaiResponseId: null,
                                hasImages: false,
                                documents: null,
                            }
                        })
                        console.log("[Chat] ⚠️ Partial response saved (stream aborted)")
                    }

                    // Update user message status
                    if (lastUserMessageRecord) {
                        await prisma.assistantUserChatMessage.update({
                            where: { id: lastUserMessageRecord.id },
                            data: { status: "COMPLETED" }
                        })
                    }

                    // Update chat timestamp
                    await prisma.assistantUserChat.update({
                        where: { id: chatIdInt },
                        data: { updatedAt: new Date() }
                    })
                } catch (error) {
                    console.error("[Chat] Error saving partial content on abort:", error)
                }
            }
        })

        const getUsage = async () => await result.usage
        let generatedImageUrls: string[] = []

        // Convert to UI message stream with message metadata for usage tracking
        return result.toUIMessageStreamResponse({
            sendReasoning: true,
            sendSources: true,
            headers: {
                'X-User-Intent': userIntent,
                'X-Auto-Canvas': finalCanvasIntent ? 'true' : 'false',
                'X-Auto-Image': hasImageIntent ? 'true' : 'false'
            },
            onFinish: async ({ messages, responseMessage }) => {
                // Skip if stream was already aborted and content saved
                if (streamAborted) {
                    console.log("[Chat] Stream was aborted, skipping onFinish (partial content already saved)")
                    return
                }

                console.log("[Chat] Stream finished, saving to DB")

                let assistantContent = ""
                let assistantReasoning = ""
                const usedTools: string[] = []
                let webSearchSources: any[] = []

                // Capture tool results (web search sources and generated images)
                try {
                    const toolResults = await result.toolResults

                    // Web search sources
                    const webSearchResults = toolResults.filter(tr => tr.toolName === 'web_search')
                    if (webSearchResults.length > 0) {
                        webSearchSources = webSearchResults.flatMap(tr => (tr.output as any).sources || [])
                        console.log(`[Chat] 🔍 Captured ${webSearchSources.length} web search sources`)
                    }

                    // Generated image URLs
                    const imageToolResults = toolResults.filter(tr => tr.toolName === 'image_generation')
                    if (imageToolResults.length > 0) {
                        const urls = imageToolResults
                            .map(tr => (tr.output as any).url)
                            .filter(Boolean)
                        generatedImageUrls.push(...urls)
                        console.log(`[Chat] 🎨 Captured ${urls.length} image URLs from tool results`)
                    }
                } catch (err) {
                    console.error("[Chat] Error capturing tool results:", err)
                }

                // Extract content and tools from the response message parts
                if (responseMessage && responseMessage.parts) {
                    for (const part of responseMessage.parts) {
                        if (part.type === "text") {
                            assistantContent += part.text
                        }

                        if (part.type === "reasoning") {
                            assistantReasoning += (part as any).reasoning || (part as any).text || ""
                        }

                        // Track used tools
                        if ('toolName' in part && typeof part.toolName === 'string') {
                            if (!usedTools.includes(part.toolName)) {
                                usedTools.push(part.toolName)
                            }
                        }
                    }
                }

                // Add image markdown to response if images were generated AND not already in content
                if (generatedImageUrls.length > 0) {
                    const missingUrls = generatedImageUrls.filter(url => !assistantContent.includes(url))

                    if (missingUrls.length > 0) {
                        const imageMarkdown = missingUrls
                            .map((url, idx) => `![Generated Image ${idx + 1}](${url})`)
                            .join('\n\n')

                        if (assistantContent) {
                            assistantContent = `${assistantContent}\n\n${imageMarkdown}`
                        } else {
                            const imageWord = generatedImageUrls.length === 1 ? 'image' : 'images'
                            assistantContent = `I've generated ${generatedImageUrls.length} ${imageWord} for you:\n\n${imageMarkdown}`
                        }
                    }
                }

                // Check for existing response (race condition protection)
                const existingResponse = await prisma.assistantUserChatMessage.findFirst({
                    where: {
                        assistantUserChatId: chatIdInt || 0,
                        role: "assistant",
                        message: { not: null },
                        createdAt: { gt: lastUserMessageRecord?.createdAt || new Date(0) }
                    }
                })

                if (!existingResponse && assistantContent.trim()) {
                    // Prepare documents field with image URLs and web search sources
                    const documentsData: any = {}

                    console.log(generatedImageUrls)

                    if (generatedImageUrls.length > 0) {
                        documentsData.generatedImages = generatedImageUrls.map((url, idx) => ({
                            url,
                            index: idx,
                            timestamp: Date.now()
                        }))
                    }

                    if (webSearchSources.length > 0) {
                        documentsData.webSearchSources = webSearchSources
                    }

                    const hasDocuments = Object.keys(documentsData).length > 0

                    await prisma.assistantUserChatMessage.create({
                        data: {
                            assistantUserChatId: chatIdInt || 0,
                            role: "assistant",
                            message: assistantContent,
                            userId: null,
                            assistantId: assistantId ? BigInt(assistantId) : null,
                            openaiResponseId: null,
                            hasImages: generatedImageUrls.length > 0,
                            documents: hasDocuments ? JSON.stringify(documentsData) : null,
                        }
                    })
                    console.log("[Chat] ✅ Assistant response saved to database with", generatedImageUrls.length, "images and", webSearchSources.length, "search sources")
                }

                // Update user message status
                if (lastUserMessageRecord) {
                    await prisma.assistantUserChatMessage.update({
                        where: { id: lastUserMessageRecord.id },
                        data: { status: "COMPLETED" }
                    })
                }

                // Update chat timestamp
                await prisma.assistantUserChat.update({
                    where: { id: chatIdInt || 0 },
                    data: { updatedAt: new Date() }
                })

                try {
                    const finalUsage = await getUsage()

                    if (finalUsage && assistantId) {
                        await prisma.usageMetric.create({
                            data: {
                                userId: chat.userId,
                                assistantId: BigInt(assistantId),
                                inputToken: finalUsage.inputTokens || 0,
                                outputToken: finalUsage.outputTokens || 0,
                                totalToken: finalUsage.totalTokens || 0,
                                totalCost: ((finalUsage.totalTokens || 0) / 1_000_000) * 0.375,
                                costType: "chat",
                                toolUsing: usedTools.length > 0 ? usedTools.join(",") : undefined
                            }
                        })
                        console.log("[Chat] ✅ Usage metrics saved")
                    }
                } catch (error) {
                    console.error("[Chat] Failed to save usage metrics:", error)
                }
            }
        })

    } catch (error) {
        console.error("[Chat] Error:", error)

        // Update message status to FAILED
        try {
            if (chatIdInt) { // Now chatIdInt is in scope
                const lastUserMessage = await prisma.assistantUserChatMessage.findFirst({
                    where: {
                        assistantUserChatId: chatIdInt,
                        role: "user"
                    },
                    orderBy: { createdAt: 'desc' }
                })

                if (lastUserMessage) {
                    await prisma.assistantUserChatMessage.update({
                        where: { id: lastUserMessage.id },
                        data: { status: "FAILED" }
                    })
                }
            }
        } catch (dbError) {
            console.error("[Chat] Failed to update message status:", dbError)
        }

        return new Response(
            JSON.stringify({
                error: error instanceof Error ? error.message : "Unknown error"
            }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        )
    }
}