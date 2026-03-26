"use client"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { useLocale } from "@/lib/i18n"
import { Code2, ExternalLink } from "lucide-react"

export interface Artifact {
  id: string
  name: string
  category: string
  htmlContent: string
  createdAt: Date
  access?: string // VIEWER, EDITOR, or ADMIN
}

interface ArtifactCardProps {
  artifact: Artifact
  onClick?: () => void
}

const getCategoryColor = (category: string) => {
  const colors: Record<string, string> = {
    presentation: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
    documentation: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
    invoice: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    video_generation: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
    "deployed project": "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    others: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400",
  }
  return colors[category.toLowerCase()] || colors.others
}

export function ArtifactCard({ artifact, onClick }: ArtifactCardProps) {
  const { t } = useLocale()

  const isDeployedProject = artifact.category === "Deployed Project"
  const categoryKey = artifact.category.toLowerCase().replace(/\s+/g, '_')

  // Special card for B-Coder projects
  if (isDeployedProject) {
    return (
      <div
        onClick={onClick}
        className="cursor-pointer rounded-xl border bg-card shadow-sm transition-all hover:shadow-lg hover:scale-[1.02] overflow-hidden group"
      >
        {/* Gradient header band */}
        <div className="h-24 bg-gradient-to-br from-emerald-500/20 via-teal-500/10 to-cyan-500/20 dark:from-emerald-500/10 dark:via-teal-500/5 dark:to-cyan-500/10 flex items-center justify-center border-b border-emerald-200/50 dark:border-emerald-800/30 relative">
          <div className="h-12 w-12 rounded-2xl bg-white dark:bg-zinc-900 border border-emerald-200 dark:border-emerald-800/60 shadow-sm flex items-center justify-center">
            <Code2 className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="absolute top-2.5 right-2.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <ExternalLink className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
          </div>
        </div>

        {/* Info */}
        <div className="p-4 space-y-2">
          <h3 className="font-bold text-base truncate">{artifact.name}</h3>
          <div className="flex items-center justify-between gap-2">
            <Badge className={cn("text-xs", getCategoryColor(artifact.category))}>
              B-Coder
            </Badge>
            <span className="text-[10px] text-muted-foreground">
              {new Date(artifact.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
            </span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      onClick={onClick}
      className="cursor-pointer rounded-lg border bg-card shadow-sm transition-all hover:shadow-lg hover:scale-[1.02]"
    >
      {/* Header */}
      <div className="p-4 space-y-2">
        <h3 className="font-bold text-lg truncate">{artifact.name}</h3>
        <Badge className={cn("text-xs", getCategoryColor(artifact.category))}>
          {t(`artifacts.categories.${categoryKey}`, { defaultValue: artifact.category })}
        </Badge>
      </div>
    </div>
  )
}

