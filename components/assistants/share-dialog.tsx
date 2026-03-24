"use client"

import { useState } from "react"
import { Copy, Share2, Check } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { useLocale } from "@/lib/i18n"

interface ShareDialogProps {
  shareableId: string
  chatTopic?: string
  trigger?: React.ReactNode
}

export function ShareDialog({ shareableId, chatTopic, trigger }: ShareDialogProps) {
  const { t } = useLocale()
  const [copied, setCopied] = useState(false)
  const [open, setOpen] = useState(false)

  const shareUrl = `${window.location.origin}/share/${shareableId}`

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      toast.success(t("chat.share.linkCopied"))
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      toast.error(t("chat.share.copyFailed"))
    }
  }

  const shareViaWebShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: chatTopic || t("chat.share.checkOut"),
          text: t("chat.share.checkOut"),
          url: shareUrl,
        })
      } catch (error) {
        // User cancelled or sharing not supported
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Share2 className="h-4 w-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("chat.share.title")}</DialogTitle>
          <DialogDescription>
            {t("chat.share.description")}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="share-url">{t("chat.share.shareLink")}</Label>
            <div className="flex space-x-2">
              <Input
                id="share-url"
                value={shareUrl}
                readOnly
                className="flex-1"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={copyToClipboard}
                className="shrink-0"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
