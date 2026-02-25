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
import { createStripeConnectInvoice } from "@/lib/services/stripe-connect-invoice.service"
import {
    streamText,
    tool,
    convertToModelMessages,
    type UIMessage,
    type InferUITools,
    type ToolSet,
    stepCountIs
} from "ai"
import { z } from "zod"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 300

/**
 * Save base64 image to S3 and return public URL
 */
async function saveImageToS3(
    base64Image: string,
    chatId: number,
    imageIndex: number,
    mimeType: string = "image/webp"
): Promise<string | null> {
    try {
        const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, "")
        const imageBuffer = Buffer.from(base64Data, "base64")
        const timestamp = Date.now()
        const extension = mimeType.split('/')[1] || 'webp'
        const fileName = `image-${timestamp}-${imageIndex}.${extension}`

        const uploadResult = await safeUploadToS3(
            imageBuffer,
            fileName,
            mimeType,
            `chat-images/chat-${chatId}`
        )

        if (uploadResult.success && uploadResult.url) {
            console.log(`[Chat] ✅ Saved image ${imageIndex + 1} to S3: ${uploadResult.url}`)
            return uploadResult.url
        } else {
            console.warn(`[Chat] ⚠️ Failed to save image ${imageIndex + 1}`)
            return null
        }
    } catch (error) {
        console.error(`[Chat] ❌ Error saving image:`, error)
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
        const conversationMessages: UIMessage[] = (clientMessages || []).map((msg: any, msgIndex: number) => {
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

                    // Handle images
                    if (mimeType?.startsWith('image/')) {
                        console.log(`[Chat] Adding image attachment: ${name}`)
                        parts.push({
                            type: "image" as const,
                            image: url,
                        })
                    }
                    // Handle PDFs
                    else if (mimeType === 'application/pdf') {
                        console.log(`[Chat] Adding PDF attachment: ${name}`)
                        parts.push({
                            type: "file" as const,
                            data: url,
                            mediaType: "application/pdf" as const,
                            filename: name,
                        })
                    }
                    // Handle other document types that might be viewable
                    else if (mimeType?.includes('document') || mimeType?.includes('text')) {
                        console.log(`[Chat] Adding document attachment: ${name} (${mimeType})`)
                        // For other documents, we rely on Upstage extraction in system prompt
                        // but we can still try to pass them if the model supports it
                    }
                }
            }

            return {
                id: msg.id || crypto.randomUUID(),
                role: msg.role as "user" | "assistant",
                parts
            }
        })

        // Build system prompt
        let systemPrompt = await getSystemPrompt()

        // Inject current date & time so the AI is always aware of when it is
        const _now = new Date()
        const _dateBlock = [
          `## 📅 Current Date & Time`,
          `- **Date**: ${_now.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}`,
          `- **Time (UTC)**: ${_now.toUTCString()}`,
          `- **ISO 8601**: ${_now.toISOString()}`,
        ].join("\n")
        systemPrompt = _dateBlock + "\n\n" + systemPrompt

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

        if (canvas) {
            systemPrompt += `\n\nIMPORTANT: Canvas mode is active. The user wants rich visual HTML output. You MUST respond with a complete, self-contained HTML page that includes all CSS and JavaScript inline. Wrap the entire HTML document in a single \`\`\`html code block. Do not explain — just output the HTML code block directly.`
        }

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

        const hasImageIntent = classifierResponse.output_text?.trim().toLowerCase() === "true"
        const hasImageAttachments = attachments?.some((att: { type: string }) => att.type.startsWith('image/'))
        const shouldUseIterativeEditing = hasImageIntent && previousResponseId && lastAssistantMessage?.hasImages && !hasImageAttachments

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
                if (!cId || cId === assistantId?.toString()) continue
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
        // BUILD TOOLS FOR AI SDK
        // ============================================

        const tools: ToolSet = {}
        let model = "gpt-5"

        // 1. Stripe Connect Invoice Tool (Custom Function)
        tools.create_stripe_connect_invoice = tool({
            description: "Create an invoice on the user's connected Stripe account and generate a PDF. The invoice will be created on the user's Stripe Connect account so they receive payments directly.",
            inputSchema: z.object({
                customerName: z.string().describe("Customer's full name"),
                customerEmail: z.string().email().describe("Customer's email address"),
                amount: z.number().describe("Invoice amount in dollars (e.g., 100.50)"),
                description: z.string().describe("Description of service/product"),
                currency: z.string().optional().describe("Currency code (defaults to 'chf')"),
                daysUntilDue: z.number().optional().describe("Days until due (defaults to 7)")
            }),
            execute: async ({ customerName, customerEmail, amount, description, currency, daysUntilDue }) => {
                console.log(`[Chat] 💳 Creating Stripe Connect invoice`)

                try {
                    const result = await createStripeConnectInvoice({
                        userId: BigInt(session.user.id),
                        customerName,
                        customerEmail,
                        amount,
                        description,
                        currency: currency || "chf",
                        daysUntilDue: daysUntilDue || 7,
                        artifactHtml: artifact?.htmlContent
                    })

                    if (!result.success) {
                        return `⚠️ **Stripe Account Required**\n\n${result.error}\n\nTo create invoices, please connect your Stripe account in profile settings.`
                    }

                    return `✅ **Invoice Created Successfully**\n\n**Customer:** ${customerName} (${customerEmail})\n**Amount:** ${result.amountDue} ${result.currency?.toUpperCase()}\n**Description:** ${description}\n\n**Payment Link:** ${result.stripeInvoiceUrl}\n**PDF Invoice:** ${result.pdfUrl}\n\nShare the payment link with ${customerName} to receive payment.`
                } catch (error: any) {
                    console.error(`[Chat] ❌ Invoice error:`, error)
                    return `⚠️ **Failed to Create Invoice**\n\nError: ${error.message}\n\nPlease try again or contact support.`
                }
            }
        })

        console.log(hasImageIntent, hasImageAttachments, shouldUseIterativeEditing)

        tools.image_generation = tool({
            description: "Generate an image using DALL-E-3 based on a text prompt. Use this tool whenever the user asks for an image, visual, or drawing. adn editing the image.",
            inputSchema: z.object({
                prompt: z.string().describe("The descriptive prompt for the image generation"),
            }),
            execute: async ({ prompt }) => {
                console.log(`[Chat] 🎨 Custom tool generating image: ${prompt}`)
                try {
                    const response = await openaiClient.images.generate({
                        model: "gpt-image-1.5",
                        prompt,
                        n: 1,
                        size: "1024x1024",
                        response_format: "b64_json"
                    });

                    const base64Image = response.data?.[0]?.b64_json;
                    if (!base64Image) throw new Error("No image data returned from OpenAI");

                    const imageUrl = await saveImageToS3(
                        base64Image,
                        chatIdInt || 0,
                        0,
                        'image/png'
                    )

                    if (!imageUrl) throw new Error("Failed to save image to S3");

                    console.log(`[Chat] ✅ Custom tool generated and saved image: ${imageUrl}`)
                    return { url: imageUrl };
                } catch (error: any) {
                    console.error(`[Chat] ❌ Custom tool image generation failed:`, error)
                    return { error: error.message };
                }
            }
        })

        // 2. Artifact Update Tool (Custom Function)
        if (artifact) {
            tools.update_artifact = tool({
                description: `Update the current artifact "${artifact.name}" with new HTML code.`,
                inputSchema: z.object({
                    updatedCode: z.string().describe("Complete updated HTML code"),
                    changeDescription: z.string().describe("What changed and why"),
                    changeSummary: z.string().describe("One-line summary")
                }),
                execute: async ({ updatedCode, changeDescription, changeSummary }) => {
                    console.log(`[Chat] 🎨 Updating artifact: ${artifact.name}`)

                    try {
                        const { createArtifactVersion } = await import("@/app/actions/update-artifact.action")

                        const versionResult = await createArtifactVersion({
                            artifactId: parseInt(artifact.id),
                            userId: BigInt(session.user.id),
                            code: updatedCode,
                            description: changeDescription,
                            changeType: 'ai',
                            setAsActive: true
                        })

                        if (!versionResult.success) {
                            throw new Error(versionResult.error || "Failed to create artifact version")
                        }

                        console.log(`[Chat] ✅ Artifact updated. Version: ${versionResult.version?.versionNumber}`)

                        return `✅ **Artifact Updated Successfully**\n\n**Version:** ${versionResult.version?.versionNumber}\n**Change:** ${changeSummary}\n\nThe artifact "${artifact.name}" has been updated.`
                    } catch (error: any) {
                        console.error(`[Chat] ❌ Artifact update error:`, error)
                        return `⚠️ **Failed to Update Artifact**\n\nError: ${error.message}\n\nPlease try again or check your permissions.`
                    }
                }
            })
        }

        // 3. API Tools (from OpenAPI schemas)
        if (apiTools.length > 0) {
            for (const apiTool of apiTools) {
                const toolName = apiTool.openaiTool.name
                const inputSchema = z.object(
                    Object.fromEntries(
                        Object.entries(apiTool.openaiTool.parameters.properties || {}).map(([key, prop]: [string, any]) => [
                            key,
                            prop.type === "string" ? z.string().describe(prop.description || "") :
                                prop.type === "number" ? z.number().describe(prop.description || "") :
                                    prop.type === "boolean" ? z.boolean().describe(prop.description || "") :
                                        z.any().describe(prop.description || "")
                        ])
                    )
                )

                tools[toolName] = tool({
                    description: apiTool.openaiTool.description,
                    inputSchema,
                    execute: async (args: any) => {
                        console.log(`[Chat] Executing API tool: ${toolName}`)

                        try {
                            const result = await executeAPITool(apiTools, toolName, args)
                            console.log(`[Chat] ✅ API tool executed`)

                            // Let AI SDK handle the result - it will automatically be added to conversation
                            return JSON.stringify(result, null, 2)
                        } catch (error: any) {
                            console.error(`[Chat] ❌ API tool error:`, error)
                            return `API call failed: ${error.message}`
                        }
                    }
                })
            }
        }

        // 4. OpenAI Web Search Tool
        if (webSearch || research) {
            tools.web_search = ai_sdk_openai.tools.webSearch({})
        }

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

        // Store option
        providerOptions.openai = {
            ...providerOptions.openai,
            reasoningSummary: 'auto',
            reasoningEffort: 'medium',
            store: true,
            metadata: {
                chatId: chatIdInt.toString(),
                userId: session.user.id
            }
        }

        // ============================================
        // STREAM TEXT WITH AI SDK
        // ============================================

        const result = streamText({
            model: ai_sdk_openai(model),
            system: systemPrompt,
            messages: await convertToModelMessages(conversationMessages),
            tools,
            providerOptions,
            stopWhen: stepCountIs(5),
            experimental_telemetry: {
                isEnabled: true,
                functionId: 'stream-text',
            },
        })

        const getUsage = async () => await result.usage
        let generatedImageUrls: string[] = []

        // Convert to UI message stream with message metadata for usage tracking
        return result.toUIMessageStreamResponse({
            sendReasoning: true,
            sendSources: true,
            onFinish: async ({ messages, responseMessage }) => {
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