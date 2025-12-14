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
import { addContact, updateContact } from "@/app/actions/contact.action"
import { useAssistantContacts, useInvalidateContacts } from "@/hooks/useContacts"
import { useAssistantPermissions } from "@/hooks/usePermissions"

interface PageProps {
  params: Promise<{ id: string }>
}

export default function ContactsPage({ params }: PageProps) {
  const { id: assistantId } = use(params)
  
  // Set assistant mode in header (automatically handles fetching and cleanup)
  useSetAssistantMode(assistantId)
  
  // Fetch permissions
  const { permissions, isLoading: isLoadingPermissions } = useAssistantPermissions(assistantId)
  
  // Fetch contacts for this assistant
  const { contacts, isLoading: isLoadingContacts, refetch: refetchContacts } = useAssistantContacts(assistantId)
  const { invalidateAssistantContacts } = useInvalidateContacts()
  
  const [searchQuery, setSearchQuery] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  
  // Check if user can add/edit contacts (only owners/admins can add/edit)
  // Buyers and shared users should check their permissions, but for contacts management, only owners are allowed
  const canAddContacts = permissions?.isOwner ?? false

  const handleAddContact = () => {
    setDialogOpen(true)
  }

  const handleSaveNewContact = async (contact: ContactFormData) => {
    try {
      if (contact.id) {
        // Update existing contact
        const result = await updateContact({
          contactId: contact.id,
          role: contact.role,
          description: contact.description,
          telephone: contact.telephone,
          information: contact.information,
        })

        if (result.success) {
          toast.success("Contact updated successfully!")
          setDialogOpen(false)
          // Refresh the contacts list
          invalidateAssistantContacts(assistantId)
          refetchContacts()
        } else {
          toast.error(result.error || "Failed to update contact")
        }
      } else {
        // Add new contact
        if (!assistantId) {
          toast.error("Assistant ID is required")
          return
        }

        const result = await addContact({
          assistantId,
          email: contact.email,
          role: contact.role,
          description: contact.description,
          telephone: contact.telephone,
          information: contact.information,
        })

        if (result.success) {
    toast.success("Contact added successfully!")
          setDialogOpen(false)
          // Refresh the contacts list
          invalidateAssistantContacts(assistantId)
          refetchContacts()
        } else {
          toast.error(result.error || "Failed to add contact")
        }
      }
    } catch (error) {
      console.error("Error saving contact:", error)
      toast.error("An unexpected error occurred")
    }
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="container mx-auto py-4 px-3 sm:px-4 max-w-4xl pb-16">
        {/* Header */}
        <div className="mb-6 md:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 md:mb-6">
            <div>
              <h1 className="text-xl sm:text-2xl font-medium mb-1 sm:mb-2">All Contacts</h1>
              <p className="text-sm text-muted-foreground">
                Manage your contacts for your assistant
              </p>
            </div>
            {canAddContacts && (
              <Button 
                onClick={handleAddContact} 
                className="flex items-center justify-center gap-2 w-full sm:w-auto"
              >
                <Plus className="h-4 w-4" />
                <span>Add Contact</span>
              </Button>
            )}
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
          assistantId={assistantId}
          contacts={contacts}
          isLoading={isLoadingContacts}
          onContactDeleted={() => {
            invalidateAssistantContacts(assistantId)
            refetchContacts()
          }}
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

