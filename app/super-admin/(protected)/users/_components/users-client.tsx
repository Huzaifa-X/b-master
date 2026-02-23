"use client"
import { useState, useTransition } from "react"
import { updateUserInfo, resetUserPassword, getUsers } from "@/app/actions/super-admin.action"
import { Search, ChevronLeft, ChevronRight, Pencil, Key, X } from "lucide-react"
import { useRouter } from "next/navigation"

type User = {
  id: string; name: string | null; email: string; status: string | null; loginType: string
  createdAt: Date; plan: { title: string } | null; _count: { assistants: number }
}

function EditModal({ user, onClose, onDone }: { user: User; onClose: () => void; onDone: () => void }) {
  const [name, setName] = useState(user.name ?? "")
  const [status, setStatus] = useState(user.status ?? "active")
  const [pending, start] = useTransition()
  const [msg, setMsg] = useState("")

  function save() {
    start(async () => {
      await updateUserInfo(user.id, { name, status })
      setMsg("Saved!")
      setTimeout(() => { onDone(); onClose() }, 600)
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-card border border-border rounded-xl p-6 w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-foreground font-semibold">Edit User</h3>
          <button onClick={onClose}><X className="w-4 h-4 text-muted-foreground" /></button>
        </div>
        <p className="text-muted-foreground text-xs mb-3">{user.email}</p>
        <div className="space-y-3">
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Name"
            className="w-full bg-background border border-input text-foreground rounded-lg px-3 py-2 text-sm outline-none focus:border-primary" />
          <select value={status} onChange={e => setStatus(e.target.value)}
            className="w-full bg-background border border-input text-foreground rounded-lg px-3 py-2 text-sm outline-none focus:border-primary">
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
        {msg && <p className="text-green-600 text-xs mt-2">{msg}</p>}
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

function ResetModal({ user, onClose }: { user: User; onClose: () => void }) {
  const [pw, setPw] = useState("")
  const [pending, start] = useTransition()
  const [msg, setMsg] = useState("")

  function save() {
    if (!pw.trim()) return
    start(async () => {
      const res = await resetUserPassword(user.id, pw.trim())
      if (res?.success) { setMsg("Password updated!"); setTimeout(onClose, 800) }
      else setMsg("Error – try again")
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-card border border-border rounded-xl p-6 w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-foreground font-semibold">Reset Password</h3>
          <button onClick={onClose}><X className="w-4 h-4 text-muted-foreground" /></button>
        </div>
        <p className="text-muted-foreground text-xs mb-3">{user.email}</p>
        <input value={pw} onChange={e => setPw(e.target.value)} type="password" placeholder="New password"
          className="w-full bg-background border border-input text-foreground rounded-lg px-3 py-2 text-sm outline-none focus:border-primary" />
        {msg && <p className={`text-xs mt-2 ${msg.startsWith("Error") ? "text-destructive" : "text-green-600"}`}>{msg}</p>}
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onClose} className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground">Cancel</button>
          <button onClick={save} disabled={pending || !pw.trim()}
            className="px-4 py-1.5 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50">
            {pending ? "Updating…" : "Update"}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function UsersClient({
  initial, total, page, search,
}: {
  initial: User[]; total: number; page: number; search: string
}) {
  const router = useRouter()
  const [users, setUsers] = useState(initial)
  const [q, setQ] = useState(search)
  const [editUser, setEditUser] = useState<User | null>(null)
  const [resetUser, setResetUser] = useState<User | null>(null)
  const limit = 20
  const totalPages = Math.ceil(total / limit)

  function go(p: number, s = q) {
    const params = new URLSearchParams()
    if (s) params.set("search", s)
    if (p > 1) params.set("page", String(p))
    router.push(`/super-admin/users?${params.toString()}`)
  }

  function refresh() { router.refresh() }

  const statusColor: Record<string, string> = {
    active: "bg-green-100 text-green-700",
    suspended: "bg-destructive/10 text-destructive",
    inactive: "bg-muted text-muted-foreground",
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Users</h1>
          <p className="text-muted-foreground text-sm mt-1">{total.toLocaleString()} total users</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            onKeyDown={e => e.key === "Enter" && go(1)}
            placeholder="Search by name or email…"
            className="bg-background border border-input text-foreground rounded-lg pl-9 pr-3 py-2 text-sm outline-none focus:border-primary w-64"
          />
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                {["Name", "Email", "Status", "Plan", "Assistants", "Joined", "Actions"].map(h => (
                  <th key={h} className="text-left text-muted-foreground font-medium px-4 py-3 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {initial.map((u) => (
                <tr key={u.id} className="border-b border-border/50 hover:bg-muted/30">
                  <td className="px-4 py-3 text-foreground whitespace-nowrap">{u.name ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded capitalize ${statusColor[u.status ?? "inactive"] ?? statusColor.inactive}`}>
                      {u.status ?? "inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{u.plan?.title ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground text-center">{u._count.assistants}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1.5">
                      <button onClick={() => setEditUser(u)}
                        className="text-muted-foreground hover:text-foreground p-1.5 rounded hover:bg-muted">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => setResetUser(u)}
                        className="text-muted-foreground hover:text-amber-600 p-1.5 rounded hover:bg-muted">
                        <Key className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {initial.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-8 text-muted-foreground text-center">No users found</td></tr>
              )}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <p className="text-muted-foreground text-xs">Page {page} of {totalPages}</p>
            <div className="flex gap-1">
              <button disabled={page <= 1} onClick={() => go(page - 1)}
                className="p-1.5 text-muted-foreground hover:text-foreground disabled:opacity-30">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button disabled={page >= totalPages} onClick={() => go(page + 1)}
                className="p-1.5 text-muted-foreground hover:text-foreground disabled:opacity-30">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {editUser && <EditModal user={editUser} onClose={() => setEditUser(null)} onDone={refresh} />}
      {resetUser && <ResetModal user={resetUser} onClose={() => setResetUser(null)} />}
    </div>
  )
}
