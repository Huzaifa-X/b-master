"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  Plus, Pencil, Trash2, X, Eye, EyeOff,
  Info, AlertTriangle, Megaphone, Tag,
  Users, UserCheck, UserX, Target,
  CalendarDays, ArrowUp, ArrowDown, ExternalLink,
} from "lucide-react"
import {
  createBanner, updateBanner, toggleBannerActive, deleteBanner,
} from "@/app/actions/super-admin.action"
import { cn } from "@/lib/utils"

// ── Types ─────────────────────────────────────────────────────────────────────
type BannerType = "INFO" | "WARNING" | "PROMO" | "ANNOUNCEMENT"
type BannerAudience = "ALL" | "FREE_USERS" | "PAID_USERS" | "SPECIFIC_PLANS"

type Banner = {
  id: number
  name: string
  message: string
  buttonText: string | null
  buttonUrl: string | null
  type: BannerType
  targetAudience: BannerAudience
  targetPlanIds: number[]
  isActive: boolean
  startDate: Date | null
  endDate: Date | null
  priority: number
  createdAt: Date
  _count: { dismissedBy: number }
}

type Plan = { id: number; title: string }

// ── Config ────────────────────────────────────────────────────────────────────
const TYPE_CONFIG: Record<BannerType, { label: string; icon: React.ReactNode; bg: string; badge: string }> = {
  INFO:         { label: "Info",         icon: <Info className="w-4 h-4" />,          bg: "bg-blue-500",    badge: "bg-blue-100 text-blue-700" },
  WARNING:      { label: "Warning",      icon: <AlertTriangle className="w-4 h-4" />, bg: "bg-amber-500",   badge: "bg-amber-100 text-amber-700" },
  PROMO:        { label: "Promo",        icon: <Tag className="w-4 h-4" />,           bg: "bg-emerald-500", badge: "bg-emerald-100 text-emerald-700" },
  ANNOUNCEMENT: { label: "Announcement", icon: <Megaphone className="w-4 h-4" />,    bg: "bg-purple-500",  badge: "bg-purple-100 text-purple-700" },
}

const AUDIENCE_CONFIG: Record<BannerAudience, { label: string; icon: React.ReactNode }> = {
  ALL:            { label: "Everyone",        icon: <Users className="w-3.5 h-3.5" /> },
  FREE_USERS:     { label: "Free users only", icon: <UserX className="w-3.5 h-3.5" /> },
  PAID_USERS:     { label: "Paid users only", icon: <UserCheck className="w-3.5 h-3.5" /> },
  SPECIFIC_PLANS: { label: "Specific plans",  icon: <Target className="w-3.5 h-3.5" /> },
}

// ── Preview ───────────────────────────────────────────────────────────────────
function BannerPreview({ type, message, buttonText }: { type: BannerType; message: string; buttonText?: string | null }) {
  const cfg = TYPE_CONFIG[type]
  const icons: Record<BannerType, React.ReactNode> = {
    INFO:         <Info className="w-4 h-4 shrink-0" />,
    WARNING:      <AlertTriangle className="w-4 h-4 shrink-0" />,
    PROMO:        <Tag className="w-4 h-4 shrink-0" />,
    ANNOUNCEMENT: <Megaphone className="w-4 h-4 shrink-0" />,
  }
  return (
    <div className={cn("rounded-lg px-4 py-3 text-white flex items-center gap-3", cfg.bg)}>
      {icons[type]}
      <p className="text-sm flex-1">{message || "Your banner message will appear here…"}</p>
      {buttonText && (
        <button className="shrink-0 text-xs font-medium bg-white/20 hover:bg-white/30 border border-white/30 px-3 py-1 rounded-md">
          {buttonText}
        </button>
      )}
    </div>
  )
}

