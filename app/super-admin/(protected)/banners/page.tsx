"use client"
import { useState } from "react"
import { Plus, Pencil, Trash2, X, Eye, EyeOff, AlertTriangle } from "lucide-react"

type Banner = {
  id: string; title: string; subtitle: string; cta: string
  color: string; active: boolean; startDate: string; endDate: string
}

const COLORS = ["#6366f1", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#3b82f6"]

function BannerPreview({ banner }: { banner: Banner }) {
  return (
    <div className="rounded-xl p-4 text-white relative overflow-hidden" style={{ background: banner.color }}>
      <div className="relative z-10">
        <p className="font-bold text-lg">{banner.title || "Banner Title"}</p>
        <p className="text-white/80 text-sm mt-1">{banner.subtitle || "Subtitle text here"}</p>
        {banner.cta && (
          <button className="mt-3 bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg text-sm font-medium border border-white/30">
            {banner.cta}
          </button>
        )}
      </div>
      <div className="absolute inset-0 opacity-10"
        style={{ backgroundImage: "radial-gradient(circle at 80% 20%, white 0%, transparent 60%)" }} />
    </div>
  )
}

function BannerModal({
  initial, onClose, onSave,
}: {
  initial?: Banner | null; onClose: () => void; onSave: (b: Omit<Banner, "id">) => void
}) {
  const [title, setTitle] = useState(initial?.title ?? "")
  const [subtitle, setSubtitle] = useState(initial?.subtitle ?? "")
  const [cta, setCta] = useState(initial?.cta ?? "")
  const [color, setColor] = useState(initial?.color ?? COLORS[0])
  const [active, setActive] = useState(initial?.active ?? true)
  const [startDate, setStartDate] = useState(initial?.startDate ?? "")
  const [endDate, setEndDate] = useState(initial?.endDate ?? "")

  const preview: Banner = { id: "", title, subtitle, cta, color, active, startDate, endDate }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-card border border-border rounded-xl p-6 w-full max-w-lg shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-foreground font-semibold">{initial ? "Edit Banner" : "New Banner"}</h3>
          <button onClick={onClose}><X className="w-4 h-4 text-muted-foreground" /></button>
        </div>
        <div className="mb-4">
          <BannerPreview banner={preview} />
        </div>
        <div className="space-y-3">
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Banner title"
            className="w-full bg-background border border-input text-foreground rounded-lg px-3 py-2 text-sm outline-none focus:border-primary" />
          <input value={subtitle} onChange={e => setSubtitle(e.target.value)} placeholder="Subtitle"
            className="w-full bg-background border border-input text-foreground rounded-lg px-3 py-2 text-sm outline-none focus:border-primary" />
          <input value={cta} onChange={e => setCta(e.target.value)} placeholder="Call to action text"
            className="w-full bg-background border border-input text-foreground rounded-lg px-3 py-2 text-sm outline-none focus:border-primary" />
          <div>
            <p className="text-muted-foreground text-xs mb-2">Color</p>
            <div className="flex gap-2">
              {COLORS.map(c => (
                <button key={c} onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-full border-2 transition-all ${color === c ? "border-white scale-110" : "border-transparent"}`}
                  style={{ background: c }} />
              ))}
              <input type="color" value={color} onChange={e => setColor(e.target.value)}
                className="w-7 h-7 rounded-full border-2 border-input cursor-pointer bg-transparent" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-muted-foreground text-xs mb-1 block">Start Date</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                className="w-full bg-background border border-input text-foreground rounded-lg px-3 py-2 text-sm outline-none" />
            </div>
            <div>
              <label className="text-muted-foreground text-xs mb-1 block">End Date</label>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                className="w-full bg-background border border-input text-foreground rounded-lg px-3 py-2 text-sm outline-none" />
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={active} onChange={e => setActive(e.target.checked)}
              className="accent-primary" />
            <span className="text-foreground text-sm">Active</span>
          </label>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onClose} className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground">Cancel</button>
          <button onClick={() => onSave({ title, subtitle, cta, color, active, startDate, endDate })}
            className="px-4 py-1.5 text-sm bg-primary text-white rounded-lg hover:bg-primary/90">
            Save
          </button>
        </div>
      </div>
    </div>
  )
}

export default function BannersPage() {
  const [banners, setBanners] = useState<Banner[]>([
    {
      id: "demo1",
      title: "Welcome to B-Master!",
      subtitle: "Your AI-powered assistant platform",
      cta: "Get Started",
      color: "#6366f1",
      active: true,
      startDate: "",
      endDate: "",
    },
  ])
  const [editing, setEditing] = useState<Banner | null | undefined>(undefined)

  function handleSave(data: Omit<Banner, "id">) {
    if (editing) {
      setBanners(b => b.map(x => x.id === editing.id ? { ...x, ...data } : x))
    } else {
      setBanners(b => [...b, { ...data, id: Date.now().toString() }])
    }
    setEditing(undefined)
  }

  function toggle(id: string) {
    setBanners(b => b.map(x => x.id === id ? { ...x, active: !x.active } : x))
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Marketing Banners</h1>
          <p className="text-muted-foreground text-sm mt-1">{banners.length} banner{banners.length !== 1 ? "s" : ""}</p>
        </div>
        <button onClick={() => setEditing(null)}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm hover:bg-primary/90">
          <Plus className="w-4 h-4" /> New Banner
        </button>
      </div>

      {/* Schema notice */}
      <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <p className="text-amber-800 font-medium text-sm">Persistence not yet enabled</p>
          <p className="text-amber-700/80 text-xs mt-1">
            No <code className="font-mono bg-amber-100 px-1 rounded">Banner</code> model exists in the schema.
            Banners are stored in UI state only. Add a <code className="font-mono bg-amber-100 px-1 rounded">Banner</code> model
            to <code className="font-mono bg-amber-100 px-1 rounded">prisma/schema.prisma</code> and update the server actions to persist data.
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {banners.map(banner => (
          <div key={banner.id} className="bg-card border border-border rounded-xl p-4 space-y-3">
            <BannerPreview banner={banner} />
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-0.5 rounded ${
                  banner.active ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"
                }`}>
                  {banner.active ? "Active" : "Inactive"}
                </span>
                {banner.startDate && (
                  <span className="text-xs text-muted-foreground">{banner.startDate} → {banner.endDate || "∞"}</span>
                )}
              </div>
              <div className="flex gap-1.5">
                <button onClick={() => toggle(banner.id)}
                  className="text-muted-foreground hover:text-foreground p-1.5 rounded hover:bg-muted"
                  title={banner.active ? "Deactivate" : "Activate"}>
                  {banner.active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
                <button onClick={() => setEditing(banner)}
                  className="text-muted-foreground hover:text-foreground p-1.5 rounded hover:bg-muted">
                  <Pencil className="w-4 h-4" />
                </button>
                <button onClick={() => setBanners(b => b.filter(x => x.id !== banner.id))}
                  className="text-red-400 hover:text-red-300 p-1.5 rounded hover:bg-red-900/20">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {editing !== undefined && (
        <BannerModal initial={editing} onClose={() => setEditing(undefined)} onSave={handleSave} />
      )}
    </div>
  )
}
