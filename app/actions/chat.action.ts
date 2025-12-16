// app/actions/chat.action.ts
"use server"

import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { openai } from "@/lib/openai"
import upstageService from "@/lib/services/upstageService"
import { getSystemPrompt } from "@/utils/prompts"
import { uploadToS3 } from "@/lib/aws-s3"
import { cleanupOrphanedMessages } from "@/lib/message-cleanup"

// ================================================================
// IMAGE GENERATION HELPERS
// ================================================================

/**
 * Save base64 image to S3 and return public URL
 * Uses existing uploadToS3 function from lib/aws-s3.ts
 * @param base64Image - Base64 encoded image string (with or without data URL prefix)
 * @param chatId - Chat ID for organizing files
 * @param imageIndex - Index for multiple images
 * @returns S3 public URL
 */
async function saveImageToS3(
  base64Image: string,
  chatId: number,
  imageIndex: number
): Promise<string> {
  try {
    // Remove data URL prefix if present (data:image/png;base64,)
    const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, "")

    // Convert to buffer
    const imageBuffer = Buffer.from(base64Data, "base64")

    // Generate unique filename with timestamp
    const timestamp = Date.now()
    const fileName = `image-${timestamp}-${imageIndex}.png`

    // Upload to S3 using existing function (folder: chat-images/chat-{chatId})
    const publicUrl = await uploadToS3(
      imageBuffer,
      fileName,
      "image/png",
      `chat-images/chat-${chatId}`
    )

    console.log(`[saveImageToS3] ✅ Saved image ${imageIndex + 1} to S3: ${publicUrl}`)
    return publicUrl

  } catch (error) {
    console.error("[saveImageToS3] ❌ Error:", error)
    throw new Error(`S3 upload failed: ${error instanceof Error ? error.message : "Unknown error"}`)
  }
}

// ================================================================
// CHAT CREATION & TOPIC GENERATION
// ================================================================

/**
 * Create chat with first message and generate topic
 */
export async function createChatWithMessage(data: {
  mode: "assistant" | "ask-b"
  assistantId?: string
  firstMessage: string
  attachments?: {
    name: string
    url: string
    type: string
    size: number
  }[]
  webSearch?: boolean
  research?: boolean
  chatWithAPI?: boolean
  dropbox?: boolean
  artifact?: {
    id: string
    name: string
    instructions: string
    htmlContent: string
  }
  mentionedUsers?: Array<{ id: string; name: string; email: string }>
  skipBackground?: boolean // Skip background processing (for streaming)
}) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized", chatId: null }
    }

    const userId = BigInt(session.user.id)

    // Generate unique shareable ID
    const shareableId = crypto.randomUUID()

    // Create chat with temporary topic
    const chat = await prisma.assistantUserChat.create({
      data: {
        userId,
        assistantId: data.assistantId ? BigInt(data.assistantId) : null,
        chatType: data.mode === "ask-b" ? "ASK_B" : "ASSISTANT",
        topic: "New Chat", // Temporary topic
        shareableId,
      }
    })

    // Prepare documents data - store attachments and mentioned users
    let documentsJson: string | null = null

    if (data.attachments || data.mentionedUsers) {
      const documentsData: any = {}

      if (data.attachments && data.attachments.length > 0) {
        documentsData.attachments = data.attachments
        console.log(`[createChatWithMessage] Storing ${data.attachments.length} attachment(s) with S3 URLs in database`)
      }

      if (data.mentionedUsers && data.mentionedUsers.length > 0) {
        documentsData.mentionedUsers = data.mentionedUsers
        console.log(`[createChatWithMessage] Message mentions ${data.mentionedUsers.length} user(s):`, data.mentionedUsers.map(u => `${u.name} (${u.email})`).join(", "))
      }

      documentsJson = JSON.stringify(documentsData)
    }

    // Save first user message
    await prisma.assistantUserChatMessage.create({
      data: {
        assistantUserChatId: chat.id,
        role: "user",
        message: data.firstMessage,
        userId: userId,
        status: "PENDING", // Initially pending, will be updated to PROCESSING when AI starts
        assistantId: data.assistantId ? BigInt(data.assistantId) : null,
        documents: documentsJson
      }
    })

    console.log("[createChatWithMessage] Chat created:", chat.id)

    // Trigger background topic generation (non-blocking)
    generateChatTopic(chat.id.toString(), data.firstMessage).catch(err => {
      console.error("[createChatWithMessage] Topic generation failed:", err)
      // Don't fail the request if topic generation fails
    })

    // Skip background processing if using streaming
    if (!data.skipBackground) {
      // Trigger background response generation (non-blocking)
      // Pass attachments and search options so content extraction can happen in background function
      const webSearchEnabled = data.webSearch || false
      const researchEnabled = data.research || false
      const chatWithAPIEnabled = data.chatWithAPI || false
      console.log(`[createChatWithMessage] Starting background response with webSearch: ${webSearchEnabled}, research: ${researchEnabled}, attachments: ${data.attachments?.length || 0}`)

      generateChatResponseInBackground({
        chatId: chat.id.toString(),
        assistantId: data.assistantId,
        chatType: data.mode === "ask-b" ? "ASK_B" : "ASSISTANT",
        webSearch: webSearchEnabled,
        research: researchEnabled,
        chatWithAPI: chatWithAPIEnabled,
        attachments: data.attachments // Pass attachments for extraction
      }).catch(err => {
        console.error("[createChatWithMessage] Response generation failed:", err)
        // Don't fail the request if response generation fails
      })
    } else {
      console.log(`[createChatWithMessage] Skipping background processing (streaming will be used)`)
    }

    return {
      success: true,
      chatId: chat.id.toString(),
      chat: {
        id: chat.id.toString(),
        topic: chat.topic,
        chatType: chat.chatType,
        assistantId: data.assistantId || null,
        createdAt: chat.createdAt,
      },
      options: {
        webSearch: data.webSearch || false,
        research: data.research || false,
        chatWithAPI: data.chatWithAPI || false,
        dropbox: data.dropbox || false,
        artifact: data.artifact || null,
        mentionedUsers: data.mentionedUsers || null
      }
    }
  } catch (error) {
    console.error("[createChatWithMessage] Error:", error)
    return { success: false, error: "Failed to create chat", chatId: null }
  }
}

