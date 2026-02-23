import { getAnalyticsSummary } from "@/app/actions/super-admin.action"
import { Users, Bot, MessageSquare, DollarSign, TrendingUp, Zap } from "lucide-react"
import prisma from "@/lib/prisma"

function StatCard({ icon: Icon, label, value, sub, color }: {
  icon: any; label: string; value: string | number; sub?: string; color: string
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-5 flex items-start gap-4">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-muted-foreground text-sm">{label}</p>
        <p className="text-foreground text-2xl font-bold">{value}</p>
        {sub && <p className="text-muted-foreground text-xs mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

function MiniBar({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground truncate max-w-[140px]">{label}</span>
        <span className="text-foreground ml-2">${(value as number).toFixed(4)}</span>
      </div>
      <div className="h-1.5 bg-muted rounded-full">
        <div className="h-1.5 bg-primary rounded-full" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

export default async function SuperAdminDashboard() {
  const [stats, recentUsers, plansCount] = await Promise.all([
    getAnalyticsSummary(),
    prisma.user.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, email: true, createdAt: true, loginType: true },
    }),
    prisma.plan.count({ where: { isActive: true } }),
  ])

  const maxCost = Math.max(...stats.topUsers.map((u) => u._sum.totalCost as number ?? 0), 0.0001)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">B-Master platform overview</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard icon={Users} label="Total Users" value={stats.totalUsers.toLocaleString()}
          sub={`${stats.activeUsers} active`} color="bg-blue-500/20 text-blue-400" />
        <StatCard icon={Bot} label="Assistants" value={stats.totalAssistants.toLocaleString()}
          color="bg-purple-500/20 text-purple-400" />
        <StatCard icon={MessageSquare} label="Chat Messages" value={stats.totalMessages.toLocaleString()}
          color="bg-green-500/20 text-green-400" />
        <StatCard icon={Zap} label="Total Tokens" value={Number(stats.totalTokens ?? 0).toLocaleString()}
          color="bg-yellow-500/20 text-yellow-400" />
        <StatCard icon={DollarSign} label="Total AI Cost" value={`$${Number(stats.totalCost).toFixed(2)}`}
          color="bg-red-500/20 text-red-400" />
        <StatCard icon={TrendingUp} label="Active Plans" value={plansCount}
          color="bg-cyan-500/20 text-cyan-400" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily usage chart (last 14 days) */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h2 className="text-foreground font-semibold mb-4">Daily Token Usage (14 days)</h2>
          <div className="flex items-end gap-1 h-24">
            {stats.dailyUsage.length === 0 ? (
              <p className="text-muted-foreground text-sm">No data yet</p>
            ) : (() => {
              const maxT = Math.max(...stats.dailyUsage.map((d) => Number(d.tokens)), 1)
              return stats.dailyUsage.map((d, i) => {
                const h = Math.round((Number(d.tokens) / maxT) * 100)
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
                    <div
                      className="w-full bg-primary/60 rounded-t hover:bg-primary transition-colors"
                      style={{ height: `${Math.max(h, 2)}%` }}
                    />
                    <span className="text-muted-foreground/50 text-[9px] hidden group-hover:block absolute -bottom-4">
                      {d.day.slice(5)}
                    </span>
                  </div>
                )
              })
            })()}
          </div>
          <div className="flex justify-between text-[10px] text-muted-foreground/50 mt-2">
            {stats.dailyUsage.length > 0 && (
              <>
                <span>{stats.dailyUsage[0]?.day?.slice(5)}</span>
                <span>{stats.dailyUsage[stats.dailyUsage.length - 1]?.day?.slice(5)}</span>
              </>
            )}
          </div>
        </div>

        {/* Top users by cost */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h2 className="text-foreground font-semibold mb-4">Top Users by AI Cost</h2>
          {stats.topUsers.length === 0 ? (
            <p className="text-muted-foreground text-sm">No usage data yet</p>
          ) : (
            <div className="space-y-3">
              {stats.topUsers.map((u, i) => (
                <MiniBar
                  key={i}
                  label={u.user?.name ?? u.user?.email ?? "Unknown"}
                  value={Number(u._sum.totalCost ?? 0)}
                  max={maxCost}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent users */}
      <div className="bg-card border border-border rounded-xl p-5">
        <h2 className="text-foreground font-semibold mb-4">Recent Registrations</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left text-muted-foreground font-medium py-2 pr-4">Name</th>
                <th className="text-left text-muted-foreground font-medium py-2 pr-4">Email</th>
                <th className="text-left text-muted-foreground font-medium py-2 pr-4">Type</th>
                <th className="text-left text-muted-foreground font-medium py-2">Joined</th>
              </tr>
            </thead>
            <tbody>
              {recentUsers.map((u) => (
                <tr key={String(u.id)} className="border-b border-border/50">
                  <td className="py-2.5 pr-4 text-foreground">{u.name ?? "—"}</td>
                  <td className="py-2.5 pr-4 text-muted-foreground">{u.email}</td>
                  <td className="py-2.5 pr-4">
                    <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded">
                      {u.loginType}
                    </span>
                  </td>
                  <td className="py-2.5 text-muted-foreground text-xs">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
