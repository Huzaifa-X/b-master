"use client"

import { useState, useTransition, useRef } from "react"
import { useRouter } from "next/navigation"
import {
  Tag, Gift, Search, ChevronLeft, ChevronRight,
  X, CheckCircle, XCircle, UserPlus, RotateCcw,
  Percent, DollarSign, Clock, Infinity, RefreshCw,
} from "lucide-react"
import { adminAssignCoupon, revokeUserPromotion, getUsers } from "@/app/actions/super-admin.action"
import { cn } from "@/lib/utils"

// ── Types ─────────────────────────────────────────────────────────────────────
type StripeCoupon = {
  id: string
  name: string
  percentOff: number | null
  amountOff: number | null
  currency: string | null
  duration: string
  durationInMonths: number | null
  timesRedeemed: number
  maxRedemptions: number | null
  valid: boolean
}

type UserPromotion = {
  id: number
  code: string
  stripeCouponId: string
  stripePromotionCodeId: string
  discountPercent: number | null
  discountAmount: number | null
  isActive: boolean
  redeemedAt: Date | null
  expiresAt: Date | null
  createdAt: Date
  user: { id: string; name: string | null; email: string }
}

type UserOption = { id: string; name: string | null; email: string }

// ── Assign Coupon Modal ────────────────────────────────────────────────────────
function AssignModal({
  coupon,
  onClose,
  onDone,
}: {
  coupon: StripeCoupon
  onClose: () => void
  onDone: () => void
}) {
  const [userSearch, setUserSearch] = useState("")
  const [userResults, setUserResults] = useState<UserOption[]>([])
  const [selectedUser, setSelectedUser] = useState<UserOption | null>(null)
  const [prefix, setPrefix] = useState("GIFT")
  const [pending, start] = useTransition()
  const [searching, setSearching] = useState(false)
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  function handleUserSearch(q: string) {
    setUserSearch(q)
    setSelectedUser(null)
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    if (!q.trim()) { setUserResults([]); return }
    searchTimeout.current = setTimeout(async () => {
      setSearching(true)
      const res = await getUsers(1, q, 8)
      setUserResults(res.users as UserOption[])
      setSearching(false)
    }, 350)
  }

  function assign() {
    if (!selectedUser) return
    start(async () => {
      const res = await adminAssignCoupon(selectedUser.id, coupon.id, prefix.trim() || "GIFT")
      if (res.success) {
        setMsg({ type: "success", text: `Coupon code ${res.promotion?.code} assigned!` })
        setTimeout(() => { onDone(); onClose() }, 1200)
      } else {
        setMsg({ type: "error", text: res.error ?? "Failed to assign coupon" })
      }
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-card border border-border rounded-xl p-6 w-full max-w-md shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-foreground font-semibold">Assign Coupon</h3>
            <p className="text-muted-foreground text-xs mt-0.5">{coupon.name} · {coupon.id}</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Coupon summary */}
        <div className="bg-muted/50 rounded-lg px-4 py-3 mb-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            {coupon.percentOff ? <Percent className="w-4 h-4 text-primary" /> : <DollarSign className="w-4 h-4 text-primary" />}
          </div>
          <div>
            <p className="text-foreground text-sm font-medium">
              {coupon.percentOff != null
                ? `${coupon.percentOff}% off`
                : `${coupon.currency?.toUpperCase()} ${coupon.amountOff?.toFixed(2)} off`}
            </p>
            <p className="text-muted-foreground text-xs capitalize">{coupon.duration}{coupon.durationInMonths ? ` · ${coupon.durationInMonths} months` : ""}</p>
          </div>
        </div>

        <div className="space-y-3">
          {/* User search */}
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Search User</label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
              <input
                value={selectedUser ? `${selectedUser.name ?? ""}  <${selectedUser.email}>` : userSearch}
                onChange={e => { if (!selectedUser) handleUserSearch(e.target.value) }}
                onFocus={() => { if (selectedUser) { setSelectedUser(null); setUserSearch(""); setUserResults([]) } }}
                placeholder="Search by name or email…"
                className="w-full bg-background border border-input text-foreground rounded-lg pl-8 pr-3 py-2 text-sm outline-none focus:border-primary"
              />
              {selectedUser && (
                <button onClick={() => { setSelectedUser(null); setUserSearch(""); setUserResults([]) }}
                  className="absolute right-2 top-2 text-muted-foreground hover:text-foreground">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            {/* Dropdown */}
            {!selectedUser && userResults.length > 0 && (
              <div className="border border-border rounded-lg mt-1 bg-card shadow-lg overflow-hidden">
                {userResults.map(u => (
                  <button key={u.id} onClick={() => { setSelectedUser(u); setUserSearch(""); setUserResults([]) }}
                    className="w-full text-left px-3 py-2 hover:bg-muted transition-colors flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs text-primary shrink-0">
                      {(u.name ?? u.email)[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="text-foreground text-xs font-medium">{u.name ?? "—"}</p>
                      <p className="text-muted-foreground text-xs">{u.email}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
            {!selectedUser && searching && (
              <p className="text-muted-foreground text-xs mt-1 px-1">Searching…</p>
            )}
          </div>

          {/* Code prefix */}
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Code Prefix <span className="text-muted-foreground/60">(optional)</span></label>
            <input
              value={prefix}
              onChange={e => setPrefix(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12))}
              placeholder="GIFT"
              className="w-full bg-background border border-input text-foreground rounded-lg px-3 py-2 text-sm outline-none focus:border-primary"
            />
            <p className="text-muted-foreground text-xs mt-1">Generated code will look like <span className="font-mono">{prefix || "GIFT"}-A8F23B</span></p>
          </div>
        </div>

        {msg && (
          <div className={cn("mt-3 px-3 py-2 rounded-lg text-sm flex items-center gap-2",
            msg.type === "success" ? "bg-green-50 text-green-700" : "bg-destructive/10 text-destructive")}>
            {msg.type === "success" ? <CheckCircle className="w-4 h-4 shrink-0" /> : <XCircle className="w-4 h-4 shrink-0" />}
            {msg.text}
          </div>
        )}

        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onClose} className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground">Cancel</button>
          <button
            onClick={assign}
            disabled={pending || !selectedUser}
            className="px-4 py-1.5 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2"
          >
            <Gift className="w-3.5 h-3.5" />
            {pending ? "Assigning…" : "Assign Coupon"}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function DiscountBadge({ p, a, currency }: { p: number | null; a: number | null; currency?: string | null }) {
  if (p != null) return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
      <Percent className="w-3 h-3" />{p}% off
    </span>
  )
  if (a != null) return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
      <DollarSign className="w-3 h-3" />{currency?.toUpperCase()} {a.toFixed(2)} off
    </span>
  )
  return <span className="text-xs text-muted-foreground">—</span>
}

function DurationBadge({ duration, months }: { duration: string; months: number | null }) {
  const map: Record<string, { label: string; icon: React.ReactNode }> = {
    once: { label: "Once", icon: <Clock className="w-3 h-3" /> },
    repeating: { label: `${months ?? "?"} months`, icon: <RotateCcw className="w-3 h-3" /> },
    forever: { label: "Forever", icon: <Infinity className="w-3 h-3" /> },
  }
  const d = map[duration] ?? { label: duration, icon: null }
  return (
    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
      {d.icon}{d.label}
    </span>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function CouponsClient({
  stripeCoupons,
  stripeError,
  initialPromotions,
  total,
  page,
  search,
}: {
  stripeCoupons: StripeCoupon[]
  stripeError?: string
  initialPromotions: UserPromotion[]
  total: number
  page: number
  search: string
}) {
  const router = useRouter()
  const [tab, setTab] = useState<"coupons" | "assigned">("coupons")
  const [assignCoupon, setAssignCoupon] = useState<StripeCoupon | null>(null)
  const [q, setQ] = useState(search)
  const [revoking, startRevoke] = useTransition()
  const [revokeId, setRevokeId] = useState<number | null>(null)
  const [refreshing, startRefresh] = useTransition()
  const limit = 20
  const totalPages = Math.ceil(total / limit)

  function go(p: number, s = q) {
    const params = new URLSearchParams()
    if (s) params.set("search", s)
    if (p > 1) params.set("page", String(p))
    router.push(`/super-admin/coupons?${params.toString()}`)
  }

  function revoke(id: number) {
    setRevokeId(id)
    startRevoke(async () => {
      await revokeUserPromotion(id)
      setRevokeId(null)
      router.refresh()
    })
  }

  return (
    <>
      {assignCoupon && (
        <AssignModal
          coupon={assignCoupon}
          onClose={() => setAssignCoupon(null)}
          onDone={() => router.refresh()}
        />
      )}

      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Coupons</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Manage Stripe coupons and assign them to users</p>
        </div>
        <button
          onClick={() => startRefresh(() => { router.refresh() })}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium border border-border rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50"
        >
          <RefreshCw className={cn("w-3.5 h-3.5", refreshing && "animate-spin")} />
          {refreshing ? "Refreshing…" : "Refresh from Stripe"}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted rounded-lg p-1 w-fit mb-6">
        <button
          onClick={() => setTab("coupons")}
          className={cn("px-4 py-1.5 text-sm font-medium rounded-md transition-colors",
            tab === "coupons" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
        >
          <span className="flex items-center gap-2"><Tag className="w-3.5 h-3.5" />Stripe Coupons</span>
        </button>
        <button
          onClick={() => setTab("assigned")}
          className={cn("px-4 py-1.5 text-sm font-medium rounded-md transition-colors",
            tab === "assigned" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
        >
          <span className="flex items-center gap-2"><Gift className="w-3.5 h-3.5" />Assigned ({total})</span>
        </button>
      </div>

      {/* ── Stripe Coupons Tab ── */}
      {tab === "coupons" && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{stripeCoupons.length} coupon{stripeCoupons.length !== 1 ? "s" : ""} from Stripe</p>
            <a
              href="https://dashboard.stripe.com/coupons"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary hover:underline"
            >
              Open Stripe Dashboard ↗
            </a>
          </div>

          {stripeCoupons.length === 0 ? (
            <div className="py-16 text-center">
              {stripeError ? (
                <>
                  <XCircle className="w-10 h-10 text-destructive/40 mx-auto mb-3" />
                  <p className="text-destructive text-sm font-medium">Stripe error</p>
                  <p className="text-muted-foreground text-xs mt-1 max-w-sm mx-auto font-mono break-all">{stripeError}</p>
                  <p className="text-muted-foreground text-xs mt-3">
                    Make sure <span className="font-mono text-foreground">STRIPE_SECRET_KEY</span> in your <span className="font-mono text-foreground">.env</span> is the correct live key (<span className="font-mono">sk_live_...</span>) and restart the server.
                  </p>
                </>
              ) : (
                <>
                  <Tag className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-muted-foreground text-sm">No coupons found in Stripe.</p>
                  <a href="https://dashboard.stripe.com/coupons/create" target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-2">
                    Create your first coupon in Stripe ↗
                  </a>
                </>
              )}
            </div>
          ) : (
            <div className="divide-y divide-border">
              {stripeCoupons.map((c) => (
                <div key={c.id} className="flex items-center gap-4 px-5 py-4 hover:bg-muted/30 transition-colors">
                  <div className={cn("w-9 h-9 rounded-full flex items-center justify-center shrink-0",
                    c.valid ? "bg-emerald-50" : "bg-muted")}>
                    <Tag className={cn("w-4 h-4", c.valid ? "text-emerald-600" : "text-muted-foreground")} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-foreground text-sm font-medium truncate">{c.name}</p>
                      {!c.valid && (
                        <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">Inactive</span>
                      )}
                    </div>
                    <p className="text-muted-foreground text-xs font-mono mt-0.5">{c.id}</p>
                  </div>

                  <div className="hidden sm:flex items-center gap-4 shrink-0">
                    <DiscountBadge p={c.percentOff} a={c.amountOff} currency={c.currency} />
                    <DurationBadge duration={c.duration} months={c.durationInMonths} />
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Redeemed</p>
                      <p className="text-sm font-medium text-foreground">
                        {c.timesRedeemed}{c.maxRedemptions != null ? `/${c.maxRedemptions}` : ""}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => setAssignCoupon(c)}
                    disabled={!c.valid}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                  >
                    <UserPlus className="w-3 h-3" />
                    Assign
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Assigned Promotions Tab ── */}
      {tab === "assigned" && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {/* Search */}
          <div className="px-5 py-4 border-b border-border flex items-center gap-3">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
              <input
                value={q}
                onChange={e => setQ(e.target.value)}
                onKeyDown={e => e.key === "Enter" && go(1)}
                placeholder="Search users…"
                className="w-full bg-background border border-input text-foreground rounded-lg pl-9 pr-3 py-2 text-sm outline-none focus:border-primary"
              />
            </div>
            <button onClick={() => go(1)}
              className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90">
              Search
            </button>
          </div>

          {initialPromotions.length === 0 ? (
            <div className="py-16 text-center">
              <Gift className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">No promotions assigned yet.</p>
            </div>
          ) : (
            <>
              <div className="divide-y divide-border">
                {initialPromotions.map((p) => (
                  <div key={p.id} className="flex items-center gap-4 px-5 py-4 hover:bg-muted/30 transition-colors">
                    {/* User avatar */}
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary shrink-0">
                      {(p.user.name ?? p.user.email)[0].toUpperCase()}
                    </div>

                    {/* User + promo info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-foreground text-sm font-medium truncate">{p.user.name ?? "—"}</p>
                        <span className="text-muted-foreground text-xs">{p.user.email}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="font-mono text-xs text-foreground bg-muted px-1.5 py-0.5 rounded">{p.code}</span>
                        <DiscountBadge p={p.discountPercent} a={p.discountAmount} />
                        {p.redeemedAt ? (
                          <span className="inline-flex items-center gap-1 text-xs text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-full">
                            <CheckCircle className="w-3 h-3" />Redeemed
                          </span>
                        ) : p.isActive ? (
                          <span className="inline-flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full">
                            <CheckCircle className="w-3 h-3" />Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
                            <XCircle className="w-3 h-3" />Revoked
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Date */}
                    <p className="hidden md:block text-xs text-muted-foreground shrink-0">
                      {new Date(p.createdAt).toLocaleDateString()}
                    </p>

                    {/* Revoke */}
                    {p.isActive && !p.redeemedAt && (
                      <button
                        onClick={() => revoke(p.id)}
                        disabled={revoking && revokeId === p.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-destructive border border-destructive/30 rounded-lg hover:bg-destructive/10 disabled:opacity-50 shrink-0"
                      >
                        <XCircle className="w-3 h-3" />
                        {revoking && revokeId === p.id ? "Revoking…" : "Revoke"}
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="px-5 py-4 border-t border-border flex items-center justify-between">
                  <p className="text-muted-foreground text-xs">
                    Page {page} of {totalPages} · {total} total
                  </p>
                  <div className="flex items-center gap-2">
                    <button onClick={() => go(page - 1)} disabled={page <= 1}
                      className="p-1.5 text-muted-foreground hover:text-foreground disabled:opacity-30 rounded-md hover:bg-muted">
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button onClick={() => go(page + 1)} disabled={page >= totalPages}
                      className="p-1.5 text-muted-foreground hover:text-foreground disabled:opacity-30 rounded-md hover:bg-muted">
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </>
  )
}