// ── Modal ─────────────────────────────────────────────────────────────────────
function BannerModal({
  initial, plans, onClose, onDone,
}: {
  initial?: Banner | null
  plans: Plan[]
  onClose: () => void
  onDone: () => void
}) {
  const [name, setName]               = useState(initial?.name ?? "")
  const [message, setMessage]         = useState(initial?.message ?? "")
  const [buttonText, setButtonText]   = useState(initial?.buttonText ?? "")
  const [buttonUrl, setButtonUrl]     = useState(initial?.buttonUrl ?? "")
  const [type, setType]               = useState<BannerType>(initial?.type ?? "INFO")
  const [audience, setAudience]       = useState<BannerAudience>(initial?.targetAudience ?? "ALL")
  const [planIds, setPlanIds]         = useState<number[]>(initial?.targetPlanIds ?? [])
  const [isActive, setIsActive]       = useState(initial?.isActive ?? true)
  const [startDate, setStartDate]     = useState(initial?.startDate ? new Date(initial.startDate).toISOString().slice(0, 10) : "")
  const [endDate, setEndDate]         = useState(initial?.endDate   ? new Date(initial.endDate  ).toISOString().slice(0, 10) : "")
  const [priority, setPriority]       = useState(String(initial?.priority ?? 0))
  const [pending, start]              = useTransition()
  const [error, setError]             = useState("")

  function togglePlan(id: number) {
    setPlanIds(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id])
  }

  function save() {
    if (!name.trim() || !message.trim()) { setError("Name and message are required."); return }
    if (audience === "SPECIFIC_PLANS" && planIds.length === 0) { setError("Select at least one plan."); return }
    setError("")
    start(async () => {
      const payload = {
        name: name.trim(),
        message: message.trim(),
        buttonText: buttonText.trim() || undefined,
        buttonUrl: buttonUrl.trim() || undefined,
        type,
        targetAudience: audience,
        targetPlanIds: audience === "SPECIFIC_PLANS" ? planIds : [],
        isActive,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        priority: parseInt(priority) || 0,
      }
      if (initial) {
        await updateBanner(initial.id, payload)
      } else {
        await createBanner(payload)
      }
      onDone()
      onClose()
    })
  }

  const inputCls = "w-full bg-background border border-input text-foreground rounded-lg px-3 py-2 text-sm outline-none focus:border-primary"

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto">
      <div className="bg-card border border-border rounded-xl p-6 w-full max-w-xl shadow-xl my-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-foreground font-semibold text-lg">{initial ? "Edit Banner" : "New Banner"}</h3>
          <button onClick={onClose}><X className="w-4 h-4 text-muted-foreground" /></button>
        </div>

        {/* Live preview */}
        <div className="mb-5">
          <p className="text-xs text-muted-foreground mb-2">Preview</p>
          <BannerPreview type={type} message={message} buttonText={buttonText} />
        </div>

        <div className="space-y-4">
          {/* Name */}
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Internal name <span className="text-destructive">*</span></label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Summer promo 2026" className={inputCls} />
          </div>

          {/* Message */}
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Message <span className="text-destructive">*</span></label>
            <textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Banner message shown to users…" rows={2}
              className={cn(inputCls, "resize-none")} />
          </div>

          {/* Button */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Button text</label>
              <input value={buttonText} onChange={e => setButtonText(e.target.value)} placeholder="e.g. Learn more" className={inputCls} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Button URL</label>
              <input value={buttonUrl} onChange={e => setButtonUrl(e.target.value)} placeholder="https://…" className={inputCls} />
            </div>
          </div>

          {/* Type */}
          <div>
            <label className="text-xs text-muted-foreground mb-2 block">Type</label>
            <div className="grid grid-cols-4 gap-2">
              {(Object.keys(TYPE_CONFIG) as BannerType[]).map(t => (
                <button key={t} onClick={() => setType(t)}
                  className={cn("flex flex-col items-center gap-1.5 px-2 py-2.5 rounded-lg border text-xs font-medium transition-colors",
                    type === t ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground hover:border-primary/50")}>
                  {TYPE_CONFIG[t].icon}
                  {TYPE_CONFIG[t].label}
                </button>
              ))}
            </div>
          </div>

          {/* Audience */}
          <div>
            <label className="text-xs text-muted-foreground mb-2 block">Target Audience</label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(AUDIENCE_CONFIG) as BannerAudience[]).map(a => (
                <button key={a} onClick={() => setAudience(a)}
                  className={cn("flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-colors text-left",
                    audience === a ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground hover:border-primary/50")}>
                  {AUDIENCE_CONFIG[a].icon}
                  {AUDIENCE_CONFIG[a].label}
                </button>
              ))}
            </div>

            {/* Plan selector */}
            {audience === "SPECIFIC_PLANS" && plans.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {plans.map(p => (
                  <button key={p.id} onClick={() => togglePlan(p.id)}
                    className={cn("px-3 py-1 text-xs rounded-full border transition-colors",
                      planIds.includes(p.id)
                        ? "bg-primary text-white border-primary"
                        : "border-border text-muted-foreground hover:border-primary/50")}>
                    {p.title}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Dates + Priority */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Start date</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">End date</label>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Priority</label>
              <input type="number" value={priority} onChange={e => setPriority(e.target.value)} min={0} max={100} className={inputCls} />
            </div>
          </div>

          {/* Active */}
          <label className="flex items-center gap-2 cursor-pointer">
            <div onClick={() => setIsActive(v => !v)}
              className={cn("w-9 h-5 rounded-full transition-colors relative cursor-pointer",
                isActive ? "bg-primary" : "bg-muted")}>
              <div className={cn("absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform",
                isActive ? "translate-x-[18px]" : "translate-x-0.5")} />
            </div>
            <span className="text-sm text-foreground">{isActive ? "Active — visible to users" : "Inactive — hidden from users"}</span>
          </label>
        </div>

        {error && <p className="text-destructive text-xs mt-3">{error}</p>}

        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onClose} className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground">Cancel</button>
          <button onClick={save} disabled={pending}
            className="px-5 py-1.5 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50">
            {pending ? "Saving…" : initial ? "Save changes" : "Create banner"}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Delete confirm ─────────────────────────────────────────────────────────────
function DeleteConfirm({ name, onCancel, onConfirm, pending }: {
  name: string; onCancel: () => void; onConfirm: () => void; pending: boolean
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-card border border-border rounded-xl p-6 w-full max-w-sm shadow-xl">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-9 h-9 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
            <Trash2 className="w-4 h-4 text-destructive" />
          </div>
          <div>
            <p className="text-foreground font-medium">Delete banner?</p>
            <p className="text-muted-foreground text-sm mt-1">
              "<span className="text-foreground">{name}</span>" will be removed. This cannot be undone.
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <button onClick={onCancel} className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground">Cancel</button>
          <button onClick={onConfirm} disabled={pending}
            className="px-4 py-1.5 text-sm bg-destructive text-white rounded-lg hover:bg-destructive/90 disabled:opacity-50">
            {pending ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function BannersClient({ initial, plans }: { initial: Banner[]; plans: Plan[] }) {
  const router = useRouter()
  const [banners, setBanners] = useState<Banner[]>(initial)
  const [editing, setEditing] = useState<Banner | null | undefined>(undefined)
  const [deleting, setDeleting] = useState<Banner | null>(null)
  const [deletePending, startDelete] = useTransition()
  const [togglePending, startToggle] = useTransition()
  const [toggleId, setToggleId] = useState<number | null>(null)

  function refresh() { router.refresh() }

  function handleToggle(banner: Banner) {
    setToggleId(banner.id)
    startToggle(async () => {
      await toggleBannerActive(banner.id, !banner.isActive)
      setBanners(bs => bs.map(b => b.id === banner.id ? { ...b, isActive: !b.isActive } : b))
      setToggleId(null)
    })
  }

  function handleDelete() {
    if (!deleting) return
    const id = deleting.id
    startDelete(async () => {
      await deleteBanner(id)
      setBanners(bs => bs.filter(b => b.id !== id))
      setDeleting(null)
    })
  }

  const active = banners.filter(b => b.isActive).length
  const inactive = banners.filter(b => !b.isActive).length

  return (
    <>
      {editing !== undefined && (
        <BannerModal
          initial={editing}
          plans={plans}
          onClose={() => setEditing(undefined)}
          onDone={() => { setEditing(undefined); refresh() }}
        />
      )}
      {deleting && (
        <DeleteConfirm
          name={deleting.name}
          onCancel={() => setDeleting(null)}
          onConfirm={handleDelete}
          pending={deletePending}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Marketing Banners</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {banners.length} banner{banners.length !== 1 ? "s" : ""} · {active} active · {inactive} inactive
          </p>
        </div>
        <button onClick={() => setEditing(null)}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90">
          <Plus className="w-4 h-4" /> New Banner
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {(Object.keys(TYPE_CONFIG) as BannerType[]).map(t => {
          const count = banners.filter(b => b.type === t).length
          const cfg = TYPE_CONFIG[t]
          return (
            <div key={t} className="bg-card border border-border rounded-xl px-4 py-3 flex items-center gap-3">
              <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm", cfg.bg)}>
                {cfg.icon}
              </div>
              <div>
                <p className="text-foreground font-semibold text-lg leading-none">{count}</p>
                <p className="text-muted-foreground text-xs mt-0.5">{cfg.label}</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Empty */}
      {banners.length === 0 && (
        <div className="bg-card border border-border rounded-xl py-20 text-center">
          <Megaphone className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">No banners yet.</p>
          <button onClick={() => setEditing(null)}
            className="mt-3 text-xs text-primary hover:underline">Create your first banner</button>
        </div>
      )}

      {/* Banner cards */}
      <div className="space-y-3">
        {banners.map(banner => {
          const cfg = TYPE_CONFIG[banner.type]
          const aud = AUDIENCE_CONFIG[banner.targetAudience]
          const isTogglingThis = togglePending && toggleId === banner.id
          const now = new Date()
          const started = !banner.startDate || new Date(banner.startDate) <= now
          const notExpired = !banner.endDate || new Date(banner.endDate) >= now
          const scheduled = banner.startDate && new Date(banner.startDate) > now
          const expired = banner.endDate && new Date(banner.endDate) < now

          return (
            <div key={banner.id}
              className={cn("bg-card border rounded-xl overflow-hidden transition-opacity",
                !banner.isActive ? "opacity-60 border-border" : "border-border")}>

              {/* Banner preview strip */}
              <div className={cn("px-4 py-3 text-white flex items-center gap-3", cfg.bg)}>
                {cfg.icon}
                <p className="text-sm flex-1 line-clamp-1">{banner.message}</p>
                {banner.buttonText && (
                  <span className="shrink-0 text-xs font-medium bg-white/20 border border-white/30 px-2 py-0.5 rounded">
                    {banner.buttonText}
                  </span>
                )}
              </div>

              {/* Card body */}
              <div className="px-4 py-3 flex items-start gap-4">
                <div className="flex-1 min-w-0 space-y-2">
                  {/* Name + badges */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-foreground font-medium text-sm">{banner.name}</p>
                    <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", cfg.badge)}>
                      {cfg.label}
                    </span>
                    {banner.isActive && started && notExpired && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium">Live</span>
                    )}
                    {scheduled && banner.isActive && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">Scheduled</span>
                    )}
                    {expired && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">Expired</span>
                    )}
                    {!banner.isActive && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">Inactive</span>
                    )}
                  </div>

                  {/* Meta row */}
                  <div className="flex items-center gap-4 flex-wrap text-xs text-muted-foreground">
                    {/* Audience */}
                    <span className="flex items-center gap-1">
                      {aud.icon}{aud.label}
                      {banner.targetAudience === "SPECIFIC_PLANS" && banner.targetPlanIds.length > 0 && (
                        <span className="text-foreground ml-1">
                          ({banner.targetPlanIds.length} plan{banner.targetPlanIds.length !== 1 ? "s" : ""})
                        </span>
                      )}
                    </span>
                    {/* Date range */}
                    {(banner.startDate || banner.endDate) && (
                      <span className="flex items-center gap-1">
                        <CalendarDays className="w-3 h-3" />
                        {banner.startDate ? new Date(banner.startDate).toLocaleDateString() : "∞"}
                        {" → "}
                        {banner.endDate ? new Date(banner.endDate).toLocaleDateString() : "∞"}
                      </span>
                    )}
                    {/* Priority */}
                    {banner.priority > 0 && (
                      <span className="flex items-center gap-1">
                        <ArrowUp className="w-3 h-3" />Priority {banner.priority}
                      </span>
                    )}
                    {/* Dismissed count */}
                    <span>{banner._count.dismissedBy} dismissed</span>
                    {/* Button URL */}
                    {banner.buttonUrl && (
                      <a href={banner.buttonUrl} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-0.5 text-primary hover:underline truncate max-w-[180px]">
                        <ExternalLink className="w-3 h-3 shrink-0" />
                        <span className="truncate">{banner.buttonUrl}</span>
                      </a>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => handleToggle(banner)}
                    disabled={isTogglingThis}
                    title={banner.isActive ? "Deactivate" : "Activate"}
                    className={cn("p-1.5 rounded-md transition-colors disabled:opacity-40",
                      banner.isActive
                        ? "text-emerald-600 hover:bg-emerald-50"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground")}>
                    {banner.isActive ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                  <button onClick={() => setEditing(banner)}
                    className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => setDeleting(banner)}
                    className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}