/**
 * Generate topic from first message using AI
 */
async function generateChatTopic(chatId: string, firstMessage: string) {
  try {
    console.log("[generateChatTopic] Generating topic for chat:", chatId)

    // Call OpenAI to generate a short topic
    const response = await openai.responses.create({
      model: "gpt-5-nano",
      input: `Generate a concise 3-5 word topic/title for the following user message. Return ONLY the topic, no quotes, no explanation.\n\nUser message: ${firstMessage}`
    })

    const topic = response.output_text?.trim() || "New Chat"

    // Update chat topic in database
    await prisma.assistantUserChat.update({
      where: { id: parseInt(chatId) },
      data: {
        topic: topic.length > 50 ? topic.substring(0, 50) : topic,
        updatedAt: new Date()
      }
    })

    console.log("[generateChatTopic] Topic generated:", topic)

    return { success: true, topic }
  } catch (error) {
    console.error("[generateChatTopic] Error:", error)
    return { success: false, topic: "New Chat" }
  }
}

/**
 * Generate assistant response in the background (unified function for first and subsequent messages)
 */
async function generateChatResponseInBackground(data: {
  chatId: string
  assistantId?: string | null
  chatType: "ASK_B" | "ASSISTANT"
  webSearch?: boolean
  research?: boolean
  chatWithAPI?: boolean
  dropbox?: boolean
  attachments?: {
    name: string
    url: string
    type: string
    size: number
  }[]
}) {
  try {
    console.log("[generateChatResponseInBackground] Generating response for chat:", data.chatId)

    const chatIdInt = parseInt(data.chatId)

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
      throw new Error("Chat not found")
    }

    // Build system prompt
    let systemPrompt = await getSystemPrompt()

    // Add to system prompt based on user selection
    if (data.research) {
      systemPrompt += `\n\nIMPORTANT: The user has requested research mode. Please conduct thorough research using both web search and file search to provide a comprehensive answer.`
    } else if (data.webSearch) {
      systemPrompt += `\n\nIMPORTANT: The user has requested web search. Please search the web for current information to answer their question.`
    }

    if (data.chatWithAPI) {
      systemPrompt += `\n\nIMPORTANT: The user has requested chat with API. Please use the API to answer their question.`
    }

    if (data.dropbox) {
      systemPrompt += `\n\nIMPORTANT: The user has enabled Dropbox integration. You can access their Dropbox files and perform file operations.`
    }

    // Add assistant-specific instructions if available
    if (data.chatType === "ASSISTANT" && chat.assistant?.instructions) {
      systemPrompt += `\n\n## Assistant-Specific Instructions\n${chat.assistant.instructions}`
    }

    const lastAssistantMessage = chat.messages
      .filter(msg => msg.role === "assistant" && msg.openaiResponseId)
      .slice(-1)[0]

    const previousResponseId = lastAssistantMessage?.openaiResponseId || null

    console.log("[generateChatResponseInBackground] 📝 Previous response ID:", previousResponseId || "None")

    // Prepare conversation history
    const conversationMessages = chat.messages
      .filter(msg => msg.message)
      .map(msg => ({
        role: msg.role as "user" | "assistant" | "system",
        content: msg.message || ""
      }))

    // Get the last user message
    const lastUserMessageIndex = conversationMessages
      .map((msg, idx) => msg.role === "user" ? idx : -1)
      .filter(idx => idx !== -1)
      .pop()

    const lastUserMessage = lastUserMessageIndex !== undefined
      ? conversationMessages[lastUserMessageIndex].content
      : ""

    // Extract content from attachments
    let extractedContent: string = ""
    const attachmentsToProcess = data.attachments || (() => {
      const lastUserMsgFromDb = chat.messages
        .filter(msg => msg.role === "user")
        .slice(-1)[0]

      if (lastUserMsgFromDb?.documents) {
        try {
          const parsed = typeof lastUserMsgFromDb.documents === 'string'
            ? JSON.parse(lastUserMsgFromDb.documents)
            : lastUserMsgFromDb.documents
          
          // Handle new structure: { attachments: [...], mentionedUsers: [...] }
          if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
            return Array.isArray(parsed.attachments) ? parsed.attachments : []
          }
          // Legacy structure: direct array
          return Array.isArray(parsed) ? parsed : []
        } catch (error) {
          console.error("[generateChatResponseInBackground] Error parsing attachments:", error)
          return []
        }
      }
      return []
    })()

    // Extract content from attachments
    if (attachmentsToProcess.length > 0) {
      console.log(`[generateChatResponseInBackground] Extracting content from ${attachmentsToProcess.length} attachment(s)`)

      const extractedTexts: string[] = []
      for (const attachment of attachmentsToProcess) {
        if (upstageService.isSupportedFileType(attachment.type) && attachment.url) {
          try {
            console.log(`[generateChatResponseInBackground] Extracting: ${attachment.name}`)
            const extracted = await upstageService.extractFromUrl(attachment.url)
            if (extracted.text) {
              extractedTexts.push(`\n\n--- Content from ${attachment.name} ---\n${extracted.text}\n--- End of ${attachment.name} ---\n`)
              console.log(`[generateChatResponseInBackground] Extracted ${extracted.text.length} characters`)
            }
          } catch (error) {
            console.error(`[generateChatResponseInBackground] Failed to extract from ${attachment.name}:`, error)
          }
        }
      }

      if (extractedTexts.length > 0) {
        extractedContent = extractedTexts.join("\n\n")
        console.log(`[generateChatResponseInBackground] Total extracted: ${extractedContent.length} characters`)
      }
    }

    // Enhance user message with extracted content
    let enhancedUserMessage = lastUserMessage
    if (extractedContent && extractedContent.trim()) {
      enhancedUserMessage = `${lastUserMessage}\n\n${extractedContent}`
      console.log("[generateChatResponseInBackground] Enhanced user message with extracted content")
    }

    const response = await openai.responses.create({
      model: "gpt-5-nano",
      input: [
        {
          role: "system",
          content:
            "You are a classifier. Respond ONLY with 'true' if the user wants to edit or modify an image. Otherwise respond ONLY with 'false'."
        },
        {
          role: "user",
          content: enhancedUserMessage
        }
      ],
    });

    // Extract raw text
    const hasImageEditIntent = response.output_text?.trim().toLowerCase() === "true";

    const hasImageAttachments = attachmentsToProcess.some((att: { type: string }) =>
      att.type.startsWith('image/')
    )

    // If user wants to edit and there was a previous image, use previous_response_id
    const shouldUseIterativeEditing = hasImageEditIntent &&
      previousResponseId &&
      lastAssistantMessage?.hasImages &&
      !hasImageAttachments // No new images uploaded

    if (shouldUseIterativeEditing) {
      console.log("[generateChatResponseInBackground] 🎨 Detected iterative image editing request")
    }

    let assistantResponse = ""
    const generatedImageUrls: string[] = []
    const usedTools: string[] = []
    let currentResponseId = null

    if (enhancedUserMessage) {
      try {
        // Build conversation context
        const conversationContext = conversationMessages
          .slice(0, -1)
          .map(msg => `${msg.role === "user" ? "User" : "Assistant"}: ${msg.content}`)
          .join("\n\n")

        const fullInput = conversationContext
          ? `${conversationContext}\n\nUser: ${enhancedUserMessage}`
          : `User: ${enhancedUserMessage}`

        // ========================================
        // SIMPLIFIED TOOL SELECTION - LET MODEL DECIDE
        // ========================================
        const tools: any[] = []

        if (data.chatType === "ASK_B") {
          // ASK_B Mode: Provide web_search and image_generation
          // Model will decide when to use them
          console.log("[generateChatResponseInBackground] ASK_B mode - providing web_search and image_generation")

          tools.push({ type: "web_search" })
          tools.push({ type: "image_generation" })

        } else {
          // ASSISTANT Mode: Provide ALL available tools
          // Model will intelligently choose which ones to use
          console.log("[generateChatResponseInBackground] ASSISTANT mode - providing all available tools")

          // Always add web search and image generation
          tools.push({ type: "web_search" })
          tools.push({ type: "image_generation" })

          // Add file_search if vector store exists
          if (data.assistantId && chat.assistant?.vectorStoreId) {
            console.log("[generateChatResponseInBackground] Adding file_search with vector store:", chat.assistant.vectorStoreId)
            tools.push({
              type: "file_search",
              vector_store_ids: [chat.assistant.vectorStoreId]
            })
          }
        }

        // Determine what to include in response (for debugging/logging)
        const include: ("file_search_call.results" | "web_search_call.action.sources")[] = []
        const hasFileSearch = tools.some(t => t.type === "file_search")
        const hasWebSearch = tools.some(t => t.type === "web_search")

        if (hasFileSearch) {
          include.push("file_search_call.results")
        }
        if (hasWebSearch) {
          include.push("web_search_call.action.sources")
        }

        let inputContent: any = fullInput

        // If user uploaded NEW images, include them in input
        if (hasImageAttachments) {
          const imageAttachments = attachmentsToProcess.filter((att: { type: string }) =>
            att.type.startsWith('image/')
          )

          const contentParts: any[] = [
            {
              type: "input_text",
              text: fullInput
            }
          ]

          for (const imageAtt of imageAttachments) {
            contentParts.push({
              type: "input_image",
              image_url: imageAtt.url
            })
          }

          inputContent = [
            {
              role: "user",
              content: contentParts
            }
          ]

          console.log(`[generateChatResponseInBackground] 📸 Added ${imageAttachments.length} new image(s) to input`)
        }

        // Make API call - model decides which tools to use
        console.log("[generateChatResponseInBackground] Making API call with available tools:", tools.map(t => t.type).join(", "))
        console.log("[generateChatResponseInBackground] 🔄 Using iterative editing:", shouldUseIterativeEditing)

        const apiParams: any = {
          model: "gpt-5.2",
          input: inputContent,
          instructions: systemPrompt,
          tools: tools.length > 0 ? tools : undefined,
          include: include.length > 0 ? include : undefined,
          tool_choice: "auto",
        }

        if (shouldUseIterativeEditing && previousResponseId) {
          apiParams.previous_response_id = previousResponseId
          console.log("[generateChatResponseInBackground] ✨ Using previous_response_id:", previousResponseId)
        }

        const response = await openai.responses.create(apiParams)

        currentResponseId = response.id
        console.log("[generateChatResponseInBackground] 📝 Current response ID:", currentResponseId)

        // ============================================
        // EXTRACT & PROCESS IMAGE GENERATION OUTPUTS
        // ============================================
        const imageOutputs = (response.output?.filter(
          (item: any) => item.type === "image_generation_call"
        ) || []) as any[]

        if (imageOutputs.length > 0) {
          console.log(`[generateChatResponseInBackground] 🎨 Found ${imageOutputs.length} generated image(s)`)

          for (let i = 0; i < imageOutputs.length; i++) {
            const imageOutput = imageOutputs[i] as any

            if (imageOutput.status === "completed" && imageOutput.result) {
              try {
                // Save to S3 using existing upload function
                const imageUrl = await saveImageToS3(
                  imageOutput.result as string,
                  chatIdInt,
                  i
                )
                generatedImageUrls.push(imageUrl)
                console.log(`[generateChatResponseInBackground] ✅ Image ${i + 1} saved to S3`)

              } catch (s3Error) {
                console.error(`[generateChatResponseInBackground] ❌ S3 upload failed for image ${i + 1}:`, s3Error)

                // FALLBACK: Use base64 data URL
                const base64Url = `data:image/png;base64,${imageOutput.result as string}`
                generatedImageUrls.push(base64Url)
                console.log(`[generateChatResponseInBackground] ⚠️ Using base64 fallback for image ${i + 1}`)
              }
            } else {
              console.warn(`[generateChatResponseInBackground] ⚠️ Image ${i + 1} generation ${(imageOutput as any).status || 'incomplete'}`)
            }
          }
        }

        // ============================================
        // EXTRACT TEXT MESSAGE
        // ============================================
        const messageOutput = response.output?.find((item: any) => item.type === "message")
        if (messageOutput && 'content' in messageOutput && Array.isArray(messageOutput.content)) {
          const textContent = messageOutput.content.find((c: any) => c.type === "output_text")
          if (textContent && 'text' in textContent) {
            assistantResponse = textContent.text || ""
          }
        }

        // ============================================
        // COMBINE TEXT + IMAGES INTO MARKDOWN
        // ============================================
        if (generatedImageUrls.length > 0) {
          // Create markdown image tags
          const imageMarkdown = generatedImageUrls.map((url, idx) =>
            `![Generated Image ${idx + 1}](${url})`
          ).join('\n\n')

          // Combine with text response
          if (assistantResponse) {
            assistantResponse = `${assistantResponse}\n\n${imageMarkdown}`
          } else {
            // No text response, just show images
            const imageWord = generatedImageUrls.length === 1 ? 'image' : 'images'
            assistantResponse = `I've generated ${generatedImageUrls.length} ${imageWord} for you:\n\n${imageMarkdown}`
          }

          console.log(`[generateChatResponseInBackground] 🖼️ Added ${generatedImageUrls.length} image(s) to response`)
        }

        // ============================================
        // LOG TOOLS USED
        // ============================================
        response.output?.forEach((item: any) => {
          if (item.type === "file_search_call") usedTools.push("file_search")
          if (item.type === "web_search_call") usedTools.push("web_search")
          if (item.type === "image_generation_call") usedTools.push("image_generation")
        })

        const toolsUsed = usedTools.length > 0 ? usedTools.join(" + ") : "none"
        console.log(`[generateChatResponseInBackground] 🔧 Tools used: ${toolsUsed}, response length: ${assistantResponse.length}`)

        // ============================================
        // VALIDATE RESPONSE
        // ============================================
        if (!assistantResponse) {
          console.error("[generateChatResponseInBackground] ❌ No response extracted. Response structure:",
            JSON.stringify(response.output?.map((o: any) => ({
              type: o.type,
              status: o.status || 'N/A'
            })), null, 2)
          )
          throw new Error("No response from Responses API")
        }
      } catch (responsesError) {
        console.error("[generateChatResponseInBackground] Responses API failed:", responsesError)
        throw responsesError
      }
    } else {
      throw new Error("No user message to process")
    }

    if (!assistantResponse) {
      throw new Error("No response generated")
    }

    // Race condition protection - check if response already exists
    const lastUserMessageRecord = await prisma.assistantUserChatMessage.findFirst({
      where: {
        assistantUserChatId: chatIdInt,
        role: "user"
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Update user message status to PROCESSING when AI starts working
    // This is especially important for research mode which can take 3-5 minutes
    if (lastUserMessageRecord && lastUserMessageRecord.status === "PENDING") {
      await prisma.assistantUserChatMessage.update({
        where: { id: lastUserMessageRecord.id },
        data: { status: "PROCESSING" }
      })
      console.log("[generateChatResponseInBackground] Updated user message status to PROCESSING")
    }

    if (lastUserMessageRecord) {
      const existingResponse = await prisma.assistantUserChatMessage.findFirst({
        where: {
          assistantUserChatId: chatIdInt,
          role: "assistant",
          message: {
            not: null
          },
          createdAt: {
            gt: lastUserMessageRecord.createdAt
          }
        }
      })

      if (!existingResponse) {
        await prisma.assistantUserChatMessage.create({
          data: {
            assistantUserChatId: chatIdInt,
            role: "assistant",
            message: assistantResponse,
            userId: null,
            assistantId: data.assistantId ? BigInt(data.assistantId) : null,
            openaiResponseId: currentResponseId,
            hasImages: generatedImageUrls.length > 0,
          }
        })
        console.log("[generateChatResponseInBackground] Assistant response saved")

        // Update user message status to COMPLETED when response is saved
        if (lastUserMessageRecord) {
          await prisma.assistantUserChatMessage.update({
            where: { id: lastUserMessageRecord.id },
            data: { status: "COMPLETED" }
          })
          console.log("[generateChatResponseInBackground] Updated user message status to COMPLETED")
        }
      } else {
        console.log("[generateChatResponseInBackground] Response already exists")
        if (!existingResponse.message || existingResponse.message.trim().length === 0) {
          await prisma.assistantUserChatMessage.update({
            where: { id: existingResponse.id },
            data: { message: assistantResponse }
          })
          console.log("[generateChatResponseInBackground] Updated existing empty response")

          // Update user message status to COMPLETED
          if (lastUserMessageRecord) {
            await prisma.assistantUserChatMessage.update({
              where: { id: lastUserMessageRecord.id },
              data: { status: "COMPLETED" }
            })
            console.log("[generateChatResponseInBackground] Updated user message status to COMPLETED")
          }
        }
      }
    } else {
      // No user message found, just save the assistant response
      await prisma.assistantUserChatMessage.create({
        data: {
          assistantUserChatId: chatIdInt,
          role: "assistant",
          message: assistantResponse,
          userId: null,
          assistantId: data.assistantId ? BigInt(data.assistantId) : null,
          openaiResponseId: currentResponseId,
          hasImages: generatedImageUrls.length > 0,
        }
      })
      console.log("[generateChatResponseInBackground] Response saved (no user message found)")
    }

    // Update chat timestamp
    await prisma.assistantUserChat.update({
      where: { id: chatIdInt },
      data: { updatedAt: new Date() }
    })

    // ============================================
    // TRACK USAGE METRICS
    // ============================================
    if (data.assistantId) {
      const inputTokens = Math.ceil(systemPrompt.length / 4) +
        Math.ceil(conversationMessages.reduce((acc, msg) =>
          acc + msg.content.length, 0) / 4)
      const outputTokens = Math.ceil(assistantResponse.length / 4)

      // Add image token costs (from OpenAI docs: ~4160 tokens per high quality square image)
      const imageTokens = generatedImageUrls.length * 4160
      const totalTokens = inputTokens + outputTokens + imageTokens

      await prisma.usageMetric.create({
        data: {
          userId: chat.userId,
          assistantId: BigInt(data.assistantId),
          inputToken: inputTokens,
          outputToken: outputTokens + imageTokens,
          totalToken: totalTokens,
          totalCost: (totalTokens / 1_000_000) * 0.375,
          costType: "chat",
          toolUsing: usedTools.length > 0 ? usedTools.join(",") : undefined
        }
      })
      console.log(`[generateChatResponseInBackground] 📊 Usage metrics tracked (${generatedImageUrls.length} images, ${imageTokens} image tokens)`)
    }

    console.log("[generateChatResponseInBackground] Complete")

    return { success: true, response: assistantResponse }
  } catch (error) {
    console.error("[generateChatResponseInBackground] Error:", error)

    // Update user message status to FAILED on error
    try {
      const chatIdInt = parseInt(data.chatId)
      const lastUserMessageRecord = await prisma.assistantUserChatMessage.findFirst({
        where: {
          assistantUserChatId: chatIdInt,
          role: "user"
        },
        orderBy: {
          createdAt: 'desc'
        }
      })

      if (lastUserMessageRecord && (lastUserMessageRecord.status === "PENDING" || lastUserMessageRecord.status === "PROCESSING")) {
        await prisma.assistantUserChatMessage.update({
          where: { id: lastUserMessageRecord.id },
          data: { status: "FAILED" }
        })
        console.log("[generateChatResponseInBackground] Updated user message status to FAILED due to error")
      }
    } catch (statusUpdateError) {
      console.error("[generateChatResponseInBackground] Failed to update message status:", statusUpdateError)
    }

    return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
  }
}

// ================================================================
// CHAT RETRIEVAL
// ================================================================

/**
 * Get a specific chat by ID
 */
export async function getSpecificChat(chatId: string) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized", chat: null }
    }

    // Validate chatId
    if (!chatId || typeof chatId !== 'string' || chatId.trim() === '') {
      return { success: false, error: "Invalid chat ID", chat: null }
    }

    const userId = BigInt(session.user.id)
    const chatIdInt = parseInt(chatId)

    // Validate parsed chatId
    if (isNaN(chatIdInt) || chatIdInt <= 0) {
      return { success: false, error: "Invalid chat ID", chat: null }
    }

    // Fetch the specific chat
    const chat = await prisma.assistantUserChat.findFirst({
      where: {
        id: chatIdInt,
        userId,
        deletedAt: null
      },
      select: {
        id: true,
        topic: true,
        chatType: true,
        assistantId: true,
        shareableId: true,
        createdAt: true,
        updatedAt: true,
        assistant: {
          select: {
            id: true,
            name: true,
            instructions: true,
            description: true
          }
        },
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          select: {
            message: true,
            createdAt: true
          }
        }
      }
    })

    if (!chat) {
      return { success: false, error: "Chat not found", chat: null }
    }

    // Handle Ask-B vs Assistant chat
    const isAskB = chat.chatType === "ASK_B"

    return {
      success: true,
      chat: {
        id: chat.id.toString(),
        topic: chat.topic,
        chatType: chat.chatType,
        assistantId: chat.assistantId?.toString() || null,
        assistantName: isAskB ? "Ask-B" : (chat.assistant?.name || "Assistant"),
        assistantInstructions: chat.assistant?.instructions || null,
        shareableId: chat.shareableId,
        lastMessage: chat.messages[0]?.message || null,
        lastMessageAt: chat.messages[0]?.createdAt || chat.createdAt,
        createdAt: chat.createdAt,
        updatedAt: chat.updatedAt
      }
    }
  } catch (error) {
    console.error("[getSpecificChat] Error:", error)
    return { success: false, error: "Failed to fetch chat", chat: null }
  }
}

