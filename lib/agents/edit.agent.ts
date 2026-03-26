// lib/agents/edit.agent.ts
// Edit Agent - applies surgical patches to existing HTML.
// Pure deterministic string manipulation — no AI call needed.
// Falls back to full-regen flag when a patch cannot be located.

import type { UpdatePlan, EditResult, AppliedPatch } from './types'

/**
 * Apply all patches from the UpdatePlan to the current HTML.
 * Uses a multi-strategy approach for reliable snippet location.
 */
export function runEditAgent(currentHtml: string, plan: UpdatePlan): EditResult {
  // If full regen is flagged or there are no patches, signal the orchestrator
  if (plan.requiresFullRegen || plan.patches.length === 0) {
    return {
      finalHtml: currentHtml,
      appliedPatches: [],
      explanation: plan.explanation,
      patchesApplied: 0,
      patchesFailed: 0,
      requiresFullRegen: true,
    }
  }

  let html = currentHtml
  const appliedPatches: AppliedPatch[] = []
  let applied = 0
  let failed = 0

  for (const patch of plan.patches) {
    const { openingTagSnippet, newContent, description } = patch

    if (!openingTagSnippet?.trim() || !newContent?.trim()) {
      appliedPatches.push({ description, applied: false, reason: 'Empty patch data' })
      failed++
      continue
    }

    // Strategy 1: Exact snippet match → replace enclosing element
    const exactResult = replaceByOpeningTag(html, openingTagSnippet, newContent)
    if (exactResult.applied) {
      html = exactResult.result
      appliedPatches.push({ description, applied: true })
      applied++
      continue
    }

    // Strategy 2: Normalized whitespace match
    const normSnippet = normalizeWs(openingTagSnippet)
    const normHtml = normalizeWs(html)
    if (normHtml.includes(normSnippet)) {
      // Find the position in original html using the first word-group
      const firstWordGroup = openingTagSnippet.trim().split(/\s+/).slice(0, 3).join(' ')
      const fallbackResult = replaceByOpeningTag(html, firstWordGroup, newContent)
      if (fallbackResult.applied) {
        html = fallbackResult.result
        appliedPatches.push({ description, applied: true })
        applied++
        continue
      }
    }

    // Strategy 3: Snippet-only direct replace (last resort, less accurate)
    if (html.includes(openingTagSnippet)) {
      const idx = html.indexOf(openingTagSnippet)
      // close the opening tag
      const gtIdx = html.indexOf('>', idx)
      if (gtIdx !== -1) {
        // extract tag name for closing tag search
        const tagNameMatch = openingTagSnippet.match(/<(\w+)/)
        if (tagNameMatch) {
          const tagName = tagNameMatch[1]
          const endResult = findClosingTag(html, idx, tagName)
          if (endResult !== -1) {
            html = html.slice(0, idx) + newContent + html.slice(endResult)
            appliedPatches.push({ description, applied: true })
            applied++
            continue
          }
        }
      }
    }

    appliedPatches.push({ description, applied: false, reason: 'Target not found in HTML' })
    failed++
  }

  // If more than half the patches failed, signal the orchestrator to fall back to full regen
  const requiresFullRegen = failed > 0 && failed >= applied

  return {
    finalHtml: html,
    appliedPatches,
    explanation: plan.explanation,
    patchesApplied: applied,
    patchesFailed: failed,
    requiresFullRegen,
  }
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

/** Find the position immediately after the closing tag that matches the element starting at startIdx */
function findClosingTag(html: string, startIdx: number, tagName: string): number {
  const openRx = new RegExp(`<${tagName}[\\s>]`, 'gi')
  const closeStr = `</${tagName}>`
  let depth = 0
  let i = startIdx

  while (i < html.length) {
    // Check for opening tag
    if (html[i] === '<') {
      // Self-closing or void elements
      const tagSlice = html.slice(i, i + tagName.length + 2)
      if (tagSlice.toLowerCase() === `<${tagName.toLowerCase()} ` || tagSlice.toLowerCase() === `<${tagName.toLowerCase()}>`) {
        depth++
        const closeAngle = html.indexOf('>', i)
        if (closeAngle !== -1) {
          if (html[closeAngle - 1] === '/') depth-- // self-closing: <tag />
          i = closeAngle + 1
          continue
        }
      }
      // Check for closing tag
      const closeCheck = html.slice(i, i + closeStr.length).toLowerCase()
      if (closeCheck === closeStr.toLowerCase()) {
        depth--
        if (depth === 0) {
          return i + closeStr.length
        }
        i += closeStr.length
        continue
      }
    }
    i++
  }
  return -1
}

/** Replace the element identified by its opening tag snippet with newContent */
function replaceByOpeningTag(
  html: string,
  openingTagSnippet: string,
  newContent: string
): { result: string; applied: boolean } {
  const snippetIdx = html.indexOf(openingTagSnippet)
  if (snippetIdx === -1) return { result: html, applied: false }

  const tagNameMatch = openingTagSnippet.match(/<(\w+)/)
  if (!tagNameMatch) return { result: html, applied: false }
  const tagName = tagNameMatch[1]

  // We start the depth count at this element's opening position
  const endPos = findClosingTag(html, snippetIdx, tagName)
  if (endPos === -1) {
    // No closing tag found — replace just from snippet to nearest close
    const closeTag = `</${tagName}>`
    const fallbackEnd = html.indexOf(closeTag, snippetIdx)
    if (fallbackEnd === -1) return { result: html, applied: false }
    const result = html.slice(0, snippetIdx) + newContent + html.slice(fallbackEnd + closeTag.length)
    return { result, applied: true }
  }

  const result = html.slice(0, snippetIdx) + newContent + html.slice(endPos)
  return { result, applied: true }
}

function normalizeWs(s: string): string {
  return s.replace(/\s+/g, ' ').trim()
}
