"use client"

import { useState } from "react"
import { Bell, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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

export function NotificationsDropdown() {
  const [notifications, setNotifications] = useState(dummyNotifications)
  const [isOpen, setIsOpen] = useState(false)
  const unreadCount = notifications.filter((n) => !n.isRead).length

  const markAsRead = (id: string) => {
    setNotifications(
      notifications.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    )
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
                  {unreadCount}
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
            <h3 className="text-base sm:text-lg font-bold">Notifications</h3>
            <div className="flex items-center gap-2 sm:gap-4">
              <button className="text-xs sm:text-sm font-medium text-primary hover:underline">
                All
              </button>
              <button className="text-xs sm:text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                Unread
              </button>
            </div>
          </div>
        </div>

        {/* Notifications list */}
        <div className="overflow-y-auto flex-1">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={cn(
                "group relative px-4 sm:px-6 py-3 sm:py-4 hover:bg-muted/50 cursor-pointer transition-all duration-200 border-b last:border-b-0",
                !notification.isRead && "bg-primary/5"
              )}
              onClick={() => markAsRead(notification.id)}
            >
              <div className="flex gap-3 items-start">
                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs sm:text-sm text-foreground leading-relaxed line-clamp-2 sm:line-clamp-3">
                        {notification.title.split(/\b(Best|Calliopee|Project Manager|bmaster Trading|Calliopee Project management)\b/).map((part, i) => 
                          ["Best", "Calliopee", "Project Manager", "bmaster Trading", "Calliopee Project management"].includes(part) ? (
                            <span key={i} className="font-semibold text-primary">{part}</span>
                          ) : (
                            <span key={i}>{part}</span>
                          )
                        )}
                      </p>
                      {notification.description && (
                        <p className="text-xs sm:text-sm text-muted-foreground mt-1 line-clamp-1">
                          {notification.description}
                        </p>
                      )}
                    </div>
                    <div className="flex items-start gap-1.5 sm:gap-2 flex-shrink-0">
                      <span className="text-[10px] sm:text-xs text-muted-foreground whitespace-nowrap">
                        {notification.timestamp}
                      </span>
                      {!notification.isRead && (
                        <div className="h-2 w-2 rounded-full bg-green-500 flex-shrink-0 mt-0.5" />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