/**
 * Get all Ask-B chats for current user
 */
export async function getAskBChats() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized", chats: [] }
    }

    const userId = BigInt(session.user.id)

    const chats = await prisma.assistantUserChat.findMany({
      where: {
        userId,
        chatType: "ASK_B",
        assistantId: null,
        deletedAt: null,
        messages: {
          some: {} // Only get chats that have messages
        }
      },
      include: {
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          select: {
            message: true,
            createdAt: true
          }
        }
      },
      orderBy: {
        updatedAt: 'desc'
      },
      take: 100 // Limit to 100 most recent chats
    })

    return {
      success: true,
      chats: chats.map(chat => ({
        id: chat.id.toString(),
        topic: chat.topic,
        chatType: chat.chatType,
        assistantId: null,
        lastMessage: chat.messages[0]?.message || null,
        lastMessageAt: chat.messages[0]?.createdAt || chat.createdAt,
        createdAt: chat.createdAt,
        updatedAt: chat.updatedAt
      }))
    }
  } catch (error) {
    console.error("[getAskBChats] Error:", error)
    return { success: false, error: "Failed to fetch chats", chats: [] }
  }
}

/**
 * Get all chats for a specific assistant
 */
export async function getAssistantChats(assistantId: string) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized", chats: [] }
    }

    const userId = BigInt(session.user.id)
    const assistantIdBigInt = BigInt(assistantId)

    // Verify user has access to this assistant
    const assistant = await prisma.assistant.findFirst({
      where: {
        id: assistantIdBigInt,
        OR: [
          { userId: userId }, // Owner
          { public: true }, // Public assistant
          {
            purchases: {
              some: {
                buyerId: userId,
                status: "completed"
              }
            }
          } // Purchased
        ],
        deletedAt: null
      }
    })

    if (!assistant) {
      return { success: false, error: "Assistant not found or access denied", chats: [] }
    }

    const chats = await prisma.assistantUserChat.findMany({
      where: {
        userId,
        assistantId: assistantIdBigInt,
        chatType: "ASSISTANT",
        deletedAt: null,
        messages: {
          some: {} // Only get chats that have messages
        }
      },
      include: {
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          select: {
            message: true,
            createdAt: true
          }
        }
      },
      orderBy: {
        updatedAt: 'desc'
      },
      take: 100 // Limit to 100 most recent chats
    })

    return {
      success: true,
      chats: chats.map(chat => ({
        id: chat.id.toString(),
        topic: chat.topic,
        chatType: chat.chatType,
        assistantId: chat.assistantId?.toString() || null,
        lastMessage: chat.messages[0]?.message || null,
        lastMessageAt: chat.messages[0]?.createdAt || chat.createdAt,
        createdAt: chat.createdAt,
        updatedAt: chat.updatedAt
      }))
    }
  } catch (error) {
    console.error("[getAssistantChats] Error:", error)
    return { success: false, error: "Failed to fetch chats", chats: [] }
  }
}

