import { openai } from '@/lib/openai'
import { getSystemPrompt } from '@/lib/runtime/prompts'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import upstageService from '@/lib/services/upstageService'

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 300

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Collect all image URLs attached by the user across all messages */
function extractAttachedImages(messages: any[]): string[] {
    const seen = new Set<string>()
    const urls: string[] = []
    for (const msg of messages) {
        if (msg.role !== 'user' || !Array.isArray(msg.parts)) continue
        for (const part of msg.parts) {
            if (part.type === 'image' && typeof part.image === 'string' && part.image.startsWith('http')) {
                if (!seen.has(part.image)) { seen.add(part.image); urls.push(part.image) }
            }
        }
    }
    return urls
}

/** Collect all PDF/file attachments attached by the user across all messages */
function extractAttachedFiles(messages: any[]): { url: string; name: string }[] {
    const files: { url: string; name: string }[] = []
    for (const msg of messages) {
        if (msg.role !== 'user' || !Array.isArray(msg.parts)) continue
        for (const part of msg.parts) {
            const fileUrl = typeof part.url === 'string' ? part.url
                : typeof part.data === 'string' ? part.data : null
            if (part.type === 'file' && fileUrl) {
                files.push({ url: fileUrl, name: part.filename || 'document.pdf' })
            }
        }
    }
    return files
}

/**
 * Use Upstage Document Parse to extract text from a PDF URL.
 * Returns extracted text, or null if extraction fails (non-blocking).
 */
async function extractPdfText(url: string): Promise<string | null> {
    try {
        const result = await upstageService.extractFromUrl(url)
        const text = result.text || result.html || ''
        return text.slice(0, 4000) + (text.length > 4000 ? '\n... (truncated)' : '')
    } catch (err) {
        console.warn('[b-coder/chat] Upstage PDF extraction failed (non-blocking):', err)
        return null
    }
}

// ─── Message Conversion ──────────────────────────────────────────────────────

/**
 * Convert our internal UIMessage format → OpenAI Responses API input format.
 * The Responses API uses `input_text` / `input_image` / `input_file` content types.
 */
function buildResponsesInput(messages: any[]): any[] {
    const result: any[] = []

    for (const msg of messages) {
        const role = msg.role as 'user' | 'assistant' | 'system'

        // Skip system messages — we pass them via the `instructions` param instead
        if (role === 'system') continue

        if (role === 'assistant') {
            // Flatten assistant messages to plain text
            const parts = Array.isArray(msg.parts) ? msg.parts : []
            const text = parts
                .filter((p: any) => p.type === 'text')
                .map((p: any) => (p.text as string) || '')
                .join('')
            const fallback = typeof msg.content === 'string' ? msg.content : ''
            const finalText = text || fallback
            if (finalText.trim()) {
                result.push({ role: 'assistant', content: finalText })
            }
            continue
        }

        // user message
        if (!Array.isArray(msg.parts) || msg.parts.length === 0) {
            const text = typeof msg.content === 'string' ? msg.content : ''
            if (text.trim()) result.push({ role: 'user', content: text })
            continue
        }

        const hasMedia = msg.parts.some((p: any) => p.type !== 'text')

        if (!hasMedia) {
            // Text-only — simple string content
            const text = msg.parts
                .filter((p: any) => p.type === 'text')
                .map((p: any) => (p.text as string) || '')
                .join('')
            if (text.trim()) result.push({ role: 'user', content: text })
            continue
        }

        // Multimodal user message
        const contentParts: any[] = []
        for (const p of msg.parts) {
            if (p.type === 'text') {
                contentParts.push({ type: 'input_text', text: (p.text as string) || '' })
            } else if (p.type === 'image') {
                const raw = p.image ?? p.url ?? p.data
                if (raw && typeof raw === 'string' && raw.startsWith('http')) {
                    contentParts.push({ type: 'input_image', image_url: raw })
                }
            } else if (p.type === 'file') {
                const raw = p.url ?? p.data
                if (raw && typeof raw === 'string' && raw.startsWith('http')) {
                    // Responses API supports file URLs directly for PDFs
                    contentParts.push({ type: 'input_file', file_url: raw })
                }
            }
        }

        if (contentParts.length > 0) {
            result.push({ role: 'user', content: contentParts })
        }
    }

    return result
}

// ─── Route ───────────────────────────────────────────────────────────────────

