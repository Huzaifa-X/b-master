"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"
import { ExpandableContactCards } from "@/components/assistants/expandable-contact-cards"
import { useAllContacts, useInvalidateContacts } from "@/hooks/useContacts"

export default function ContactsPage() {
  // Fetch all contacts across all assistants
  const { contacts, isLoading: isLoadingContacts, refetch: refetchContacts } = useAllContacts()
  const { invalidateAllContacts } = useInvalidateContacts()
  const [searchQuery, setSearchQuery] = useState("")

  return (
    <div className="h-full overflow-y-auto">
      <div className="container mx-auto py-4 px-3 sm:px-4 max-w-4xl pb-16">
        {/* Header */}
        <div className="mb-6 md:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 md:mb-6">
            <div>
              <h1 className="text-xl sm:text-2xl font-medium mb-1 sm:mb-2">All Contacts</h1>
              <p className="text-sm text-muted-foreground">
                View all contacts across all your assistants
              </p>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-8">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search contacts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Expandable Contact Cards */}
        <ExpandableContactCards 
          searchQuery={searchQuery}
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