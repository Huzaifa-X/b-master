"use client"

import { useState, useMemo } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Search, Users, X, Check } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { PresignedAvatarImage } from "@/components/ui/presigned-avatar-image"
import { useAssistantContacts } from "@/hooks/useContacts"
import { useSession } from "next-auth/react"
import { useCreateGroupChat } from "@/hooks/use-assistant-group-chat"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { useLocale } from "@/lib/i18n"

interface CreateGroupDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  assistantId: string
  onGroupCreated?: (groupId: string) => void
}

export function CreateGroupDialog({
  open,
  onOpenChange,
  assistantId,
  onGroupCreated
}: CreateGroupDialogProps) {
  const { t } = useLocale()
  const [searchQuery, setSearchQuery] = useState("")
  const [groupName, setGroupName] = useState("")
  const [description, setDescription] = useState("")
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const { data: session } = useSession()
  const { contacts, isLoading } = useAssistantContacts(assistantId, { enabled: open })
  const createGroup = useCreateGroupChat(assistantId)

  // Filter out current user then search
  const filteredContacts = useMemo(() => {
    const withoutSelf = contacts.filter((c) => {
      const uid = c.userId || c.contactId
      return uid !== session?.user?.id
    })
    if (!searchQuery.trim()) return withoutSelf
    const q = searchQuery.toLowerCase()
    return withoutSelf.filter(
      (c) => c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q)
    )
  }, [contacts, session?.user?.id, searchQuery])

  const selectedContacts = useMemo(
    () => contacts.filter((c) => selectedIds.has(c.userId || c.contactId)),
    [contacts, selectedIds]
  )

  const toggleContact = (uid: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(uid)) next.delete(uid)
      else next.add(uid)
      return next
    })
  }

  const handleCreate = async () => {
    if (!groupName.trim()) {
      toast.error(t("group.enterGroupName"))
      return
    }
    if (selectedIds.size < 1) {
      toast.error(t("group.atLeastOneMember"))
      return
    }

    const result = await createGroup.mutateAsync({
      name: groupName.trim(),
      description: description.trim() || undefined,
      memberIds: [...selectedIds]
    })

    if (result.success && result.group) {
      toast.success(t("group.groupCreated", { name: result.group.name }))
      onGroupCreated?.(result.group.id)
      handleClose()
    } else {
      toast.error(result.error || t("group.failedToCreate"))
    }
  }

  const handleClose = () => {
    setGroupName("")
    setDescription("")
    setSearchQuery("")
    setSelectedIds(new Set())
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {t("group.newGroupChat")}
          </DialogTitle>
          <DialogDescription>
            {t("group.createDescription")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Group name */}
          <div className="space-y-1">
            <Label htmlFor="group-name">{t("group.groupNameLabel")}</Label>
            <Input
              id="group-name"
              placeholder={t("group.groupNamePlaceholder")}
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
            />
          </div>

          {/* Description (optional) */}
          <div className="space-y-1">
            <Label htmlFor="description">{t("group.groupDescriptionLabel")}</Label>
            <Input
              id="description"
              placeholder={t("group.groupDescriptionPlaceholder")}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Selected members chips */}
          {selectedContacts.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {selectedContacts.map((c) => {
                const uid = c.userId || c.contactId
                return (
                  <span
                    key={uid}
                    className="flex items-center gap-1 bg-primary/10 text-primary rounded-full px-2.5 py-0.5 text-xs font-medium"
                  >
                    {c.name}
                    <button
                      onClick={() => toggleContact(uid)}
                      className="ml-0.5 hover:text-destructive transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )
              })}
            </div>
          )}

          {/* Contact search */}
          <div className="space-y-2">
            <Label>{t("group.addMembers")}</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("group.searchContacts")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="max-h-[220px] overflow-y-auto space-y-0.5 border rounded-md py-1">
              {isLoading ? (
                <div className="text-center py-6">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">{t("group.loadingContacts")}</p>
                </div>
              ) : filteredContacts.length > 0 ? (
                filteredContacts.map((contact) => {
                  const uid = contact.userId || contact.contactId
                  const isSelected = selectedIds.has(uid)
                  return (
                    <button
                      key={contact.id}
                      onClick={() => toggleContact(uid)}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-muted",
                        isSelected && "bg-primary/5"
                      )}
                    >
                      <Avatar className="h-8 w-8 shrink-0">
                        <PresignedAvatarImage src={contact.avatar || ""} />
                        <AvatarFallback>{contact.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{contact.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{contact.email}</p>
                      </div>
                      {isSelected && <Check className="h-4 w-4 text-primary shrink-0" />}
                    </button>
                  )
                })
              ) : (
                <div className="text-center py-6">
                  <p className="text-xs text-muted-foreground">{t("group.noContactsFound")}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            {t("common.cancel")}
          </Button>
          <Button
            onClick={handleCreate}
            disabled={createGroup.isPending || !groupName.trim() || selectedIds.size < 1}
          >
            {createGroup.isPending ? t("group.creating") : t("group.createWithNMembers", { n: selectedIds.size + 1 })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
