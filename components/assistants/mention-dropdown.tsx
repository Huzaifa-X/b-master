"use client"

import { useState, useEffect, useRef } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { Loader2 } from "lucide-react"

interface User {
  id: string
  name: string
  email: string
  image: string | null
}

interface MentionDropdownProps {
  users: User[]
  isLoading: boolean
  onSelect: (user: User) => void
  position: { top: number; left: number }
  selectedIndex: number
  onSelectedIndexChange: (index: number) => void
}

export function MentionDropdown({
  users,
  isLoading,
  onSelect,
  position,
  selectedIndex,
  onSelectedIndexChange,
}: MentionDropdownProps) {
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Scroll selected item into view
  useEffect(() => {
    if (dropdownRef.current) {
      const selectedElement = dropdownRef.current.children[selectedIndex] as HTMLElement
      if (selectedElement) {
        selectedElement.scrollIntoView({
          block: "nearest",
          behavior: "smooth",
        })
      }
    }
  }, [selectedIndex])

  if (isLoading) {
    return (
      <div
        className="fixed z-[9999] w-64 rounded-lg border border-border bg-background shadow-xl p-4"
        style={{
          top: `${position.top}px`,
          left: `${position.left}px`,
        }}
      >
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Loading users...</span>
        </div>
      </div>
    )
  }

  if (users.length === 0) {
    return (
      <div
        className="fixed z-[9999] w-64 rounded-lg border border-border bg-background shadow-xl p-4"
        style={{
          top: `${position.top}px`,
          left: `${position.left}px`,
        }}
      >
        <div className="text-sm text-muted-foreground text-center">
          No users found
        </div>
      </div>
    )
  }

  return (
    <div
      ref={dropdownRef}
      className="fixed z-[9999] w-64 rounded-lg border border-border bg-background shadow-xl overflow-hidden"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
        maxHeight: "240px",
        overflowY: "auto",
      }}
    >
      {users.map((user, index) => (
        <button
          key={user.id}
          onClick={() => onSelect(user)}
          onMouseEnter={() => onSelectedIndexChange(index)}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-muted transition-colors",
            selectedIndex === index && "bg-muted"
          )}
        >
          <Avatar className="h-8 w-8">
            <AvatarImage src={user.image || undefined} alt={user.name} />
            <AvatarFallback className="text-xs">
              {user.name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .toUpperCase()
                .slice(0, 2)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">{user.name}</div>
            <div className="text-xs text-muted-foreground truncate">
              {user.email}
            </div>
          </div>
        </button>
      ))}
    </div>
  )
}

