"use client"
import { useState, useTransition } from "react"
import { updatePlan } from "@/app/actions/super-admin.action"
import { Pencil, X, Users, ToggleLeft, ToggleRight } from "lucide-react"

type Plan = {
  id: number; title: string; description: string | null; amount: any; period: string
  assistantLimit: number; isActive: boolean; features: any; _count: { subscribers: number }
}

function EditModal({ plan, onClose, onDone }: { plan: Plan; onClose: () => void; onDone: () => void }) {
  const [title, setTitle] = useState(plan.title)
  const [desc, setDesc] = useState(plan.description ?? "")
  const [amount, setAmount] = useState(String(plan.amount ?? 0))
  const [limit, setLimit] = useState(String(plan.assistantLimit ?? ""))
  const [features, setFeatures] = useState(
    typeof plan.features === "object" ? JSON.stringify(plan.features, null, 2) : String(plan.features ?? "[]")
  )
  const [active, setActive] = useState(plan.isActive)
  const [pending, start] = useTransition()
  const [msg, setMsg] = useState("")

  function save() {
    let parsedFeatures: any
    try {
      parsedFeatures = JSON.parse(features)
    } catch {
      setMsg("Features must be valid JSON")
      return
    }
    start(async () => {
      await updatePlan(plan.id, {
        title, description: desc, amount: parseFloat(amount),
        assistantLimit: limit ? parseInt(limit) : undefined,
        features: parsedFeatures, isActive: active,
      })
      setMsg("Saved!")
      setTimeout(() => { onDone(); onClose() }, 600)
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-card border border-border rounded-xl p-6 w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-foreground font-semibold">Edit Plan</h3>
          <button onClick={onClose}><X className="w-4 h-4 text-muted-foreground" /></button>
        </div>
        <div className="space-y-3">
          {[
            { label: "Title", val: title, set: setTitle, placeholder: "Plan title" },
            { label: "Description", val: desc, set: setDesc, placeholder: "Description" },
          ].map(({ label, val, set, placeholder }) => (
            <div key={label}>
              <label className="text-muted-foreground text-xs mb-1 block">{label}</label>
              <input value={val} onChange={e => set(e.target.value)} placeholder={placeholder}
                className="w-full bg-background border border-input text-foreground rounded-lg px-3 py-2 text-sm outline-none focus:border-primary" />
            </div>
          ))}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-muted-foreground text-xs mb-1 block">Amount ($)</label>
              <input value={amount} onChange={e => setAmount(e.target.value)} type="number" min="0" step="0.01"
                className="w-full bg-background border border-input text-foreground rounded-lg px-3 py-2 text-sm outline-none focus:border-primary" />
            </div>
            <div>
              <label className="text-muted-foreground text-xs mb-1 block">Assistant Limit</label>
              <input value={limit} onChange={e => setLimit(e.target.value)} type="number" min="0" placeholder="unlimited"
                className="w-full bg-background border border-input text-foreground rounded-lg px-3 py-2 text-sm outline-none focus:border-primary" />
            </div>
          </div>
          <div>
            <label className="text-muted-foreground text-xs mb-1 block">Features (JSON array)</label>
            <textarea value={features} onChange={e => setFeatures(e.target.value)} rows={4}
              className="w-full bg-background border border-input text-foreground rounded-lg px-3 py-2 text-sm outline-none focus:border-primary font-mono resize-none" />
          </div>
          <label className="flex items-center gap-3 cursor-pointer">
            <button type="button" onClick={() => setActive(a => !a)} className="text-muted-foreground hover:text-primary">
              {active ? <ToggleRight className="w-6 h-6 text-primary" /> : <ToggleLeft className="w-6 h-6" />}
            </button>
            <span className="text-foreground text-sm">Plan is {active ? "active" : "inactive"}</span>
          </label>
        </div>
        {msg && (
          <p className={`text-xs mt-2 ${msg.startsWith("Features") ? "text-destructive" : "text-green-600"}`}>{msg}</p>
        )}
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onClose} className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground">Cancel</button>
          <button onClick={save} disabled={pending}
            className="px-4 py-1.5 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50">
            {pending ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function PlansClient({ initial }: { initial: Plan[] }) {
  const [plans, setPlans] = useState(initial)
  const [editing, setEditing] = useState<Plan | null>(null)

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Plans</h1>
        <p className="text-muted-foreground text-sm mt-1">{plans.length} subscription plan{plans.length !== 1 ? "s" : ""}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {plans.map((plan) => {
          const features: string[] = Array.isArray(plan.features) ? plan.features : []
          return (
            <div key={plan.id}
              className={`bg-card border rounded-xl p-5 relative ${plan.isActive ? "border-border" : "border-border/50 opacity-60"}`}>
              {!plan.isActive && (
                <span className="absolute top-3 right-3 text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded">Inactive</span>
              )}
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-foreground font-semibold">{plan.title}</h3>
                  <p className="text-muted-foreground text-xs mt-0.5">{plan.period}</p>
                </div>
                <p className="text-2xl font-bold text-primary">${plan.amount}</p>
              </div>
              {plan.description && (
                <p className="text-muted-foreground text-sm mb-3">{plan.description}</p>
              )}
              <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
                <span className="flex items-center gap-1"><Users className="w-3 h-3" />{plan._count.subscribers} subscribers</span>
                {plan.assistantLimit !== null && (
                  <span>{plan.assistantLimit} assistants</span>
                )}
              </div>
              {features.length > 0 && (
                <ul className="space-y-1 mb-4">
                  {features.slice(0, 4).map((f, i) => (
                    <li key={i} className="text-muted-foreground text-xs flex items-center gap-1.5">
                      <span className="w-1 h-1 bg-primary rounded-full shrink-0" />{f}
                    </li>
                  ))}
                  {features.length > 4 && (
                    <li className="text-muted-foreground/60 text-xs">+{features.length - 4} more</li>
                  )}
                </ul>
              )}
              <button onClick={() => setEditing(plan)}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border border-border hover:border-input px-3 py-1.5 rounded-lg">
                <Pencil className="w-3.5 h-3.5" /> Edit plan
              </button>
            </div>
          )
        })}
      </div>

      {editing && (
        <EditModal
          plan={editing}
          onClose={() => setEditing(null)}
          onDone={() => { window.location.reload() }}
        />
      )}
    </div>
  )
}
