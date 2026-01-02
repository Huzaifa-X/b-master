// app/api/chat/stream/route.ts
import { NextRequest } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { openai } from "@/lib/openai"
import upstageService from "@/lib/services/upstageService"
import { getArtifactCodingPrompt, getSystemPrompt } from "@/utils/prompts"
import { safeUploadToS3 } from "@/lib/aws-s3"
import { OpenAPITool } from "@/lib/openapi-tool-converter"
import { executeAPITool, loadAPITools, toOpenAIToolDefinitions } from "@/lib/api-tools-loader"
import { decrypt } from "@/lib/encryption"
import { generateInvoicePDFFromData } from "@/lib/services/invoice-pdf-service"
import { generatePDFFromHTML } from "@/lib/services/pdf-generator"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * Save base64 image to S3 and return public URL (or null if upload fails)
 * Uses safe upload to prevent chat from failing if S3 is unavailable
 */
async function saveImageToS3(
  base64Image: string,
  chatId: number,
  imageIndex: number
): Promise<string | null> {
  try {
    const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, "")
    const imageBuffer = Buffer.from(base64Data, "base64")
    const timestamp = Date.now()
    const fileName = `image-${timestamp}-${imageIndex}.png`

    const uploadResult = await safeUploadToS3(
      imageBuffer,
      fileName,
      "image/png",
      `chat-images/chat-${chatId}`
    )

    if (uploadResult.success && uploadResult.url) {
      console.log(`[Stream] ✅ Saved image ${imageIndex + 1} to S3: ${uploadResult.url}`)
      return uploadResult.url
    } else {
      console.warn(`[Stream] ⚠️ Failed to save image ${imageIndex + 1} to S3: ${uploadResult.error}. Chat will continue without image URL.`)
      return null
    }
  } catch (error) {
    console.error(`[Stream] ❌ Error saving image ${imageIndex + 1}:`, error)
    return null
  }
}

/**
 * Stream assistant response using Server-Sent Events
 */
