"use client"

import { use } from "react"
import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, Plus } from "lucide-react"
import { ExpandableContactCards } from "@/components/assistants/expandable-contact-cards"
import { ContactDialog, type ContactFormData } from "@/components/assistants/contact-dialog"
import { toast } from "sonner"
import { useSetAssistantMode } from "@/hooks/useAssistant"
import { useAssistantContacts, useAddContact, useUpdateContact } from "@/hooks/useContacts"
import { useAssistantPermissions } from "@/hooks/usePermissions"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { useLocale } from "@/lib/i18n"

interface PageProps {
  params: Promise<{ id: string }>
}

export default function ContactsPage({ params }: PageProps) {
  const { id: assistantId } = use(params)
  const { t } = useLocale()

  // Set assistant mode in header (automatically handles fetching and cleanup)
  useSetAssistantMode(assistantId)

  // Fetch permissions
  const { permissions, isLoading: isLoadingPermissions } = useAssistantPermissions(assistantId)

  // Fetch contacts for this assistant
  const { contacts, isLoading: isLoadingContacts } = useAssistantContacts(assistantId)

  // Contact mutations
  const { addContactAsync, isAdding } = useAddContact({
    assistantId,
    onSuccess: () => setDialogOpen(false)
  })
  const { updateContactAsync, isUpdating } = useUpdateContact({
    assistantId,
    onSuccess: () => setDialogOpen(false)
  })

  const [searchQuery, setSearchQuery] = useState("")
  const [roleFilter, setRoleFilter] = useState("all")
  const [dialogOpen, setDialogOpen] = useState(false)

  const PREDEFINED_ROLES = [
    "user",
    "client",
    "prospect",
    "investor",
    "colleague",
    "associate",
    "coworker",
    "other",
  ]

  // Check if user can add/edit contacts (only owners/admins can add/edit)
  // Buyers and shared users should check their permissions, but for contacts management, only owners are allowed
  const canAddContacts = permissions?.isOwner ?? false

  const handleAddContact = () => {
    setDialogOpen(true)
  }

  const handleSaveNewContact = async (contact: ContactFormData) => {
    if (contact.id) {
      // Update existing contact
      await updateContactAsync({
        contactId: contact.id,
        role: contact.role,
        description: contact.description,
        telephone: contact.telephone,
        information: contact.information,
      })
    } else {
      // Add new contact
      if (!assistantId) {
        toast.error("Assistant ID is required")
        return
      }

      await addContactAsync({
        assistantId,
        email: contact.email,
        role: contact.role,
        description: contact.description,
        telephone: contact.telephone,
        information: contact.information,
      })
    }
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="container mx-auto py-4 px-3 sm:px-4 max-w-4xl pb-16">
        {/* Header */}
        <div className="mb-6 md:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 md:mb-6">
            <div>
              <h1 className="text-xl sm:text-2xl font-medium mb-1 sm:mb-2">{t("contacts.allContacts")}</h1>
              <p className="text-sm text-muted-foreground">
                {t("contacts.noContactsDescription")}
              </p>
            </div>
            {canAddContacts && (
              <Button
                onClick={handleAddContact}
                className="flex items-center justify-center gap-2 w-full sm:w-auto"
              >
                <Plus className="h-4 w-4" />
                <span>{t("contacts.addContact")}</span>
              </Button>
            )}
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="mb-8 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("contacts.searchContacts")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-10"
            />
          </div>
          <div className="w-full sm:w-[180px]">
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="h-10">
                <SelectValue placeholder={t("contacts.role")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("common.all")}</SelectItem>
                {PREDEFINED_ROLES.map((role) => (
                  <SelectItem key={role} value={role}>
                    {t(`contacts.roles.${role}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Expandable Contact Cards */}
        <ExpandableContactCards
          searchQuery={searchQuery}
          roleFilter={roleFilter}
          assistantId={assistantId}
          contacts={contacts}
          isLoading={isLoadingContacts}
          onContactDeleted={() => { }}
          canEdit={canAddContacts}
        />

        {/* Add Contact Dialog */}
        <ContactDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSave={handleSaveNewContact}
          assistantId={assistantId}
        />
      </div>
    </div>
  )
}

