"use client"

import { useState } from "react"
import { Bell, Check, User } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { cn } from "@/lib/utils"

// Dummy notification data
const dummyNotifications = [
  {
    id: "1",
    type: "purchase",
    title: "Great news! Guylain has purchased your assistant",
    description: "Best . You've earned $10!",
    avatar: null,
    isRead: false,
    timestamp: "10 days ago",
    date: "Friday 10 Jan",
  },
  {
    id: "2",
    type: "purchase",
    title: "Great news! Guylain has purchased your assistant",
    description: "Calliopee . You've earned $0!",
    avatar: "/avatars/assistant-1.jpg",
    isRead: false,
    timestamp: "18 days ago",
    date: "Invalid Date",
  },
  {
    id: "3",
    type: "artifact",
    title: "Your artifact Calliopee Project management has been created successfully using Project Manager.",
    description: null,
    avatar: null,
    isRead: false,
    timestamp: "a month ago",
    date: "Invalid Date",
  },
  {
    id: "4",
    type: "assistant",
    title: "Your assistant Project Manager has been created and is now available.",
    description: null,
    avatar: "/avatars/assistant-2.jpg",
    isRead: false,
    timestamp: "a month ago",
    date: null,
  },
  {
    id: "5",
    type: "assistant",
    title: "Your assistant bmaster Trading has been created and is now available.",
    description: null,
    avatar: null,
    isRead: true,
    timestamp: "a month ago",
    date: "Tuesday 9 Dec",
  },
]

export function NotificationsSheet() {
  const [notifications, setNotifications] = useState(dummyNotifications)
  const unreadCount = notifications.filter((n) => !n.isRead).length

  const markAllAsRead = () => {
    setNotifications(notifications.map((n) => ({ ...n, isRead: true })))
  }

  const markAsRead = (id: string) => {
    setNotifications(
      notifications.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    )
  }

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative focus:!bg-transparent hover:!bg-transparent hover:text-black">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
              {unreadCount}
            </span>
          )}
          <span className="sr-only">Notifications</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:w-[540px] p-0 flex flex-col">
        <SheetHeader className="px-6 py-4 border-b">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <Bell className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <SheetTitle className="text-xl">Notifications</SheetTitle>
              <SheetDescription className="text-sm text-primary">
                {unreadCount} unread
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        {/* All tab */}
        <div className="border-b">
          <div className="px-6 py-3">
            <h3 className="text-sm font-semibold text-primary text-center">All</h3>
          </div>
        </div>

        {/* Notifications list */}
        <div className="flex-1 overflow-y-auto">
          {notifications.map((notification, index) => {
            const showDate = index === 0 || notifications[index - 1].date !== notification.date
            
            return (
              <div key={notification.id}>
                {/* Date header */}
                {showDate && notification.date && (
                  <div className="px-6 py-3 bg-muted/30">
                    <p className="text-sm text-muted-foreground font-medium">{notification.date}</p>
                  </div>
                )}

                {/* Notification item */}
                <div
                  className={cn(
                    "group relative px-6 py-4 hover:bg-muted/50 cursor-pointer transition-colors border-b",
                    !notification.isRead && "bg-primary/5"
                  )}
                  onClick={() => markAsRead(notification.id)}
                >
                  <div className="flex gap-3">
                    {/* Unread indicator */}
                    {!notification.isRead && (
                      <div className="flex-shrink-0 mt-1">
                        <div className="h-2 w-2 rounded-full bg-primary" />
                      </div>
                    )}
                    {notification.isRead && (
                      <div className="flex-shrink-0 mt-1">
                        <div className="h-2 w-2" />
                      </div>
                    )}

                    {/* Avatar */}
                    <Avatar className="h-10 w-10 flex-shrink-0">
                      <AvatarImage src={notification.avatar || undefined} />
                      <AvatarFallback className="bg-muted">
                        <User className="h-5 w-5 text-muted-foreground" />
                      </AvatarFallback>
                    </Avatar>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground leading-relaxed">
                        {notification.title.split(/\b(Best|Calliopee|Project Manager|bmaster Trading|Calliopee Project management)\b/).map((part, i) => 
                          ["Best", "Calliopee", "Project Manager", "bmaster Trading", "Calliopee Project management"].includes(part) ? (
                            <span key={i} className="font-semibold text-primary">{part}</span>
                          ) : (
                            <span key={i}>{part}</span>
                          )
                        )}
                        {notification.description && (
                          <span className="ml-1">{notification.description}</span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {notification.timestamp}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <div className="border-t px-6 py-4 bg-background">
          <Button
            variant="outline"
            className="w-full text-primary hover:text-primary"
            onClick={markAllAsRead}
            disabled={unreadCount === 0}
          >
            <Check className="h-4 w-4 mr-2" />
            Mark all as read
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}

