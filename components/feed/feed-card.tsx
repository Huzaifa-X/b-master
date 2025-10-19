"use client"

import { useState, useRef, useEffect } from "react"
import { Heart, MessageCircle, ChevronDown, ChevronUp, Send, Lock, Globe, Trash2, X } from "lucide-react"
import { AnimatePresence, motion } from "motion/react"
import { useOutsideClick } from "@/hooks/use-outside-click"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import type { FeedPost } from "@/app/(dashboard)/assistants/[id]/news/page"

interface FeedCardProps {
  feed: FeedPost
  currentUser: {
    id: string
    name: string
    avatar: string
  }
  isExpanded: boolean
  onToggleExpand: () => void
  onToggleLike: () => void
  onAddComment: (text: string) => void
  onDelete: (id: string) => void
}

function formatTimestamp(date: Date): string {
  const now = new Date()
  const diffInMs = now.getTime() - date.getTime()
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60))
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60))
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24))

  if (diffInMinutes < 1) return "Just now"
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`
  if (diffInHours < 24) return `${diffInHours}h ago`
  if (diffInDays === 1) return "Yesterday"
  if (diffInDays < 7) return `${diffInDays}d ago`
  
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

export function FeedCard({
  feed,
  currentUser,
  isExpanded,
  onToggleExpand,
  onToggleLike,
  onAddComment,
  onDelete,
}: FeedCardProps) {
  const [commentText, setCommentText] = useState("")
  const [isLikeAnimating, setIsLikeAnimating] = useState(false)
  const ref = useRef<HTMLDivElement>(null as any)

  const isLiked = feed.likes.some((like) => like.userId === currentUser.id)
  const likesCount = feed.likes.length
  const commentsCount = feed.comments.length

  const handleLikeClick = () => {
    setIsLikeAnimating(true)
    onToggleLike()
    setTimeout(() => setIsLikeAnimating(false), 300)
  }

  const handlePostComment = () => {
    if (commentText.trim()) {
      onAddComment(commentText.trim())
      setCommentText("")
    }
  }

  useOutsideClick(ref, () => {
    if (isExpanded) {
      onToggleExpand()
    }
  })

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && isExpanded) {
        onToggleExpand()
      }
    }

    if (isExpanded) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = "auto"
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [isExpanded, onToggleExpand])

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  const truncateContent = (content: string, maxLength: number = 150) => {
    if (content.length <= maxLength) return content
    return content.slice(0, maxLength) + "..."
  }

  return (
    <>
      <motion.div
        layoutId={`card-${feed.id}`}
        onClick={!isExpanded ? onToggleExpand : undefined}
        className={cn(
          "bg-card rounded-lg border shadow-sm transition-all duration-200",
          !isExpanded && "hover:shadow-md cursor-pointer"
        )}
      >
        {/* Card Header */}
        <div className="p-4">
          <div className="flex items-start gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={feed.author.avatar} />
              <AvatarFallback>{getInitials(feed.author.name)}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold text-sm">{feed.author.name}</p>
                <span className="text-xs text-muted-foreground">•</span>
                <p className="text-xs text-muted-foreground">{formatTimestamp(feed.timestamp)}</p>
                <span className="text-xs text-muted-foreground">•</span>
                <div
                  className={cn(
                    "flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
                    feed.privacy === "public"
                      ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                      : "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400"
                  )}
                >
                  {feed.privacy === "public" ? (
                    <>
                      <Globe className="h-3 w-3" />
                      <span>Public</span>
                    </>
                  ) : (
                    <>
                      <Lock className="h-3 w-3" />
                      <span>Private</span>
                    </>
                  )}
                </div>
              </div>
              <h3 className="font-bold text-lg mt-1">{feed.title}</h3>
            </div>
          </div>

          {/* Content */}
          <div className="mt-3">
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {truncateContent(feed.content)}
            </p>
            {feed.content.length > 150 && (
              <button className="text-primary text-sm font-medium mt-1 hover:underline">
                Read more
              </button>
            )}
          </div>

          {/* Image */}
          {feed.image && (
            <div className="mt-3">
              <img
                src={feed.image}
                alt="Post image"
                className="rounded-lg w-full object-cover max-h-48"
              />
            </div>
          )}
        </div>

        {/* Action Bar */}
        <div className="px-4 py-2 flex items-center gap-4 border-t">
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleLikeClick()
            }}
            className={cn(
              "flex items-center gap-1.5 text-sm font-medium transition-all",
              isLiked ? "text-red-500" : "text-muted-foreground hover:text-red-500",
              isLikeAnimating && "scale-110"
            )}
          >
            <Heart className={cn("h-4 w-4", isLiked && "fill-current")} />
            <span>{likesCount}</span>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              if (!isExpanded) onToggleExpand()
            }}
            className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
          >
            <MessageCircle className="h-4 w-4" />
            <span>{commentsCount}</span>
          </button>
          <div className="flex-1" />
          <button
            onClick={(e) => {
              e.stopPropagation()
              onToggleExpand()
            }}
            className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
          >
            <span>View Details</span>
            <ChevronDown className="h-4 w-4" />
          </button>
        </div>
      </motion.div>

      <AnimatePresence>
        {isExpanded && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/20 h-full w-full z-[60]"
            />
            <div className="fixed inset-0 grid place-items-center z-[70]">
              <motion.div
                layoutId={`card-${feed.id}`}
                ref={ref}
                className="w-full max-w-[900px] h-full md:h-fit md:max-h-[90%] flex flex-col bg-white dark:bg-neutral-900 sm:rounded-3xl overflow-hidden shadow-2xl"
              >
                {/* Expanded Header with Delete Button */}
                <div className="p-4 sm:p-6 border-b relative flex-shrink-0">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={feed.author.avatar} />
                      <AvatarFallback>{getInitials(feed.author.name)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0 pr-20">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-sm text-neutral-800 dark:text-neutral-200">{feed.author.name}</p>
                        <span className="text-xs text-neutral-600 dark:text-neutral-400">•</span>
                        <p className="text-xs text-neutral-600 dark:text-neutral-400">{formatTimestamp(feed.timestamp)}</p>
                        <span className="text-xs text-neutral-600 dark:text-neutral-400">•</span>
                        <div
                          className={cn(
                            "flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
                            feed.privacy === "public"
                              ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                              : "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400"
                          )}
                        >
                          {feed.privacy === "public" ? (
                            <>
                              <Globe className="h-3 w-3" />
                              <span>Public</span>
                            </>
                          ) : (
                            <>
                              <Lock className="h-3 w-3" />
                              <span>Private</span>
                            </>
                          )}
                        </div>
                      </div>
                      <h3 className="font-bold text-lg mt-1 text-neutral-800 dark:text-neutral-200">{feed.title}</h3>
                    </div>
                  </div>

                  {/* Close and Delete Buttons */}
                  <div className="absolute top-4 right-4 flex gap-2">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => onDelete(feed.id)}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      title="Delete Post"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={onToggleExpand}
                      className="bg-transparent hover:bg-transparent hover:text-primary"
                      title="Close"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Scrollable Content Area */}
                <div className="flex-1 overflow-y-auto">
                  {/* Full Content */}
                  <div className="p-4 sm:p-6">
                    <p className="text-sm text-neutral-600 dark:text-neutral-400 whitespace-pre-wrap">
                      {feed.content}
                    </p>

                    {/* Image */}
                    {feed.image && (
                      <div className="mt-4">
                        <img
                          src={feed.image}
                          alt="Post image"
                          className="rounded-lg w-full object-cover max-h-96"
                        />
                      </div>
                    )}
                  </div>

                  {/* Action Bar */}
                  <div className="px-4 sm:px-6 py-3 flex items-center gap-4 border-t border-b border-neutral-200 dark:border-neutral-800">
                    <button
                      onClick={handleLikeClick}
                      className={cn(
                        "flex items-center gap-1.5 text-sm font-medium transition-all",
                        isLiked ? "text-red-500" : "text-neutral-600 dark:text-neutral-400 hover:text-red-500",
                        isLikeAnimating && "scale-110"
                      )}
                    >
                      <Heart className={cn("h-4 w-4", isLiked && "fill-current")} />
                      <span>{likesCount} likes</span>
                    </button>
                    <button className="flex items-center gap-1.5 text-sm font-medium text-neutral-600 dark:text-neutral-400">
                      <MessageCircle className="h-4 w-4" />
                      <span>{commentsCount} comments</span>
                    </button>
                  </div>

                  {/* Likes Section */}
                  {likesCount > 0 && (
                    <div className="p-4 sm:p-6">
                      <p className="text-sm font-medium mb-3 text-neutral-800 dark:text-neutral-200">
                        {isLiked && likesCount === 1 && "You liked this"}
                        {isLiked && likesCount === 2 && "You and 1 other liked this"}
                        {isLiked && likesCount > 2 && `You and ${likesCount - 1} others liked this`}
                        {!isLiked && likesCount === 1 && "1 person liked this"}
                        {!isLiked && likesCount > 1 && `${likesCount} people liked this`}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {feed.likes.slice(0, 10).map((like) => (
                          <div key={like.userId} className="group relative">
                            <Avatar className="h-8 w-8 border-2 border-white dark:border-neutral-900">
                              <AvatarImage src={like.avatar} />
                              <AvatarFallback className="text-xs">{getInitials(like.userName)}</AvatarFallback>
                            </Avatar>
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-neutral-800 dark:bg-neutral-100 text-white dark:text-neutral-900 text-xs rounded shadow-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                              {like.userName}
                            </div>
                          </div>
                        ))}
                        {feed.likes.length > 10 && (
                          <div className="flex items-center justify-center h-8 w-8 rounded-full bg-neutral-100 dark:bg-neutral-800 text-xs font-medium text-neutral-700 dark:text-neutral-300">
                            +{feed.likes.length - 10}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <Separator className="border-neutral-200 dark:border-neutral-800" />

                  {/* Comments Section */}
                  <div className="p-4 sm:p-6 space-y-4">
                    <h4 className="font-semibold text-sm text-neutral-800 dark:text-neutral-200">
                      Comments {commentsCount > 0 && `(${commentsCount})`}
                    </h4>

                    {commentsCount === 0 ? (
                      <p className="text-sm text-neutral-600 dark:text-neutral-400 text-center py-4">
                        No comments yet. Be the first to comment!
                      </p>
                    ) : (
                      <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
                        {feed.comments.map((comment) => (
                          <div key={comment.id} className="flex gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={comment.author.avatar} />
                              <AvatarFallback className="text-xs">
                                {getInitials(comment.author.name)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="bg-neutral-100 dark:bg-neutral-800 rounded-lg p-3">
                                <p className="font-semibold text-sm text-neutral-800 dark:text-neutral-200">{comment.author.name}</p>
                                <p className="text-sm mt-1 text-neutral-700 dark:text-neutral-300">{comment.text}</p>
                              </div>
                              <div className="flex items-center gap-3 mt-1 px-3">
                                <span className="text-xs text-neutral-600 dark:text-neutral-400">
                                  {formatTimestamp(comment.timestamp)}
                                </span>
                                {comment.likes !== undefined && comment.likes > 0 && (
                                  <>
                                    <span className="text-xs text-neutral-600 dark:text-neutral-400">•</span>
                                    <button className="text-xs text-neutral-600 dark:text-neutral-400 hover:text-red-500 transition-colors flex items-center gap-1">
                                      <Heart className="h-3 w-3" />
                                      {comment.likes}
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Add Comment */}
                    <div className="flex gap-3 pt-2 border-t border-neutral-200 dark:border-neutral-800 mt-4">
                      <Avatar className="h-8 w-8 mt-2">
                        <AvatarImage src={currentUser.avatar} />
                        <AvatarFallback className="text-xs">{getInitials(currentUser.name)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 flex gap-2">
                        <Textarea
                          placeholder="Write a comment..."
                          value={commentText}
                          onChange={(e) => setCommentText(e.target.value)}
                          className="min-h-[45px] resize-none"
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault()
                              handlePostComment()
                            }
                          }}
                        />
                        <Button
                          size="icon"
                          onClick={handlePostComment}
                          disabled={!commentText.trim()}
                          className="h-[45px] w-[45px] shrink-0"
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </>
          
        )}
      </AnimatePresence>
    </>
  )
}

