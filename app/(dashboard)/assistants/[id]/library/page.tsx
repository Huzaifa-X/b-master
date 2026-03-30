"use client"

import { use, useState } from "react"
import { useSetAssistantMode } from "@/hooks/useAssistant"
import { AssistantLibrary } from "@/components/assistants/assistant-library"
import { useAssistantPermissions } from "@/hooks/usePermissions"
import { useLocale } from "@/lib/i18n"
import { Input } from "@/components/ui/input"
import { Search, X } from "lucide-react"
import { Button } from "@/components/ui/button"

interface LibraryPageProps {
  params: Promise<{ id: string }>
}

export default function LibraryPage({ params }: LibraryPageProps) {
  const { id: assistantId } = use(params)
  const { t } = useLocale()
  const [searchQuery, setSearchQuery] = useState("")

  // Set assistant mode in header
  useSetAssistantMode(assistantId)

  // Only owners can upload/delete
  const { permissions } = useAssistantPermissions(assistantId)
  const isOwner = permissions?.isOwner ?? false

  return (
    <div className="flex flex-col h-full">
      <div className="flex-shrink-0 border-b px-6 py-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold">{t("library.title")}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {t("library.description")}
            </p>
          </div>

          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("library.searchPlaceholder") || "Search files, URLs, notes..."}
              className="pl-9 pr-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                onClick={() => setSearchQuery("")}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <AssistantLibrary
          assistantId={assistantId}
          readonly={!isOwner}
          searchQuery={searchQuery}
        />
      </div>
    </div>
  )
}
