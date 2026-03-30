"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"
import { ExpandableContactCards } from "@/components/assistants/expandable-contact-cards"
import { useAllContacts, useInvalidateContacts } from "@/hooks/useContacts"
import { useLocale } from "@/lib/i18n"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export default function ContactsPage() {
  const { t } = useLocale()
  // Fetch all contacts across all assistants
  const { contacts, isLoading: isLoadingContacts, refetch: refetchContacts } = useAllContacts()
  const { invalidateAllContacts } = useInvalidateContacts()
  const [searchQuery, setSearchQuery] = useState("")
  const [roleFilter, setRoleFilter] = useState("all")

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

  return (
    <div className="h-full overflow-y-auto">
      <div className="container mx-auto py-4 px-3 sm:px-4 max-w-4xl pb-16">
        {/* Header */}
        <div className="mb-6 md:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 md:mb-6">
            <div>
              <h1 className="text-xl sm:text-2xl font-medium mb-1 sm:mb-2">{t("contacts.allContacts")}</h1>
              <p className="text-sm text-muted-foreground">
                {t("contacts.subtitle")}
              </p>
            </div>
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
          contacts={contacts}
          isLoading={isLoadingContacts}
          viewOnly={true}
          onContactDeleted={() => {
            invalidateAllContacts()
            refetchContacts()
          }}
        />
      </div>
    </div>
  )
}