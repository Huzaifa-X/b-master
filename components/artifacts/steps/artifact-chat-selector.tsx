"use client"

import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Loader2 } from "lucide-react"
import { ChatHistoryItem } from "@/types/chat"

interface ArtifactChatSelectorProps {
  chats: ChatHistoryItem[]
  loadingChats: boolean
  chatError: Error | null
  selectedChatId: string | null
  onChatSelect: (chatId: string | null) => void
}

import { useLocale } from "@/lib/i18n"

export function ArtifactChatSelector({
  chats,
  loadingChats,
  chatError,
  selectedChatId,
  onChatSelect,
}: ArtifactChatSelectorProps) {
  const { t } = useLocale()

  if (loadingChats) {
    return (
      <div className="space-y-2">
        <Label>{t("artifacts.selectChatContext")}</Label>
        <div className="flex items-center gap-2 p-3 border rounded-lg">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground">{t("artifacts.loadingChatHistory")}</span>
        </div>
      </div>
    )
  }

  if (chatError) {
    return (
      <div className="space-y-2">
        <Label>{t("artifacts.selectChatContext")}</Label>
        <div className="p-3 border rounded-lg border-destructive/50 bg-destructive/10">
          <p className="text-sm text-destructive">{t("artifacts.errors.failedToLoadChats")}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <Label htmlFor="chat-select">
        {t("artifacts.selectChatContext")}
      </Label>
      <p className="text-xs text-muted-foreground">
        {t("artifacts.chatContextDescription")}
      </p>
      <Select
        value={selectedChatId || "__none__"}
        onValueChange={(value) => {
          if (value === "__none__") {
            onChatSelect(null)
          } else {
            onChatSelect(value)
          }
        }}
      >
        <SelectTrigger id="chat-select" className="w-full">
          <SelectValue placeholder={t("artifacts.noChatSelected")} />
        </SelectTrigger>
        <SelectContent className="cursor-pointer">
          <SelectItem value="__none__" className="focus:bg-muted focus:text-foreground">{t("artifacts.noChatSelected")}</SelectItem>
          {chats.length === 0 ? (
            <SelectItem value="no-chats" disabled className="focus:bg-muted focus:text-foreground">
              {t("artifacts.noChatsAvailable")}
            </SelectItem>
          ) : (
            chats.map((chat) => (
              <SelectItem key={chat.id} value={chat.id} className="focus:bg-muted focus:text-foreground">
                <div className="flex flex-col gap-0.5">
                  <span className="font-medium text-sm">{chat.topic || t("artifacts.untitledChat")}</span>
                  {/* <span className="text-xs text-muted-foreground">{chat.timestamp}</span> */}
                </div>
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>
    </div>
  )
}

