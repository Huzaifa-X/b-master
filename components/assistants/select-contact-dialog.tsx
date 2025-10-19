"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Search, User } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"

interface Contact {
  id: string
  name: string
  email: string
  avatar: string
}

const CONTACTS: Contact[] = [
  { id: "1", name: "John Doe", email: "john@example.com", avatar: "/bmaster-icon.png" },
  { id: "2", name: "Jane Smith", email: "jane@example.com", avatar: "/bmaster-icon.png" },
  { id: "3", name: "Mike Johnson", email: "mike@example.com", avatar: "/bmaster-icon.png" },
  { id: "4", name: "Sarah Williams", email: "sarah@example.com", avatar: "/bmaster-icon.png" },
  { id: "5", name: "David Brown", email: "david@example.com", avatar: "/bmaster-icon.png" },
  { id: "6", name: "Emily Davis", email: "emily@example.com", avatar: "/bmaster-icon.png" },
]

interface SelectContactDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelectContact: (contactId: string, contactName: string) => void
}

export function SelectContactDialog({ open, onOpenChange, onSelectContact }: SelectContactDialogProps) {
  const [searchQuery, setSearchQuery] = useState("")

  const filteredContacts = CONTACTS.filter((contact) =>
    contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleSelect = (contact: Contact) => {
    onSelectContact(contact.id, contact.name)
    onOpenChange(false)
    setSearchQuery("")
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>New Conversation</DialogTitle>
          <DialogDescription>
            Select a contact to start a conversation
          </DialogDescription>
        </DialogHeader>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search contacts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Contacts List */}
        <div className="max-h-[400px] overflow-y-auto space-y-1">
          {filteredContacts.length > 0 ? (
            filteredContacts.map((contact) => (
              <button
                key={contact.id}
                onClick={() => handleSelect(contact)}
                className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors text-left"
              >
                <Avatar className="h-10 w-10">
                  {/* <AvatarImage src={contact.avatar} alt={contact.name} /> */}
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
              <p className="text-sm text-muted-foreground">No contacts found</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

