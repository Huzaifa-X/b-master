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
        systemPrompt += `\n\n## IMAGE GENERATION\n**YOU CAN GENERATE IMAGES** using the \`image_generation\` tool.\n- User asks for image/visual/photo → Use the tool immediately\n- Display result: \`![Image](url)\`\n- Never say "I can't" - you have this capability`

        // Add mentioned users context
        if (mentionedUsers?.length > 0) {
            systemPrompt += `\n\n## @Mentioned: ${mentionedUsers.map((u: { name: string; email: string }) => `${u.name} <${u.email}>`).join(", ")}\nYou have their contact info - use when relevant.`
        }

        if (research) {
            systemPrompt += `\n\nResearch mode: Use web + file search.`
        } else if (webSearch) {
            systemPrompt += `\n\nWeb search enabled.`
        } else if (chatWithAPI) {
            systemPrompt += `\n\nAPI integration active.`
        }

        if (dropbox) {
            systemPrompt += ` Dropbox connected.`
        }

        // Canvas mode system prompt is injected after intent detection (see below)

        // STRIPE CONNECT INSTRUCTIONS (concise)
        systemPrompt += `\n\n## Stripe Invoices\nUse \`create_stripe_connect_invoice\` with: customerName, customerEmail, amount, description. Returns payment link + PDF.`

        if (chatType === "ASSISTANT" && chat.assistant?.instructions) {
            systemPrompt += `\n\n## Assistant-Specific Instructions\n${chat.assistant.instructions}`
        }

        if (attachments?.length > 0) {
            systemPrompt += `\n\n## Attachments\nImages/PDFs attached. Use when user references them.`

            const extractedTexts: string[] = []
            for (const attachment of attachments) {
                if (upstageService.isSupportedFileType(attachment.type) && attachment.url) {
                    try {
                        const extracted = await upstageService.extractFromUrl(attachment.url)
                        if (extracted.text) {
                            // Truncate long texts for speed
                            const truncatedText = extracted.text.length > 30000 
                                ? extracted.text.substring(0, 30000) + "\n...(truncated)"
                                : extracted.text
                            extractedTexts.push(`\n--- ${attachment.name} ---\n${truncatedText}\n--- End ---`)
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

            // Obvious image creation (check first to avoid false positives)
            if (/\b(draw|sketch|image of|picture of|photo of|generate.*image|create.*image|make.*image|design.*logo|illustrat)/i.test(msg)) {
                return 'CREATE_IMAGE'
            }

            // STRIPE INVOICE DETECTION - Don't auto-canvas for payment invoices
            // If message mentions payment-related terms with invoice, let AI handle with Stripe tool
            if (/invoice/i.test(msg) && /(\$|€|£|\d+\s*(dollars?|euros?|chf|usd|eur)|payment|charge|bill|send.*to|email.*to|customer)/i.test(msg)) {
                // Exception: Swiss QR invoices should use canvas (visual artifact)
                if (/\b(swiss|suisse|qr.*invoice|qr.*facture|qr.*bill|bulletin.*versement|récépissé)\b/i.test(msg)) {
                    return 'CREATE_CANVAS'
                }
                return 'QUESTION' // Let AI decide - it will use Stripe tool
            }

            // Swiss QR Invoice detection - Always canvas mode
            if (/\b(swiss|suisse|qr.*invoice|qr.*facture|qr.*bill|bulletin.*versement|récépissé|qr code invoice)\b/i.test(msg)) {
                return 'CREATE_CANVAS'
            }

            // Obvious canvas/visual creation (excluding payment invoices handled above)
            if (/^(create|make|build|design|draft|generate|write me|code|show me|give me|develop)\s+(a |an |me )?(quote|invoice|contract|proposal|dashboard|landing page|webpage|website|page|document|letter|report|presentation|form|calculator|app|tool|component|widget|example|demo|prototype|mockup|template)/i.test(msg)) {
                return 'CREATE_CANVAS'
            }

            // Code/HTML/Web-related creation requests
            if (/\b(html|css|javascript|react|vue|svelte|component|ui|frontend|webpage)\b/i.test(msg) && /\b(create|make|build|show|example|demo|code|write|generate|design)/i.test(msg)) {
                return 'CREATE_CANVAS'
            }

            // Questions asking for code examples or demonstrations
            if (/(show me|give me|can you (show|create|make)|example of|demo of|code for|how to (create|make|build)).*\b(html|css|form|page|component|button|navbar|footer|card|modal|website)/i.test(msg)) {
                return 'CREATE_CANVAS'
            }

            // Strong creation signals without specific type
            if (/^(create|make|build|design|draft|generate|code|develop)\s+(a |an |me )/i.test(msg)) {
                return 'CREATE_CANVAS' // Default creation to canvas
            }

            // Obvious questions - has question mark or starts with question words (check last to allow canvas patterns to match first)
            if (msg.endsWith('?') || /^(what|how|why|when|where|who|is |are |can you explain|tell me about)/i.test(msg)) {
                // But if it's asking for code/HTML examples, treat as canvas
                if (/(html|code|example|component|create|build)/i.test(msg)) {
                    return 'CREATE_CANVAS'
                }
                return 'QUESTION'
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
        // IMAGE INTENT (use existing pattern detection, no redundant API call)
        // ============================================
        const hasImageIntent = isImageIntentFromPattern
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
                systemPrompt += `\n\n## Canvas Mode - HTML Output Required

${!canvas ? 'Note: Auto-enabled for visual creation.\n\n' : ''}**RULES:**
1. Output complete HTML page in \`\`\`html code block
2. All CSS inline in <style>, all JS inline in <script>
3. No external CDN - write custom styles
4. Make it visually appealing

**Format:**
\`\`\`html
<!DOCTYPE html>
<html><head><style>/* styles */</style></head>
<body><!-- content --></body></html>
\`\`\`

${swissQRInvoiceInstructions}`
            } else {
                // ── TEXT / QUESTION CANVAS: output rich markdown in a canvas block ──
                systemPrompt += `\n\n## Canvas Mode - Markdown Output

Write response in \`\`\`canvas block with rich markdown formatting.

**Format:**
\`\`\`canvas
# Your Response
Content here...
\`\`\`
`
            }
        }

        // Add artifact context
        if (artifact) {
            systemPrompt += `\n\n## Artifact: "${artifact.name}"\n\n\`\`\`html\n${artifact.htmlContent}\n\`\`\`\n${artifact.instructions ? `\nInstructions: ${artifact.instructions}\n` : ''}\n\n**Actions:**\n- Questions → Answer without modifying\n- Changes → Use \`update_artifact(updatedCode, changeDescription, changeSummary)\`\n\n${await getArtifactUpdateCodingPrompt()}`
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

        // ============================================
        // SMART MODEL ROUTING (based on complexity)
        // ============================================
        function classifyComplexity(message: string, hasAttachments: boolean, isCanvas: boolean, isResearch: boolean): 'fast' | 'medium' | 'complex' | 'heavy' {
            const msg = message.toLowerCase()
            
            // Fast model for simple queries (100-300ms)
            if (!hasAttachments && !isCanvas && !isResearch) {
                // Simple greetings
                if (/^(hi|hello|hey|thanks|thank you|okay|ok|yes|no|sure)$/i.test(msg.trim())) {
                    return 'fast'
                }
                // Short questions without code keywords
                if (msg.length < 100 && msg.includes('?') && 
                    !/\b(code|function|component|implement|refactor|build|create|generate)\b/i.test(msg)) {
                    return 'fast'
                }
                // Simple requests
                if (/^(what is|who is|when is|where is|define|explain simply)\b/i.test(msg)) {
                    return 'fast'
                }
            }
            
            // Heavy model for complex artifacts (2-5s)
            if (isCanvas || artifact) {
                return 'heavy'
            }
            
            // Complex model for coding/refactoring (1-3s)
            if (/\b(refactor|optimize|architect|design pattern|algorithm|performance|debug|fix bug|implement feature)\b/i.test(msg)) {
                return 'complex'
            }
            
            // Complex model for research
            if (isResearch) {
                return 'complex'
            }
            
            // Medium model for general coding (500-1000ms)
            if (/\b(code|function|component|api|endpoint|database|query)\b/i.test(msg)) {
                return 'medium'
            }
            
            // Default: medium for conversational responses
            return 'medium'
        }
        
        const complexity = classifyComplexity(lastUserMessage, attachments?.length > 0, effectiveCanvasMode, research)
        
        let model: string
        switch (complexity) {
            case 'fast':
                model = 'gpt-5-nano'  // 100-300ms
                break
            case 'medium':
                model = 'gpt-4.1-mini'  // 500-1000ms
                break
            case 'complex':
                model = 'gpt-4.1'  // 1-3s
                break
            case 'heavy':
                model = 'gpt-5'  // 2-5s
                break
            default:
                model = 'gpt-4.1-mini'
        }
        
        console.log(`[Chat] Model selected: ${model} (complexity: ${complexity})`)

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
        // Use 'low' effort for faster responses (medium/high adds significant latency)
        const needsReasoning = canvas || research || artifact

        providerOptions.openai = {
            ...providerOptions.openai,
            store: true,
            metadata: {
                chatId: chatIdInt.toString(),
                userId: session.user.id
            },
            // Only add reasoning for heavy tasks, use low effort for speed
            ...(needsReasoning && complexity === 'heavy' && {
                reasoningSummary: 'auto',
                reasoningEffort: 'low', // Low effort for faster responses
            })
        }

        // ============================================
        // STREAM TEXT WITH AI SDK
        // ============================================

        // Track partial content for abort handling
        let partialContent = ""
        let partialReasoning = ""
        let streamAborted = false

        // Adjust temperature based on complexity
        const temperature = complexity === 'fast' ? 0.9 : (complexity === 'medium' ? 0.8 : 0.7)

        const result = streamText({
            model: ai_sdk_openai(model),
            system: systemPrompt,
            messages: await convertToModelMessages(conversationMessages),
            tools,
            providerOptions,
            temperature, // Dynamic temperature based on complexity
            abortSignal: req.signal, // Pass abort signal from request
            // Disable telemetry for fast queries to reduce overhead
            ...(complexity !== 'fast' && {
                experimental_telemetry: {
                    isEnabled: true,
                    functionId: 'stream-text',
                }
            }),
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