export async function POST(req: Request) {
    try {
        const body = await req.json()
        const { messages, fileStructure, currentFile, templateId } = body

        if (!messages || messages.length === 0) {
            return new Response(
                JSON.stringify({ error: 'No messages provided' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            )
        }

        const input = buildResponsesInput(messages)

        // ── Supabase MCP ────────────────────────────────────────────────────
        // If the user has connected their Supabase project, add the native MCP tool.
        // OpenAI's Responses API handles MCP server-side — no local process needed.
        const tools: any[] = []
        let supabaseContext = ''

        try {
            const session = await getServerSession(authOptions)
            if (session?.user?.id) {
                const supabaseConnector = await prisma.connector.findFirst({
                    where: {
                        userId: BigInt(session.user.id),
                        provider: 'SUPABASE',
                        deletedAt: null,
                        status: 'ACTIVE',
                    },
                })

                if (supabaseConnector) {
                    const cfg = (supabaseConnector.config ?? {}) as Record<string, string>
                    const projectRef = cfg.projectRef ?? supabaseConnector.providerAccountId ?? ''
                    const projectUrl = cfg.projectUrl ?? `https://${projectRef}.supabase.co`
                    const anonKey = cfg.anonKey ?? ''

                    // Native MCP tool — OpenAI fetches tools from the remote server
                    // and executes calls server-side. No local npx needed.
                    tools.push({
                        type: 'mcp',
                        server_label: 'supabase',
                        server_url: 'https://mcp.supabase.com/mcp',
                        // Supabase PAT as the Bearer token
                        authorization: `${supabaseConnector.accessToken}`,
                        // Auto-approve all Supabase tool calls
                        require_approval: 'never',
                    })

                    supabaseContext = `
<supabase_context>
The user has connected their Supabase project. You have full access to Supabase MCP tools.

Project URL : ${projectUrl}
Anon Key   : ${anonKey}
Project Ref: ${projectRef}

Rules when working with Supabase:
1. Use MCP tools (create_table, execute_sql, enable_rls, list_tables, etc.) for ALL database structure changes.
2. When writing frontend code, always initialize the client as:
   import { createClient } from '@supabase/supabase-js'
   const supabase = createClient('${projectUrl}', '${anonKey}')
3. ALWAYS enable RLS on every table you create.
4. ALWAYS create user-scoped RLS policies: auth.uid() = user_id
5. NEVER use the service_role key in frontend code.
6. Install @supabase/supabase-js in the WebContainer when first using Supabase.
</supabase_context>`

                    console.log('[b-coder/chat] Supabase MCP tool added (remote HTTP)')
                }
            }
        } catch (mcpErr) {
            console.warn('[b-coder/chat] Supabase connector lookup failed (non-blocking):', mcpErr)
        }

        // ── Attached asset context ──────────────────────────────────────────
        const attachedImages = extractAttachedImages(messages)
        const attachedFiles = extractAttachedFiles(messages)

        let assetContext = ''

        if (attachedImages.length > 0) {
            assetContext += `
<attached_images>
The user has attached the following image(s). You can see them directly via vision.
When the user asks you to use an image in the app, embed its URL in an <img> tag or as a
CSS background-image. Do NOT invent or modify image URLs.

${attachedImages.map((url, i) => `Image ${i + 1} URL: ${url}`).join('\n')}
</attached_images>`
        }

        // PDFs: the Responses API natively reads PDF file URLs, so no OCR needed.
        // If Upstage is available, we still provide extracted text as a fallback context.
        if (attachedFiles.length > 0) {
            const pdfContextParts: string[] = []
            await Promise.all(
                attachedFiles.map(async (f) => {
                    const text = await extractPdfText(f.url)
                    if (text) {
                        pdfContextParts.push(`--- ${f.name} ---\n${text}`)
                    }
                })
            )
            if (pdfContextParts.length > 0) {
                assetContext += `
<attached_documents>
The user has attached the following document(s). Their content has been extracted for you:

${pdfContextParts.join('\n\n')}
</attached_documents>`
            }
        }

        // ── System prompt ────────────────────────────────────────────────────
        const systemPrompt = getSystemPrompt()
        const instructions = `${systemPrompt}

Current Project Context:
- Template: ${templateId}
- Current File: ${currentFile?.path || 'None'}
${fileStructure ? `\nFile Structure:\n${JSON.stringify(fileStructure, null, 2)}` : ''}
${currentFile?.content ? `\nCurrent File Content (${currentFile.path}):\n\`\`\`\n${currentFile.content.slice(0, 2000)}${currentFile.content.length > 2000 ? '\n... (truncated)' : ''}\n\`\`\`` : ''}
${supabaseContext}
${assetContext}
`

        // ── Stream response via OpenAI Responses API ─────────────────────────
        // The Responses API handles MCP tool calls server-side in a single request.
        // gpt-5 reasons, calls MCP tools, and streams the final response — all in one.
        const stream = await openai.responses.create({
            model: 'gpt-5',
            instructions,
            input,
            tools: tools.length > 0 ? tools : undefined,
            stream: true,
        })

        // Pipe the Responses API SSE stream to the client as a simple
        // newline-delimited JSON stream that our custom hook reads.
        const encoder = new TextEncoder()
        const readable = new ReadableStream({
            async start(controller) {
                try {
                    for await (const event of stream) {
                        console.log('\n[b-coder/chat] Received stream event:', JSON.stringify(event, null, 2));

                        if (event.type === 'response.output_text.delta') {
                            const chunk = JSON.stringify({
                                type: 'text_delta',
                                delta: event.delta,
                            })
                            console.log('[b-coder/chat] Sending to client:', chunk);
                            controller.enqueue(encoder.encode(`data: ${chunk}\n\n`))
                        } else if (event.type === 'response.completed') {
                            const chunk = JSON.stringify({ type: 'done' });
                            console.log('[b-coder/chat] Sending to client:', chunk);
                            controller.enqueue(encoder.encode(`data: ${chunk}\n\n`))
                        } else if (event.type === 'response.failed') {
                            const err = JSON.stringify({ type: 'error', message: 'Response failed' })
                            console.log('[b-coder/chat] Sending to client:', err);
                            controller.enqueue(encoder.encode(`data: ${err}\n\n`))
                        }
                    }
                } catch (err) {
                    const msg = err instanceof Error ? err.message : 'Stream error'
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', message: msg })}\n\n`))
                } finally {
                    controller.close()
                }
            },
        })

        return new Response(readable, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
            },
        })

    } catch (error) {
        return new Response(
            JSON.stringify({
                error: 'Failed to process chat request',
                details: error instanceof Error ? error.message : 'Unknown error'
            }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        )
    }
}