// ================================================================
// MESSAGE OPERATIONS
// ================================================================

/**
 * Get messages for a specific chat
 */
export async function getChatMessages(chatId: string) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized", messages: [] }
    }

    const userId = BigInt(session.user.id)
    const chatIdInt = parseInt(chatId)

    // Verify ownership
    const chat = await prisma.assistantUserChat.findFirst({
      where: {
        id: chatIdInt,
        userId,
        deletedAt: null
      }
    })

    if (!chat) {
      return { success: false, error: "Chat not found", messages: [] }
    }

    const messages = await prisma.assistantUserChatMessage.findMany({
      where: {
        assistantUserChatId: chatIdInt
      },
      orderBy: {
        createdAt: 'asc'
      },
      select: {
        id: true,
        role: true,
        message: true,
        documents: true,
        createdAt: true,
        status: true
      }
    })

    return {
      success: true,
      messages: messages.map(msg => {
        // Parse attachments from documents (JSON string)
        const attachments: {
          name: string
          url: string
          type: string
          size: number
        }[] = []

        // Parse documents if it exists (stored as JSON string)
        if (msg.documents) {
          try {
            const documents = typeof msg.documents === 'string'
              ? JSON.parse(msg.documents)
              : msg.documents

            // Handle new structure: { attachments: [...], mentionedUsers: [...] }
            if (documents && typeof documents === 'object' && !Array.isArray(documents)) {
              // New structure with attachments property
              if (Array.isArray(documents.attachments)) {
                documents.attachments.forEach((doc: any) => {
                  if (doc && (doc.url || doc.name)) {
                    attachments.push({
                      name: doc.name || 'Document',
                      url: doc.url || '',
                      type: doc.type || 'application/octet-stream',
                      size: doc.size || 0
                    })
                  }
                })
              }
            } else if (Array.isArray(documents)) {
              // Legacy structure: direct array of attachments (for backward compatibility)
              documents.forEach((doc: any) => {
                if (doc && (doc.url || doc.name)) {
                  attachments.push({
                    name: doc.name || 'Document',
                    url: doc.url || '',
                    type: doc.type || 'application/octet-stream',
                    size: doc.size || 0
                  })
                }
              })
            }
          } catch (e) {
            console.error("[getChatMessages] Error parsing documents:", e)
          }
        }

        return {
          id: msg.id.toString(),
          role: msg.role as "user" | "assistant",
          content: msg.message || "",
          createdAt: msg.createdAt,
          attachments: attachments.length > 0 ? attachments : undefined,
          status: msg.status
        }
      })
    }
  } catch (error) {
    console.error("[getChatMessages] Error:", error)
    return { success: false, error: "Failed to fetch messages", messages: [] }
  }
}

