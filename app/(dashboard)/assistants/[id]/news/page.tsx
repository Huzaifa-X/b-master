"use client"

import { use } from "react"
import { useState } from "react"
import { Plus, Search } from "lucide-react"
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

// Mock current user
const CURRENT_USER = {
  id: "current-user",
  name: "You",
  avatar: "/avatars/current-user.jpg",
}

// Mock data structure
export interface FeedPost {
  id: string
  author: {
    id: string
    name: string
    avatar: string
  }
  title: string
  content: string
  image?: string
  privacy: "public" | "private"
  timestamp: Date
  likes: Array<{ userId: string; userName: string; avatar: string }>
  comments: Array<{
    id: string
    author: { id: string; name: string; avatar: string }
    text: string
    timestamp: Date
    likes?: number
  }>
}

const INITIAL_FEEDS: FeedPost[] = [
  {
    id: "1",
    author: {
      id: "user-1",
      name: "Sarah Williams",
      avatar: "",
    },
    title: "Exciting news about our new project!",
    content:
      "Just wrapped up an amazing brainstorming session with the team. We're launching a new initiative that will revolutionize how we approach customer engagement. Can't wait to share more details soon! What do you all think about integrating AI-powered chatbots into our customer service? Would love to hear your thoughts and experiences.",
    image: undefined,
    privacy: "public",
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    likes: [
      { userId: "user-2", userName: "John Doe", avatar: "" },
      { userId: "user-3", userName: "Jane Smith", avatar: "" },
      { userId: "user-4", userName: "Mike Johnson", avatar: "" },
    ],
    comments: [
      {
        id: "c1",
        author: { id: "user-2", name: "John Doe", avatar: "" },
        text: "This sounds amazing! Can't wait to see what you've been working on.",
        timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000),
        likes: 2,
      },
      {
        id: "c2",
        author: { id: "user-3", name: "Jane Smith", avatar: "" },
        text: "AI-powered chatbots are definitely the future. We should explore this further!",
        timestamp: new Date(Date.now() - 30 * 60 * 1000),
        likes: 1,
      },
    ],
  },
  {
    id: "2",
    author: {
      id: "user-2",
      name: "John Doe",
      avatar: "",
    },
    title: "Team Building Event - Last Week's Highlights",
    content:
      "What an incredible team building event we had last week! From problem-solving activities to creative workshops, every moment was memorable. Special thanks to everyone who participated and made it such a success. Looking forward to the next one!",
    image: undefined,
    privacy: "public",
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
    likes: [
      { userId: "user-1", userName: "Sarah Williams", avatar: "" },
      { userId: "user-5", userName: "Emily Brown", avatar: "" },
    ],
    comments: [
      {
        id: "c3",
        author: { id: "user-1", name: "Sarah Williams", avatar: "" },
        text: "It was fantastic! Already looking forward to the next event.",
        timestamp: new Date(Date.now() - 20 * 60 * 60 * 1000),
        likes: 0,
      },
    ],
  },
  {
    id: "3",
    author: {
      id: "user-3",
      name: "Jane Smith",
      avatar: "",
    },
    title: "Q4 Goals and Objectives",
    content:
      "As we approach Q4, let's align on our key objectives. I've drafted a preliminary list focusing on: 1) Improving customer satisfaction scores by 15%, 2) Launching two new product features, 3) Expanding our market reach. Please share your feedback and suggestions!",
    image: undefined,
    privacy: "public",
    timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
    likes: [
      { userId: "user-1", userName: "Sarah Williams", avatar: "" },
      { userId: "user-2", userName: "John Doe", avatar: "" },
      { userId: "user-4", userName: "Mike Johnson", avatar: "" },
      { userId: "user-5", userName: "Emily Brown", avatar: "" },
      { userId: "user-6", userName: "David Lee", avatar: "" },
    ],
    comments: [
      {
        id: "c4",
        author: { id: "user-4", name: "Mike Johnson", avatar: "" },
        text: "Great objectives! I think we should also focus on team development and training.",
        timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        likes: 3,
      },
      {
        id: "c5",
        author: { id: "user-2", name: "John Doe", avatar: "" },
        text: "Agreed! Let's schedule a meeting to discuss this in detail.",
        timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        likes: 1,
      },
      {
        id: "c6",
        author: { id: "user-5", name: "Emily Brown", avatar: "" },
        text: "I have some ideas for the new product features. Will share them soon!",
        timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        likes: 2,
      },
    ],
  },
  {
    id: "4",
    author: {
      id: "user-4",
      name: "Mike Johnson",
      avatar: "",
    },
    title: "Celebrating Our Milestone!",
    content:
      "🎉 We've just reached 10,000 active users! This is a huge milestone for our team. Thank you everyone for your hard work and dedication. Let's keep this momentum going!",
    image: undefined,
    privacy: "public",
    timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
    likes: [
      { userId: "user-1", userName: "Sarah Williams", avatar: "" },
      { userId: "user-2", userName: "John Doe", avatar: "" },
      { userId: "user-3", userName: "Jane Smith", avatar: "" },
      { userId: "user-5", userName: "Emily Brown", avatar: "" },
      { userId: "user-6", userName: "David Lee", avatar: "" },
      { userId: "user-7", userName: "Lisa Chen", avatar: "" },
      { userId: "user-8", userName: "Tom Wilson", avatar: "" },
    ],
    comments: [
      {
        id: "c7",
        author: { id: "user-1", name: "Sarah Williams", avatar: "" },
        text: "Congratulations to everyone! This is just the beginning! 🚀",
        timestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
        likes: 5,
      },
      {
        id: "c8",
        author: { id: "user-3", name: "Jane Smith", avatar: "" },
        text: "So proud of this team! Next stop: 100K users! 💪",
        timestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
        likes: 4,
      },
    ],
  },
  {
    id: "5",
    author: {
      id: "user-5",
      name: "Emily Brown",
      avatar: "",
    },
    title: "Introducing Our New Design System",
    content:
      "After months of work, I'm excited to introduce our new design system! It includes updated color palettes, typography guidelines, and reusable components. This will help us maintain consistency across all our products. Check out the documentation link in the comments!",
    image: undefined,
    privacy: "public",
    timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 1 week ago
    likes: [
      { userId: "user-2", userName: "John Doe", avatar: "" },
      { userId: "user-6", userName: "David Lee", avatar: "" },
    ],
    comments: [
      {
        id: "c9",
        author: { id: "user-6", name: "David Lee", avatar: "" },
        text: "The new design system looks fantastic! Great work on this.",
        timestamp: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
        likes: 1,
      },
    ],
  },
  {
    id: "6",
    author: {
      id: "user-6",
      name: "David Lee",
      avatar: "",
    },
    title: "Important: Security Update Required",
    content:
      "Team, please update your systems with the latest security patches by end of day. This is critical to maintain our security standards. If you encounter any issues during the update, please reach out to IT support immediately.",
    image: undefined,
    privacy: "private",
    timestamp: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
    likes: [
      { userId: "user-1", userName: "Sarah Williams", avatar: "" },
      { userId: "user-2", userName: "John Doe", avatar: "" },
      { userId: "user-3", userName: "Jane Smith", avatar: "" },
      { userId: "user-4", userName: "Mike Johnson", avatar: "" },
    ],
    comments: [],
  },
]