export async function POST(req: NextRequest) {
  const encoder = new TextEncoder()

  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })
    }

    const body = await req.json()
    const { chatId, assistantId, chatType, webSearch, research, chatWithAPI, attachments, artifact, dropbox, mentionedUsers } = body

    console.log("[Stream] mentionedUsers:", mentionedUsers)
    const chatIdInt = parseInt(chatId)
    if (isNaN(chatIdInt)) {
      return new Response(JSON.stringify({ error: "Invalid chatId" }), { status: 400 })
    }

    // Get chat with full context
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
        },
        messages: {
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            role: true,
            message: true,
            documents: true,
            openaiResponseId: true,
            hasImages: true,
            createdAt: true,
          }
        }
      }
    })

    if (!chat) {
      return new Response(JSON.stringify({ error: "Chat not found" }), { status: 404 })
    }

    // Update user message status to PROCESSING
    const lastUserMessageRecord = await prisma.assistantUserChatMessage.findFirst({
      where: {
        assistantUserChatId: chatIdInt,
        role: "user"
      },
      orderBy: { createdAt: 'desc' }
    })

    if (lastUserMessageRecord && lastUserMessageRecord.status === "PENDING") {
      await prisma.assistantUserChatMessage.update({
        where: { id: lastUserMessageRecord.id },
        data: { status: "PROCESSING" }
      })
      console.log("[Stream] Updated user message status to PROCESSING")
    }

    // Build system prompt
    let systemPrompt = await getSystemPrompt()

    // Add mentioned users context
    if (mentionedUsers && mentionedUsers.length > 0) {
      systemPrompt += `\n\n## Mentioned Users\nWhen you see "[This message mentions: Name <email>]" at the start of a user message, those are people the user has specifically mentioned using @ mentions. You have their full contact information (name and email). Use this information when relevant - for example, if the user asks you to create an invoice for someone, send an email, or perform any action involving the mentioned person, you already have their email address and don't need to ask for it.`
      systemPrompt += `\n\n## Mentioned Users\n${mentionedUsers.map((user: { name: string; email: string }) => `- ${user.name} <${user.email}>`).join("\n")}`
    }

    if (research) {
      systemPrompt += `\n\nIMPORTANT: The user has requested research mode. Please conduct thorough research using both web search and file search to provide a comprehensive answer.`
    } else if (webSearch) {
      systemPrompt += `\n\nIMPORTANT: The user has requested web search. Please search the web for current information to answer their question.`
    } else if (chatWithAPI) {
      systemPrompt += `\n\nIMPORTANT: The user has requested chat with API. Please use the API to answer their question.`
    }

    if (dropbox) {
      systemPrompt += `\n\nIMPORTANT: The user has enabled Dropbox integration. You can access their Dropbox files and perform file operations.`
    }

    // ==========================================
    // FINAL PRODUCTION-READY STRIPE INVOICE PROMPT
    // Replace lines 132-195 in app/api/chat/stream/route.ts
    // ==========================================

    // Add Stripe invoice creation instructions
    systemPrompt += `\n\n## Stripe Invoice Creation Workflow

      When the user requests invoice creation, execute the Stripe MCP workflow immediately.

      Follow these exact Stripe MCP calls in sequence:

      ### 🎯 Complete Invoice Flow (6 Steps)

      **Step 1: Get or Create Customer**
      - Tool: \`create_customer\` or search with \`search_stripe_resources\`
      - Required: email, name
      - Returns: \`customer_id\` (e.g., "cus_...")

      **Step 2: Create Product**
      - Tool: \`create_product\`
      - Required: name (e.g., "SEO Career Support - Basic Package")
      - Optional: description
      - Returns: \`product_id\` (e.g., "prod_...")

      **Step 3: Create ONE-TIME Price**
      - Tool: \`create_price\`
      - Required parameters ONLY:
        - \`product\`: "prod_..." (from Step 2)
        - \`unit_amount\`: amount in cents (e.g., 2000 = 20.00 CHF)
        - \`currency\`: lowercase code (e.g., "chf", "usd", "eur")
      - **CRITICAL:** Do NOT include \`recurring\` parameter - omitting it creates a one-time price
      - **WRONG:** \`{product, unit_amount, currency, recurring: {interval: "month"}}\` ❌
      - **CORRECT:** \`{product, unit_amount, currency}\` ✅ (no recurring field!)
      - Returns: \`price_id\` (e.g., "price_...")

      **Step 4: Create Draft Invoice**
      - Tool: \`create_invoice\`
      - Required: \`customer\` (customer_id from Step 1)
      - Optional: \`days_until_due\` (e.g., 7 for Net 7 terms), \`description\`
      - Returns: \`invoice_id\` (e.g., "in_...")

      **Step 5: Add Line Item to Invoice**
      - Tool: \`create_invoice_item\`
      - Required:
        - \`invoice\`: invoice_id from Step 4
        - \`price\`: price_id from Step 3
      - Optional: \`quantity\` (default: 1)
      - Returns: Line item added to draft invoice

      **Step 6: Finalize Invoice**
      - Tool: \`finalize_invoice\`
      - Required: \`invoice\` (invoice_id from Step 4)
      - Returns: Finalized invoice with status "open" and \`hosted_invoice_url\` for payment

      ### ✅ Correct MCP Tool Call Example

      \`\`\`json
      // Step 3: Create ONE-TIME Price (CORRECT)
      {
        "name": "create_price",
        "arguments": {
          "product": "prod_Th1bJ3LBv7PTiQ",
          "unit_amount": 2000,
          "currency": "chf"
        }
      }
      // ✅ This creates a one-time price because "recurring" is omitted
      \`\`\`

      ### ❌ Common Mistakes to AVOID

      \`\`\`json
      // ❌ WRONG - Don't add "type" parameter
      {
        "name": "create_price",
        "arguments": {
          "product": "prod_...",
          "unit_amount": 2000,
          "currency": "chf",
          "type": "one_time"  // ❌ This parameter doesn't exist in Stripe API!
        }
      }

      // ❌ WRONG - Don't add "recurring" for invoices
      {
        "name": "create_price",
        "arguments": {
          "product": "prod_...",
          "unit_amount": 2000,
          "currency": "chf",
          "recurring": { "interval": "month" }  // ❌ This creates a subscription price!
        }
      }
      \`\`\`

      ### 📋 Complete Real-World Example

      **User Request:** "Create invoice for Hassan (hassanmuzaffar100@gmail.com) for 20 CHF for SEO career support"

      **Correct MCP Call Sequence:**

      \`\`\`json
      // 1. Create customer (or retrieve if exists)
      {
        "name": "create_customer",
        "arguments": {
          "email": "hassanmuzaffar100@gmail.com",
          "name": "M Hassan Muzaffar"
        }
      }
      // → Returns: { "id": "cus_Tfi1ZIvpa60tGx", ... }

      // 2. Create product
      {
        "name": "create_product",
        "arguments": {
          "name": "SEO Career Support - Basic Package"
        }
      }
      // → Returns: { "id": "prod_Th1bJ3LBv7PTiQ", ... }

      // 3. Create one-time price (NO recurring field!)
      {
        "name": "create_price",
        "arguments": {
          "product": "prod_Th1bJ3LBv7PTiQ",
          "unit_amount": 2000,
          "currency": "chf"
        }
      }
      // → Returns: { "id": "price_...", "type": "one_time", ... }

      // 4. Create draft invoice
      {
        "name": "create_invoice",
        "arguments": {
          "customer": "cus_Tfi1ZIvpa60tGx",
          "days_until_due": 7,
          "description": "Invoice for SEO Career Support - Basic Package"
        }
      }
      // → Returns: { "id": "in_1SjdYqGwVMSCaO58lIzPCRA4", "status": "draft", ... }

      // 5. Add line item
      {
        "name": "create_invoice_item",
        "arguments": {
          "invoice": "in_1SjdYqGwVMSCaO58lIzPCRA4",
          "price": "price_...",
          "quantity": 1
        }
      }
      // → Returns: { "invoice": "in_...", "amount": 2000, ... }

      // 6. Finalize invoice
      {
        "name": "finalize_invoice",
        "arguments": {
          "invoice": "in_1SjdYqGwVMSCaO58lIzPCRA4"
        }
      }
      // → Returns: {
      //   "id": "in_1SjdYqGwVMSCaO58lIzPCRA4",
      //   "amount_due": 2000,
      //   "currency": "chf",
      //   "hosted_invoice_url": "https://invoice.stripe.com/i/...",
      //   "status": "open"
      // }
      \`\`\`

      ### 💡 Important Notes

      **Amount Format:**
      - Always in cents (smallest currency unit)
      - 2000 = 20.00 CHF
      - 150000 = 1,500.00 USD
      - Formula: amount_in_dollars × 100

      **Currency Codes:**
      - Must be lowercase 3-letter ISO code
      - Examples: "chf", "usd", "eur", "gbp", "cad"

      **Invoice Status Flow:**
      - "draft" → Created but not finalized
      - "open" → Finalized and ready for payment
      - "paid" → Customer paid
      - "void" → Canceled

      **Why Finalization is Critical:**
      - Draft invoices have \`amount_due: null\`
      - Finalization calculates totals, taxes, discounts
      - Only finalized invoices get \`hosted_invoice_url\`
      - Only finalized invoices can be paid
      - Always finalize invoices before sharing with customers

      **Multi-Line Invoices:**
      For multiple line items, repeat Steps 2-3 for each item, then add all items in Step 5:
      \`\`\`json
      // Add first item
      { "name": "create_invoice_item", "arguments": { "invoice": "in_...", "price": "price_1", "quantity": 1 }}

      // Add second item
      { "name": "create_invoice_item", "arguments": { "invoice": "in_...", "price": "price_2", "quantity": 1 }}

      // Then finalize
      { "name": "finalize_invoice", "arguments": { "invoice": "in_..." }}
      \`\`\`

      After finalizing, share the \`hosted_invoice_url\` with the customer for payment! 🎉`

    // ==========================================
    // END OF STRIPE INVOICE PROMPT
    // ==========================================

    // Add artifact information if provided
    if (artifact) {
      systemPrompt += `\n\n## 🎨 Artifact Context & Update Capability

      **The user has shared an artifact named "${artifact.name}" in this conversation.**

      ### Artifact Content:
      \`\`\`html
      ${artifact.htmlContent}
      \`\`\`
      ${artifact.instructions ? `\n### Original Instructions:\n${artifact.instructions}\n` : ''}

      ### Your Role with This Artifact:

      **CRITICAL: Understand User Intent First**

      Before responding, analyze what the user is asking:

      1. **Information Questions** (e.g., "What does this do?", "How does the button work?", "Explain this code"):
        - DO NOT modify the artifact
        - Provide clear explanations about the artifact's functionality
        - Reference specific parts of the code when explaining
        - Answer their questions directly without making changes

      2. **Modification Requests** (e.g., "Change the color to blue", "Add a counter", "Fix the button", "Make it responsive"):
        - Use the update_artifact function to implement the changes
        - Explain what you're changing BEFORE making the update
        - After updating, clearly describe what was changed and why
        - Provide a concise summary of the modifications

      3. **Debugging/Help Requests** (e.g., "This isn't working", "Why is it broken?", "Help me fix this"):
        - First, analyze and explain the issue
        - If a fix is needed AND user confirms, then update
        - If unclear whether to update, ASK the user first

      4. **General Conversation** (e.g., "Thanks!", "That looks good", "Hello"):
        - Respond naturally without modifying the artifact
        - Acknowledge their message appropriately

      ### Updating the Artifact:

      When you determine the user wants modifications:
      - Call the \`update_artifact\` function with:
        - \`updatedCode\`: Complete updated HTML (include ALL code, not just changes)
        - \`changeDescription\`: Detailed explanation of what changed and why
        - \`changeSummary\`: One-line summary (e.g., "Changed button color to blue")

      ### Key Principles:
      - **Don't over-update**: If they ask a question, answer it - don't modify the code unless explicitly requested
      - **Be explicit**: If you're updating, say "I'll update the artifact to..." BEFORE calling the function
      - **Confirm uncertain requests**: If unclear whether to modify, ask for confirmation
      - **Preserve functionality**: When updating, maintain existing features unless told to remove them

      ${await getArtifactCodingPrompt()}`
    }

    if (chatType === "ASSISTANT" && chat.assistant?.instructions) {
      systemPrompt += `\n\n## Assistant-Specific Instructions\n${chat.assistant.instructions}`
    }

    // Prepare conversation history
    const conversationMessages = chat.messages
      .filter(msg => msg.message)
      .map((msg) => {
        let content = msg.message || ""

        // Add mentioned users to message context
        if (msg.role === "user" && msg.documents) {
          try {
            const documentsData = JSON.parse(msg.documents)
            if (documentsData.mentionedUsers && Array.isArray(documentsData.mentionedUsers) && documentsData.mentionedUsers.length > 0) {
              const mentionsList = documentsData.mentionedUsers
                .map((u: { name: string; email: string }) => `${u.name} <${u.email}>`)
                .join(', ')
              content = `[This message mentions: ${mentionsList}]\n\n${content}`
            }
          } catch (e) {
            // Ignore parse errors
          }
        }

        return {
          role: msg.role as "user" | "assistant" | "system",
          content
        }
      })

    const lastUserMessageIndex = conversationMessages
      .map((msg, idx) => msg.role === "user" ? idx : -1)
      .filter(idx => idx !== -1)
      .pop()

    const lastUserMessage = lastUserMessageIndex !== undefined
      ? conversationMessages[lastUserMessageIndex].content
      : ""

    // Extract content from attachments
    const attachmentsToProcess = attachments || []
    let extractedContent = ""
    let enhancedUserMessage = lastUserMessage

    if (attachmentsToProcess.length > 0) {
      enhancedUserMessage += `## User Attachments Handling Rules 
      
      The user may attach one or more files (images, PDFs, documents, or other assets).

      - **Images**:
        - If the user explicitly asks to use the attached image, **use the provided image URL directly in the code** (do not recreate, summarize, or describe the image unless asked).
        - If the user does not ask to use the image, ignore it.

      - **PDFs, DOC/DOCX, TXT, or similar documents**:
        - If the user asks to use the content, **extract and use the text content** from the attachment.
        - If the user explicitly asks to reference the file itself, **use the attachment URL instead of extracted content**.
        - If no instruction is given, prefer **extracted content** over the URL.

      - **Other file types**:
        - Follow the user’s explicit instruction.
        - If unclear, use the attachment URL and do not assume content structure.

      Only use attachments **when the user explicitly indicates they should be used**.  
      Never hallucinate attachment contents.  
      Never modify or invent URLs.
      `
      const extractedTexts: string[] = []
      for (const attachment of attachmentsToProcess) {
        if (upstageService.isSupportedFileType(attachment.type) && attachment.url) {
          try {
            const extracted = await upstageService.extractFromUrl(attachment.url)
            if (extracted.text) {
              extractedTexts.push(`\n\n--- Content from ${attachment.name} \n url: ${attachment.url} \n type: ${attachment.type} ---\n${extracted.text}\n--- End of ${attachment.name} ---\n`)
            }
          } catch (error) {
            console.error(`[Stream] Failed to extract from ${attachment.name}:`, error)
          }
        }
      }
      enhancedUserMessage += "\n\n## End of Attachments"
      if (extractedTexts.length > 0) {
        extractedContent = extractedTexts.join("\n\n")
      }
    }

    if (extractedContent && extractedContent.trim()) {
      enhancedUserMessage += `\n\n${extractedContent}`
    }

    // Check for image edit intent and previous response
    const lastAssistantMessage = chat.messages
      .filter(msg => msg.role === "assistant" && msg.openaiResponseId)
      .slice(-1)[0]

    const previousResponseId = lastAssistantMessage?.openaiResponseId || null

    // Classify image edit intent
    const classifierResponse = await openai.responses.create({
      model: "gpt-5-nano",
      input: [
        {
          role: "system",
          content: "You are a classifier. Respond ONLY with 'true' if the user wants to edit or modify an image. Otherwise respond ONLY with 'false'."
        },
        {
          role: "user",
          content: enhancedUserMessage
        }
      ],
    })

    const hasImageEditIntent = classifierResponse.output_text?.trim().toLowerCase() === "true"
    const hasImageAttachments = attachmentsToProcess.some((att: { type: string }) => att.type.startsWith('image/'))
    const shouldUseIterativeEditing = hasImageEditIntent && previousResponseId && lastAssistantMessage?.hasImages && !hasImageAttachments

    // Build conversation context
    const conversationContext = conversationMessages
      .slice(0, -1)
      .map(msg => `${msg.role === "user" ? "User" : "Assistant"}: ${msg.content}`)
      .join("\n\n")

    const fullInput = conversationContext
      ? `${conversationContext}\n\nUser: ${enhancedUserMessage}`
      : `User: ${enhancedUserMessage}`

    const invoicePdfResponse = await openai.responses.create({
      model: "gpt-5.2",
      tools: [
        {
          "type": "function",
          "name": "analyze_invoice_request",
          "description": "Analyze a user message and determine whether they are requesting an invoice to be generated. If yes, extract invoice details. If not, return is_invoice_request as false and all other fields as null.",
          "strict": true,
          "parameters": {
            "type": "object",
            "properties": {
              "is_invoice_request": {
                "type": "boolean",
                "description": "True if the user is asking to generate or create an invoice, otherwise false."
              },
              "name": {
                "type": ["string", "null"],
                "description": "Customer full name for the invoice."
              },
              "email": {
                "type": ["string", "null"],
                "description": "Customer email address for the invoice."
              },
              "price": {
                "type": ["number", "null"],
                "description": "Invoice total amount as a number."
              },
              "description": {
                "type": ["string", "null"],
                "description": "Description of what the invoice is for (services or products)."
              }
            },
            "required": [
              "is_invoice_request",
              "name",
              "email",
              "price",
              "description"
            ],
            "additionalProperties": false
          }
        }
      ],
      input: [
        {
          role: "system",
          content: `You are an assistant that analyzes user messages.

          If the user is requesting an invoice to be generated, call the analyze_invoice_request tool.
          If not, still call the tool and set is_invoice_request to false.

          Do not generate explanations or text.
          Only use the tool.
          `
        },
        {
          role: "user",
          content: enhancedUserMessage
        }
      ],
    })

    const toolCall = invoicePdfResponse.output.find(
      (item) =>
        item.type === "function_call" &&
        item.name === "analyze_invoice_request"
    );

    if (toolCall && toolCall.type === "function_call") {
      const {
        is_invoice_request,
        name,
        email,
        price,
        description,
      } = JSON.parse(toolCall.arguments as string);

      if (is_invoice_request && artifact && artifact.htmlContent) {
        const updatedHtmlResponse = await openai.responses.create({
          model: "gpt-4.1",
          input: `Update the provided invoice HTML template with the following customer details:
            - Customer Name: ${name}
            - Customer Email: ${email}
            - Invoice Amount: ${price}
            - Description: ${description}
            - Currency: USD (or extract from context)
            - Invoice Date: ${new Date().toLocaleDateString()}
            - User Input: ${enhancedUserMessage}

            ## Invoice Template HTML
            \`\`\`html
            ${artifact.htmlContent}
            \`\`\`

            ## Instructions
            1. Find the customer name field in the HTML and update it with "${name}"
            2. Find the customer email field and update it with "${email}"
            3. Find the invoice amount/price field and update it with "${price}"
            4. Find the description/items field and update it with "${description}"
            5. Find the date field and update it with today's date
            6. Update any totals, subtotals, or calculated fields
            7. Preserve ALL existing HTML structure, styles, and classes
            8. Return ONLY the complete updated HTML (no explanations, no markdown)

            ## Important Rules
            - Do NOT add explanations before or after the HTML
            - Do NOT wrap the HTML in markdown code blocks
            - Return the raw HTML ready for PDF generation
            - Ensure all HTML tags are properly closed
            - Preserve all CSS styles and JavaScript if present`
        });

        console.log("updatedHtmlResponse", updatedHtmlResponse.output_text);

        const { pdfUrl } = await generatePDFFromHTML({
          html: updatedHtmlResponse.output_text || "",
          filename: `invoice-${Date.now()}.pdf`,
          s3Folder: "invoices",
        });

        systemPrompt += `
        ## Invoice PDF
        - **URL**: ${pdfUrl}
        - PLease Include this URL in the response to the user as a link.
        - Please Do not update the Artifact.
      `;
      }
      else if (is_invoice_request) {
        const pdfUrl = await generateInvoicePDFFromData({
          customerName: name!,
          customerEmail: email!,
          amount: price!,
          description: description!,
        });

        systemPrompt += `
        ## Invoice PDF
        - **URL**: ${pdfUrl}
        - PLease Include this URL in the response to the user as a link.
      `;
      }
    }

    // Load API tools if needed
    let apiTools: OpenAPITool[] = []

    if (chatWithAPI && assistantId) {
      const toolsResult = await loadAPITools(assistantId.toString())
      if (toolsResult.success) {
        apiTools = toolsResult.tools
        console.log(`[Stream] Loaded ${apiTools.length} API tools`)
      } else {
        console.warn(`[Stream] Failed to load API tools: ${toolsResult.error}`)
      }
    }

    if (apiTools.length > 0) {
      systemPrompt += `\n\n## Available External APIs\n`
      systemPrompt += `You have access to the following external API tools:\n\n`

      apiTools.forEach(tool => {
        systemPrompt += `### ${tool.openaiTool.name}\n`
        systemPrompt += `- **Description**: ${tool.openaiTool.description}\n`
        systemPrompt += `- **Method**: ${tool.metadata.method}\n`
        systemPrompt += `- **Endpoint**: ${tool.metadata.baseUrl}${tool.metadata.path}\n`

        const params = tool.openaiTool.parameters
        if (params.properties && Object.keys(params.properties).length > 0) {
          systemPrompt += `- **Parameters**:\n`
          for (const [name, prop] of Object.entries(params.properties)) {
            const required = params.required?.includes(name) ? '(required)' : '(optional)'
            const propAny = prop as any
            systemPrompt += `  - \`${name}\` ${required}: ${propAny.description || propAny.type}\n`
          }
        }
        systemPrompt += `\n`
      })
      systemPrompt += `Use these tools when the user's question requires data from external APIs.`
    }

    // Build tools array
    const tools: any[] = []

    if (chatType === "ASK_B") {
      tools.push({ type: "web_search" })
      tools.push({ type: "image_generation" })
      tools.push({
        type: "file_search",
        vector_store_ids: [process.env.ASKB_VECTOR_STORE_ID || ""]
      })
    } else {
      tools.push({ type: "web_search" })
      tools.push({ type: "image_generation" })

      // Add Stripe MCP tool
      tools.push({
        type: "mcp",
        server_label: "stripe",
        server_url: "https://mcp.stripe.com",
        authorization: process.env.STRIPE_SECRET_KEY,
        require_approval: "never",
      })

      // Add Dropbox MCP tool if enabled
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

          if (dropboxConnector && dropboxConnector.accessToken) {
            const accessToken = decrypt(dropboxConnector.accessToken)
            tools.push({
              type: "mcp",
              server_label: "Dropbox",
              connector_id: `connector_dropbox`,
              authorization: accessToken,
              require_approval: "never",
            })
            console.log(`[Stream] Added Dropbox MCP tool`)
          }
        } catch (error) {
          console.error("[Stream] Failed to add Dropbox MCP tool:", error)
        }
      }

      // Add API tools
      if (apiTools.length > 0) {
        const apiToolDefs = toOpenAIToolDefinitions(apiTools)
        apiToolDefs.forEach((tool, i) => {
          if (tool.type === "function") {
            if (!tool.name || !tool.parameters) {
              console.error(`[Stream] ❌ Invalid API tool at index ${i}`)
              throw new Error("Invalid function tool shape")
            }
          }
        })
        tools.push(...apiToolDefs)
        console.log(`[Stream] Added ${apiToolDefs.length} API tool definitions`)
      }

      // Add file search if assistant has vector store
      if (assistantId && chat.assistant?.vectorStoreId) {
        tools.push({
          type: "file_search",
          vector_store_ids: [chat.assistant.vectorStoreId]
        })
      }

      // Add artifact update tool
      if (artifact) {
        tools.push({
          type: "function",
          name: "update_artifact",
          description: `Update the current artifact "${artifact.name}" with new HTML code.`,
          parameters: {
            type: "object",
            properties: {
              updatedCode: {
                type: "string",
                description: "The complete updated HTML code for the artifact."
              },
              changeDescription: {
                type: "string",
                description: "What changed and why."
              },
              changeSummary: {
                type: "string",
                description: "One-line summary of the change."
              }
            },
            required: ["updatedCode", "changeDescription", "changeSummary"]
          }
        })
        console.log(`[Stream] ✅ Added artifact update tool`)
      }
    }

    // Prepare input content with images if any
    let inputContent: any = fullInput

    if (hasImageAttachments) {
      const imageAttachments = attachmentsToProcess.filter((att: { type: string }) => att.type.startsWith('image/'))
      const contentParts: any[] = [{ type: "input_text", text: fullInput }]

      for (const imageAtt of imageAttachments) {
        contentParts.push({
          type: "input_image",
          image_url: imageAtt.url
        })
      }

      inputContent = [{ role: "user", content: contentParts }]
    }

    // API params with streaming enabled
    const apiParams: any = {
      model: "gpt-5.2",
      input: inputContent,
      instructions: systemPrompt,
      tools: tools.length > 0 ? tools : undefined,
      tool_choice: "auto",
      stream: true
    }

    if (shouldUseIterativeEditing && previousResponseId) {
      apiParams.previous_response_id = previousResponseId
    }

    // Create streaming response
    const stream = new ReadableStream({
      async start(controller) {
        try {
          console.log("[Stream] Creating OpenAI response with streaming enabled")

          // Send initial connection message
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "connected" })}\n\n`)
          )

          let assistantResponse = ""
          let currentResponseId: string | null = null
          const generatedImageUrls: string[] = []
          const usedTools: string[] = []

          // Create streaming response
          console.log("[Stream] Starting OpenAI stream...")
          const responseStream = await openai.responses.create(apiParams) as any

          // Stream events from OpenAI
          for await (const event of responseStream) {
            console.log("[Stream] Event type:", event.type)

            switch (event.type) {
              case "response.created":
                // Response started
                if (event.response?.id) {
                  currentResponseId = event.response.id
                  console.log("[Stream] Response ID:", currentResponseId)
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify({ type: "response_id", id: currentResponseId })}\n\n`)
                  )
                }
                break

              case "response.output_text.delta":
                // Text chunk received - stream immediately
                if (event.delta) {
                  assistantResponse += event.delta
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify({ type: "text", content: event.delta })}\n\n`)
                  )
                }
                break

              // ==================== IMAGE GENERATION EVENTS ====================

              case "response.image_generation_call.generating":
                // Image generation started
                if (!usedTools.includes("image_generation")) {
                  usedTools.push("image_generation")
                }
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({
                    type: "image_generating_start",
                    itemId: event.item_id
                  })}\n\n`)
                )
                console.log("[Stream] 🎨 Image generation started")
                break

              case "response.image_generation_call.in_progress":
                // Image still generating
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({
                    type: "image_generating_progress",
                    itemId: event.item_id
                  })}\n\n`)
                )
                break

              case "response.image_generation_call.partial_image":
                // Partial preview AND final image (last partial is the final image!)
                if (event.partial_image_b64) {
                  console.log(`[Stream] 🖼️ Partial/Final image received (index: ${event.partial_image_index})`)

                  // Upload to S3 immediately (safe upload - won't fail the chat)
                  const imageUrl = await saveImageToS3(
                    event.partial_image_b64,
                    chatIdInt,
                    generatedImageUrls.length
                  )

                  // Only add and send if upload succeeded
                  if (imageUrl) {
                    generatedImageUrls.push(imageUrl)
                    console.log(`[Stream] ✅ Image ${event.partial_image_index} uploaded: ${imageUrl}`)

                    // Send to frontend with partial flag
                    controller.enqueue(
                      encoder.encode(`data: ${JSON.stringify({
                        type: event.partial_image_index === 0 ? "image_partial" : "image_complete",
                        url: imageUrl,
                        itemId: event.item_id,
                        index: event.partial_image_index,
                        isPartial: event.partial_image_index === 0
                      })}\n\n`)
                    )
                  }
                }
                break

              case "response.image_generation_call.completed":
                // This event rarely fires in Responses API, handled by partial_image instead
                console.log("[Stream] 🎨 Image generation completed event (rare)")
                if (event.b64_json && !generatedImageUrls.some(url => url && url.includes(event.item_id))) {
                  const imageUrl = await saveImageToS3(
                    event.b64_json,
                    chatIdInt,
                    generatedImageUrls.length
                  )

                  // Only add and send if upload succeeded
                  if (imageUrl) {
                    generatedImageUrls.push(imageUrl)
                    controller.enqueue(
                      encoder.encode(`data: ${JSON.stringify({
                        type: "image_complete",
                        url: imageUrl,
                        itemId: event.item_id
                      })}\n\n`)
                    )
                  }
                }
                break

              case "response.output_item.done":
                // Output item completed
                console.log("[Stream] 📦 Output item done event received")
                console.log("[Stream] Item type:", event.item?.type)
                console.log("[Stream] Item status:", event.item?.status)
                console.log("[Stream] Has result?:", !!event.item?.result)
                console.log("[Stream] Has b64_json?:", !!(event.item as any)?.b64_json)
                console.log("[Stream] All item keys:", event.item ? Object.keys(event.item) : 'no item')

                // 1. IMAGE GENERATION COMPLETED (fallback if not caught by completed event)
                if (event.item?.type === "image_generation_call") {
                  console.log("[Stream] 🎨 Processing image_generation_call in output_item.done")

                  // Try multiple possible fields where the image might be
                  const imageData = event.item.result ||
                    (event.item as any).b64_json ||
                    (event.item as any).image ||
                    (event.item as any).output

                  if (event.item.status === "completed" && imageData) {
                    console.log("[Stream] 🎨 Found image data, uploading to S3...")
                    console.log("[Stream] Image data length:", imageData?.length || 0)

                    // Upload to S3 (safe upload - won't fail the chat)
                    const imageUrl = await saveImageToS3(
                      imageData as string,
                      chatIdInt,
                      generatedImageUrls.length
                    )

                    // Only add and send if upload succeeded
                    if (imageUrl) {
                      generatedImageUrls.push(imageUrl)
                      console.log(`[Stream] ✅ Image uploaded: ${imageUrl}`)

                      // Send final image to frontend
                      controller.enqueue(
                        encoder.encode(`data: ${JSON.stringify({
                          type: "image_complete",
                          url: imageUrl,
                          itemId: event.item.id
                        })}\n\n`)
                      )
                    } else if (event.item.status === "failed") {
                      console.error("[Stream] ❌ Image generation failed:", event.item.error)
                      controller.enqueue(
                        encoder.encode(`data: ${JSON.stringify({
                          type: "image_failed",
                          error: event.item.error?.message || "Image generation failed"
                        })}\n\n`)
                      )
                    } else {
                      console.log("[Stream] ⚠️ Image item done but no image data found")
                      console.log("[Stream] Item status:", event.item.status)
                      console.log("[Stream] Full item structure:", JSON.stringify(event.item, null, 2))
                    }
                  }

                  // 2. TRACK TOOL USAGE
                  if (event.item?.type === "file_search_call" && !usedTools.includes("file_search")) {
                    usedTools.push("file_search")
                  }
                  if (event.item?.type === "web_search_call" && !usedTools.includes("web_search")) {
                    usedTools.push("web_search")
                  }

                  // 3. HANDLE MCP CALLS
                  if (event.item?.type === "mcp_call") {
                    console.log("===============================================")
                    const mcpCallName = event.item.name || '';
                    const mcpCallArgs = event.item.arguments ? JSON.parse(event.item.arguments) : {};
                    const mcpServerLabel = event.item.server_label || '';
                    const mcpOutput = event.item.output;

                    console.log("[Stream] 🔌 MCP call completed via output_item.done")
                    console.log("[Stream] MCP name:", mcpCallName)
                    console.log("[Stream] MCP server:", mcpServerLabel)
                    console.log("[Stream] MCP status:", event.item.status)
                    console.log("[Stream] MCP output:", mcpOutput)
                    console.log("===============================================")

                    // Dropbox MCP
                    if (mcpServerLabel.toLowerCase().includes("dropbox") && !usedTools.includes("dropbox")) {
                      usedTools.push("dropbox")
                      console.log("[Stream] Dropbox MCP tool used:", mcpCallName)
                    }

                    // Stripe MCP - Track tool usage
                    if (mcpServerLabel.toLowerCase().includes("stripe") && !usedTools.includes("stripe")) {
                      usedTools.push("stripe")
                      console.log("[Stream] Stripe MCP tool used:", mcpCallName)
                    }
                  }

                  // 4. HANDLE FUNCTION CALLS
                  if (event.item?.type === "function_call") {
                    const functionName = event.item.name
                    const functionArgs = event.item.arguments
                      ? JSON.parse(event.item.arguments)
                      : {}

                    console.log(`[Stream] Function call detected: ${functionName}`)

                    // Artifact Update
                    if (functionName === "update_artifact" && artifact) {
                      console.log(`[Stream] 🎨 Updating artifact: ${artifact.name}`)

                      try {
                        const { updatedCode, changeDescription, changeSummary } = functionArgs

                        if (!updatedCode || !changeDescription) {
                          throw new Error("Missing required parameters for artifact update")
                        }

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

                        console.log(`[Stream] ✅ Artifact updated successfully. New version: ${versionResult.version?.versionNumber}`)

                        if (!usedTools.includes("artifact_update")) {
                          usedTools.push("artifact_update")
                        }

                        const successMessage = `\n\n✅ **Artifact Updated Successfully**\n\n` +
                          `**Version:** ${versionResult.version?.versionNumber}\n` +
                          `**Change:** ${changeSummary}\n\n` +
                          `The artifact "${artifact.name}" has been updated with your requested changes.\n\n`

                        assistantResponse += successMessage

                        controller.enqueue(
                          encoder.encode(`data: ${JSON.stringify({
                            type: "artifact_updated",
                            artifactId: artifact.id,
                            artifactName: artifact.name,
                            versionNumber: versionResult.version?.versionNumber,
                            changeSummary: changeSummary
                          })}\n\n`)
                        )

                        controller.enqueue(
                          encoder.encode(`data: ${JSON.stringify({
                            type: "text",
                            content: successMessage
                          })}\n\n`)
                        )

                      } catch (updateError: any) {
                        console.error(`[Stream] ❌ Artifact update error:`, updateError)

                        const errorMessage = `\n\n⚠️ **Failed to Update Artifact**\n\n` +
                          `Error: ${updateError.message}\n\n` +
                          `The artifact could not be updated. Please try again or check your permissions.\n\n`

                        assistantResponse += errorMessage

                        controller.enqueue(
                          encoder.encode(`data: ${JSON.stringify({
                            type: "artifact_update_error",
                            error: updateError.message
                          })}\n\n`)
                        )

                        controller.enqueue(
                          encoder.encode(`data: ${JSON.stringify({
                            type: "text",
                            content: errorMessage
                          })}\n\n`)
                        )
                      }
                    }

                    // API Tools
                    const isAPITool = apiTools.some(t => t.openaiTool.name === functionName)

                    if (isAPITool) {
                      console.log(`[Stream] Executing API tool: ${functionName}`)

                      try {
                        const result = await executeAPITool(apiTools, functionName, functionArgs)

                        if (!usedTools.includes(functionName)) {
                          usedTools.push(functionName)
                        }

                        const resultText = typeof result === 'string'
                          ? result
                          : JSON.stringify(result, null, 2)

                        assistantResponse += `\n\n**API Call Result (${functionName}):**\n\`\`\`json\n${resultText}\n\`\`\`\n\n`

                        controller.enqueue(
                          encoder.encode(`data: ${JSON.stringify({
                            type: "tool_result",
                            tool: functionName,
                            result: result
                          })}\n\n`)
                        )
                      } catch (apiError: any) {
                        console.error(`[Stream] ❌ API tool error:`, apiError)
                        const errorText = `API call failed: ${apiError.message}`
                        assistantResponse += `\n\n**Error calling ${functionName}:** ${errorText}\n\n`
                        controller.enqueue(
                          encoder.encode(`data: ${JSON.stringify({
                            type: "tool_error",
                            tool: functionName,
                            error: errorText
                          })}\n\n`)
                        )
                      }
                    }
                  }
                }
                break

              case "response.mcp_call.in_progress":
                // MCP call started (no data here, just notification)
                console.log("[Stream] 🔌 MCP call in progress")
                break

              case "response.mcp_call.completed":
                // MCP call completed (no data here either, actual data is in output_item.done)
                console.log("[Stream] 🔌 MCP call completed event (data will be in output_item.done)")
                break

              case "response.completed":
                console.log("[Stream] ✅ Response completed")
                break

              case "error":
                console.error("[Stream] ❌ Error event:", event)
                throw new Error(event.error?.message || "Stream error")
            }
          }

          console.log("[Stream] Finished streaming, total response length:", assistantResponse.length)

          // Save complete response to database
          const hasImages = generatedImageUrls.length > 0

          // Create markdown for images if any
          if (hasImages) {
            const imageMarkdown = generatedImageUrls.map((url, idx) =>
              `![Generated Image ${idx + 1}](${url})`
            ).join('\n\n')

            if (assistantResponse) {
              assistantResponse = `${assistantResponse}\n\n${imageMarkdown}`
            } else {
              const imageWord = generatedImageUrls.length === 1 ? 'image' : 'images'
              assistantResponse = `I've generated ${generatedImageUrls.length} ${imageWord} for you:\n\n${imageMarkdown}`
            }
          }

          // Check if response already exists (race condition protection)
          const existingResponse = await prisma.assistantUserChatMessage.findFirst({
            where: {
              assistantUserChatId: chatIdInt,
              role: "assistant",
              message: { not: null },
              createdAt: { gt: lastUserMessageRecord?.createdAt || new Date(0) }
            }
          })

          if (!existingResponse) {
            // Prepare documents field with image URLs for easy loading
            const documentsData = hasImages ? {
              generatedImages: generatedImageUrls.map((url, idx) => ({
                url,
                index: idx,
                timestamp: Date.now()
              }))
            } : null

            await prisma.assistantUserChatMessage.create({
              data: {
                assistantUserChatId: chatIdInt,
                role: "assistant",
                message: assistantResponse,
                userId: null,
                assistantId: assistantId ? BigInt(assistantId) : null,
                openaiResponseId: currentResponseId,
                hasImages,
                documents: documentsData ? JSON.stringify(documentsData) : null,
              }
            })
            console.log("[Stream] ✅ Assistant response saved to database with", generatedImageUrls.length, "image URLs")
          }

          // Update user message status to COMPLETED
          if (lastUserMessageRecord) {
            await prisma.assistantUserChatMessage.update({
              where: { id: lastUserMessageRecord.id },
              data: { status: "COMPLETED" }
            })
            console.log("[Stream] Updated user message status to COMPLETED")
          }

          // Update chat timestamp
          await prisma.assistantUserChat.update({
            where: { id: chatIdInt },
            data: { updatedAt: new Date() }
          })

          // Track usage metrics
          if (assistantId) {
            const inputTokens = Math.ceil(systemPrompt.length / 4) +
              Math.ceil(conversationMessages.reduce((acc, msg) => acc + msg.content.length, 0) / 4)
            const outputTokens = Math.ceil(assistantResponse.length / 4)
            const imageTokens = generatedImageUrls.length * 4160
            const totalTokens = inputTokens + outputTokens + imageTokens

            await prisma.usageMetric.create({
              data: {
                userId: chat.userId,
                assistantId: BigInt(assistantId),
                inputToken: inputTokens,
                outputToken: outputTokens + imageTokens,
                totalToken: totalTokens,
                totalCost: (totalTokens / 1_000_000) * 0.375,
                costType: "chat",
                toolUsing: usedTools.length > 0 ? usedTools.join(",") : undefined
              }
            })
            console.log(`[Stream] 📊 Usage metrics tracked`)
          }

          // Send done signal
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`)
          )
          console.log("[Stream] ✅ Stream complete")
          controller.close()

        } catch (error) {
          console.error("[Stream] ❌ Streaming error:", error)

          // Update status to FAILED
          if (lastUserMessageRecord) {
            await prisma.assistantUserChatMessage.update({
              where: { id: lastUserMessageRecord.id },
              data: { status: "FAILED" }
            })
            console.log("[Stream] Updated user message status to FAILED")
          }

          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({
              type: "error",
              error: error instanceof Error ? error.message : "Unknown error"
            })}\n\n`)
          )
          controller.close()
        }
      }
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })

  } catch (error) {
    console.error("[Stream] Setup error:", error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}