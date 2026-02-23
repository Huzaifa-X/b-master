"use client"
import { useState, useTransition, useRef, useEffect, useCallback } from "react"
import { getPrompts, createPrompt, updatePrompt, deletePrompt } from "@/app/actions/super-admin.action"
import { Plus, Trash2, Save, FileText, X, Check, RotateCcw, Circle } from "lucide-react"

type Prompt = { id: number; name: string; prompt: string; createdAt: Date }

/* ── Editor panel ─────────────────────────────────────────────── */
function PromptEditor({
  prompt,
  onSave,
  onDelete,
  onClose,
}: {
  prompt: Prompt | null           // null = new prompt
  onSave: (name: string, content: string) => Promise<void>
  onDelete?: (id: number) => Promise<void>
  onClose: () => void
}) {
  const [name, setName] = useState(prompt?.name ?? "")
  const [content, setContent] = useState(prompt?.prompt ?? "")
  const [pending, startT] = useTransition()
  const [deleting, startD] = useTransition()
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const isDirty = name !== (prompt?.name ?? "") || content !== (prompt?.prompt ?? "")
  const lines = content.split("\n")

  // Keep line numbers scrolled in sync
  const gutterRef = useRef<HTMLDivElement>(null)
  const syncScroll = useCallback(() => {
    if (gutterRef.current && textareaRef.current) {
      gutterRef.current.scrollTop = textareaRef.current.scrollTop
    }
  }, [])

  function handleSave() {
    if (!name.trim() || !content.trim()) return
    startT(async () => {
      await onSave(name.trim(), content.trim())
    })
  }

  function handleDelete() {
    if (!prompt) return
    startD(async () => {
      await onDelete!(prompt.id)
    })
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    // Tab → insert 2 spaces
    if (e.key === "Tab") {
      e.preventDefault()
      const ta = e.currentTarget
      const start = ta.selectionStart
      const end = ta.selectionEnd
      const next = content.substring(0, start) + "  " + content.substring(end)
      setContent(next)
      requestAnimationFrame(() => {
        ta.selectionStart = ta.selectionEnd = start + 2
      })
    }
    // Ctrl/Cmd+S → save
    if ((e.ctrlKey || e.metaKey) && e.key === "s") {
      e.preventDefault()
      handleSave()
    }
  }

  const isNew = prompt === null

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* ── Title bar ── */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border bg-muted/40 shrink-0">
        <FileText className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="prompt-name"
          className="flex-1 bg-transparent text-sm font-medium text-foreground outline-none placeholder:text-muted-foreground/50 min-w-0"
        />
        {isDirty && (
          <Circle className="w-2 h-2 fill-primary text-primary shrink-0" title="Unsaved changes" />
        )}
        <div className="flex items-center gap-1 ml-2 shrink-0">
          {!isNew && (
            <button
              onClick={() => { setName(prompt!.name); setContent(prompt!.prompt) }}
              title="Discard changes"
              className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={pending || !name.trim() || !content.trim()}
            title="Save  (Ctrl+S)"
            className="flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium bg-primary text-white hover:bg-primary/90 disabled:opacity-40 transition-colors"
          >
            {pending ? (
              <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            {pending ? "Saving…" : "Save"}
          </button>
          {!isNew && onDelete && (
            <button
              onClick={handleDelete}
              disabled={deleting}
              title="Delete prompt"
              className="p-1.5 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 disabled:opacity-40"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ── Editor body ── */}
      <div className="flex-1 min-h-0 flex overflow-hidden bg-[#1e1e2e] rounded-b-xl">
        {/* Line numbers */}
        <div
          ref={gutterRef}
          className="select-none overflow-hidden shrink-0 pt-3 pb-3 pr-3 pl-4 text-right text-xs leading-[1.6rem] font-mono text-[#6e7191] bg-[#181825] border-r border-[#313244] w-[3.25rem]"
          style={{ overflowY: "hidden" }}
        >
          {lines.map((_, i) => (
            <div key={i}>{i + 1}</div>
          ))}
          {/* Extra blank line so last line number shows when cursor is there */}
          <div>&nbsp;</div>
        </div>

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={content}
          onChange={e => setContent(e.target.value)}
          onScroll={syncScroll}
          onKeyDown={handleKeyDown}
          placeholder={"# Write your system prompt here…\n\nYou are a helpful assistant…"}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          className={[
            "flex-1 min-w-0 resize-none outline-none p-3 pl-4",
            "text-sm leading-[1.6rem] font-mono",
            "text-[#cdd6f4] bg-transparent",
            "placeholder:text-[#6e7191]/60",
            "overflow-y-auto",
          ].join(" ")}
        />
      </div>

      {/* ── Status bar ── */}
      <div className="flex items-center justify-between px-4 py-1 bg-primary text-white text-[11px] font-mono rounded-b-none rounded-t-none shrink-0 select-none" style={{ borderRadius: "0 0 0.75rem 0.75rem" }}>
        <span>{isNew ? "New prompt" : `Last saved: ${new Date(prompt!.createdAt).toLocaleString()}`}</span>
        <span>Ln {lines.length} · {content.length} chars</span>
      </div>
    </div>
  )
}

/* ── Main page ────────────────────────────────────────────────── */
export default function PromptsClient({ initial }: { initial: Prompt[] }) {
  const [prompts, setPrompts] = useState<Prompt[]>(initial)
  // undefined = nothing open, null = new, Prompt = existing
  const [active, setActive] = useState<Prompt | null | undefined>(
    initial.length > 0 ? initial[0] : undefined
  )
  const [saved, setSaved] = useState<number | null>(null)

  async function handleSave(name: string, content: string) {
    if (active) {
      await updatePrompt(active.id, { name, prompt: content })
    } else {
      await createPrompt({ name, prompt: content })
    }
    const updated = (await getPrompts()) as Prompt[]
    setPrompts(updated)
    // Show saved flash
    setSaved(Date.now())
    setTimeout(() => setSaved(null), 1800)
    // Re-select the updated prompt by name
    const match = updated.find(p => p.name === name)
    if (match) setActive(match)
    else if (active === null) setActive(updated[updated.length - 1] ?? undefined)
  }

  async function handleDelete(id: number) {
    await deletePrompt(id)
    const updated = (await getPrompts()) as Prompt[]
    setPrompts(updated)
    setActive(updated.length > 0 ? updated[0] : undefined)
  }

  return (
    <div className="flex flex-col gap-4" style={{ height: "calc(100vh - 9rem)" }}>
      {/* ── Header ── */}
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Prompts</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {prompts.length} system prompt{prompts.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {saved !== null && (
            <span className="flex items-center gap-1 text-green-600 text-xs font-medium">
              <Check className="w-3.5 h-3.5" /> Saved
            </span>
          )}
          <button
            onClick={() => setActive(null)}
            className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm hover:bg-primary/90"
          >
            <Plus className="w-4 h-4" /> New Prompt
          </button>
        </div>
      </div>

      {/* ── Split layout ── */}
      <div className="flex flex-1 min-h-0 gap-4">
        {/* Left: prompt list */}
        <div className="w-64 shrink-0 flex flex-col min-h-0">
          <div className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground px-1 mb-2">
            Explorer
          </div>
          <div className="flex-1 overflow-y-auto space-y-0.5 pr-1">
            {prompts.length === 0 && (
              <p className="text-muted-foreground text-xs px-2 py-3">No prompts yet.</p>
            )}
            {prompts.map((p) => {
              const isActive = active && "id" in active && active.id === p.id
              return (
                <button
                  key={p.id}
                  onClick={() => setActive(p)}
                  className={[
                    "w-full text-left flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm transition-colors group",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  ].join(" ")}
                >
                  <FileText className="w-3.5 h-3.5 shrink-0 opacity-70" />
                  <span className="flex-1 truncate font-mono text-xs">{p.name}</span>
                </button>
              )
            })}
            {active === null && (
              <button
                className="w-full text-left flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm bg-primary/10 text-primary"
              >
                <FileText className="w-3.5 h-3.5 shrink-0 opacity-70" />
                <span className="flex-1 truncate font-mono text-xs italic">untitled</span>
                <Circle className="w-2 h-2 fill-primary text-primary shrink-0" />
              </button>
            )}
          </div>
        </div>

        {/* Right: editor */}
        <div className="flex-1 min-w-0 border border-border rounded-xl overflow-hidden flex flex-col">
          {active !== undefined ? (
            <PromptEditor
              key={active === null ? "new" : active.id}
              prompt={active}
              onSave={handleSave}
              onDelete={handleDelete}
              onClose={() => setActive(prompts[0] ?? undefined)}
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 bg-[#1e1e2e] text-[#6e7191]">
              <FileText className="w-12 h-12 opacity-20" />
              <p className="text-sm">Select a prompt or create a new one</p>
              <button
                onClick={() => setActive(null)}
                className="flex items-center gap-1.5 text-xs text-primary hover:underline"
              >
                <Plus className="w-3.5 h-3.5" /> New Prompt
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
