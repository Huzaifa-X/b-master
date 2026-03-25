"use client"

import { useState } from "react"
import { History, Check, Clock, User, ChevronRight, Loader2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useArtifactVersions, useSetActiveVersion } from "@/hooks/useArtifact"
import { cn } from "@/lib/utils"
import { useLocale } from "@/lib/i18n"

interface VersionHistoryDialogProps {
  artifactId: string
  onVersionSelect?: (versionCode: string, versionId: string) => void
  disabled?: boolean
}

interface ArtifactVersion {
  id: string
  versionNumber: number
  versionName: string | null
  code: string
  description: string | null
  changeType: string
  isSnapshot: boolean
  createdAt: Date
  isActive: boolean
  creator: {
    id: string
    name: string
    email: string
    image: string | null
  }
}

export function VersionHistoryDialog({
  artifactId,
  onVersionSelect,
  disabled = false,
}: VersionHistoryDialogProps) {
  const { t } = useLocale()
  const [open, setOpen] = useState(false)

  // Fetch versions using the hook
  const {
    versions,
    activeVersionId,
    isLoading,
    isError,
    error,
    refetch,
  } = useArtifactVersions(artifactId, { enabled: open })

  // Set active version mutation
  const { setActiveVersion, isLoading: isSettingActive } = useSetActiveVersion({
    onSuccess: () => {
      refetch()
    }
  })

  const handleVersionClick = async (version: ArtifactVersion) => {
    // If selecting a different version than the active one, set it as active
    if (!version.isActive) {
      setActiveVersion({
        artifactId,
        versionId: version.id
      })
    }

    // Call the callback to update the preview
    onVersionSelect?.(version.code, version.id)

    // Close the dialog
    setOpen(false)
  }

  const getChangeTypeBadge = (changeType: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "outline" | "destructive", label: string }> = {
      manual: { variant: "default", label: t("artifacts.changeTypes.manual") },
      ai: { variant: "secondary", label: t("artifacts.changeTypes.ai") },
      rollback: { variant: "outline", label: t("artifacts.changeTypes.rollback") },
    }

    const config = variants[changeType] || variants.manual

    return (
      <Badge variant={config.variant} className="text-xs">
        {config.label}
      </Badge>
    )
  }

  const formatDate = (date: Date) => {
    const now = new Date()
    const diffMs = now.getTime() - new Date(date).getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return t("artifacts.time.justNow")
    if (diffMins < 60) return t("artifacts.time.minutesAgo", { count: diffMins })
    if (diffHours < 24) return t("artifacts.time.hoursAgo", { count: diffHours })
    if (diffDays < 7) return t("artifacts.time.daysAgo", { count: diffDays })

    return new Date(date).toLocaleDateString()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          title={t("artifacts.versionHistory")}
          disabled={disabled}
        >
          <History className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            {t("artifacts.versionHistory")}
          </DialogTitle>
          <DialogDescription>
            {t("artifacts.viewRestoreVersions")}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 w-full overflow-hidden">
          {isLoading ? (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : isError ? (
            <div className="flex h-full flex-col items-center justify-center space-y-4">
              <p className="text-sm text-destructive">{t("artifacts.failedToLoadVersions")}</p>
              <Button onClick={() => refetch()} variant="outline" size="sm">
                {t("artifacts.tryAgain")}
              </Button>
            </div>
          ) : versions.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center space-y-2">
              <History className="h-12 w-12 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">{t("artifacts.noVersionHistory")}</p>
            </div>
          ) : (
            <div className="max-h-[60vh] w-full overflow-y-auto">
              <div className="space-y-2 pr-4 pb-4">
                {versions.map((version) => (
                  <div
                    key={version.id}
                    className={cn(
                      "group relative rounded-lg border p-4 transition-all hover:border-primary/50 hover:bg-accent/50 cursor-pointer",
                      version.isActive && "border-primary bg-accent/30",
                      isSettingActive && "opacity-50 pointer-events-none"
                    )}
                    onClick={() => handleVersionClick(version)}
                  >
                    {/* Active indicator */}
                    {version.isActive && (
                      <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-r" />
                    )}

                    <div className="flex items-start justify-between gap-4">
                      {/* Left side: Version info */}
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-semibold text-sm">
                            {version.versionName || t("artifacts.version", { number: version.versionNumber })}
                          </h4>
                          {getChangeTypeBadge(version.changeType)}
                          {version.isActive && (
                            <Badge variant="default" className="text-xs gap-1">
                              <Check className="h-3 w-3" />
                              {t("artifacts.active")}
                            </Badge>
                          )}
                        </div>

                        {version.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {version.description}
                          </p>
                        )}

                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          {/* Creator */}
                          <div className="flex items-center gap-2">
                            <Avatar className="h-5 w-5">
                              <AvatarImage src={version.creator.image || undefined} />
                              <AvatarFallback className="text-[10px]">
                                {version.creator.name.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span>{version.creator.name}</span>
                          </div>

                          {/* Timestamp */}
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span>{formatDate(version.createdAt)}</span>
                          </div>

                          {/* Version number */}
                          <div className="flex items-center gap-1">
                            <span>v{version.versionNumber}</span>
                          </div>
                        </div>
                      </div>


                      {/* Right side: Action indicator */}
                      <div className="flex items-center">
                        {isSettingActive ? (
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
