"use client"

import { File, Link2, ExternalLink } from "lucide-react"
import { format } from "date-fns"

/** Build a server-proxy URL so the browser never hits S3 directly */
function toProxyUrl(url: string | null | undefined): string | null {
  if (!url) return null
  // Already a proxy or relative URL — use as-is
  if (url.startsWith("/") || url.includes("/api/attachments")) return url
  // External non-S3 URLs (e.g. user-pasted links) — use directly
  const isS3 = url.includes("amazonaws.com") || url.includes("s3.")
  if (!isS3) return url
  return `/api/attachments?url=${encodeURIComponent(url)}`
}

interface MessageBubbleProps {
  message: string
  messageType: string
  attachmentUrl?: string | null
  attachmentName?: string | null
  createdAt: string
  isOwn: boolean
  /** Optional sender name shown above bubble (for group chats) */
  senderName?: string | null
}

const IMAGE_EXTENSIONS = /\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)$/i

function isImageAttachment(messageType: string, name?: string | null): boolean {
  return messageType === "image" || (!!name && IMAGE_EXTENSIONS.test(name))
}

function isUrlMessage(messageType: string): boolean {
  return messageType === "url"
}

/** Convert plain text URLs to clickable anchors */
function linkifyText(text: string, isOwn: boolean) {
  const urlRegex = /(https?:\/\/[^\s]+)/g
  const parts = text.split(urlRegex)
  return parts.map((part, i) => {
    if (urlRegex.test(part)) {
      // reset lastIndex after test()
      urlRegex.lastIndex = 0
      return (
        <a
          key={i}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className={`underline hover:opacity-80 break-all ${
            isOwn ? "text-primary-foreground" : "text-primary"
          }`}
        >
          {part}
        </a>
      )
    }
    return <span key={i}>{part}</span>
  })
}

export function MessageBubble({
  message,
  messageType,
  attachmentUrl,
  attachmentName,
  createdAt,
  isOwn,
  senderName
}: MessageBubbleProps) {
  const isImage = isImageAttachment(messageType, attachmentName)
  const isUrl = isUrlMessage(messageType)

  // Route S3 attachments through our server proxy (browser never hits S3 directly)
  const resolvedAttachmentUrl = isUrl ? attachmentUrl : toProxyUrl(attachmentUrl)

  return (
    <div className="max-w-[70%]">
      {senderName && (
        <p className="text-xs text-muted-foreground mb-0.5 ml-1">{senderName}</p>
      )}

      <div
        className={`rounded-2xl px-4 py-2 ${
          isOwn ? "bg-primary text-primary-foreground" : "bg-muted"
        }`}
      >
        {/* ── Image attachment ── */}
        {isImage && resolvedAttachmentUrl && (
          <div className="mb-2">
            <a
              href={resolvedAttachmentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block rounded-lg overflow-hidden"
            >
              <img
                src={resolvedAttachmentUrl}
                alt={attachmentName ?? "Image"}
                className="max-w-full h-auto max-h-[320px] object-contain rounded-lg"
                loading="lazy"
              />
            </a>
          </div>
        )}

        {/* ── URL card ── */}
        {isUrl && attachmentUrl && (
          <a
            href={attachmentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`flex items-start gap-2 mb-2 p-2 rounded-lg border text-sm transition-opacity hover:opacity-80 ${
              isOwn
                ? "border-primary-foreground/30 bg-primary-foreground/10"
                : "border-border bg-background"
            }`}
          >
            <Link2
              className={`h-4 w-4 shrink-0 mt-0.5 ${
                isOwn ? "text-primary-foreground/70" : "text-primary"
              }`}
            />
            <span
              className={`flex-1 break-all underline text-xs ${
                isOwn ? "text-primary-foreground/90" : "text-primary"
              }`}
            >
              {attachmentUrl}
            </span>
            <ExternalLink
              className={`h-3.5 w-3.5 shrink-0 mt-0.5 ${
                isOwn ? "text-primary-foreground/50" : "text-muted-foreground"
              }`}
            />
          </a>
        )}

        {/* ── File attachment (non-image) ── */}
        {resolvedAttachmentUrl && !isImage && !isUrl && (
          <a
            href={resolvedAttachmentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`flex items-center gap-2 mb-2 p-2 rounded-lg border text-sm transition-opacity hover:opacity-80 ${
              isOwn
                ? "border-primary-foreground/30 bg-primary-foreground/10"
                : "border-border bg-background"
            }`}
          >
            <File
              className={`h-4 w-4 shrink-0 ${
                isOwn ? "text-primary-foreground/70" : "text-primary"
              }`}
            />
            <span
              className={`flex-1 truncate underline text-xs ${
                isOwn ? "text-primary-foreground/90" : "text-primary"
              }`}
            >
              {attachmentName ?? "Download File"}
            </span>
          </a>
        )}

        {/* ── Text message ── */}
        {message && (
          <p className="text-sm whitespace-pre-wrap break-words">
            {linkifyText(message, isOwn)}
          </p>
        )}

        {/* ── Timestamp ── */}
        <p
          className={`text-xs mt-1 ${
            isOwn ? "text-primary-foreground/70" : "text-muted-foreground"
          }`}
        >
          {format(new Date(createdAt), "HH:mm")}
        </p>
      </div>
    </div>
  )
}
