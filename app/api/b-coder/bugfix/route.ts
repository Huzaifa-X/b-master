import { openai } from '@/lib/openai'
import type { BCoderPlan, PlanStep } from '@/app/api/b-coder/plan/route'

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

interface BugFixResponse {
    errorSummary: string
    plan: BCoderPlan
}

export async function POST(req: Request) {
    try {
        const body = await req.json()
        const { errorOutput, currentFiles, templateId } = body as {
            errorOutput: string
            currentFiles?: Record<string, string>
            templateId?: string
        }

        if (!errorOutput?.trim()) {
            return new Response(JSON.stringify({ error: 'No error output provided' }), {
                status: 400, headers: { 'Content-Type': 'application/json' },
            })
        }

        const fileList = currentFiles ? Object.keys(currentFiles).join(', ') : '(unknown)'

        const systemPrompt = `You are an expert developer specializing in debugging in-browser React/Vite WebContainer apps.
Analyze the error and return a JSON bug fix plan.

Rules:
- errorSummary: one clear sentence explaining the root cause (max 90 chars)
- plan.title: "Fix: [short description]" (max 55 chars)
- plan.summary: what will be fixed and how (1-2 sentences)
- plan.steps: 1-4 concrete steps referencing exact file paths
- Use type "code" for file edits, "shell" for package installs, "mixed" for both

Common WebContainer bugs: missing Tailwind config, wrong import paths, missing packages, CSS variable mismatches, Vite config issues.

Return ONLY valid JSON:
{
  "errorSummary": "string",
  "plan": {
    "id": "bugfix-<timestamp>",
    "title": "string",
    "summary": "string",
    "directResponse": null,
    "steps": [
      { "id": "1", "title": "string", "description": "string", "files": ["path"], "type": "code" }
    ]
  }
}`

        const userPrompt = `Template: ${templateId || 'react-vite'}
Workspace files: ${fileList}

Error output:
\`\`\`
${errorOutput.slice(0, 3000)}
\`\`\`

Analyze and return the JSON bug fix plan.`

        const response = await openai.chat.completions.create({
            model: 'gpt-4.1-mini',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt },
            ],
            response_format: { type: 'json_object' },
            max_tokens: 800,
            temperature: 0.1,
        })

        const raw = response.choices[0]?.message?.content || '{}'
        let data: BugFixResponse
        try {
            data = JSON.parse(raw)
            if (!data.errorSummary || !data.plan) throw new Error('Invalid structure')
            data.plan.id = data.plan.id || `bugfix-${Date.now()}`
            if (!Array.isArray(data.plan.steps)) data.plan.steps = []
        } catch {
            return new Response(JSON.stringify({ error: 'Failed to parse bug analysis' }), {
                status: 500, headers: { 'Content-Type': 'application/json' },
            })
        }

        return new Response(JSON.stringify(data), {
            headers: { 'Content-Type': 'application/json' },
        })
    } catch (error) {
        console.error('[b-coder/bugfix] Error:', error)
        return new Response(JSON.stringify({ error: 'Failed to analyze bug' }), {
            status: 500, headers: { 'Content-Type': 'application/json' },
        })
    }
}