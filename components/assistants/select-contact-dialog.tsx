"use client"

import { useState, useMemo } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Search, User } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { PresignedAvatarImage } from "@/components/ui/presigned-avatar-image"
import { useAssistantContacts } from "@/hooks/useContacts"
import { useSession } from "next-auth/react"
import { useLocale } from "@/lib/i18n"

interface SelectContactDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelectContact: (contactId: string, contactName: string) => void
  assistantId: string
}

export function SelectContactDialog({ open, onOpenChange, onSelectContact, assistantId }: SelectContactDialogProps) {
  const { t } = useLocale()
  const [searchQuery, setSearchQuery] = useState("")
  const { data: session } = useSession()
  const { contacts, isLoading } = useAssistantContacts(assistantId, { enabled: open })

  // Filter out current user from contacts
  const filteredContacts = useMemo(() => {
    // First, exclude the current user
    const contactsWithoutSelf = contacts.filter((contact) => {
      const userId = contact.userId || contact.contactId
      return userId !== session?.user?.id
    })

    // Then apply search filter if there's a query
    if (!searchQuery.trim()) return contactsWithoutSelf

    const query = searchQuery.toLowerCase()
    return contactsWithoutSelf.filter((contact) =>
      contact.name.toLowerCase().includes(query) ||
      contact.email.toLowerCase().includes(query)
    )
  }, [searchQuery, contacts, session?.user?.id])

  const handleSelect = (contact: typeof contacts[0]) => {
    // Use userId if available (for assistant contacts), otherwise use contactId
    const userId = contact.userId || contact.contactId
    onSelectContact(userId, contact.name)
    onOpenChange(false)
    setSearchQuery("")
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("contacts.newConversation")}</DialogTitle>
          <DialogDescription>
            {t("contacts.selectContactToStart")}
          </DialogDescription>
        </DialogHeader>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("contacts.searchContacts")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Contacts List */}
        <div className="max-h-[400px] overflow-y-auto space-y-1">
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">{t("contacts.loadingContacts")}</p>
            </div>
          ) : filteredContacts.length > 0 ? (
            filteredContacts.map((contact) => (
              <button
                key={contact.id}
                onClick={() => handleSelect(contact)}
                className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors text-left"
              >
                <Avatar className="h-10 w-10">
                  <PresignedAvatarImage 
                    src={contact.avatar || ""} 
                  />
                  <AvatarFallback>{contact.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{contact.name}</p>
                  <p className="text-sm text-muted-foreground truncate">{contact.email}</p>
                </div>
              </button>
            ))
          ) : (
            <div className="text-center py-8">
              <User className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">{t("contacts.noContactsFound")}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

