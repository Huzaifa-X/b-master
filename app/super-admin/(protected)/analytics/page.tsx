import { getAnalyticsSummary } from "@/app/actions/super-admin.action"
import { Users, Bot, MessageSquare, DollarSign, Zap, Activity } from "lucide-react"

function StatCard({ icon: Icon, label, value, color }: {
  icon: any; label: string; value: string; color: string
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-5 flex items-start gap-4">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-muted-foreground text-sm">{label}</p>
        <p className="text-foreground text-xl font-bold">{value}</p>
      </div>
    </div>
  )
}

export default async function AnalyticsPage() {
  const stats = await getAnalyticsSummary()

  const maxTokens = Math.max(...stats.dailyUsage.map(d => Number(d.tokens)), 1)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
        <p className="text-muted-foreground text-sm mt-1">Platform-wide AI usage statistics</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard icon={Users} label="Total Users" value={stats.totalUsers.toLocaleString()} color="bg-blue-500/20 text-blue-400" />
        <StatCard icon={Activity} label="Active Users" value={stats.activeUsers.toLocaleString()} color="bg-green-500/20 text-green-400" />
        <StatCard icon={Bot} label="Total Assistants" value={stats.totalAssistants.toLocaleString()} color="bg-purple-500/20 text-purple-400" />
        <StatCard icon={MessageSquare} label="Total Messages" value={stats.totalMessages.toLocaleString()} color="bg-cyan-500/20 text-cyan-400" />
        <StatCard icon={Zap} label="Total Tokens Used" value={Number(stats.totalTokens).toLocaleString()} color="bg-yellow-500/20 text-yellow-400" />
        <StatCard icon={DollarSign} label="Total AI Cost" value={`$${Number(stats.totalCost).toFixed(4)}`} color="bg-red-500/20 text-red-400" />
      </div>

      {/* Daily usage bar chart */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h2 className="text-foreground font-semibold mb-1">Daily Token Usage</h2>
        <p className="text-muted-foreground text-xs mb-6">Last 14 days</p>
        {stats.dailyUsage.length === 0 ? (
          <p className="text-muted-foreground text-sm">No usage data yet</p>
        ) : (
          <div className="space-y-2">
            {stats.dailyUsage.map((d, i) => {
              const pct = Math.round((Number(d.tokens) / maxTokens) * 100)
              return (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-muted-foreground text-xs w-16 shrink-0">{d.day?.slice(5)}</span>
                  <div className="flex-1 h-6 bg-muted rounded relative">
                    <div
                      className="h-6 bg-primary/70 rounded"
                      style={{ width: `${Math.max(pct, 1)}%` }}
                    />
                  </div>
                  <span className="text-muted-foreground text-xs w-24 text-right shrink-0">
                    {Number(d.tokens).toLocaleString()} tok
                  </span>
                  <span className="text-muted-foreground/70 text-xs w-16 text-right shrink-0">
                    ${Number(d.cost).toFixed(4)}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Top users table */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h2 className="text-foreground font-semibold mb-4">Top 10 Users by AI Cost</h2>
        {stats.topUsers.length === 0 ? (
          <p className="text-muted-foreground text-sm">No usage data yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left text-muted-foreground font-medium py-2 pr-4">#</th>
                  <th className="text-left text-muted-foreground font-medium py-2 pr-4">User</th>
                  <th className="text-right text-muted-foreground font-medium py-2 pr-4">Total Cost</th>
                  <th className="text-right text-muted-foreground font-medium py-2 pr-4">Total Tokens</th>
                  <th className="text-right text-muted-foreground font-medium py-2">Requests</th>
                </tr>
              </thead>
              <tbody>
                {stats.topUsers.map((u, i) => (
                  <tr key={i} className="border-b border-border/50">
                    <td className="py-2.5 pr-4 text-muted-foreground/60 text-xs">{i + 1}</td>
                    <td className="py-2.5 pr-4 text-foreground">
                      {u.user?.name ?? u.user?.email ?? "Unknown"}
                      {u.user?.name && (
                        <span className="text-muted-foreground text-xs block">{u.user.email}</span>
                      )}
                    </td>
                    <td className="py-2.5 pr-4 text-right text-amber-600 font-mono text-sm">
                      ${Number(u._sum.totalCost ?? 0).toFixed(4)}
                    </td>
                    <td className="py-2.5 pr-4 text-right text-muted-foreground font-mono text-sm">
                      {Number(u._sum.totalToken ?? 0).toLocaleString()}
                    </td>
                    <td className="py-2.5 text-right text-muted-foreground text-sm">
                      {u._count._all}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
