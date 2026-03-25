"use client"

import { useState, useEffect } from "react"
import { Tabs } from "@/components/ui/vercel-tabs"
import { AssistantCard } from "@/components/assistants/assistant-card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, Plus, Bot, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { useAssistants } from "@/hooks/useAssistants"
import { Skeleton } from "@/components/ui/skeleton"
import { useDebounce } from "@/hooks/useDebounce"
import { useLocale } from "@/lib/i18n"

const getTabs = (t: any) => [
  { id: "my", label: t("assistants.tabs.my") },
  { id: "purchased", label: t("assistants.tabs.purchased") },
  { id: "shared", label: t("assistants.tabs.shared") },
]

export default function AssistantsPage() {
  const router = useRouter()
  const { t } = useLocale()
  const [activeTab, setActiveTab] = useState<'my' | 'purchased' | 'shared'>("my")
  const [searchQuery, setSearchQuery] = useState("")

  const TABS = getTabs(t)
  
  // Debounce search to avoid too many requests
  const debouncedSearch = useDebounce(searchQuery, 500)

  const {
    assistants,
    pagination,
    isLoading,
    isError,
    error,
    hasMore,
    loadMore,
    isLoadingMore
  } = useAssistants({
    type: activeTab,
    search: debouncedSearch,
    limit: 12
  })

  const handleCreateNew = () => {
    router.push("/assistants/add")
  }

  // Reset search when tab changes
  useEffect(() => {
    setSearchQuery("")
  }, [activeTab])

  return (
    <div className="h-full overflow-y-auto">
      <div className="container mx-auto py-4 px-4 max-w-4xl pb-16">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-medium mb-2">{t("assistants.allAssistants")}</h1>
              <p className="text-muted-foreground">
                {t("assistants.manageDescription")}
              </p>
            </div>
          </div>

          {/* Tabs */}
          <Tabs tabs={TABS} activeTab={activeTab} onTabChange={(tab) => setActiveTab(tab as typeof activeTab)} />
        </div>

        {/* Search Bar */}
        <div className="mb-8">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("assistants.searchPlaceholder")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="h-48 w-full rounded-lg" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ))}
          </div>
        )}

        {/* Error State */}
        {isError && (
          <div className="text-center py-16">
            <Bot className="h-16 w-16 mx-auto mb-4 text-destructive" />
            <h3 className="text-lg font-semibold mb-2">{t("assistants.errorLoading")}</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {error || t("common.error")}
            </p>
          </div>
        )}

        {/* Assistants Grid */}
        {!isLoading && !isError && (
          <>
            {assistants.length > 0 ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {assistants.map((assistant) => (
                    <AssistantCard
                      key={assistant.id}
                      assistant={{
                        id: assistant.id,
                        name: assistant.name,
                        userId: assistant.userId.toString(),
                        price: assistant.price,
                        description: assistant.description || "",
                        image: assistant.image || "/bmaster-icon.png",
                        category: assistant.category,
                        createdAt: assistant.createdAt.toString()
                      }}
                      tabType={activeTab}
                    />
                  ))}
                </div>

                {/* Load More Button */}
                {hasMore && (
                  <div className="flex justify-center mt-8">
                    <Button
                      onClick={() => loadMore()}
                      disabled={isLoadingMore}
                      variant="outline"
                      size="lg"
                    >
                      {isLoadingMore ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          {t("common.loading")}
                        </>
                      ) : (
                        `${t("assistants.loadMore")} (${t("assistants.remaining", { count: pagination.total - assistants.length })})`
                      )}
                    </Button>
                  </div>
                )}

                {/* Pagination Info */}
                <div className="text-center mt-4 text-sm text-muted-foreground">
                  {t("assistants.showingCount", { count: assistants.length, total: pagination.total })}
                </div>
              </>
            ) : searchQuery ? (
              <div className="text-center py-16">
                <Search className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">{t("assistants.noResults")}</h3>
                <p className="text-sm text-muted-foreground">
                  {t("assistants.tryDifferentKeywords")}
                </p>
              </div>
            ) : (
              <div className="text-center py-16">
                <Bot className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">
                  {activeTab === "my" && t("assistants.noMyAssistants")}
                  {activeTab === "purchased" && t("assistants.noPurchasedAssistants")}
                  {activeTab === "shared" && t("assistants.noSharedAssistants")}
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {activeTab === "my" && t("assistants.createFirst")}
                  {activeTab === "purchased" && t("assistants.browseStore")}
                  {activeTab === "shared" && t("assistants.sharedAppearHere")}
                </p>
                {activeTab === "my" && (
                  <Button onClick={handleCreateNew} className="mt-4">
                    <Plus className="mr-2 h-4 w-4" />
                    {t("assistants.createAssistant")}
                  </Button>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
