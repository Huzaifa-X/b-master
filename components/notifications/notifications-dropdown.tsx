"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Bell, X, Loader2, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { useUserNotifications, useUnreadCount, useMarkAsRead, useMarkAllAsRead } from "@/hooks/useNotifications"
import { useNotifications } from "@/context/notificationContext"
import { formatRelativeTime } from "@/lib/utils/date"
import { Notification } from "@/types/notification"
import { getNotificationUrl } from "@/lib/utils/notification-url"
import { useLocale } from "@/lib/i18n"

type FilterType = 'all' | 'unread'

export function NotificationsDropdown() {
  const router = useRouter()
  const { t, locale } = useLocale()
  const [isOpen, setIsOpen] = useState(false)
  const [filter, setFilter] = useState<FilterType>('all')
  
  // Get notifications from React Query
  const { data: notificationsData, isLoading: isLoadingNotifications } = useUserNotifications({
    page: 1,
    limit: 50,
    unreadOnly: filter === 'unread'
  })

  // Get unread count
  const { data: unreadCount = 0 } = useUnreadCount()

  // Mutations
  const markAsReadMutation = useMarkAsRead()
  const markAllAsReadMutation = useMarkAllAsRead()

  // Get notifications from context (for real-time updates)
  const { notifications: contextNotifications, setNotifications } = useNotifications()

  // Sync React Query data with context when it changes
  useEffect(() => {
    if (notificationsData?.records) {
      // Use a Map to deduplicate by ID
      const notificationsMap = new Map<string, Notification>();
      
      // Add query notifications first (source of truth from server)
      notificationsData.records.forEach(notif => {
        notificationsMap.set(notif.id, notif);
      });
      
      // Merge with context notifications (for real-time updates that might not be in query yet)
      contextNotifications.forEach(notif => {
        if (!notificationsMap.has(notif.id)) {
          notificationsMap.set(notif.id, notif);
        }
      });
      
      // Convert to array and sort by date (newest first)
      const merged = Array.from(notificationsMap.values()).sort((a, b) => {
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        return dateB - dateA;
      });
      
      setNotifications(merged);
    }
  }, [notificationsData, setNotifications])

  // Use context notifications as the source of truth (they're synced from React Query + Pusher)
  // Memoize to ensure stable references and prevent duplicate keys
  const notifications = useMemo(() => {
    const base = contextNotifications.length > 0 
      ? contextNotifications 
      : (notificationsData?.records || [])
    
    // Ensure unique IDs by using a Map (in case of any duplicates)
    const uniqueMap = new Map<string, Notification>();
    base.forEach(notif => {
      // Ensure ID is a string
      const id = String(notif.id);
      if (!uniqueMap.has(id)) {
        uniqueMap.set(id, notif);
      }
    });
    
    return Array.from(uniqueMap.values());
  }, [contextNotifications, notificationsData?.records])

  // Filter notifications based on selected filter
  const displayedNotifications = useMemo(() => {
    return filter === 'unread' 
      ? notifications.filter(n => !n.isRead)
      : notifications
  }, [notifications, filter])

  const handleMarkAsRead = async (notification: Notification) => {
    if (!notification.isRead) {
      try {
        await markAsReadMutation.mutateAsync(notification.id)
      } catch (error) {
        console.error('Failed to mark notification as read:', error)
      }
    }
  }

  const handleNotificationClick = (notification: Notification) => {
    // Navigate immediately — don't wait for the mark-as-read round-trip
    const url = getNotificationUrl(notification)
    if (url) {
      setIsOpen(false)
      router.push(url)
    }

    // Mark as read in the background (fire-and-forget)
    handleMarkAsRead(notification).catch((err) =>
      console.error('Failed to mark notification as read:', err)
    )
  }

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsReadMutation.mutateAsync()
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error)
    }
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="group/notification relative focus:!bg-transparent hover:!bg-transparent"
        >
          {isOpen ? (
            <X className="h-5 w-5 text-primary transition-all duration-300 ease-in-out group-hover/notification:scale-110 group-hover/notification:rotate-90" />
          ) : (
            <>
              <Bell className="h-5 w-5 text-primary transition-all duration-300 ease-in-out group-hover/notification:scale-110 group-hover/notification:rotate-12" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground transition-all duration-300 ease-in-out group-hover/notification:scale-110">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="end" 
        className="w-[calc(100vw-2rem)] sm:w-[360px] md:w-[380px] p-0 max-h-[70vh] sm:max-h-[75vh] md:max-h-[600px] overflow-hidden flex flex-col"
        sideOffset={8}
      >
        {/* Header */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b bg-background sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <h3 className="text-base sm:text-lg font-bold">{t("notifications.title")}</h3>
            <div className="flex items-center gap-2 sm:gap-4">
              <button
                onClick={() => setFilter('all')}
                className={cn(
                  "text-xs sm:text-sm font-medium transition-colors",
                  filter === 'all' 
                    ? "text-primary hover:underline" 
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {t("common.all")}
              </button>
              <button
                onClick={() => setFilter('unread')}
                className={cn(
                  "text-xs sm:text-sm font-medium transition-colors",
                  filter === 'unread' 
                    ? "text-primary hover:underline" 
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {t("notifications.unread")}
              </button>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  disabled={markAllAsReadMutation.isPending}
                  className="text-xs sm:text-sm font-medium text-primary hover:underline disabled:opacity-50"
                >
                  {markAllAsReadMutation.isPending ? t("notifications.markingAllRead") : t("notifications.markAllRead")}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Notifications list */}
        <div className="overflow-y-auto flex-1">
          {isLoadingNotifications ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : displayedNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 px-4">
              <Bell className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground text-center">
                {filter === 'unread' ? t("notifications.noUnreadNotifications") : t("notifications.noNotifications")}
              </p>
            </div>
          ) : (
            displayedNotifications.map((notification) => {
              const url = getNotificationUrl(notification)
              const isNavigable = !!url
              return (
                <div
                  key={notification.id}
                  className={cn(
                    "group relative px-4 sm:px-6 py-3 sm:py-4 hover:bg-muted/50 transition-all duration-200 border-b last:border-b-0",
                    isNavigable ? "cursor-pointer" : "cursor-default",
                    !notification.isRead && "bg-primary/5"
                  )}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex gap-3 items-start">
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className={cn(
                            "text-xs sm:text-sm text-foreground leading-relaxed line-clamp-2 sm:line-clamp-3",
                            isNavigable && "group-hover:text-primary transition-colors"
                          )}>
                            {notification.title}
                          </p>
                          {notification.message && (
                            <p className="text-xs sm:text-sm text-muted-foreground mt-1 whitespace-pre-wrap break-words">
                              {notification.message}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                          <span className="text-[10px] sm:text-xs text-muted-foreground whitespace-nowrap">
                            {formatRelativeTime(notification.createdAt, locale)}
                          </span>
                          {!notification.isRead && (
                            <div className="h-2 w-2 rounded-full bg-green-500 flex-shrink-0" />
                          )}
                          {isNavigable && (
                            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

