// lib/agents/types.ts
// Shared type definitions for the artifact agent pipeline

// ─── Context passed to each agent ────────────────────────────────────────────

export interface ArtifactAgentContext {
  name: string
  category: string
  instructions: string
  files: UploadedFileCtx[]
  images: ImageCtx[]
  chatHistory: ChatTurn[]
  vectorStoreId?: string
  currentHtml?: string // only for update flows
}

export interface UploadedFileCtx {
  name: string
  extractedText?: string
  extractedHtml?: string
  url?: string
}

export interface ImageCtx {
  name: string
  url: string
}

export interface ChatTurn {
  role: 'user' | 'assistant'
  content: string
}

// ─── Requirement Agent output ─────────────────────────────────────────────────

export type ArtifactIntent = 'generate' | 'update' | 'qa'

export interface RequirementSpec {
  intent: ArtifactIntent
  primaryGoal: string            // One-sentence goal
  contentRequirements: string[]  // Specific content needs
  styleRequirements: string[]    // Visual / styling needs
  dataPoints: string[]           // Key facts from docs / images to embed
  contextSummary: string         // 2-3 sentence distilled summary
  qaAnswer?: string              // Populated only when intent === 'qa'
}

// ─── Process Agent output (generation) ───────────────────────────────────────

export interface SectionPlan {
  id: string
  name: string
  description: string
  dataToInclude: string[]
}

export interface GenerationPlan {
  sections: SectionPlan[]
  layoutStrategy: string     // e.g. "single-page scroll with sticky nav"
  colorScheme: string        // e.g. "dark navy background, gold accents"
  typography: string         // e.g. "Inter for body, Playfair Display for headings"
  specialInstructions: string
}

// ─── Process Agent output (update) ───────────────────────────────────────────

export interface PatchTarget {
  /** 
   * A short unique snippet from the current HTML that identifies the
   * OPENING TAG of the element to replace (includes id/class attributes).
   * Example: '<section id="hero-section"' or '<div class="pricing-card featured"'
   */
  openingTagSnippet: string
  /** Human-readable description of this change (for explanation) */
  description: string
  /** 
   * The complete replacement HTML for this element (full outer HTML including
   * the opening and closing tags). This must be self-contained valid HTML.
   */
  newContent: string
}

export interface UpdatePlan {
  patches: PatchTarget[]
  affectedSections: string[]
  requiresFullRegen: boolean  // true when surgical edit cannot work
  explanation: string         // user-facing explanation of what will change
}

// ─── Edit Agent output ────────────────────────────────────────────────────────

export interface AppliedPatch {
  description: string
  applied: boolean
  reason?: string
}

export interface EditResult {
  finalHtml: string
  appliedPatches: AppliedPatch[]
  explanation: string
  patchesApplied: number
  patchesFailed: number
  requiresFullRegen: boolean
}

// ─── SSE events ──────────────────────────────────────────────────────────────

export type AgentName = 'requirement' | 'process' | 'edit' | 'generator'

export interface AgentStepEvent {
  type: 'agent_step'
  agent: AgentName
  status: 'running' | 'completed' | 'failed'
  message: string
  durationMs?: number
}

export type StreamEvent =
  | { type: 'connected' }
  | AgentStepEvent
  | { type: 'progress'; value: number }
  | { type: 'mode'; mode: 'qa' | 'modify' }
  | { type: 'chunk'; content: string }        // base64-encoded partial HTML
  | { type: 'qa_response'; content: string }
  | { type: 'qa_done' }
  | { type: 'artifact_updating' }
  | { type: 'done'; code: string; explanation: string; versionNumber?: number; message?: string }
  | { type: 'error'; error: string }
