import { openai } from '@/lib/openai'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { canUseTokens, trackTokenUsage } from '@/lib/utils/token-limits'
import prisma from '@/lib/prisma'

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

function scoreRelevance(path: string, content: string, question: string): number {
    const q = question.toLowerCase()
    const p = path.toLowerCase()
    let score = 0
    if (p.endsWith('.tsx') || p.endsWith('.jsx')) score += 3
    if (p.endsWith('.ts') || p.endsWith('.js')) score += 2
    if (p.endsWith('.css')) score += 1
    if (p.includes('package.json') && !p.includes('lock')) score += 2
    if (p.includes('pnpm-lock') || p.includes('package-lock')) score -= 10
    if (p.includes('node_modules')) score -= 10
    const words = q.split(/\W+/).filter(w => w.length > 3)
    for (const word of words) {
        if (p.includes(word)) score += 3
        if (content.toLowerCase().slice(0, 4000).includes(word)) score += 1
    }
    return score
}

export async function POST(req: Request) {
    try {
        // 1. CHECK AUTHENTICATION
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return new Response(
                JSON.stringify({ error: 'Authentication required' }),
                { status: 401, headers: { 'Content-Type': 'application/json' } }
            )
        }

        // 2. CHECK TOKEN QUOTA BEFORE AI CALL
        const estimatedTokens = 3000 // B-Coder ask is a smaller operation
        const tokenCheck = await canUseTokens(estimatedTokens, session.user.id)

        if (!tokenCheck.allowed) {
            const percentUsed = tokenCheck.limit > BigInt(0)
                ? Number((tokenCheck.currentUsage * BigInt(100)) / tokenCheck.limit)
                : 0

            return new Response(
                JSON.stringify({
                    error: 'Token limit exceeded',
                    message: tokenCheck.error,
                    currentUsage: tokenCheck.currentUsage.toString(),
                    limit: tokenCheck.limit.toString(),
                    percentUsed,
                    resetDate: tokenCheck.resetDate.toISOString(),
                    upgradeUrl: '/pricing'
                }),
                { status: 429, headers: { 'Content-Type': 'application/json' } }
            )
        }

        const body = await req.json()
        const { messages, currentFiles, templateId } = body as {
            messages: { role: string; content: string | any[] }[]
            currentFiles?: Record<string, string>
            templateId?: string
        }

        const lastUserMsg = [...(messages || [])].reverse().find((m: any) => m.role === 'user')
        const question = typeof lastUserMsg?.content === 'string'
            ? lastUserMsg.content
            : (lastUserMsg?.content as any[])?.find((p: any) => p.type === 'text')?.text || ''

        // Pick the most relevant source files
        const topFiles = Object.entries(currentFiles || {})
            .filter(([p]) => !p.includes('node_modules') && !p.includes('pnpm-lock') && !p.includes('.git'))
            .map(([path, content]) => ({ path, content, score: scoreRelevance(path, content, question) }))
            .sort((a, b) => b.score - a.score)
            .slice(0, 22)

        const fileContext = topFiles
            .map(({ path, content }) => `=== ${path} ===\n${content.slice(0, 2200)}`)
            .join('\n\n')

        // Keep the last 8 turns for conversational follow-up
        const history = (messages || []).slice(-8).map((m: any) => ({
            role: m.role as 'user' | 'assistant',
            content: typeof m.content === 'string'
                ? m.content.slice(0, 600)
                : (m.content as any[])?.find((p: any) => p.type === 'text')?.text?.slice(0, 600) || '',
        })).filter(m => m.content.trim())

        const systemPrompt = `You are an expert code analyst helping a developer understand their ${templateId || 'React/Vite'} project running in a WebContainer (an in-browser app builder like Bolt.new).

Your job: answer questions about the EXISTING project — its pages, components, features, design, APIs, data models, routing, and overall architecture.

Guidelines:
- Be specific: cite actual file names, component names, function names you see in the code
- Use markdown: headings, bullet lists, inline code like \`ComponentName\`
- For "what pages exist": list each route with its file and what it renders
- For "what components": group them by feature area
- For "what styles/colors": look at CSS files, Tailwind classes, theme config
- For "summarize the app": give a structured overview (purpose, pages, stack, key features)
- Keep the answer focused and useful — not a dump of every file

SOURCE FILES:
${fileContext}`

        const encoder = new TextEncoder()
        let totalTokens = 0

        const stream = new ReadableStream({
            async start(controller) {
                try {
                    const completion = await openai.chat.completions.create({
                        model: 'gpt-4.1-mini',
                        messages: [
                            { role: 'system', content: systemPrompt },
                            ...history,
                        ],
                        stream: true,
                        stream_options: { include_usage: true },
                        max_tokens: 1400,
                        temperature: 0.25,
                    })

                    for await (const chunk of completion) {
                        const delta = chunk.choices[0]?.delta?.content
                        if (delta) {
                            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'text_delta', delta })}\n\n`))
                        }

                        // Extract usage from the final chunk
                        if (chunk.usage) {
                            totalTokens = chunk.usage.total_tokens || 0
                        }
                    }
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`))

                    // Track token usage after completion
                    if (totalTokens > 0) {
                        await trackTokenUsage(session.user.id, totalTokens)

                        // Also create detailed usage metric
                        await prisma.usageMetric.create({
                            data: {
                                userId: BigInt(session.user.id),
                                assistantId: null,
                                inputToken: 0, // Could be extracted from chunk.usage
                                outputToken: 0,
                                totalToken: totalTokens,
                                totalCost: (totalTokens / 1_000_000) * 0.375,
                                costType: "b-coder",
                                toolUsing: "ask"
                            }
                        })
                        console.log('[b-coder/ask] ✅ Token usage tracked:', totalTokens)
                    }
                } catch (err: any) {
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', message: err.message })}\n\n`))
                } finally {
                    controller.close()
                }
            }
        })

        return new Response(stream, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
            }
        })
    } catch (error) {
        console.error('[b-coder/ask] Error:', error)
        return new Response(JSON.stringify({ error: 'Failed to process question' }), {
            status: 500, headers: { 'Content-Type': 'application/json' }
        })
    }
}
