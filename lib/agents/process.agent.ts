// lib/agents/process.agent.ts
// Process Agent - plans the work based on RequirementSpec.
// Two modes: generation planning and surgical update planning.
// Uses gpt-4o-mini for speed.

import { openai } from '@/lib/openai'
import type { RequirementSpec, GenerationPlan, UpdatePlan } from './types'

// ─── Generation planner ───────────────────────────────────────────────────────

const GEN_SYSTEM_PROMPT = `You are an Artifact Architect AI.
Given requirements for an HTML artifact, create a detailed structural plan.
Output ONLY valid JSON matching this schema:
{
  "sections": [
    {
      "id": "kebab-case-id",
      "name": "Human Readable Name",
      "description": "what this section contains and how it looks",
      "dataToInclude": ["specific data point 1 to embed here", "..."]
    }
  ],
  "layoutStrategy": "description of overall layout approach",
  "colorScheme": "specific color choices and their usage",
  "typography": "font choices (prefer Google Fonts) and usage",
  "specialInstructions": "critical implementation notes, animations, interactions"
}
Create sections in logical order. Be specific and actionable.`

export async function runProcessAgentGeneration(
  spec: RequirementSpec,
  artifactName: string,
  category: string
): Promise<GenerationPlan> {
  const input = [
    `Artifact: "${artifactName}" (${category})`,
    ``,
    `Requirements:`,
    `Goal: ${spec.primaryGoal}`,
    `Content needs: ${spec.contentRequirements.join('; ')}`,
    `Style needs: ${spec.styleRequirements.join('; ')}`,
    `Data to embed: ${spec.dataPoints.join('; ')}`,
    `Context: ${spec.contextSummary}`,
  ].join('\n')

  const response = await openai.chat.completions.create({
    model: 'gpt-4.1-mini',
    messages: [
      { role: 'system', content: GEN_SYSTEM_PROMPT },
      { role: 'user', content: input },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.2,
    max_tokens: 1500,
  })

  try {
    return JSON.parse(response.choices[0]?.message?.content ?? '{}') as GenerationPlan
  } catch {
    return {
      sections: [{ id: 'main', name: 'Main Content', description: spec.primaryGoal, dataToInclude: spec.dataPoints }],
      layoutStrategy: 'Clean single-page layout with clear sections',
      colorScheme: 'Professional color scheme matching the artifact category',
      typography: 'Inter or system-ui for body text',
      specialInstructions: '',
    }
  }
}

// ─── Update / surgical edit planner ──────────────────────────────────────────

const UPDATE_SYSTEM_PROMPT = `You are an HTML Surgical Edit Planner AI.
Given requirements and current HTML, identify the MINIMUM exact changes needed.

For each change, produce a patch with:
- openingTagSnippet: a SHORT unique snippet (30-100 chars) from the element's opening tag
  that uniquely identifies it in the HTML. Include id or class attributes.
  Example: '<section id="pricing-section"' or '<div class="hero-card featured"'
- description: brief human-readable description of what this patch changes
- newContent: the COMPLETE replacement outer HTML for this element (valid, self-contained)

RULES:
1. Only produce patches for elements that actually need to change
2. openingTagSnippet MUST exist verbatim in the current HTML
3. newContent must be complete, valid HTML ready to splice in  
4. Set requiresFullRegen=true ONLY if more than 50% of sections change
5. Prefer surgical patches over full regeneration

Output ONLY valid JSON:
{
  "patches": [
    {
      "openingTagSnippet": "exact snippet from opening tag in current HTML",
      "description": "what this patch changes",
      "newContent": "complete replacement HTML for this element"
    }
  ],
  "affectedSections": ["section names"],
  "requiresFullRegen": false,
  "explanation": "user-friendly explanation of what changed"
}`

export async function runProcessAgentUpdate(
  spec: RequirementSpec,
  currentHtml: string
): Promise<UpdatePlan> {
  // Truncate very long HTML while preserving structure (first + last parts have structure/closing tags)
  const MAX_HTML_CHARS = 20000
  const htmlForAgent = currentHtml.length > MAX_HTML_CHARS
    ? currentHtml.slice(0, 12000) + '\n\n<!-- ... middle section truncated for brevity ... -->\n\n' + currentHtml.slice(-6000)
    : currentHtml

  const input = [
    `Requirements:`,
    `Goal: ${spec.primaryGoal}`,
    `Changes needed: ${spec.contentRequirements.join('; ')}`,
    `Style changes: ${spec.styleRequirements.join('; ')}`,
    `New data to embed: ${spec.dataPoints.join('; ')}`,
    ``,
    `Current HTML (${currentHtml.length} chars total):`,
    htmlForAgent,
  ].join('\n')

  const response = await openai.chat.completions.create({
    model: 'gpt-4.1-mini',
    messages: [
      { role: 'system', content: UPDATE_SYSTEM_PROMPT },
      { role: 'user', content: input },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.1,
    max_tokens: 8000,
  })

  try {
    const parsed = JSON.parse(response.choices[0]?.message?.content ?? '{}') as UpdatePlan
    // Validate structure
    if (!Array.isArray(parsed.patches)) parsed.patches = []
    if (typeof parsed.requiresFullRegen !== 'boolean') parsed.requiresFullRegen = parsed.patches.length === 0
    return parsed
  } catch {
    return {
      patches: [],
      affectedSections: ['all'],
      requiresFullRegen: true,
      explanation: 'Could not plan surgical edit — will regenerate the artifact',
    }
  }
}