type SortOption = "recent" | "most-liked" | "most-commented"

interface PageProps {
  params: Promise<{ id: string }>
}

export default function NewsFeedPage({ params }: PageProps) {
  const { id: assistantId } = use(params)
  const [feeds, setFeeds] = useState<FeedPost[]>(INITIAL_FEEDS)
  const [expandedFeedId, setExpandedFeedId] = useState<string | null>(null)
  const [addFeedOpen, setAddFeedOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [sortBy, setSortBy] = useState<SortOption>("recent")
  
  // Set assistant mode in header (automatically handles fetching and cleanup)
  useSetAssistantMode(assistantId)

  const handleAddFeed = (newFeed: Omit<FeedPost, "id" | "author" | "timestamp" | "likes" | "comments">) => {
    const feed: FeedPost = {
      ...newFeed,
      id: Date.now().toString(),
      author: CURRENT_USER,
      timestamp: new Date(),
      likes: [],
      comments: [],
    }
    setFeeds([feed, ...feeds])
    setAddFeedOpen(false)
  }

  const handleToggleLike = (feedId: string) => {
    setFeeds(
      feeds.map((feed) => {
        if (feed.id === feedId) {
          const hasLiked = feed.likes.some((like) => like.userId === CURRENT_USER.id)
          if (hasLiked) {
            return {
              ...feed,
              likes: feed.likes.filter((like) => like.userId !== CURRENT_USER.id),
            }
          } else {
            return {
              ...feed,
              likes: [
                ...feed.likes,
                {
                  userId: CURRENT_USER.id,
                  userName: CURRENT_USER.name,
                  avatar: CURRENT_USER.avatar,
                },
              ],
            }
          }
        }
        return feed
      })
    )
  }

  const handleAddComment = (feedId: string, commentText: string) => {
    setFeeds(
      feeds.map((feed) => {
        if (feed.id === feedId) {
          const newComment = {
            id: Date.now().toString(),
            author: CURRENT_USER,
            text: commentText,
            timestamp: new Date(),
            likes: 0,
          }
          return {
            ...feed,
            comments: [...feed.comments, newComment],
          }
        }
        return feed
      })
    )
  }

  const handleDeleteFeed = (feedId: string) => {
    setFeeds(feeds.filter((feed) => feed.id !== feedId))
    setExpandedFeedId(null)
    toast.success("Post deleted successfully")
  }

  // Filter and sort feeds
  const filteredAndSortedFeeds = feeds
    .filter(
      (feed) =>
        feed.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        feed.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        feed.author.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      switch (sortBy) {
        case "most-liked":
          return b.likes.length - a.likes.length
        case "most-commented":
          return b.comments.length - a.comments.length
        case "recent":
        default:
          return b.timestamp.getTime() - a.timestamp.getTime()
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
          {filteredAndSortedFeeds.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-lg text-muted-foreground mb-4">
                {searchQuery ? "No posts found matching your search." : "No posts yet. Create the first post!"}
              </p>
              {!searchQuery && (
                <Button onClick={() => setAddFeedOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Post
                </Button>
              )}
            </div>
          ) : (
            filteredAndSortedFeeds.map((feed) => (
              <FeedCard
                key={feed.id}
                feed={feed}
                currentUser={CURRENT_USER}
                isExpanded={expandedFeedId === feed.id}
                onToggleExpand={() => setExpandedFeedId(expandedFeedId === feed.id ? null : feed.id)}
                onToggleLike={() => handleToggleLike(feed.id)}
                onAddComment={(text) => handleAddComment(feed.id, text)}
                onDelete={handleDeleteFeed}
              />
            ))
          )}
        </div>
      </div>

      {/* Add Feed Dialog */}
      <AddFeedDialog open={addFeedOpen} onOpenChange={setAddFeedOpen} onSubmit={handleAddFeed} />
    </div>
  )
}

