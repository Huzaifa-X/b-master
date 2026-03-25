"use client"

import { useState, useRef, useEffect } from "react"
import { Heart, MessageCircle, ChevronDown, ChevronUp, Send, Lock, Globe, Trash2, X, Loader2, FileText } from "lucide-react"
import { AnimatePresence, motion } from "motion/react"
import { useOutsideClick } from "@/hooks/use-outside-click"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { PresignedAvatarImage } from "@/components/ui/presigned-avatar-image"
import { PresignedImage } from "@/components/ui/presigned-image"
import { PresignedVideo } from "@/components/ui/presigned-video"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import { usePresignedImage } from "@/hooks/usePresignedImage"
import { useComments } from "@/hooks/use-newFeed"
import { useLocale } from "@/lib/i18n"

interface NewsFeedPost {
  id: string
  title: string | null
  content: string | null
  image: string | null
  isPublic: boolean
  likeCount: number
  commentCount: number
  createdAt: Date | string
  updatedAt: Date | string
  isLikedByCurrentUser: boolean
  user: {
    id: string
    name: string | null
    email: string | null
    image: string | null
  }
}

interface FeedCardProps {
  post: NewsFeedPost
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

type MediaKind = "image" | "video" | "pdf"

function getMediaType(url: string | null): MediaKind {
  if (!url) return "image"
  const path = url.toLowerCase().split("?")[0]
  const videoRegex = /\.(mp4|mov|webm|ogg|ogv|avi|mkv|3gp|m4v|flv|wmv|ts|m3u8)$|(\/video\/)|(video-artifact)/
  const pdfRegex = /\.(pdf)$|(\/pdf)/

  if (videoRegex.test(path)) return "video"
  if (pdfRegex.test(path)) return "pdf"
  return "image"
}

function MediaRenderer({ src, className }: { src: string; className?: string }) {
  const kind = getMediaType(src)
  // Only fetch presigned URL for PDFs here - videos and images handle it internally
  const presignedUrl = usePresignedImage(src, kind === "pdf")

  if (kind === "video") {
    // For videos: remove object-cover (we use object-contain in PresignedVideo)
    // Keep max-height constraints for proper sizing
    const videoClassName = className
      ?.replace("object-cover", "")
      .replace(/\s+/g, " ")
      .trim()
    return (
      <PresignedVideo
        src={src}
        className={videoClassName}
      />
    )
  }

  if (kind === "pdf") {
    const rawName = src.split("/").pop()?.split("?")[0] ?? "document.pdf"
    const fileName = decodeURIComponent(rawName)
    return (
      <a
        href={presignedUrl || "#"}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-3 p-3 border rounded-md bg-muted/30 hover:bg-muted/50 transition-colors"
      >
        <FileText className="h-8 w-8 text-muted-foreground shrink-0" />
        <span className="text-sm font-medium truncate">{fileName}</span>
      </a>
    )
  }

  return (
    <PresignedImage
      src={src}
      alt="Post media"
      className={cn("rounded-lg w-full object-cover", className)}
    />
  )
}

function formatTimestamp(date: Date, t: any): string {
  const now = new Date()
  const diffInMs = now.getTime() - date.getTime()
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60))
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60))
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24))

  if (diffInMinutes < 1) return t("feed.justNow")
  if (diffInMinutes < 60) return t("feed.minutesAgo", { n: diffInMinutes })
  if (diffInHours < 24) return t("feed.hoursAgo", { n: diffInHours })
  if (diffInDays === 1) return t("feed.yesterday")
  if (diffInDays < 7) return t("feed.daysAgo", { n: diffInDays })
  
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" })
}

