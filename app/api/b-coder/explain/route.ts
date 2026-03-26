import { openai } from '@/lib/openai'
import type { BCoderPlan } from '@/app/api/b-coder/plan/route'

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 30

export async function POST(req: Request) {
    try {
        const body = await req.json()
        const { plan, fileChanges = [] }: { plan: BCoderPlan; fileChanges: string[] } = body

        const systemPrompt = `You are a friendly developer assistant explaining what was just built inside a live in-browser React/Vite app.
Given the plan and the files that were changed, write 2-4 warm, concrete sentences.
Focus on what the user can NOW see or do in their app preview.
No bullet points, no markdown headers. Plain conversational sentences only.`

        const stepsText = plan.steps.map((s, i) => `${i + 1}. ${s.title}: ${s.description}`).join('\n')
        const fileList = fileChanges.length > 0 ? `Files changed: ${fileChanges.join(', ')}` : ''

        const userPrompt = `Plan: "${plan.title}"
Summary: ${plan.summary}
${fileList}
Steps:
${stepsText}

Explain what was just built in 2-4 friendly sentences.`

        const response = await openai.chat.completions.create({
            model: 'gpt-4.1-mini',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt },
            ],
            max_tokens: 220,
            temperature: 0.7,
        })

        const explanation = response.choices[0]?.message?.content?.trim() || 'Implementation complete.'

        return new Response(JSON.stringify({ explanation }), {
            headers: { 'Content-Type': 'application/json' },
        })
    } catch (error) {
        console.error('[b-coder/explain] Error:', error)
        return new Response(JSON.stringify({ explanation: 'Implementation complete.' }), {
            headers: { 'Content-Type': 'application/json' },
        })
    }
}
