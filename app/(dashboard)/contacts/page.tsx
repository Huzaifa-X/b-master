"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, Plus } from "lucide-react"
import { ExpandableContactCards } from "@/components/assistants/expandable-contact-cards"
import { ContactDialog, type ContactFormData } from "@/components/assistants/contact-dialog"
import { toast } from "sonner"

export default function ContactsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)

  const handleAddContact = () => {
    setDialogOpen(true)
  }

  const handleSaveNewContact = (contact: ContactFormData) => {
    console.log("New contact:", contact)
    toast.success("Contact added successfully!")
    // In production, this would save to your backend
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
            <Button 
              onClick={handleAddContact} 
              className="flex items-center justify-center gap-2 w-full sm:w-auto"
            >
              <Plus className="h-4 w-4" />
              <span>Add Contact</span>
            </Button>
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
        <ExpandableContactCards searchQuery={searchQuery} />

        {/* Add Contact Dialog */}
        <ContactDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSave={handleSaveNewContact}
        />
      </div>
    </div>
  )
}