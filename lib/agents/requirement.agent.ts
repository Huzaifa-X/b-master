// lib/agents/requirement.agent.ts
// Requirement Agent - analyzes user input and extracts structured requirements.
// Uses gpt-4o-mini for speed (~300-600ms).

import { openai } from '@/lib/openai'
import type { ArtifactAgentContext, RequirementSpec } from './types'

const SYSTEM_PROMPT = `You are a Requirements Analyst for an AI artifact generation system.
Analyze the user request, attached files, conversation context, and the current artifact content, then extract structured requirements.
Output ONLY valid JSON (no extra text) matching this exact schema:
{
  "intent": "generate" | "update" | "qa",
  "primaryGoal": "one-sentence main objective",
  "contentRequirements": ["specific content needed 1", "..."],
  "styleRequirements": ["visual or layout requirement 1", "..."],
  "dataPoints": ["key fact or data extracted from documents to embed in artifact", "..."],
  "contextSummary": "2-3 sentence distilled summary of all context",
  "qaAnswer": "only when intent is qa - direct helpful answer BASED ON THE ARTIFACT CONTENT provided"
}

Intent classification:
- "generate": creating a new artifact or a complete rebuild from scratch
- "update": targeted modification, fix, addition, or edit to an existing artifact
- "qa": user is asking a question about the artifact content (totals, dates, names, values, etc.) WITHOUT wanting any code/HTML change

CRITICAL for qa intent: read the CURRENT ARTIFACT CONTENT section carefully and answer from it directly.`

export async function runRequirementAgent(
  userPrompt: string,
  ctx: ArtifactAgentContext,
  isUpdate: boolean
): Promise<RequirementSpec> {
  const parts: string[] = [
    `## Artifact`,
    `Name: ${ctx.name}`,
    `Category: ${ctx.category}`,
    isUpdate ? `Mode: UPDATE EXISTING ARTIFACT` : `Mode: GENERATE NEW ARTIFACT`,
    ``,
    `## User Request`,
    userPrompt || ctx.instructions,
  ]

  if (ctx.chatHistory.length > 0) {
    parts.push(`\n## Conversation History (most recent)`)
    ctx.chatHistory.slice(-8).forEach(m => {
      const role = m.role === 'user' ? 'User' : 'AI'
      parts.push(`${role}: ${m.content.slice(0, 600)}`)
    })
  }

  if (ctx.files.length > 0) {
    parts.push(`\n## Attached Documents`)
    ctx.files.forEach(f => {
      parts.push(`### ${f.name}`)
      if (f.extractedText) {
        parts.push(f.extractedText.slice(0, 6000))
      }
    })
  }

  if (ctx.images.length > 0) {
    parts.push(`\n## Attached Images`)
    ctx.images.forEach(img => parts.push(`- ${img.name}: ${img.url}`))
  }

  // When answering questions about an existing artifact, provide the readable
  // text content so the agent can answer data questions (totals, names, dates…)
  if (isUpdate && ctx.currentHtml) {
    const visibleText = htmlToVisibleText(ctx.currentHtml)
    if (visibleText) {
      parts.push(`\n## Current Artifact Content (read this to answer questions)`)
      parts.push(visibleText.slice(0, 8000))
    }
  }

  const response = await openai.chat.completions.create({
    model: 'gpt-4.1-mini',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: parts.join('\n') },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.1,
    max_tokens: 1024,
  })

  try {
    const raw = response.choices[0]?.message?.content ?? '{}'
    const parsed = JSON.parse(raw) as RequirementSpec
    // Ensure intent makes sense for the context
    if (!isUpdate && parsed.intent === 'update') parsed.intent = 'generate'
    return parsed
  } catch {
    return {
      intent: isUpdate ? 'update' : 'generate',
      primaryGoal: (userPrompt || ctx.instructions).slice(0, 200),
      contentRequirements: [userPrompt || ctx.instructions],
      styleRequirements: [],
      dataPoints: [],
      contextSummary: (userPrompt || ctx.instructions).slice(0, 300),
    }
  }
}

/**
 * Strip HTML tags and decode common entities to produce readable plain text.
 * Used to give the Requirement Agent visible artifact content for Q&A answers.
 */
function htmlToVisibleText(html: string): string {
  return html
    // Remove <script> and <style> blocks entirely
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    // Replace block elements with newlines for readability
    .replace(/<\/?(p|div|section|article|header|footer|h[1-6]|li|tr|td|th|br)[^>]*>/gi, '\n')
    // Strip all remaining tags
    .replace(/<[^>]+>/g, '')
    // Decode common HTML entities
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&[a-z]+;/gi, ' ')
    // Collapse excessive whitespace while preserving line breaks
    .split('\n')
    .map(l => l.replace(/\s+/g, ' ').trim())
    .filter(l => l.length > 0)
    .join('\n')
}
