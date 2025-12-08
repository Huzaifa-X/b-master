"use client"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export interface Artifact {
  id: string
  name: string
  category: string
  htmlContent: string
  createdAt: Date
}

interface ArtifactCardProps {
  artifact: Artifact
  onClick?: () => void
}

const getCategoryColor = (category: string) => {
  const colors: Record<string, string> = {
    accounting: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    invoice: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    payment: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
    documentation: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
    analytics: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400",
    presentation: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
    booking: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
    others: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400",
  }
  return colors[category.toLowerCase()] || colors.others
}

export function ArtifactCard({ artifact, onClick }: ArtifactCardProps) {
  return (
    <div
      onClick={onClick}
      className="cursor-pointer rounded-lg border bg-card shadow-sm transition-all hover:shadow-lg hover:scale-[1.02]"
    >
      {/* Header */}
      <div className="p-4 space-y-2">
        <h3 className="font-bold text-lg truncate">{artifact.name}</h3>
        <Badge className={cn("text-xs", getCategoryColor(artifact.category))}>
          {artifact.category.charAt(0).toUpperCase() + artifact.category.slice(1)}
        </Badge>
      </div>

      {/* HTML Preview */}
      <div>
        <div className="w-full h-64 rounded-lg overflow-hidden border-2 bg-white dark:bg-neutral-950">
          <iframe
            srcDoc={artifact.htmlContent}
            className="w-full border-0 pointer-events-none origin-top-left"
            style={{
              height: "800px",
              transform: "scale(0.32)",
              width: "calc(100% / 0.32)",
            }}
            title={artifact.name}
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            referrerPolicy="no-referrer"
            loading="lazy"
          />
        </div>
      </div>
    </div>
  )
}

