import { openai } from '@/lib/openai'
import { getSystemPrompt } from '@/lib/runtime/prompts'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import upstageService from '@/lib/services/upstageService'
import { getTemplateById } from '@/lib/templates'

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 300

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Smart model routing: Determine if a message requires heavy coding model or can use faster model.
 * Returns 'fast' for simple questions/greetings, 'full' for complex coding tasks.
 */
function classifyMessageComplexity(messages: any[]): 'fast' | 'full' {
    const lastUserMessage = messages.filter(m => m.role === 'user').pop()
    if (!lastUserMessage) return 'full'

    // Extract text from the last user message
    let messageText = ''
    if (typeof lastUserMessage.content === 'string') {
        messageText = lastUserMessage.content.toLowerCase()
    } else if (Array.isArray(lastUserMessage.parts)) {
        messageText = lastUserMessage.parts
            .filter((p: any) => p.type === 'text')
            .map((p: any) => p.text || '')
            .join(' ')
            .toLowerCase()
    }

    // If there are images or files attached, use full model
    if (Array.isArray(lastUserMessage.parts)) {
        const hasMedia = lastUserMessage.parts.some((p: any) => p.type === 'image' || p.type === 'file')
        if (hasMedia) return 'full'
    }

    // Short messages that are likely greetings or simple questions
    const simplePatterns = [
        /^(hi|hey|hello|yo|sup|what'?s? up)[\s!?]*$/,
        /^how are you/,
        /^what can you do/,
        /^help$/,
        /^thanks?[\s!]*$/,
        /^thank you/,
        /^ok(ay)?[\s!]*$/,
        /^(yes|no|sure|nope)[\s!]*$/,
        /^what is this/,
        /^explain/,
        /^tell me about/,
    ]

    // Check if message matches simple patterns
    if (simplePatterns.some(pattern => pattern.test(messageText.trim()))) {
        return 'fast'
    }

    // Short messages without coding keywords -> fast
    const codingKeywords = [
        'create', 'build', 'add', 'implement', 'fix', 'change', 'update', 'modify',
        'delete', 'remove', 'rename', 'refactor', 'component', 'function', 'api',
        'button', 'form', 'page', 'route', 'database', 'style', 'css', 'tailwind',
        'import', 'export', 'react', 'hook', 'state', 'props', 'supabase'
    ]

    const hasCodeKeywords = codingKeywords.some(kw => messageText.includes(kw))
    const isShortMessage = messageText.length < 50

    if (isShortMessage && !hasCodeKeywords) {
        return 'fast'
    }

    return 'full'
}

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

/**
 * Build context from current files only (when template is not found).
 * This ensures the AI still has file context even without template info.
 */
function buildCurrentFilesOnlyContext(currentFiles: Record<string, string>): string {
    const currentFilePaths = Object.keys(currentFiles)

    // Source file patterns to include
    const sourceFilePatterns = [/\.jsx$/, /\.tsx$/, /\.js$/, /\.ts$/, /index\.html$/]
    const excludePatterns = [/node_modules/, /\.config\./, /vite\.config/, /tsconfig/, /\.css$/, /\.json$/]

    const availableKeyFiles = currentFilePaths.filter(filePath => {
        const isSourceFile = sourceFilePatterns.some(pattern => pattern.test(filePath))
        const isExcluded = excludePatterns.some(pattern => pattern.test(filePath))
        return isSourceFile && !isExcluded
    }).sort((a, b) => {
        const priority = ['App.jsx', 'App.tsx', 'main.jsx', 'main.tsx', 'index.html']
        const aIdx = priority.findIndex(p => a.includes(p))
        const bIdx = priority.findIndex(p => b.includes(p))
        if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx
        if (aIdx !== -1) return -1
        if (bIdx !== -1) return 1
        return a.localeCompare(b)
    })

    if (availableKeyFiles.length === 0) return ''

    const fileList = currentFilePaths.slice(0, 20).map(f => `  - ${f}`).join('\n')
    const moreFiles = currentFilePaths.length > 20 ? `  ... and ${currentFilePaths.length - 20} more` : ''

    let context = `
<current_workspace>
Note: Template information unavailable. Showing current workspace files.

Files in workspace (${currentFilePaths.length} total):
${fileList}
${moreFiles}

<current_file_contents>
IMPORTANT: Below is the CURRENT content of source files. When editing these files, you MUST preserve ALL existing code, imports, classes, and structure. Only change the SPECIFIC text/value requested.

`
    let totalSize = 0
    const maxTotalSize = 15000
    const maxPerFile = 3000

    for (const filePath of availableKeyFiles) {
        if (totalSize >= maxTotalSize) break

        const content = currentFiles[filePath]
        if (content) {
            const remainingBudget = Math.min(maxPerFile, maxTotalSize - totalSize)
            const truncated = content.length > remainingBudget
                ? content.slice(0, remainingBudget) + '\n... (truncated)'
                : content

            context += `--- CURRENT ${filePath} ---
\`\`\`
${truncated}
\`\`\`

`
            totalSize += truncated.length
        }
    }
    context += '</current_file_contents>\n</current_workspace>'

    return context
}

/**
 * Build context about the initial template code and analyze changes.
 * This helps the AI understand the baseline and what modifications have been made.
 */
function buildTemplateContext(
    templateId: string,
    currentFiles: Record<string, string> | null
): string {
    const template = getTemplateById(templateId)
    if (!template) {
        console.warn(`[b-coder/chat] Template not found: "${templateId}". AI will have limited context.`)

        // If we have current files but no template, still provide them as context
        if (currentFiles && Object.keys(currentFiles).length > 0) {
            return buildCurrentFilesOnlyContext(currentFiles)
        }
        return ''
    }

    const originalFiles = template.files
    const originalFilePaths = Object.keys(originalFiles)

    // Key files to always show (main entry points)
    const keyFiles = ['src/App.jsx', 'src/App.tsx', 'src/main.jsx', 'src/main.tsx', 'src/index.jsx', 'src/index.tsx']
    const importantOriginalFiles = keyFiles
        .filter(f => originalFilePaths.includes(f))
        .slice(0, 3) // Limit to 3 key files

    let context = `
<initial_template>
Template: ${template.name} (${templateId})
Description: ${template.description}

Original Files (${originalFilePaths.length} total):
${originalFilePaths.map(f => `  - ${f}`).join('\n')}
`

    // Show key original file contents (truncated)
    for (const filePath of importantOriginalFiles) {
        const content = originalFiles[filePath]
        if (content) {
            const truncated = content.length > 1500
                ? content.slice(0, 1500) + '\n... (truncated)'
                : content
            context += `
--- Original ${filePath} ---
\`\`\`
${truncated}
\`\`\`
`
        }
    }
    context += '</initial_template>'

    // Analyze changes if current files are provided
    if (currentFiles && Object.keys(currentFiles).length > 0) {
        const currentFilePaths = Object.keys(currentFiles)

        // Find new files (added)
        const newFiles = currentFilePaths.filter(f => !originalFilePaths.includes(f))

        // Find deleted files
        const deletedFiles = originalFilePaths.filter(f => !currentFilePaths.includes(f))

        // Find modified files (content changed)
        const modifiedFiles = currentFilePaths.filter(f => {
            if (!originalFilePaths.includes(f)) return false
            return originalFiles[f] !== currentFiles[f]
        })

        if (newFiles.length > 0 || deletedFiles.length > 0 || modifiedFiles.length > 0) {
            context += `

<changes_since_initial>
Changes made to the project since the initial template:

${newFiles.length > 0 ? `New Files Added (${newFiles.length}):
${newFiles.map(f => `  + ${f}`).join('\n')}
` : ''}
${deletedFiles.length > 0 ? `Files Deleted (${deletedFiles.length}):
${deletedFiles.map(f => `  - ${f}`).join('\n')}
` : ''}
${modifiedFiles.length > 0 ? `Files Modified (${modifiedFiles.length}):
${modifiedFiles.map(f => `  ~ ${f}`).join('\n')}
` : ''}
</changes_since_initial>`
        }

        // Include CURRENT content of source files so AI can make minimal edits
        // This is critical - AI needs to see exact current state to preserve it
        // Dynamically include all JSX/TSX/HTML files (not config files or CSS)
        const sourceFilePatterns = [
            /\.jsx$/,
            /\.tsx$/,
            /\.js$/,
            /\.ts$/,
            /index\.html$/
        ]

        // Exclude patterns (config, node_modules, etc.)
        const excludePatterns = [
            /node_modules/,
            /\.config\./,
            /vite\.config/,
            /tsconfig/,
            /\.css$/,
            /\.json$/
        ]

        // Get all source files from current workspace
        const availableKeyFiles = currentFilePaths.filter(filePath => {
            const isSourceFile = sourceFilePatterns.some(pattern => pattern.test(filePath))
            const isExcluded = excludePatterns.some(pattern => pattern.test(filePath))
            return isSourceFile && !isExcluded
        }).sort((a, b) => {
            // Prioritize main files first
            const priority = ['App.jsx', 'App.tsx', 'main.jsx', 'main.tsx', 'index.html']
            const aIdx = priority.findIndex(p => a.includes(p))
            const bIdx = priority.findIndex(p => b.includes(p))
            if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx
            if (aIdx !== -1) return -1
            if (bIdx !== -1) return 1
            return a.localeCompare(b)
        })

        if (availableKeyFiles.length > 0) {
            context += `

<current_file_contents>
IMPORTANT: Below is the CURRENT content of source files. When editing these files, you MUST preserve ALL existing code, imports, classes, and structure. Only change the SPECIFIC text/value requested.

`
            // Show up to 8 files, with smarter truncation based on total context size
            let totalSize = 0
            const maxTotalSize = 15000 // Max ~15KB of file content
            const maxPerFile = 3000 // Max ~3KB per file

            for (const filePath of availableKeyFiles) {
                if (totalSize >= maxTotalSize) break

                const content = currentFiles[filePath]
                if (content) {
                    const remainingBudget = Math.min(maxPerFile, maxTotalSize - totalSize)
                    const truncated = content.length > remainingBudget
                        ? content.slice(0, remainingBudget) + '\n... (truncated)'
                        : content

                    context += `--- CURRENT ${filePath} ---
\`\`\`
${truncated}
\`\`\`

`
                    totalSize += truncated.length
                }
            }
            context += '</current_file_contents>'
        }
    }

    return context
}

/**
 * Summarize conversation history for context awareness.
 * Extracts key actions and decisions from past messages.
 */
function buildConversationSummary(messages: any[]): string {
    if (messages.length <= 2) return '' // Not enough history to summarize

    // Count message types
    const userMessages = messages.filter(m => m.role === 'user').length
    const assistantMessages = messages.filter(m => m.role === 'assistant').length

    // Extract file operations mentioned in assistant responses
    const fileOperations: string[] = []
    const shellCommands: string[] = []

    for (const msg of messages) {
        if (msg.role !== 'assistant') continue
        const content = typeof msg.content === 'string' ? msg.content : ''

        // Extract file paths from boltAction tags
        const fileMatches = content.matchAll(/<boltAction[^>]*type="file"[^>]*filePath="([^"]+)"[^>]*>/g)
        for (const match of fileMatches) {
            if (match[1] && !fileOperations.includes(match[1])) {
                fileOperations.push(match[1])
            }
        }

        // Extract shell commands
        const shellMatches = content.matchAll(/<boltAction[^>]*type="shell"[^>]*>([\s\S]*?)<\/boltAction>/g)
        for (const match of shellMatches) {
            if (match[1]) {
                const cmd = match[1].trim().slice(0, 50)
                if (!shellCommands.includes(cmd)) {
                    shellCommands.push(cmd)
                }
            }
        }
    }

    if (fileOperations.length === 0 && shellCommands.length === 0) return ''

    return `
<conversation_history_summary>
Conversation Stats: ${userMessages} user messages, ${assistantMessages} assistant responses

${fileOperations.length > 0 ? `Files Created/Modified in This Session (${fileOperations.length}):
${fileOperations.slice(-10).map(f => `  • ${f}`).join('\n')}
${fileOperations.length > 10 ? `  ... and ${fileOperations.length - 10} more` : ''}
` : ''}
${shellCommands.length > 0 ? `Shell Commands Executed:
${shellCommands.slice(-5).map(c => `  $ ${c}`).join('\n')}
` : ''}
</conversation_history_summary>`
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

// ─── Plan Context ─────────────────────────────────────────────────────────────

/**
 * When the user has approved a plan, inject it as a high-priority directive
 * so the implementation agent executes ALL steps in a single boltArtifact.
 */
function buildPlanContext(plan: any): string {
    if (!plan || !Array.isArray(plan.steps) || plan.steps.length === 0) return ''

    const stepsText = plan.steps
        .map((s: any, i: number) =>
            `${i + 1}. [${s.type?.toUpperCase() ?? 'CODE'}] ${s.title}: ${s.description}${s.files?.length ? ` (files: ${s.files.join(', ')})` : ''}`
        )
        .join('\n')

    return `
<approved_plan>
The user has reviewed and APPROVED the following implementation plan.
You MUST execute ALL steps below in a SINGLE <boltArtifact> block.
Do NOT skip any step. Do NOT ask for confirmation.

Title : ${plan.title}
Goal  : ${plan.summary}

Steps to implement:
${stepsText}

CRITICAL: Emit one complete <boltArtifact> that covers every step above.
Emit full file contents for every file you touch — never partial diffs.
</approved_plan>`
}

// ─── Route ───────────────────────────────────────────────────────────────────

export async function POST(req: Request) {
    try {
        const body = await req.json()
        const { messages, fileStructure, currentFile, templateId, currentFiles, plan } = body

        // Debug logging to verify context is being received
        console.log('[b-coder/chat] Request received:', {
            templateId,
            hasFileStructure: !!fileStructure?.length,
            hasCurrentFile: !!currentFile,
            hasCurrentFiles: !!currentFiles,
            currentFilesCount: currentFiles ? Object.keys(currentFiles).length : 0,
            currentFilesList: currentFiles ? Object.keys(currentFiles).slice(0, 10) : []
        })

        if (!messages || messages.length === 0) {
            return new Response(
                JSON.stringify({ error: 'No messages provided' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            )
        }

        const input = buildResponsesInput(messages)

        // ── Template & Conversation Context ─────────────────────────────────
        // Fallback: If currentFiles is null/empty, use original template files
        // This ensures the AI always has file context even on first message
        let filesForContext = currentFiles
        let usingFallback = false
        if (!filesForContext || Object.keys(filesForContext).length === 0) {
            const template = getTemplateById(templateId)
            if (template) {
                filesForContext = template.files
                usingFallback = true
                console.log('[b-coder/chat] Using original template files as fallback')
            } else {
                console.warn(`[b-coder/chat] WARNING: No currentFiles provided and template "${templateId}" not found. AI will have NO file context!`)
            }
        }

        const templateContext = buildTemplateContext(templateId, filesForContext)
        const conversationSummary = buildConversationSummary(messages)

        // Log context status for debugging
        if (!templateContext) {
            console.warn('[b-coder/chat] WARNING: templateContext is empty! AI may claim it has no file context.')
        } else {
            console.log('[b-coder/chat] Template context built successfully:', {
                contextLength: templateContext.length,
                usingFallback,
                filesCount: filesForContext ? Object.keys(filesForContext).length : 0
            })
        }

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
${templateContext}
${conversationSummary}
${supabaseContext}
${assetContext}
${plan ? buildPlanContext(plan) : ''}
`

        // ── Smart Model Selection ─────────────────────────────────────────────
        // If a pre-approved plan is present, always use the full model.
        // Otherwise use fast model for simple questions/greetings.
        const complexity = plan ? 'full' : classifyMessageComplexity(messages)
        const selectedModel = complexity === 'fast' ? 'gpt-5-nano' : 'gpt-5'

        console.log('[b-coder/chat] Smart routing:', { complexity, selectedModel })

        // ── Stream response via OpenAI Responses API ─────────────────────────
        // The Responses API handles MCP tool calls server-side in a single request.
        // GPT-5.4 reasons, calls MCP tools, and streams the final response — all in one.
        const stream = await openai.responses.create({
            model: selectedModel,
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
        console.error('[b-coder/chat] ❌ Request failed:', error instanceof Error ? error.message : error)
        if (error instanceof Error && error.stack) {
            console.error('[b-coder/chat] Stack:', error.stack)
        }
        return new Response(
            JSON.stringify({
                error: 'Failed to process chat request',
                details: error instanceof Error ? error.message : 'Unknown error'
            }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        )
    }
}
