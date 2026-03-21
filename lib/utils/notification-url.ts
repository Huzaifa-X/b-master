import { Notification } from "@/types/notification"

/**
 * Returns the destination URL for a notification, or null if not navigable.
 */
export function getNotificationUrl(notification: Notification): string | null {
  const { type, relatedId, relatedType, data } = notification

  switch (type) {
    // ── Assistant notifications ──────────────────────────────────────
    case "assistant_created":
    case "assistant_purchased":
    case "assistant_sold":
    case "assistant_shared":
    case "assistant_refund":
    case "assistant_refund_seller":
      if (relatedId) return `/assistants/${relatedId}`
      return null

    // ── Artifact notifications ───────────────────────────────────────
    case "artifact_created":
    case "artifact_updated":
    case "artifact_permission_granted": {
      const assistantId = data?.assistantId
      if (assistantId && relatedId) {
        return `/assistants/${assistantId}/artifacts/${relatedId}`
      }
      if (assistantId) return `/assistants/${assistantId}/artifacts`
      return null
    }

    case "artifact_permission_removed":
    case "artifact_deleted": {
      const assistantId = data?.assistantId
      if (assistantId) return `/assistants/${assistantId}/artifacts`
      return null
    }

    // ── Chat notifications ───────────────────────────────────────────
    case "chat_message": {
      // relatedId is the chatId; data.assistantId is the assistant
      const assistantId = data?.assistantId
      const chatId = relatedId || data?.chatId
      if (assistantId && chatId) return `/assistants/${assistantId}/${chatId}`
      return null
    }

    case "group_message": {
      const assistantId = data?.assistantId
      if (assistantId) return `/assistants/${assistantId}/messenger`
      return null
    }

    // ── Comment notifications ────────────────────────────────────────
    case "comment_added": {
      // relatedType hint: 'assistant' | 'artifact' etc.
      if (relatedType === "artifact" && data?.assistantId && relatedId) {
        return `/assistants/${data.assistantId}/artifacts/${relatedId}`
      }
      if (relatedType === "assistant" && relatedId) {
        return `/assistants/${relatedId}`
      }
      if (data?.assistantId) return `/assistants/${data.assistantId}`
      return null
    }

    // ── Subscription notifications ───────────────────────────────────
    case "subscription_purchased":
      return `/pricing`

    // ── News Feed notifications ──────────────────────────────────────
    case "news_feed_post": {
      const assistantId = data?.assistantId || relatedId
      if (assistantId) return `/assistants/${assistantId}/news`
      return null
    }

    // ── Generic / welcome ────────────────────────────────────────────
    case "welcome_notification":
    case "notification":
    default:
      return null
  }
}
