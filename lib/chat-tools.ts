import { tool, type ToolSet } from "ai"
import { z } from "zod"
import { createStripeConnectInvoice } from "@/lib/services/stripe-connect-invoice.service"
import { openai as openaiClient } from "@/lib/openai"
import { safeUploadToS3 } from "@/lib/aws-s3"
import { executeAPITool } from "@/lib/api-tools-loader"
import { OpenAPITool } from "@/lib/openapi-tool-converter"

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
            console.log(`[ChatTools] ✅ Saved image ${imageIndex + 1} to S3: ${uploadResult.url}`)
            return uploadResult.url
        }
        return null
    } catch (error) {
        console.error(`[ChatTools] ❌ Error saving image:`, error)
        return null
    }
}

export interface ChatToolsContext {
    userId: bigint
    chatIdInt: number
    assistantId?: string | null
    artifact?: {
        id: string
        name: string
        htmlContent: string
    } | null
    apiTools?: OpenAPITool[]
}

/**
 * Build the toolset for AI SDK based on the chat context and available API tools
 */
export function getChatTools(context: ChatToolsContext): ToolSet {
    const { userId, chatIdInt, artifact, apiTools = [] } = context
    const tools: ToolSet = {}

    // 1. Stripe Connect Invoice Tool
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
            console.log(`[ChatTools] 💳 Creating Stripe Connect invoice for ${customerName}`)
            try {
                const result = await createStripeConnectInvoice({
                    userId,
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
                console.error(`[ChatTools] ❌ Invoice error:`, error)
                return `⚠️ **Failed to Create Invoice**\n\nError: ${error.message}\n\nPlease try again or contact support.`
            }
        }
    })

    // 2. Image Generation Tool
    tools.image_generation = tool({
        description: "Generate an image using DALL-E-3 based on a text prompt. Use this tool whenever the user asks for an image, visual, or drawing. Supports editing the image contextually.",
        inputSchema: z.object({
            prompt: z.string().describe("The descriptive prompt for the image generation"),
        }),
        execute: async ({ prompt }) => {
            console.log(`[ChatTools] 🎨 Generating image: ${prompt}`)
            try {
                const response = await openaiClient.images.generate({
                    model: "gpt-image-1.5", // Using the user's specified model
                    prompt,
                    n: 1,
                    size: "1024x1024",
                    response_format: "b64_json"
                });

                const base64Image = response.data?.[0]?.b64_json;
                if (!base64Image) throw new Error("No image data returned from OpenAI");

                const imageUrl = await saveImageToS3(
                    base64Image,
                    chatIdInt,
                    0,
                    'image/png'
                )

                if (!imageUrl) throw new Error("Failed to save image to S3");

                return { url: imageUrl };
            } catch (error: any) {
                console.error(`[ChatTools] ❌ Image generation failed:`, error)
                return { error: error.message };
            }
        }
    })

    // 3. Artifact Update Tool
    if (artifact) {
        tools.update_artifact = tool({
            description: `Update the current artifact "${artifact.name}" with new HTML code.`,
            inputSchema: z.object({
                updatedCode: z.string().describe("Complete updated HTML code"),
                changeDescription: z.string().describe("What changed and why"),
                changeSummary: z.string().describe("One-line summary")
            }),
            execute: async ({ updatedCode, changeDescription, changeSummary }) => {
                console.log(`[ChatTools] 🎨 Updating artifact: ${artifact.name}`)
                try {
                    const { createArtifactVersion } = await import("@/app/actions/update-artifact.action")

                    const versionResult = await createArtifactVersion({
                        artifactId: parseInt(artifact.id),
                        userId,
                        code: updatedCode,
                        description: changeDescription,
                        changeType: 'ai',
                        setAsActive: true
                    })

                    if (!versionResult.success) {
                        throw new Error(versionResult.error || "Failed to create artifact version")
                    }

                    return `✅ **Artifact Updated Successfully**\n\n**Version:** ${versionResult.version?.versionNumber}\n**Change:** ${changeSummary}\n\nThe artifact "${artifact.name}" has been updated.`
                } catch (error: any) {
                    console.error(`[ChatTools] ❌ Artifact update error:`, error)
                    return `⚠️ **Failed to Update Artifact**\n\nError: ${error.message}\n\nPlease try again or check your permissions.`
                }
            }
        })
    }

    // 4. Load Dynamic API Tools (from OpenAPI schemas)
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
                    console.log(`[ChatTools] Executing dynamic API tool: ${toolName}`)
                    try {
                        const result = await executeAPITool(apiTools, toolName, args)
                        return JSON.stringify(result, null, 2)
                    } catch (error: any) {
                        console.error(`[ChatTools] ❌ Dynamic API tool error:`, error)
                        return `API call failed: ${error.message}`
                    }
                }
            })
        }
    }

    return tools
}
