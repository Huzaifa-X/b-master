"use client"

import { use } from "react"
import { useState } from "react"
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
import { toast } from "sonner"
import { useSetAssistantMode } from "@/hooks/useAssistant"
import { useNewsFeedPosts, useCreatePost, useDeletePost, useLikePost, useUnlikePost, useCreateComment, useComments } from "@/hooks/use-newFeed"
import { useSession } from "next-auth/react"

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
  const { data: session } = useSession()
  const currentUser = getCurrentUser(session)

  const [expandedFeedId, setExpandedFeedId] = useState<string | null>(null)
  const [addFeedOpen, setAddFeedOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [sortBy, setSortBy] = useState<SortOption>("recent")

  // Set assistant mode in header (automatically handles fetching and cleanup)
  useSetAssistantMode(assistantId)

  // Fetch news feed posts
  const {
    data: feedData,
    isLoading,
    isError,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
  } = useNewsFeedPosts(assistantId)

  // Mutations
  const createPostMutation = useCreatePost()
  const deletePostMutation = useDeletePost()
  const likePostMutation = useLikePost()
  const unlikePostMutation = useUnlikePost()
  const createCommentMutation = useCreateComment()

  // Extract posts from paginated data
  const posts = feedData?.pages?.flatMap(page => page.posts) || []

  const handleAddFeed = (newFeed: {
    title: string
    content: string
    image?: string
    privacy: "public" | "private"
  }) => {
    // Combine title and content into a single content field
    const fullContent = newFeed.title ? `${newFeed.title}\n\n${newFeed.content}` : newFeed.content

    createPostMutation.mutate({
      assistantId,
      content: fullContent,
      isPublic: newFeed.privacy === "public",
    })
    setAddFeedOpen(false)
  }

  const handleToggleLike = (postId: string, isLiked: boolean) => {
    if (isLiked) {
      unlikePostMutation.mutate(postId)
    } else {
      likePostMutation.mutate(postId)
    }
  }

  const handleAddComment = (postId: string, commentText: string) => {
    createCommentMutation.mutate({
      postId,
      comment: commentText,
    })
  }

  const handleDeleteFeed = (postId: string) => {
    deletePostMutation.mutate(postId)
  }

  // Filter and sort posts
  const validPosts = posts.filter((post) => post && post.content && post.user) as any[]
  const filteredAndSortedPosts = validPosts
    .filter(
      (post: any) =>
        post.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (post.user?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
    )
    .sort((a, b) => {
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

  return (
    <div className="h-full overflow-auto">
      <div className="container max-w-4xl mx-auto py-6 px-4 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">News Feed</h1>
            <p className="text-muted-foreground">Stay updated with the latest from your team</p>
          </div>
          <Button onClick={() => setAddFeedOpen(true)} className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            Create Post
          </Button>
        </div>

        {/* Search and Filter */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search posts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent" className="focus:bg-muted focus:text-foreground">Most Recent</SelectItem>
              <SelectItem value="most-liked" className="focus:bg-muted focus:text-foreground">Most Liked</SelectItem>
              <SelectItem value="most-commented" className="focus:bg-muted focus:text-foreground">Most Commented</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Feed List */}
        <div className="space-y-4">
          {isLoading ? (
            <div className="text-center py-12">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">Loading posts...</p>
            </div>
          ) : isError ? (
            <div className="text-center py-12">
              <p className="text-lg text-muted-foreground mb-4">
                Failed to load posts. Please try again.
              </p>
              <Button variant="outline" onClick={() => window.location.reload()}>
                Retry
              </Button>
            </div>
          ) : filteredAndSortedPosts.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-lg text-muted-foreground mb-4">
                {searchQuery ? "No posts found matching your search." : "No posts yet. Create the first post!"}
              </p>
              {!searchQuery && (
                <Button onClick={() => setAddFeedOpen(true)} disabled={createPostMutation.isPending}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Post
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
                        Loading...
                      </>
                    ) : (
                      "Load More Posts"
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
        onSubmit={handleAddFeed}
        isLoading={createPostMutation.isPending}
      />
    </div>
  )
}

