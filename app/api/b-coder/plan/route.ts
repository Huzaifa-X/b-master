import { openai } from '@/lib/openai'
import { getTemplateById } from '@/lib/templates'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { canUseTokens, trackTokenUsage } from '@/lib/utils/token-limits'
import prisma from '@/lib/prisma'

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

export interface PlanStep {
    id: string
    title: string
    description: string
    files?: string[]
    type: 'code' | 'shell' | 'mixed'
}

export interface BCoderPlan {
    id: string
    title: string
    summary: string
    directResponse?: string | null
    siteQuestion?: boolean
    steps: PlanStep[]
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
        const estimatedTokens = 3000 // Plan generation is lighter
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
        const { messages, templateId, currentFiles } = body

        const lastUserMessage = messages?.filter((m: any) => m.role === 'user').pop()
        if (!lastUserMessage) {
            return new Response(JSON.stringify({ error: 'No user message' }), {
                status: 400, headers: { 'Content-Type': 'application/json' },
            })
        }

        // Extract text from last user message
        let userText = ''
        if (typeof lastUserMessage.content === 'string') {
            userText = lastUserMessage.content
        } else if (Array.isArray(lastUserMessage.parts)) {
            userText = lastUserMessage.parts
                .filter((p: any) => p.type === 'text')
                .map((p: any) => p.text || '')
                .join(' ')
        }

        const template = templateId ? getTemplateById(templateId) : null
        const fileList = currentFiles
            ? Object.keys(currentFiles).map(f => `- ${f}`).slice(0, 30).join('\n')
            : '(none)'

        // Include recent conversation for context
        const historyContext = (messages as any[])
            .slice(-6)
            .filter((m: any) => m.role !== 'system')
            .map((m: any) => {
                const text = typeof m.content === 'string'
                    ? m.content.slice(0, 300)
                    : (m.parts?.find((p: any) => p.type === 'text')?.text || '').slice(0, 300)
                return `${m.role.toUpperCase()}: ${text}`
            })
            .join('\n')

        const systemPrompt = `You are a planning agent inside B-Coder, an in-browser React/Vite WebContainer app builder (similar to Bolt.new / Lovable).

PROJECT: ${template?.name || templateId || 'Unknown'}
CURRENT FILES:
${fileList}

RECENT CONVERSATION:
${historyContext}

ANALYZE the user request and produce a structured JSON implementation plan.

RULES:
- Greetings, capability questions ("what can you do?") → set directResponse to a SHORT friendly reply, steps: []
- Questions about the EXISTING project ("what pages exist?", "what components do you have?", "summarize the app", "how does X work?", "what colors are used?", "what APIs are called?", "what is the architecture?", etc.) → set siteQuestion: true, directResponse: null, steps: []
- Code tasks → 1–6 concrete steps referencing exact file paths where possible
- Include a shell step ONLY if new npm packages are genuinely required
- Step title max 50 chars; description max 120 chars
- Never say "write code" or "implement the logic" — be specific about what changes
- Think like a senior dev: batch related changes into single steps

Respond ONLY with valid JSON:
{
  "id": "<uuid-v4>",
  "title": "<60-char max action title>",
  "summary": "<1-2 sentence approach overview>",
  "directResponse": null,
  "siteQuestion": false,
  "steps": [
    {
      "id": "1",
      "title": "Step title",
      "description": "Exact action description",
      "files": ["src/App.jsx"],
      "type": "code"
    }
  ]
}`

        const response = await openai.chat.completions.create({
            model: 'gpt-4.1-mini',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userText },
            ],
            response_format: { type: 'json_object' },
            max_tokens: 1000,
            temperature: 0.2,
        })

        // Track token usage
        const totalTokens = response.usage?.total_tokens || 0
        if (totalTokens > 0) {
            await trackTokenUsage(session.user.id, totalTokens)

            // Also create detailed usage metric
            await prisma.usageMetric.create({
                data: {
                    userId: BigInt(session.user.id),
                    assistantId: null,
                    inputToken: response.usage?.prompt_tokens || 0,
                    outputToken: response.usage?.completion_tokens || 0,
                    totalToken: totalTokens,
                    totalCost: (totalTokens / 1_000_000) * 0.375,
                    costType: "b-coder",
                    toolUsing: "plan"
                }
            })
            console.log('[b-coder/plan] ✅ Token usage tracked:', totalTokens)
        }

        const raw = response.choices[0]?.message?.content || '{}'
        let plan: BCoderPlan
        try {
            plan = JSON.parse(raw)
            if (!plan.id) plan.id = crypto.randomUUID()
            if (!Array.isArray(plan.steps)) plan.steps = []
            if (!plan.title) plan.title = 'Implementation Plan'
            if (plan.directResponse === undefined) plan.directResponse = null
            if (plan.siteQuestion === undefined) plan.siteQuestion = false
        } catch {
            plan = {
                id: crypto.randomUUID(),
                title: 'Implementation Plan',
                summary: 'Ready to proceed with your request.',
                directResponse: null,
                steps: [],
            }
        }

        return new Response(JSON.stringify({ plan }), {
            headers: { 'Content-Type': 'application/json' },
        })
    } catch (error) {
        console.error('[b-coder/plan] Error:', error)
        return new Response(
            JSON.stringify({ error: 'Failed to generate plan' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        )
    }
}
