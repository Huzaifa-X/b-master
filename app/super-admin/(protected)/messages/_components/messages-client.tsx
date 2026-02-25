"use client"
import { useState, useTransition } from "react"
import { getMessages } from "@/app/actions/super-admin.action"
import { Search, ChevronLeft, ChevronRight } from "lucide-react"

// AssistantChatMessage shape
type ChatMsg = {
  id: any
  message: string
  messageType?: string
  createdAt: Date
  sender?: { name: string | null; email: string } | null
  assistant?: { name: string } | null
}

// AssistantUserChatMessage shape
type AiMsg = {
  id: any
  role: string
  message: string | null
  createdAt: Date
  user?: { name: string | null; email: string } | null
  assistant?: { name: string } | null
}

type AnyMsg = ChatMsg | AiMsg

function isAiMsg(m: AnyMsg): m is AiMsg {
  return "role" in m
}

export default function MessagesClient({
  initial, total, page, search, msgType,
}: {
  initial: AnyMsg[]; total: number; page: number; search: string; msgType: string
}) {
  const [type, setType] = useState<"chat" | "ai">(msgType as "chat" | "ai")
  const [q, setQ] = useState(search)
  const [msgs, setMsgs] = useState<AnyMsg[]>(initial)
  const [curPage, setCurPage] = useState(page)
  const [curTotal, setCurTotal] = useState(total)
  const [pending, start] = useTransition()
  const limit = 25
  const totalPages = Math.ceil(curTotal / limit)

  function load(p: number, s = q, t = type) {
    start(async () => {
      const r = await getMessages(p, s, t, limit)
      setMsgs(r.messages as any)
      setCurTotal(r.total)
      setCurPage(p)
    })
  }

  function switchTab(t: "chat" | "ai") {
    setType(t)
    setCurPage(1)
    load(1, q, t)
  }

  const roleColor: Record<string, string> = {
    user: "bg-blue-100 text-blue-700",
    assistant: "bg-purple-100 text-purple-700",
    system: "bg-muted text-muted-foreground",
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Messages</h1>
          <p className="text-muted-foreground text-sm mt-1">{curTotal.toLocaleString()} messages</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            onKeyDown={e => e.key === "Enter" && load(1)}
            placeholder="Search content…"
            className="bg-background border border-input text-foreground rounded-lg pl-9 pr-3 py-2 text-sm outline-none focus:border-primary w-56"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted border border-border rounded-lg p-1 w-fit">
        {(["chat", "ai"] as const).map(t => (
          <button key={t} onClick={() => switchTab(t)}
            className={`px-4 py-1.5 rounded text-sm transition-colors ${
              type === t ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground"
            }`}>
            {t === "chat" ? "Messenger Chats" : "AI Chats"}
          </button>
        ))}
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                {type === "ai" && (
                  <th className="text-left text-muted-foreground font-medium px-4 py-3">Role</th>
                )}
                <th className="text-left text-muted-foreground font-medium px-4 py-3">Assistant</th>
                <th className="text-left text-muted-foreground font-medium px-4 py-3">
                  {type === "chat" ? "Sender" : "User"}
                </th>
                <th className="text-left text-muted-foreground font-medium px-4 py-3">Message</th>
                <th className="text-left text-muted-foreground font-medium px-4 py-3 whitespace-nowrap">Date</th>
              </tr>
            </thead>
            <tbody>
              {pending ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-muted-foreground text-center">Loading…</td>
                </tr>
              ) : msgs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-muted-foreground text-center">No messages found</td>
                </tr>
              ) : msgs.map((m, i) => {
                const ai = isAiMsg(m)
                const actorName = ai
                  ? (m.user?.name ?? m.user?.email ?? "—")
                  : ((m as ChatMsg).sender?.name ?? (m as ChatMsg).sender?.email ?? "—")
                return (
                  <tr key={i} className="border-b border-border/50 hover:bg-muted/30">
                    {ai && (
                      <td className="px-4 py-2.5">
                        <span className={`text-xs px-2 py-0.5 rounded capitalize ${roleColor[m.role] ?? roleColor.system}`}>
                          {m.role}
                        </span>
                      </td>
                    )}
                    <td className="px-4 py-2.5 text-muted-foreground text-xs whitespace-nowrap">
                      {m.assistant?.name ?? "—"}
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground text-xs whitespace-nowrap">{actorName}</td>
                    <td className="px-4 py-2.5 text-foreground max-w-xs">
                      <p className="truncate text-xs">{m.message ?? "—"}</p>
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground text-xs whitespace-nowrap">
                      {new Date(m.createdAt).toLocaleString()}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <p className="text-muted-foreground text-xs">Page {curPage} of {totalPages}</p>
            <div className="flex gap-1">
              <button disabled={curPage <= 1 || pending} onClick={() => load(curPage - 1)}
                className="p-1.5 text-muted-foreground hover:text-foreground disabled:opacity-30">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button disabled={curPage >= totalPages || pending} onClick={() => load(curPage + 1)}
                className="p-1.5 text-muted-foreground hover:text-foreground disabled:opacity-30">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