export function FeedCard({
  post,
  currentUser,
  isExpanded,
  onToggleExpand,
  onToggleLike,
  onAddComment,
  onDelete,
}: FeedCardProps) {
  const { t } = useLocale()
  const [commentText, setCommentText] = useState("")
  const [isLikeAnimating, setIsLikeAnimating] = useState(false)
  const ref = useRef<HTMLDivElement>(null as any)

  const isLiked = post.isLikedByCurrentUser
  const likesCount = post.likeCount
  const commentsCount = post.commentCount

  // Use title and content directly from post (now properly typed as nullable)
  const title = post.title || undefined
  const content = post.content || ""

  // Fetch comments when expanded
  const { data: commentsData, isLoading: commentsLoading } = useComments(post.id, undefined)

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

  const getInitials = (name: string | null) => {
    if (!name) return "U"
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
        layoutId={`card-${post.id}`}
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
              <PresignedAvatarImage src={post.user.image || ""} />
              <AvatarFallback>{getInitials(post.user.name)}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold text-sm">{post.user.name || t("feed.unknownUser")}</p>
                <span className="text-xs text-muted-foreground">•</span>
                <p className="text-xs text-muted-foreground">{formatTimestamp(new Date(post.createdAt), t)}</p>
                <span className="text-xs text-muted-foreground">•</span>
                <div
                  className={cn(
                    "flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
                    post.isPublic
                      ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                      : "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400"
                  )}
                >
                  {post.isPublic ? (
                    <>
                      <Globe className="h-3 w-3" />
                      <span>{t("feed.public")}</span>
                    </>
                  ) : (
                    <>
                      <Lock className="h-3 w-3" />
                      <span>{t("feed.private")}</span>
                    </>
                  )}
                </div>
              </div>
              <h3 className="font-bold text-lg mt-1">{title || t("feed.title")}</h3>
            </div>
          </div>

          {/* Content */}
          <div className="mt-3">
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {truncateContent(content)}
            </p>
            {content.length > 150 && (
              <button className="text-primary text-sm font-medium mt-1 hover:underline">
                {t("feed.readMore")}
              </button>
            )}
          </div>

          {/* Media */}
          {post.image && (
            <div className="mt-3">
              <MediaRenderer src={post.image} className="rounded-lg w-full object-cover max-h-48" />
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
              if (!isExpanded) onToggleExpand()
            }}
            className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
          >
            <span>{t("feed.viewDetails")}</span>
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
              layoutId={`card-${post.id}`}
              ref={ref}
              className="w-full max-w-[900px] h-full md:h-fit md:max-h-[90%] flex flex-col bg-white dark:bg-neutral-900 sm:rounded-3xl overflow-hidden shadow-2xl"
            >
                {/* Expanded Header with Delete Button */}
                <div className="p-4 sm:p-6 border-b relative flex-shrink-0">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-10 w-10">
                      <PresignedAvatarImage src={post.user.image || ""} />
                      <AvatarFallback>{getInitials(post.user.name)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0 pr-20">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-sm text-neutral-800 dark:text-neutral-200">{post.user.name || t("feed.unknownUser")}</p>
                        <p className="text-xs text-neutral-600 dark:text-neutral-400">•</p>
                        <p className="text-xs text-neutral-600 dark:text-neutral-400">{formatTimestamp(new Date(post.createdAt), t)}</p>
                        <p className="text-xs text-neutral-600 dark:text-neutral-400">•</p>
                        <div
                          className={cn(
                            "flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
                            post.isPublic
                              ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                              : "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400"
                          )}
                        >
                          {post.isPublic ? (
                            <>
                              <Globe className="h-3 w-3" />
                              <span>{t("feed.public")}</span>
                            </>
                          ) : (
                            <>
                              <Lock className="h-3 w-3" />
                              <span>{t("feed.private")}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <h3 className="font-bold text-lg mt-1 text-neutral-800 dark:text-neutral-200">{title || t("feed.title")}</h3>
                    </div>
                  </div>

                  {/* Close and Delete Buttons */}
                  <div className="absolute top-4 right-4 flex gap-2">
                    {/* Only show delete button if current user is the post owner */}
                    {currentUser.id === post.user.id && (
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => onDelete(post.id)}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        title={t("feed.deletePost")}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={onToggleExpand}
                      className="bg-transparent hover:bg-transparent hover:text-primary"
                      title={t("feed.close")}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Scrollable Content Area */}
                <div className="flex-1 overflow-y-auto">
                  {/* Full Content */}
                  <div className="p-4 sm:p-6">
                    {title && (
                      <h3 className="font-bold text-xl mb-4 text-neutral-800 dark:text-neutral-200">{title}</h3>
                    )}
                    <p className="text-sm text-neutral-600 dark:text-neutral-400 whitespace-pre-wrap">
                      {content}
                    </p>

                    {/* Media */}
                    {post.image && (
                      <div className="mt-4">
                        <MediaRenderer src={post.image} className="rounded-lg w-full object-cover max-h-96" />
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
                      <span>{t("feed.likes", { n: likesCount })}</span>
                    </button>
                    <button className="flex items-center gap-1.5 text-sm font-medium text-neutral-600 dark:text-neutral-400">
                      <MessageCircle className="h-4 w-4" />
                      <span>{t("feed.comments", { n: commentsCount })}</span>
                    </button>
                  </div>

                  {/* Likes Section */}
                  {likesCount > 0 && (
                    <div className="p-4 sm:p-6">
                      <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
                        {isLiked && likesCount === 1 && t("feed.youLiked")}
                        {isLiked && likesCount === 2 && t("feed.youAndOneOtherLiked")}
                        {isLiked && likesCount > 2 && t("feed.youAndOthersLiked", { n: likesCount - 1 })}
                        {!isLiked && likesCount === 1 && t("feed.onePersonLiked")}
                        {!isLiked && likesCount > 1 && t("feed.peopleLiked", { n: likesCount })}
                      </p>
                    </div>
                  )}

                  <Separator className="border-neutral-200 dark:border-neutral-800" />

                  {/* Comments Section */}
                  <div className="p-4 sm:p-6 space-y-4">
                    <h4 className="font-semibold text-sm text-neutral-800 dark:text-neutral-200">
                      {t("feed.commentsHeader")} {commentsCount > 0 && `(${commentsCount})`}
                    </h4>

                    {commentsLoading ? (
                      <div className="text-center py-4">
                        <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2" />
                        <p className="text-sm text-neutral-600 dark:text-neutral-400">{t("feed.loadingComments")}</p>
                      </div>
                    ) : !commentsData || commentsData.length === 0 ? (
                      <p className="text-sm text-neutral-600 dark:text-neutral-400 text-center py-4">
                        {t("feed.noComments")}
                      </p>
                    ) : (
                      <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
                        {commentsData.map((comment: any) => (
                          <div key={comment.id} className="flex gap-3">
                            <Avatar className="h-8 w-8">
                              <PresignedAvatarImage src={comment.user?.image || ""} />
                              <AvatarFallback className="text-xs">
                                {getInitials(comment.user?.name || null)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="bg-neutral-100 dark:bg-neutral-800 rounded-lg p-3">
                                <p className="font-semibold text-sm text-neutral-800 dark:text-neutral-200">{comment.user?.name || t("feed.unknownUser")}</p>
                                <p className="text-sm mt-1 text-neutral-700 dark:text-neutral-300">{comment.comment}</p>
                              </div>
                              <div className="flex items-center gap-3 mt-1 px-3">
                                <span className="text-xs text-neutral-600 dark:text-neutral-400">
                                  {formatTimestamp(new Date(comment.createdAt), t)}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Add Comment */}
                    <div className="flex gap-3 pt-2 border-t border-neutral-200 dark:border-neutral-800 mt-4">
                      <Avatar className="h-8 w-8 mt-2">
                        <PresignedAvatarImage src={currentUser.avatar} />
                        <AvatarFallback className="text-xs">{getInitials(currentUser.name)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 flex gap-2">
                        <Textarea
                          placeholder={t("feed.writeComment")}
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