/**
 * Cleanup orphaned user messages (messages without assistant responses)
 * This is useful when streaming was interrupted (e.g., user reloaded page)
 * 
 * @param chatId - The chat ID to clean up
 * @param gracePeriodMinutes - Don't delete messages newer than this (default: 2 minutes)
 */
export async function cleanupChat(chatId: string, gracePeriodMinutes?: number) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized", deleted: 0 }
    }

    const result = await cleanupOrphanedMessages(chatId, gracePeriodMinutes)
    return { success: true, deleted: result.deleted }
  } catch (error) {
    console.error("[cleanupChat] Error:", error)
    return { success: false, error: String(error), deleted: 0 }
  }
}

/**
 * Send a user message and generate assistant response in background
 */
export async function sendChatMessage(data: {
  chatId: string
  content: string
  assistantId?: string | null
  chatType: "ASK_B" | "ASSISTANT"
  attachments?: {
    name: string
    url: string
    type: string
    size: number
  }[]
  webSearch?: boolean
  research?: boolean
  chatWithAPI?: boolean
  dropbox?: boolean
  artifact?: {
    id: string
    name: string
    instructions: string
    htmlContent: string
  }
  mentionedUsers?: Array<{ id: string; name: string; email: string }>
  skipBackground?: boolean // Skip background processing (for streaming)
}) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" }
    }

    const userId = BigInt(session.user.id)
    const chatIdInt = parseInt(data.chatId)

    // Verify ownership
    const chat = await prisma.assistantUserChat.findFirst({
      where: {
        id: chatIdInt,
        userId,
        deletedAt: null
      },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          select: {
            role: true,
            message: true
          }
        }
      }
    })

    if (!chat) {
      return { success: false, error: "Chat not found" }
    }

    // Prepare documents data - store attachments and mentioned users
    let documentsJson: string | null = null

    if (data.attachments || data.mentionedUsers) {
      const documentsData: any = {}

      if (data.attachments && data.attachments.length > 0) {
        documentsData.attachments = data.attachments
        console.log(`[sendChatMessage] Storing ${data.attachments.length} attachment(s) with S3 URLs in database`)
      }

      if (data.mentionedUsers && data.mentionedUsers.length > 0) {
        documentsData.mentionedUsers = data.mentionedUsers
        console.log(`[sendChatMessage] Message mentions ${data.mentionedUsers.length} user(s):`, data.mentionedUsers.map(u => `${u.name} (${u.email})`).join(", "))
      }

      documentsJson = JSON.stringify(documentsData)
    }

    // Save user message immediately with PENDING status
    const userMessage = await prisma.assistantUserChatMessage.create({
      data: {
        assistantUserChatId: chatIdInt,
        role: "user",
        message: data.content,
        userId: userId,
        assistantId: chat.assistantId,
        documents: documentsJson,
        status: "PENDING" // Initially pending, will be updated to PROCESSING when AI starts
      }
    })

    // Update chat timestamp
    await prisma.assistantUserChat.update({
      where: { id: chatIdInt },
      data: { updatedAt: new Date() }
    })

    // Skip background processing if using streaming
    if (!data.skipBackground) {
      console.log(`[sendChatMessage] User message saved, triggering background response with webSearch: ${data.webSearch || false}, research: ${data.research || false}, attachments: ${data.attachments?.length || 0}`)

      // Trigger background response generation (non-blocking)
      // Pass attachments and search options so content extraction can happen in background function
      generateChatResponseInBackground({
        chatId: data.chatId,
        assistantId: data.assistantId,
        chatType: data.chatType,
        webSearch: data.webSearch || false,
        research: data.research || false,
        chatWithAPI: data.chatWithAPI || false,
        dropbox: data.dropbox || false,
        attachments: data.attachments // Pass attachments for extraction
      }).catch(err => {
        console.error("[sendChatMessage] Background response generation failed:", err)
        // Don't fail the request if background generation fails
      })
    } else {
      console.log(`[sendChatMessage] User message saved, skipping background processing (streaming will be used)`)
    }

    return {
      success: true,
      message: {
        id: userMessage.id.toString(),
        role: userMessage.role,
        content: userMessage.message || "",
        createdAt: userMessage.createdAt
      }
    }
  } catch (error) {
    console.error("[sendChatMessage] Error:", error)
    return { success: false, error: "Failed to send message" }
  }
}


