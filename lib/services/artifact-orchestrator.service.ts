// lib/services/artifact-orchestrator.service.ts
//
// Main Orchestrator — sequences the sub-agents for both generation and update flows.
//
//  Generation flow:
//    RequirementAgent → ProcessAgent(gen) → HTML Generator (streaming)
//
//  Update flow:
//    RequirementAgent → ProcessAgent(update) → EditAgent (surgical)
//                    └─ fallback to full HTML regen if surgical fails
//
// All sub-agent calls run on gpt-4o-mini (~300-600ms each).
// HTML generation uses the primary model with streaming.

import { openai } from '@/lib/openai'
import { getArtifactCodingPrompt, getArtifactUpdateCodingPrompt } from '@/utils/prompts'
import { runRequirementAgent } from '@/lib/agents/requirement.agent'
import { runProcessAgentGeneration, runProcessAgentUpdate } from '@/lib/agents/process.agent'
import { runEditAgent } from '@/lib/agents/edit.agent'
import type {
  ArtifactAgentContext,
  RequirementSpec,
  GenerationPlan,
  UpdatePlan,
  EditResult,
  AgentName,
  StreamEvent,
} from '@/lib/agents/types'

// ─── Models ───────────────────────────────────────────────────────────────────
const GENERATION_MODEL = 'gpt-5.2'
const UPDATE_MODEL = 'gpt-4.1'
const MAX_GEN_TOKENS = 16000
const GENERATION_TEMPERATURE = 0.3

// ─── Helper: encode SSE event ─────────────────────────────────────────────────
export function encodeSSE(event: StreamEvent): Uint8Array {
  return new TextEncoder().encode(`data: ${JSON.stringify(event)}\n\n`)
}

// ─── Helper: timer ────────────────────────────────────────────────────────────
function now(): number {
  return Date.now()
}

// ─────────────────────────────────────────────────────────────────────────────
// GENERATION ORCHESTRATOR
// Called by the artifact-generation.service.ts (background job pipeline)
// Emits progress via the onProgress callback; streams HTML via onChunk.
// ─────────────────────────────────────────────────────────────────────────────

export interface GenerationCallbacks {
  /** Called at various pipeline stages with a 0-100 value and optional agent step message */
  onProgress: (pct: number, message?: string, agent?: AgentName) => Promise<void>
  /** Called with each streamed HTML chunk */
  onChunk: (chunk: string) => Promise<void>
}

export async function orchestrateGeneration(
  ctx: ArtifactAgentContext,
  callbacks: GenerationCallbacks
): Promise<string> {
  const { onProgress, onChunk } = callbacks

  // ── Step 1: Requirement Agent ──────────────────────────────────────────────
  let t = now()
  await onProgress(10, 'Analysing requirements…', 'requirement')
  const spec = await runRequirementAgent(ctx.instructions, ctx, false)
  await onProgress(22, `Requirements extracted (${now() - t}ms)`, 'requirement')

  // ── Step 2: Process Agent (generation plan) ────────────────────────────────
  t = now()
  await onProgress(25, 'Planning artifact structure…', 'process')
  const plan = await runProcessAgentGeneration(spec, ctx.name, ctx.category)
  await onProgress(35, `Structure planned: ${plan.sections.length} sections (${now() - t}ms)`, 'process')

  // ── Step 3: HTML Generator ─────────────────────────────────────────────────
  await onProgress(40, 'Generating HTML…', 'generator')
  const generatedHtml = await runHtmlGenerator(spec, plan, ctx, onProgress, onChunk)

  await onProgress(95, 'Finalising…', 'generator')
  return generatedHtml
}

// ─────────────────────────────────────────────────────────────────────────────
// UPDATE ORCHESTRATOR
// Called directly from the update-stream API route.
// Returns an async generator that yields SSE events.
// ─────────────────────────────────────────────────────────────────────────────

