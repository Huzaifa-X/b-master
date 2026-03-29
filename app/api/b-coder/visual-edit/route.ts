import { openai } from '@/lib/openai'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { canUseTokens, trackTokenUsage } from '@/lib/utils/token-limits'
import prisma from '@/lib/prisma'

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 90

interface SelectedElement {
    tag: string
    id: string | null
    classes: string
    text: string
    component: string | null
    outerHTML: string
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
        const estimatedTokens = 5000 // Visual edit operations
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
        const { elementInfo, changeRequest, currentFiles, templateId } = body as {
            elementInfo: SelectedElement
            changeRequest: string
            currentFiles: Record<string, string>
            templateId?: string
        }

        if (!elementInfo || !changeRequest || !currentFiles) {
            return new Response(JSON.stringify({ error: 'Missing required fields' }), {
                status: 400, headers: { 'Content-Type': 'application/json' }
            })
        }

        // Only include source files, capped to avoid token overflow
        const fileEntries = Object.entries(currentFiles)
            .filter(([path]) =>
                !path.includes('node_modules') &&
                (path.endsWith('.jsx') || path.endsWith('.tsx') || path.endsWith('.js') ||
                    path.endsWith('.ts') || path.endsWith('.css'))
            )
            .slice(0, 25)

        const filesSummary = fileEntries.map(([path, content]) =>
            `=== ${path} ===\n${content.slice(0, 3000)}`
        ).join('\n\n')

        const elementDesc = [
            elementInfo.component ? `React component name: <${elementInfo.component}>` : null,
            `HTML tag: <${elementInfo.tag}>`,
            elementInfo.id ? `id="${elementInfo.id}"` : null,
            elementInfo.classes ? `className="${elementInfo.classes}"` : null,
            elementInfo.text ? `Text: "${elementInfo.text}"` : null,
            `outerHTML: ${elementInfo.outerHTML}`,
        ].filter(Boolean).join('\n')

        const systemPrompt = `You are a surgical code editor for a live React/Vite app.
A user clicked on an element in the preview and wants to change it.

Your job:
1. Identify the MOST SPECIFIC source file that renders this element's JSX
2. Apply ONLY the requested change to that one element/component
3. Return the complete file with no other code changed

Rules:
- Prefer dedicated component files over App.tsx/App.jsx
- NEVER modify unrelated elements or logic
- Preserve all imports, hooks, and other components exactly
- Apply changes via Tailwind classes when styling
- Return the COMPLETE updated file content — never truncate

Respond ONLY with valid JSON (no markdown, no code fences):
{
  "file": "relative/path/to/file.tsx",
  "newContent": "// complete file contents",
  "explanation": "One sentence: what exactly was changed"
}`

        const userPrompt = `Element selected by user:
${elementDesc}

User request: "${changeRequest}"

Available source files:
${filesSummary}

Find the file, apply the change, return JSON.`

        const response = await openai.chat.completions.create({
            model: 'gpt-4.1',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt },
            ],
            response_format: { type: 'json_object' },
            max_tokens: 6000,
            temperature: 0.05,
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
                    toolUsing: "visual-edit"
                }
            })
            console.log('[b-coder/visual-edit] ✅ Token usage tracked:', totalTokens)
        }

        const raw = response.choices[0]?.message?.content || '{}'
        let result: { file: string; newContent: string; explanation: string }
        try {
            result = JSON.parse(raw)
            if (!result.file || !result.newContent) throw new Error('Invalid structure')
        } catch {
            return new Response(JSON.stringify({ error: 'Failed to parse AI response' }), {
                status: 500, headers: { 'Content-Type': 'application/json' }
            })
        }

        return new Response(JSON.stringify(result), {
            headers: { 'Content-Type': 'application/json' }
        })
    } catch (error) {
        console.error('[b-coder/visual-edit] Error:', error)
        return new Response(JSON.stringify({ error: 'Failed to process visual edit' }), {
            status: 500, headers: { 'Content-Type': 'application/json' }
        })
    }
}