// ================================================================
// CHAT MANAGEMENT
// ================================================================

/**
 * Rename a chat
 */
export async function renameChat(chatId: string, newTopic: string) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" }
    }

    const userId = BigInt(session.user.id)
    const chatIdInt = parseInt(chatId)

    // Verify ownership
    const chat = await prisma.assistantUserChat.findFirst({
      where: {
        id: chatIdInt,
        userId,
        deletedAt: null
      }
    })

    if (!chat) {
      return { success: false, error: "Chat not found" }
    }

    // Validate topic
    const sanitizedTopic = newTopic.trim()
    if (!sanitizedTopic || sanitizedTopic.length > 100) {
      return { success: false, error: "Invalid topic" }
    }

    await prisma.assistantUserChat.update({
      where: { id: chatIdInt },
      data: {
        topic: sanitizedTopic,
        updatedAt: new Date()
      }
    })

    return { success: true }
  } catch (error) {
    console.error("[renameChat] Error:", error)
    return { success: false, error: "Failed to rename chat" }
  }
}

/**
 * Delete a chat (soft delete)
 */
export async function deleteChat(chatId: string) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" }
    }

    const userId = BigInt(session.user.id)
    const chatIdInt = parseInt(chatId)

    // Verify ownership
    const chat = await prisma.assistantUserChat.findFirst({
      where: {
        id: chatIdInt,
        userId,
        deletedAt: null
      }
    })

    if (!chat) {
      return { success: false, error: "Chat not found" }
    }

    // Soft delete
    await prisma.assistantUserChat.update({
      where: { id: chatIdInt },
      data: { deletedAt: new Date() }
    })

    return { success: true }
  } catch (error) {
    console.error("[deleteChat] Error:", error)
    return { success: false, error: "Failed to delete chat" }
  }
}

