"use client"

import { use } from "react"
import { useState, useMemo, useCallback } from "react"
import { Plus, Search, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { FeedCard } from "@/components/feed/feed-card"
import { AddFeedDialog } from "@/components/feed/add-feed-dialog"
import { useSetAssistantMode } from "@/hooks/useAssistant"
import { 
  useNewsFeedPosts, 
  useCreatePost, 
  useDeletePost, 
  useToggleLike, 
  useCreateComment 
} from "@/hooks/use-newFeed"
import { useSession } from "next-auth/react"
import { useDebounce } from "@/hooks/useDebounce"
import { useLocale } from "@/lib/i18n"

// Current user from session
const getCurrentUser = (session: any) => ({
  id: session?.user?.id || "current-user",
  name: session?.user?.name || "You",
  avatar: session?.user?.image || "/avatars/current-user.jpg",
})

type SortOption = "recent" | "most-liked" | "most-commented"

interface PageProps {
  params: Promise<{ id: string }>
}

export default function NewsFeedPage({ params }: PageProps) {
  const { id: assistantId } = use(params)
  const { t } = useLocale()
  const { data: session } = useSession()
  const currentUser = getCurrentUser(session)

  const [expandedFeedId, setExpandedFeedId] = useState<string | null>(null)
  const [addFeedOpen, setAddFeedOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [sortBy, setSortBy] = useState<SortOption>("recent")

  // Debounce search query to avoid excessive filtering
  const debouncedSearchQuery = useDebounce(searchQuery, 300)

  // Set assistant mode in header
  useSetAssistantMode(assistantId)

  // Fetch news feed posts
  const {
    data: feedData,
    isLoading,
    isError,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch
  } = useNewsFeedPosts(assistantId)

  // Mutations
  const createPostMutation = useCreatePost()
  const deletePostMutation = useDeletePost()
  const { toggleLike, isLoading: isTogglingLike } = useToggleLike()
  const createCommentMutation = useCreateComment()

  // Extract posts from paginated data
  const posts = useMemo(() => {
    return feedData?.pages?.flatMap(page => page.posts) || []
  }, [feedData])

  // Handle add feed with proper data structure
  const handleAddFeed = useCallback((newFeed: {
    title: string
    content: string
    image?: string
    privacy: "public" | "private"
    allowedUserIds?: string[]
  }) => {
    createPostMutation.mutate({
      assistantId,
      title: newFeed.title,
      content: newFeed.content,
      image: newFeed.image,
      isPublic: newFeed.privacy === "public",
      allowedUserIds: newFeed.allowedUserIds,
    }, {
      onSuccess: () => {
        setAddFeedOpen(false)
      }
    })
  }, [assistantId, createPostMutation])

  const handleToggleLike = useCallback((postId: string, isLiked: boolean) => {
    toggleLike(postId, isLiked)
  }, [toggleLike])

  const handleAddComment = useCallback((postId: string, commentText: string) => {
    createCommentMutation.mutate({
      postId,
      comment: commentText,
    })
  }, [createCommentMutation])

  const handleDeleteFeed = useCallback((postId: string) => {
    if (window.confirm(t("feed.confirmDelete"))) {
      deletePostMutation.mutate(postId)
    }
  }, [deletePostMutation, t])

  // Filter and sort posts
  const filteredAndSortedPosts = useMemo(() => {
    const validPosts = posts.filter((post) => post && post.content && post.user)
    
    // Apply search filter
    const filtered = validPosts.filter((post) => {
      const searchLower = debouncedSearchQuery.toLowerCase()
      const titleMatch = post.title?.toLowerCase().includes(searchLower)
      const contentMatch = post.content?.toLowerCase().includes(searchLower)
      const nameMatch = post.user?.name?.toLowerCase().includes(searchLower)
      
      return titleMatch || contentMatch || nameMatch
    })

    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case "most-liked":
          return (b.likeCount || 0) - (a.likeCount || 0)
        case "most-commented":
          return (b.commentCount || 0) - (a.commentCount || 0)
        case "recent":
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      }
    })

    return sorted
  }, [posts, debouncedSearchQuery, sortBy])

  // Render loading state
  if (isLoading) {
    return (
      <div className="h-full overflow-auto">
        <div className="container max-w-4xl mx-auto py-6 px-4">
          <div className="text-center py-12">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">{t("feed.loadingPosts")}</p>
          </div>
        </div>
      </div>
    )
  }

  // Render error state
  if (isError) {
    return (
      <div className="h-full overflow-auto">
        <div className="container max-w-4xl mx-auto py-6 px-4">
          <div className="text-center py-12">
            <p className="text-lg text-muted-foreground mb-4">
              {t("feed.failedToLoad")} {error?.message || t("feed.tryAgain")}
            </p>
            <Button variant="outline" onClick={() => refetch()}>
              {t("feed.retry")}
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full overflow-auto">
      <div className="container max-w-4xl mx-auto py-6 px-4 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{t("feed.title")}</h1>
            <p className="text-muted-foreground">{t("feed.description")}</p>
          </div>
          <Button 
            onClick={() => setAddFeedOpen(true)} 
            className="w-full sm:w-auto"
            disabled={createPostMutation.isPending}
          >
            <Plus className="h-4 w-4 mr-2" />
            {t("feed.createPost")}
          </Button>
        </div>

        {/* Search and Filter */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder={t("feed.searchPlaceholder")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              aria-label={t("feed.searchPlaceholder")}
            />
          </div>
          <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder={t("feed.sortBy")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent" className="focus:bg-muted focus:text-foreground">
                {t("feed.mostRecent")}
              </SelectItem>
              <SelectItem value="most-liked" className="focus:bg-muted focus:text-foreground">
                {t("feed.mostLiked")}
              </SelectItem>
              <SelectItem value="most-commented" className="focus:bg-muted focus:text-foreground">
                {t("feed.mostCommented")}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Feed List */}
        <div className="space-y-4">
          {filteredAndSortedPosts.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-lg text-muted-foreground mb-4">
                {debouncedSearchQuery 
                  ? t("feed.noResults") 
                  : t("feed.noFeedGeneral")
                }
              </p>
              {!debouncedSearchQuery && (
                <Button 
                  onClick={() => setAddFeedOpen(true)} 
                  disabled={createPostMutation.isPending}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {t("feed.createFirstPost")}
                </Button>
              )}
            </div>
          ) : (
            <>
              {filteredAndSortedPosts.map((post) => (
                <FeedCard
                  key={post.id}
                  post={post}
                  currentUser={currentUser}
                  isExpanded={expandedFeedId === post.id}
                  onToggleExpand={() => setExpandedFeedId(expandedFeedId === post.id ? null : post.id)}
                  onToggleLike={() => handleToggleLike(post.id, post.isLikedByCurrentUser)}
                  onAddComment={(text) => handleAddComment(post.id, text)}
                  onDelete={handleDeleteFeed}
                />
              ))}

              {/* Load More Button */}
              {hasNextPage && (
                <div className="text-center py-6">
                  <Button
                    variant="outline"
                    onClick={() => fetchNextPage()}
                    disabled={isFetchingNextPage}
                  >
                    {isFetchingNextPage ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        {t("feed.loading")}
                      </>
                    ) : (
                      t("feed.loadMore")
                    )}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Add Feed Dialog */}
      <AddFeedDialog
        open={addFeedOpen}
        onOpenChange={setAddFeedOpen}
        assistantId={assistantId}
        onSubmit={handleAddFeed}
        isLoading={createPostMutation.isPending}
      />
    </div>
  )
}