export async function* orchestrateUpdate(
  userPrompt: string,
  ctx: ArtifactAgentContext,
  currentHtml: string
): AsyncGenerator<StreamEvent> {
  // ── Connected ──────────────────────────────────────────────────────────────
  yield { type: 'connected' }

  // ── Step 1: Requirement Agent ──────────────────────────────────────────────
  let t = now()
  yield { type: 'agent_step', agent: 'requirement', status: 'running', message: 'Analysing your request…' }

  let spec: RequirementSpec
  try {
    spec = await runRequirementAgent(userPrompt, ctx, true)
  } catch (err: any) {
    yield { type: 'error', error: 'Requirement analysis failed: ' + (err.message ?? err) }
    return
  }

  yield {
    type: 'agent_step',
    agent: 'requirement',
    status: 'completed',
    message: `Intent: ${spec.intent} — ${spec.primaryGoal}`,
    durationMs: now() - t,
  }

  // ── Handle Q&A intent immediately ─────────────────────────────────────────
  if (spec.intent === 'qa') {
    yield { type: 'mode', mode: 'qa' }
    yield { type: 'qa_response', content: spec.qaAnswer ?? spec.primaryGoal }
    yield { type: 'qa_done' }
    return
  }

  yield { type: 'mode', mode: 'modify' }

  // ── Step 2: Process Agent (update plan) ───────────────────────────────────
  t = now()
  yield { type: 'agent_step', agent: 'process', status: 'running', message: 'Planning surgical edits…' }

  let updatePlan: UpdatePlan
  try {
    updatePlan = await runProcessAgentUpdate(spec, currentHtml)
  } catch (err: any) {
    // If planning fails, fall through to full regeneration
    updatePlan = { patches: [], affectedSections: ['all'], requiresFullRegen: true, explanation: spec.primaryGoal }
  }

  yield {
    type: 'agent_step',
    agent: 'process',
    status: 'completed',
    message: updatePlan.requiresFullRegen
      ? 'Full regeneration required'
      : `${updatePlan.patches.length} surgical patch(es) planned`,
    durationMs: now() - t,
  }

  // ── Step 3a: Surgical Edit Agent ──────────────────────────────────────────
  if (!updatePlan.requiresFullRegen && updatePlan.patches.length > 0) {
    t = now()
    yield { type: 'agent_step', agent: 'edit', status: 'running', message: 'Applying surgical patches…' }

    const editResult: EditResult = runEditAgent(currentHtml, updatePlan)

    if (!editResult.requiresFullRegen && editResult.patchesApplied > 0) {
      yield {
        type: 'agent_step',
        agent: 'edit',
        status: 'completed',
        message: `Applied ${editResult.patchesApplied}/${updatePlan.patches.length} patch(es) in ${now() - t}ms`,
        durationMs: now() - t,
      }

      // Emit the final patched HTML as a single chunk (base64)
      const encoded = Buffer.from(editResult.finalHtml).toString('base64')
      yield { type: 'chunk', content: encoded }

      yield {
        type: 'done',
        code: editResult.finalHtml,
        explanation: editResult.explanation,
        message: editResult.explanation,
      }
      return
    }

    // Patches failed — fall through to full regen
    yield {
      type: 'agent_step',
      agent: 'edit',
      status: 'failed',
      message: `${editResult.patchesFailed} patch(es) failed — falling back to full regeneration`,
      durationMs: now() - t,
    }
  }

  // ── Step 3b: Full Regeneration Fallback ───────────────────────────────────
  yield { type: 'agent_step', agent: 'generator', status: 'running', message: 'Regenerating artifact…' }

  try {
    yield* runStreamingFullRegen(userPrompt, ctx, currentHtml, spec)
  } catch (err: any) {
    yield { type: 'error', error: err.message ?? 'Generation failed' }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// INTERNAL: HTML Generator for new artifacts
// ─────────────────────────────────────────────────────────────────────────────

async function runHtmlGenerator(
  spec: RequirementSpec,
  plan: GenerationPlan,
  ctx: ArtifactAgentContext,
  onProgress: (pct: number, msg?: string, agent?: AgentName) => Promise<void>,
  onChunk: (chunk: string) => Promise<void>
): Promise<string> {
  const systemPrompt = await getArtifactCodingPrompt()
  const sectionDescriptions = plan.sections
    .map(s => `- ${s.name}: ${s.description} [data: ${s.dataToInclude.join(', ')}]`)
    .join('\n')

  // Build file context sections
  const fileContextParts: string[] = []
  if (ctx.files.length > 0) {
    fileContextParts.push(`## Attached Documents (use CONTENT only, NOT URLs)`)
    ctx.files.forEach(f => {
      fileContextParts.push(`### ${f.name}`)
      if (f.extractedText) {
        fileContextParts.push(f.extractedText.slice(0, 4000))
      }
    })
  }

  if (ctx.images.length > 0) {
    fileContextParts.push(`## Attached Images (describe content, DO NOT embed image URLs)`)
    ctx.images.forEach(img => {
      fileContextParts.push(`- ${img.name}: [Image for reference - analyze content but don't use URLs in HTML]`)
    })
  }

  const input = [
    `Create a complete, production-quality HTML artifact.`,
    ``,
    `## Artifact Details`,
    `Name: ${ctx.name}`,
    `Category: ${ctx.category}`,
    ``,
    `## Architect Plan`,
    `Layout: ${plan.layoutStrategy}`,
    `Colors: ${plan.colorScheme}`,
    `Typography: ${plan.typography}`,
    `Special: ${plan.specialInstructions}`,
    ``,
    `## Required Sections`,
    sectionDescriptions,
    ``,
    `## Content Requirements`,
    spec.contentRequirements.join('\n'),
    ``,
    `## Style Requirements`,
    spec.styleRequirements.join('\n'),
    ``,
    `## Data to Embed`,
    spec.dataPoints.join('\n'),
    ``,
    ...fileContextParts,
    ``,
    `## Original User Instructions`,
    ctx.instructions,
    ``,
    `CRITICAL RULES:`,
    `1. Output ONLY the complete HTML starting with <!DOCTYPE html> and ending with </html>. No explanations.`,
    `2. DO NOT embed external URLs (S3, AWS, or any file storage URLs) in the HTML`,
    `3. For images: Use data URIs, placeholders, or generate with Canvas/SVG - NEVER use uploaded file URLs`,
    `4. Extract and USE the TEXT CONTENT from documents, not their storage locations`,
  ].join('\n')

  const systemInstructions =
    systemPrompt +
    '\n\nCRITICAL REMINDER: Your response must be ONLY HTML code starting with <!DOCTYPE html> and ending with </html>. No explanations, no markdown.'

  let generatedCode = ''
  let progressPct = 40
  let chunkCount = 0

  const response = await openai.responses.create({
    model: GENERATION_MODEL,
    instructions: systemInstructions,
    input,
    stream: true,
    temperature: GENERATION_TEMPERATURE,
    max_output_tokens: MAX_GEN_TOKENS,
    ...(ctx.vectorStoreId && {
      tools: [{ type: 'file_search', vector_store_ids: [ctx.vectorStoreId] }],
    }),
  } as any)

  for await (const event of response as any) {
    if (event.type === 'response.output_text.delta' && event.delta) {
      generatedCode += event.delta
      chunkCount++
      progressPct = Math.min(90, progressPct + 0.2)

      await onChunk(event.delta)

      if (chunkCount % 15 === 0) {
        await onProgress(Math.floor(progressPct), undefined, 'generator')
      }
    }
  }

  // Clean markdown fences if any
  generatedCode = generatedCode
    .replace(/^```html\n?/i, '')
    .replace(/^```\n?/i, '')
    .replace(/\n?```$/i, '')
    .trim()

  return generatedCode
}

// ─────────────────────────────────────────────────────────────────────────────
// INTERNAL: Full regeneration streaming (for update fallback)
// ─────────────────────────────────────────────────────────────────────────────

async function* runStreamingFullRegen(
  userPrompt: string,
  ctx: ArtifactAgentContext,
  currentHtml: string,
  spec: RequirementSpec
): AsyncGenerator<StreamEvent> {
  const systemPrompt = await getArtifactUpdateCodingPrompt()

  // Build file context sections
  const fileContextParts: string[] = []
  if (ctx.files.length > 0) {
    fileContextParts.push(`## Attached Documents (use CONTENT only, NOT URLs)`)
    ctx.files.forEach(f => {
      fileContextParts.push(`### ${f.name}`)
      if (f.extractedText) {
        fileContextParts.push(f.extractedText.slice(0, 4000))
      }
    })
  }

  if (ctx.images.length > 0) {
    fileContextParts.push(`## Attached Images (analyze content, DO NOT embed URLs)`)
    ctx.images.forEach(img => {
      fileContextParts.push(`- ${img.name}: [Image for reference - use content description, not URLs]`)
    })
  }

  const input = [
    `## User Request`,
    userPrompt,
    ``,
    `## What to Change`,
    spec.contentRequirements.join('\n'),
    spec.styleRequirements.length > 0 ? `\nStyle: ${spec.styleRequirements.join('; ')}` : '',
    spec.dataPoints.length > 0 ? `\nNew data: ${spec.dataPoints.join('; ')}` : '',
    ``,
    ...fileContextParts,
    ``,
    `## Current Artifact (update this — do not start from scratch)`,
    currentHtml,
    ``,
    `CRITICAL RULES:`,
    `1. Output the complete updated HTML starting with <!DOCTYPE html>`,
    `2. DO NOT embed external URLs (S3, AWS, or any file storage URLs) in the HTML`,
    `3. For images: Use data URIs, placeholders, or Canvas/SVG - NEVER use uploaded file URLs`,
    `4. Use the TEXT CONTENT from uploaded documents, not their storage locations`,
  ].filter(Boolean).join('\n')

  const streamResponse = await openai.responses.create({
    model: UPDATE_MODEL,
    instructions: systemPrompt + '\n\nOutput ONLY complete HTML starting with <!DOCTYPE html>. No explanations.',
    input,
    stream: true,
    ...(ctx.vectorStoreId && {
      tools: [{ type: 'file_search', vector_store_ids: [ctx.vectorStoreId] }],
    }),
  } as any)

  let fullText = ''
  let buffer = ''
  const CHUNK_SIZE = 1024

  for await (const event of streamResponse as any) {
    if (event.type === 'response.output_text.delta' && event.delta) {
      fullText += event.delta
      buffer += event.delta

      if (buffer.length >= CHUNK_SIZE) {
        yield { type: 'chunk', content: Buffer.from(buffer).toString('base64') }
        buffer = ''
      }
    }
  }

  if (buffer.length > 0) {
    yield { type: 'chunk', content: Buffer.from(buffer).toString('base64') }
  }

  const finalCode = fullText
    .replace(/^\s*\[UPDATE\]\s*/i, '')
    .replace(/^```html\n?/i, '')
    .replace(/^```\n?/i, '')
    .replace(/\n?```$/i, '')
    .trim()

  yield {
    type: 'agent_step',
    agent: 'generator',
    status: 'completed',
    message: 'Artifact regenerated successfully',
  }

  yield {
    type: 'done',
    code: finalCode,
    explanation: spec.primaryGoal,
    message: spec.primaryGoal,
  }
}