/**
 * Archive a chat
 */
export async function archiveChat(chatId: string) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" }
    }

    const userId = BigInt(session.user.id)
    const chatIdInt = parseInt(chatId)

    // Verify ownership
    const chat = await prisma.assistantUserChat.findFirst({
      where: {
        id: chatIdInt,
        userId,
        deletedAt: null
      }
    })

    if (!chat) {
      return { success: false, error: "Chat not found" }
    }

    // For now, we'll use soft delete for archiving
    // In the future, you might want to add an 'archived' field
    await prisma.assistantUserChat.update({
      where: { id: chatIdInt },
      data: {
        deletedAt: new Date() // Using deletedAt as archived for now
      }
    })

    return { success: true }
  } catch (error) {
    console.error("[archiveChat] Error:", error)
    return { success: false, error: "Failed to archive chat" }
  }
}

/**
 * Get chat statistics for a user
 */
export async function getChatStats() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized", stats: null }
    }

    const userId = BigInt(session.user.id)

    const [totalChats, askBChats, assistantChats, totalMessages] = await Promise.all([
      // Total chats
      prisma.assistantUserChat.count({
        where: {
          userId,
          deletedAt: null
        }
      }),
      // Ask-B chats
      prisma.assistantUserChat.count({
        where: {
          userId,
          chatType: "ASK_B",
          deletedAt: null
        }
      }),
      // Assistant chats
      prisma.assistantUserChat.count({
        where: {
          userId,
          chatType: "ASSISTANT",
          deletedAt: null
        }
      }),
      // Total messages
      prisma.assistantUserChatMessage.count({
        where: {
          userId
        }
      })
    ])

    return {
      success: true,
      stats: {
        totalChats,
        askBChats,
        assistantChats,
        totalMessages
      }
    }
  } catch (error) {
    console.error("[getChatStats] Error:", error)
    return { success: false, error: "Failed to fetch stats", stats: null }
  }
}

