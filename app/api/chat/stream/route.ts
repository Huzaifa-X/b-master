// app/api/chat/stream/route.ts
import { NextRequest } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { openai } from "@/lib/openai"
import upstageService from "@/lib/services/upstageService"
import { getSystemPrompt } from "@/utils/prompts"
import { uploadToS3 } from "@/lib/aws-s3"
import { OpenAPITool } from "@/lib/openapi-tool-converter"
import { executeAPITool, loadAPITools, toOpenAIToolDefinitions } from "@/lib/api-tools-loader"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * Save base64 image to S3 and return public URL
 */
async function saveImageToS3(
  base64Image: string,
  chatId: number,
  imageIndex: number
): Promise<string> {
  try {
    const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, "")
    const imageBuffer = Buffer.from(base64Data, "base64")
    const timestamp = Date.now()
    const fileName = `image-${timestamp}-${imageIndex}.png`
    const publicUrl = await uploadToS3(
      imageBuffer,
      fileName,
      "image/png",
      `chat-images/chat-${chatId}`
    )
    console.log(`[Stream] ✅ Saved image ${imageIndex + 1} to S3: ${publicUrl}`)
    return publicUrl
  } catch (error) {
    console.error("[Stream] ❌ S3 upload failed:", error)
    throw new Error(`S3 upload failed: ${error instanceof Error ? error.message : "Unknown error"}`)
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
    const { chatId, assistantId, chatType, webSearch, research, chatWithAPI, attachments, artifact } = body

    const chatIdInt = parseInt(chatId)
    if (isNaN(chatIdInt)) {
      return new Response(JSON.stringify({ error: "Invalid chatId" }), { status: 400 })
    }

    // Get chat with full context including the last user message with mentioned users
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

    // Add important note about mentioned users
    systemPrompt += `\n\n## Mentioned Users\nWhen you see "[This message mentions: Name <email>]" at the start of a user message, those are people the user has specifically mentioned using @ mentions. You have their full contact information (name and email). Use this information when relevant - for example, if the user asks you to create an invoice for someone, send an email, or perform any action involving the mentioned person, you already have their email address and don't need to ask for it.`

    if (research) {
      systemPrompt += `\n\nIMPORTANT: The user has requested research mode. Please conduct thorough research using both web search and file search to provide a comprehensive answer.`
    } else if (webSearch) {
      systemPrompt += `\n\nIMPORTANT: The user has requested web search. Please search the web for current information to answer their question.`
    } else if (chatWithAPI) {
      systemPrompt += `\n\nIMPORTANT: The user has requested chat with API. Please use the API to answer their question.`
    }

    // Add artifact information if provided
    if (artifact) {
      systemPrompt += `\n\n## Artifact Information Shared by User\n`
      systemPrompt += `The user has shared an artifact named "${artifact.name}" with the following content:\n\n`
      systemPrompt += `Artifact HTML Content:\n${artifact.htmlContent}\n\n`
      if (artifact.instructions) {
        systemPrompt += `Artifact Instructions:\n${artifact.instructions}\n\n`
      }
      systemPrompt += `Please use this artifact information to help answer the user's question. Reference the artifact content when relevant.`
    }

    if (chatType === "ASSISTANT" && chat.assistant?.instructions) {
      systemPrompt += `\n\n## Assistant-Specific Instructions\n${chat.assistant.instructions}`
    }

    // Prepare conversation history and extract mentioned users
    const conversationMessages = chat.messages
      .filter(msg => msg.message)
      .map((msg) => {
        let content = msg.message || ""

        // Check all user messages for mentioned users
        if (msg.role === "user" && msg.documents) {
          try {
            const documentsData = JSON.parse(msg.documents)
            console.log("[Stream] Mentioned users in message:", documentsData.mentionedUsers)
            console.log("[Stream] Data:", documentsData)
            if (documentsData.mentionedUsers && Array.isArray(documentsData.mentionedUsers) && documentsData.mentionedUsers.length > 0) {
              // Prepend mentioned users info to make it more visible to AI
              const mentionsList = documentsData.mentionedUsers
                .map((u: { name: string; email: string }) => `${u.name} <${u.email}>`)
                .join(', ')
              content = `[This message mentions: ${mentionsList}]\n\n${content}`
              console.log("[Stream] Added mentioned users to message context:", documentsData.mentionedUsers)
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

    if (attachmentsToProcess.length > 0) {
      const extractedTexts: string[] = []
      for (const attachment of attachmentsToProcess) {
        if (upstageService.isSupportedFileType(attachment.type) && attachment.url) {
          try {
            const extracted = await upstageService.extractFromUrl(attachment.url)
            if (extracted.text) {
              extractedTexts.push(`\n\n--- Content from ${attachment.name} ---\n${extracted.text}\n--- End of ${attachment.name} ---\n`)
            }
          } catch (error) {
            console.error(`[Stream] Failed to extract from ${attachment.name}:`, error)
          }
        }
      }
      if (extractedTexts.length > 0) {
        extractedContent = extractedTexts.join("\n\n")
      }
    }

    let enhancedUserMessage = lastUserMessage
    if (extractedContent && extractedContent.trim()) {
      enhancedUserMessage = `${lastUserMessage}\n\n${extractedContent}`
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
        systemPrompt += `### ${tool.tool.function.name}\n`
        systemPrompt += `- **Description**: ${tool.tool.function.description}\n`
        systemPrompt += `- **Method**: ${tool.metadata.method}\n`
        systemPrompt += `- **Endpoint**: ${tool.metadata.baseUrl}${tool.metadata.path}\n`

        // List parameters
        const params = tool.tool.function.parameters
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
    } else {
      tools.push({ type: "web_search" })
      tools.push({ type: "image_generation" })
      // Add Stripe MCP tool for invoice creation
      tools.push({
        type: "mcp",
        server_label: "stripe",
        server_url: "https://mcp.stripe.com",
        authorization: process.env.STRIPE_SECRET_KEY,
        require_approval: "never",
      })

      if (apiTools.length > 0) {
        const apiToolDefs = toOpenAIToolDefinitions(apiTools)
        tools.push(...apiToolDefs)
        console.log(`[Stream] Added ${apiToolDefs.length} API tool definitions to OpenAI request`)
      }

      if (assistantId && chat.assistant?.vectorStoreId) {
        tools.push({
          type: "file_search",
          vector_store_ids: [chat.assistant.vectorStoreId]
        })
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
      stream: true // Enable streaming
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

          // Create streaming response - try streaming first, fallback if not supported
          console.log("[Stream] Starting OpenAI stream...")

          try {
            // Try to get streaming response - don't await yet, check if it's a promise
            const responsePromise = openai.responses.create(apiParams) as any

            // Check if it's a promise or already iterable
            let responseStream: any
            if (responsePromise instanceof Promise) {
              responseStream = await responsePromise
            } else if (typeof responsePromise[Symbol.asyncIterator] === 'function') {
              responseStream = responsePromise
            } else {
              throw new Error("Response is neither a promise nor async iterable")
            }

            // Check if response is iterable after awaiting
            if (!responseStream || typeof responseStream[Symbol.asyncIterator] !== 'function') {
              console.warn("[Stream] Response is not async iterable, falling back to non-streaming mode")
              console.log("[Stream] Response type:", typeof responseStream)
              console.log("[Stream] Response structure:", JSON.stringify(Object.keys(responseStream || {}), null, 2))

              // Fallback: treat as complete response and simulate streaming
              const fullResponse = responseStream as any
              if (fullResponse?.id) {
                currentResponseId = fullResponse.id
                const responseIdMsg = `data: ${JSON.stringify({ type: "response_id", id: currentResponseId })}\n\n`
                console.log("[Stream] Sending response_id:", responseIdMsg)
                controller.enqueue(encoder.encode(responseIdMsg))
              }

              // Process complete response and simulate streaming
              if (fullResponse?.output && Array.isArray(fullResponse.output)) {
                for (const item of fullResponse.output) {
                  if (item.type === "message" && 'content' in item && Array.isArray(item.content)) {
                    for (const contentItem of item.content) {
                      if (contentItem.type === "output_text" && 'text' in contentItem) {
                        const text = contentItem.text || ""
                        if (text) {
                          assistantResponse += text
                          // Simulate streaming by sending word by word
                          const words = text.split(' ')
                          for (const word of words) {
                            controller.enqueue(
                              encoder.encode(`data: ${JSON.stringify({ type: "text", content: word + ' ' })}\n\n`)
                            )
                            await new Promise(resolve => setTimeout(resolve, 10))
                          }
                        }
                      }
                    }
                  }

                  if (item.type === "image_generation_call" && item.status === "completed" && item.result) {
                    try {
                      const imageUrl = await saveImageToS3(
                        item.result as string,
                        chatIdInt,
                        generatedImageUrls.length
                      )
                      generatedImageUrls.push(imageUrl)
                      controller.enqueue(
                        encoder.encode(`data: ${JSON.stringify({ type: "image", url: imageUrl })}\n\n`)
                      )
                    } catch (s3Error) {
                      console.error("[Stream] S3 upload failed:", s3Error)
                      const base64Url = `data:image/png;base64,${item.result as string}`
                      generatedImageUrls.push(base64Url)
                      controller.enqueue(
                        encoder.encode(`data: ${JSON.stringify({ type: "image", url: base64Url })}\n\n`)
                      )
                    }
                  }
                }
              }

              // Skip to end of streaming logic
              console.log("[Stream] Finished fallback streaming")
            } else {
              // Response is iterable - use real streaming
              console.log("[Stream] Response is async iterable, starting real streaming...")
              for await (const event of responseStream) {
                console.log("[Stream] Event type:", event.type)

                // Handle different event types according to OpenAI's streaming events
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
                    // Text chunk received
                    if (event.delta) {
                      assistantResponse += event.delta
                      // console.log("[Stream] Text delta:", event.delta.substring(0, 50))
                      controller.enqueue(
                        encoder.encode(`data: ${JSON.stringify({ type: "text", content: event.delta })}\n\n`)
                      )
                    }
                    break

                  case "response.output_item.done":
                    // Output item completed (could be text, image, etc.)
                    if (event.item?.type === "image_generation_call") {
                      if (!usedTools.includes("image_generation")) {
                        usedTools.push("image_generation")
                      }

                      if (event.item.status === "completed" && event.item.result) {
                        console.log("[Stream] Image generation completed")
                        try {
                          const imageUrl = await saveImageToS3(
                            event.item.result as string,
                            chatIdInt,
                            generatedImageUrls.length
                          )
                          generatedImageUrls.push(imageUrl)

                          controller.enqueue(
                            encoder.encode(`data: ${JSON.stringify({ type: "image", url: imageUrl })}\n\n`)
                          )
                        } catch (s3Error) {
                          console.error("[Stream] S3 upload failed:", s3Error)
                          const base64Url = `data:image/png;base64,${event.item.result as string}`
                          generatedImageUrls.push(base64Url)

                          controller.enqueue(
                            encoder.encode(`data: ${JSON.stringify({ type: "image", url: base64Url })}\n\n`)
                          )
                        }
                      }
                    }

                    // Track tool usage
                    if (event.item?.type === "file_search_call" && !usedTools.includes("file_search")) {
                      usedTools.push("file_search")
                    }
                    if (event.item?.type === "web_search_call" && !usedTools.includes("web_search")) {
                      usedTools.push("web_search")
                    }
                    if (event.item?.type === "mcp_call" && !usedTools.includes("stripe")) {
                      usedTools.push("stripe")
                      console.log("[Stream] Stripe MCP tool used:", event.item.name)
                    }

                    if (event.item?.type === "function_call") {
                      const functionName = event.item.name
                      const functionArgs = event.item.arguments
                        ? JSON.parse(event.item.arguments)
                        : {}

                      console.log(`[Stream] Function call detected: ${functionName}`)

                      // Check if this is one of our API tools
                      const isAPITool = apiTools.some(t => t.tool.function.name === functionName)

                      if (isAPITool) {
                        console.log(`[Stream] Executing API tool: ${functionName}`)

                        try {
                          // Execute the API call
                          const result = await executeAPITool(apiTools, functionName, functionArgs)

                          // Track tool usage
                          if (!usedTools.includes(functionName)) {
                            usedTools.push(functionName)
                          }

                          // Format result for display
                          const resultText = typeof result === 'string'
                            ? result
                            : JSON.stringify(result, null, 2)

                          // Add to assistant response
                          assistantResponse += `\n\n**API Call Result (${functionName}):**\n\`\`\`json\n${resultText}\n\`\`\`\n\n`

                          // Stream the result to the client
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
                    break

                  case "response.completed":
                    // Response fully completed
                    console.log("[Stream] Response completed")
                    break

                  case "error":
                    // Error occurred
                    console.error("[Stream] Error event:", event)
                    throw new Error(event.error?.message || "Stream error")
                }
              }
              console.log("[Stream] Finished real streaming")
            }
          } catch (streamError: any) {
            console.error("[Stream] Error during streaming attempt:", streamError)
            // If streaming fails, try non-streaming as final fallback
            console.log("[Stream] Attempting non-streaming fallback...")
            const fallbackParams = { ...apiParams, stream: false }
            const fullResponse = await openai.responses.create(fallbackParams) as any

            if (fullResponse?.id) {
              currentResponseId = fullResponse.id
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: "response_id", id: currentResponseId })}\n\n`)
              )
            }

            // Process and simulate streaming
            if (fullResponse?.output && Array.isArray(fullResponse.output)) {
              for (const item of fullResponse.output) {
                if (item.type === "message" && 'content' in item && Array.isArray(item.content)) {
                  for (const contentItem of item.content) {
                    if (contentItem.type === "output_text" && 'text' in contentItem) {
                      const text = contentItem.text || ""
                      if (text) {
                        assistantResponse += text
                        const words = text.split(' ')
                        for (const word of words) {
                          const textMsg = `data: ${JSON.stringify({ type: "text", content: word + ' ' })}\n\n`
                          console.log("[Stream] Sending text chunk:", word.substring(0, 20))
                          controller.enqueue(encoder.encode(textMsg))
                          await new Promise(resolve => setTimeout(resolve, 10))
                        }
                      }
                    }
                  }
                }

                if (item.type === "image_generation_call" && item.status === "completed" && item.result) {
                  try {
                    const imageUrl = await saveImageToS3(
                      item.result as string,
                      chatIdInt,
                      generatedImageUrls.length
                    )
                    generatedImageUrls.push(imageUrl)
                    controller.enqueue(
                      encoder.encode(`data: ${JSON.stringify({ type: "image", url: imageUrl })}\n\n`)
                    )
                  } catch (s3Error) {
                    console.error("[Stream] S3 upload failed:", s3Error)
                    const base64Url = `data:image/png;base64,${item.result as string}`
                    generatedImageUrls.push(base64Url)
                    controller.enqueue(
                      encoder.encode(`data: ${JSON.stringify({ type: "image", url: base64Url })}\n\n`)
                    )
                  }
                }
              }
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
            await prisma.assistantUserChatMessage.create({
              data: {
                assistantUserChatId: chatIdInt,
                role: "assistant",
                message: assistantResponse,
                userId: null,
                assistantId: assistantId ? BigInt(assistantId) : null,
                openaiResponseId: currentResponseId,
                hasImages,
              }
            })
            console.log("[Stream] Assistant response saved to database")
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
          const doneMsg = `data: ${JSON.stringify({ type: "done" })}\n\n`
          console.log("[Stream] Sending done signal")
          controller.enqueue(encoder.encode(doneMsg))
          controller.close()

        } catch (error) {
          console.error("[Stream] Streaming error:", error)

          // Update status to FAILED
          if (lastUserMessageRecord) {
            await prisma.assistantUserChatMessage.update({
              where: { id: lastUserMessageRecord.id },
              data: { status: "FAILED" }
            })
            console.log("[Stream] Updated user message status to FAILED")
          }

          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "error", error: error instanceof Error ? error.message : "Unknown error" })}\n\n`)
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