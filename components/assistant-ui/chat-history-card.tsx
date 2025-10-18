"use client"

import { ArchiveIcon, MoreVertical, Pencil, Trash2 } from "lucide-react"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useIsMobile } from "@/hooks/use-mobile"

export interface ChatHistoryItem {
  id: string
  title: string
  timestamp: string
  messageCount?: number
}

interface ChatHistoryCardProps {
  chat: ChatHistoryItem
  onSelect?: (chatId: string) => void
  onRename?: (chatId: string) => void
  onArchive?: (chatId: string) => void
  onDelete?: (chatId: string) => void
  className?: string
}

export function ChatHistoryCard({
  chat,
  onSelect,
  onRename,
  onArchive,
  onDelete,
  className,
}: ChatHistoryCardProps) {
  const isMobile = useIsMobile()

  const handleSelect = () => {
    onSelect?.(chat.id)
  }

  const handleRename = (e: React.MouseEvent) => {
    e.stopPropagation()
    onRename?.(chat.id)
  }

  const handleArchive = (e: React.MouseEvent) => {
    e.stopPropagation()
    onArchive?.(chat.id)
  }

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    onDelete?.(chat.id)
  }

  return (
    <Card
      className={cn(
        "group relative cursor-pointer transition-all duration-200 bg-transparent hover:border-primary/50",
        className
      )}
      onClick={handleSelect}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base line-clamp-1 mb-1">
                {chat.title}
              </CardTitle>
              <CardDescription className="text-xs">
                {chat.timestamp}
              </CardDescription>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground transition-colors hover:bg-transparent"
              >
                <MoreVertical className="h-4 w-4" />
                <span className="sr-only">Open menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent 
              align="end" 
              className="w-48 rounded-lg"
              side="bottom"
            >
              <DropdownMenuItem
                onClick={handleRename}
                className="text-muted-foreground focus:!text-muted-foreground focus:!bg-muted"
              >
                <Pencil className="text-muted-foreground focus:!text-muted-foreground focus:!bg-muted" />
                <span>Rename</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleArchive}
                className="text-muted-foreground focus:!text-muted-foreground focus:!bg-muted"
              >
                <ArchiveIcon className="text-muted-foreground focus:!text-muted-foreground focus:!bg-muted" />
                <span>Archive</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={handleDelete}
                className="text-destructive focus:!text-destructive focus:!bg-destructive/10"
              >
                <Trash2 className="text-destructive focus:!text-destructive focus:!bg-destructive/10" />
                <span>Delete</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
    </Card>
  )
}