/**
 * Search chats by topic or content
 */
export async function searchChats(query: string) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized", chats: [] }
    }

    const userId = BigInt(session.user.id)
    const searchQuery = query.trim().toLowerCase()

    if (!searchQuery || searchQuery.length < 2) {
      return { success: false, error: "Search query too short", chats: [] }
    }

    const chats = await prisma.assistantUserChat.findMany({
      where: {
        userId,
        deletedAt: null,
        OR: [
          {
            topic: {
              contains: searchQuery,
              mode: 'insensitive'
            }
          },
          {
            messages: {
              some: {
                message: {
                  contains: searchQuery,
                  mode: 'insensitive'
                }
              }
            }
          }
        ]
      },
      include: {
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          select: {
            message: true,
            createdAt: true
          }
        }
      },
      orderBy: {
        updatedAt: 'desc'
      },
      take: 50
    })

    return {
      success: true,
      chats: chats.map(chat => ({
        id: chat.id.toString(),
        topic: chat.topic,
        chatType: chat.chatType,
        assistantId: chat.assistantId?.toString() || null,
        lastMessage: chat.messages[0]?.message || null,
        lastMessageAt: chat.messages[0]?.createdAt || chat.createdAt,
        createdAt: chat.createdAt,
        updatedAt: chat.updatedAt
      }))
    }
  } catch (error) {
    console.error("[searchChats] Error:", error)
    return { success: false, error: "Failed to search chats", chats: [] }
  }
}