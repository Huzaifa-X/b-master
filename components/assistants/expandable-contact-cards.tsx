"use client"

import React, { useEffect, useId, useRef, useState } from "react"
import { AnimatePresence, motion } from "motion/react"
import { useOutsideClick } from "@/hooks/use-outside-click"
import { Button } from "@/components/ui/button"
import { User, MapPin, Briefcase, Mail, Search, Edit, Trash2, X, FileText } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { toast } from "sonner"
import { ContactDialog, type ContactFormData } from "./contact-dialog"

interface Contact {
    id: string
    name: string
    email: string
    description: string
    avatar: string
    gender: string
    role: "user" | "client" | "investor"
    address: string
}

const CONTACTS: Contact[] = [
    {
        id: "1",
        name: "John Doe",
        email: "john@example.com",
        description: "Senior marketing manager with 10+ years of experience in digital marketing and brand strategy.",
        avatar: "/bmaster-icon.png",
        gender: "Male",
        role: "client",
        address: "123 Main St, New York, NY 10001",
    },
    {
        id: "2",
        name: "Jane Smith",
        email: "jane@example.com",
        description: "Angel investor focusing on early-stage tech startups and SaaS companies.",
        avatar: "/bmaster-icon.png",
        gender: "Female",
        role: "investor",
        address: "456 Oak Ave, San Francisco, CA 94102",
    },
    {
        id: "3",
        name: "Mike Johnson",
        email: "mike@example.com",
        description: "Product designer passionate about creating intuitive user experiences.",
        avatar: "/bmaster-icon.png",
        gender: "Male",
        role: "user",
        address: "789 Pine Rd, Austin, TX 73301",
    },
    {
        id: "4",
        name: "Sarah Williams",
        email: "sarah@example.com",
        description: "E-commerce business owner looking to scale operations and improve customer experience.",
        avatar: "/bmaster-icon.png",
        gender: "Female",
        role: "client",
        address: "321 Elm St, Boston, MA 02101",
    },
    {
        id: "5",
        name: "David Brown",
        email: "david@example.com",
        description: "Venture capitalist with portfolio focused on AI and machine learning startups.",
        avatar: "/bmaster-icon.png",
        gender: "Male",
        role: "investor",
        address: "654 Maple Dr, Seattle, WA 98101",
    },
    {
        id: "6",
        name: "Emily Davis",
        email: "emily@example.com",
        description: "Freelance content writer specializing in technology and business topics.",
        avatar: "/bmaster-icon.png",
        gender: "Female",
        role: "user",
        address: "987 Cedar Ln, Miami, FL 33101",
    },
]

const getRoleBadgeColor = (role: string) => {
    switch (role) {
        case "client":
            return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
        case "investor":
            return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
        case "user":
            return "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400"
        default:
            return "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400"
    }
}

export function ExpandableContactCards({ searchQuery }: { searchQuery: string }) {
    const [active, setActive] = useState<Contact | null>(null)
    const [dialogOpen, setDialogOpen] = useState(false)
    const [editingContact, setEditingContact] = useState<ContactFormData | null>(null)
    const ref = useRef<HTMLDivElement>(null)
    const id = useId()

    const filteredContacts = CONTACTS.filter(
        (contact) =>
            contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            contact.email.toLowerCase().includes(searchQuery.toLowerCase())
    )

    useEffect(() => {
        function onKeyDown(event: KeyboardEvent) {
            if (event.key === "Escape") {
                setActive(null)
            }
        }

        if (active) {
            document.body.style.overflow = "hidden"
        } else {
            document.body.style.overflow = "auto"
        }

        window.addEventListener("keydown", onKeyDown)
        return () => window.removeEventListener("keydown", onKeyDown)
    }, [active])

    useOutsideClick(ref as React.RefObject<HTMLDivElement>, () => setActive(null))

    const handleEdit = () => {
        if (active) {
            setEditingContact(active as ContactFormData)
            setDialogOpen(true)
            setActive(null)
        }
    }

    const handleDelete = () => {
        toast.success("Contact deleted successfully")
        console.log("Delete contact:", active?.id)
        setActive(null)
    }

    const handleSaveContact = (contact: ContactFormData) => {
        console.log("Saved contact:", contact)
        // In production, this would call your API
    }

    return (
        <>
            <AnimatePresence>
                {active && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/20 h-full w-full z-[60]"
                    />
                )}
            </AnimatePresence>

            <AnimatePresence>
                {active ? (
                    <div className="fixed inset-0 grid place-items-center z-[70]">
                        <motion.div
                            layoutId={`card-${active.id}-${id}`}
                            ref={ref}
                            className="w-full max-w-[500px] h-full md:h-fit md:max-h-[90%] flex flex-col bg-white dark:bg-neutral-900 sm:rounded-3xl overflow-hidden shadow-2xl"
                        >
                            {/* Expanded Card Content */}
                            <div className="p-6">
                                <div className="flex flex-col items-center text-center mb-6">
                                    <motion.div layoutId={`avatar-${active.id}-${id}`} className="mb-4">
                                        <Avatar className="h-24 w-24">
                                            {/* <AvatarImage src={active.avatar} alt={active.name} /> */}
                                            <AvatarFallback>{active.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                                        </Avatar>
                                    </motion.div>

                                    <motion.h3
                                        layoutId={`name-${active.id}-${id}`}
                                        className="text-2xl font-bold text-neutral-800 dark:text-neutral-200 mb-2"
                                    >
                                        {active.name}
                                    </motion.h3>

                                    <motion.p
                                        layoutId={`email-${active.id}-${id}`}
                                        className="text-neutral-600 dark:text-neutral-400 mb-4"
                                    >
                                        {active.email}
                                    </motion.p>

                                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor(active.role)}`}>
                                        {active.role.charAt(0).toUpperCase() + active.role.slice(1)}
                                    </span>
                                </div>

                                {/* Description */}
                                {active.description && (
                                    <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg mb-4">
                                        <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                                        <div>
                                            <p className="text-xs text-muted-foreground mb-1">Description</p>
                                            <p className="text-sm">{active.description}</p>
                                        </div>
                                    </div>
                                )}

                                {/* Detailed Information */}
                                <div className="space-y-4">
                                    <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                                        <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                                        <div>
                                            <p className="text-xs text-muted-foreground">Gender</p>
                                            <p className="text-sm font-medium">{active.gender}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                                        <Briefcase className="h-5 w-5 text-muted-foreground mt-0.5" />
                                        <div>
                                            <p className="text-xs text-muted-foreground">Role</p>
                                            <p className="text-sm font-medium capitalize">{active.role}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                                        <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
                                        <div>
                                            <p className="text-xs text-muted-foreground">Email Address</p>
                                            <p className="text-sm font-medium">{active.email}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                                        <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                                        <div>
                                            <p className="text-xs text-muted-foreground">Address</p>
                                            <p className="text-sm font-medium">{active.address}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex justify-end gap-2 mt-6">
                                    <Button
                                        variant="outline"
                                        onClick={handleEdit}
                                        size="sm"
                                    >
                                        <Edit className="h-4 w-4" />
                                        Edit
                                    </Button>
                                    <Button
                                        variant="destructive"
                                        onClick={handleDelete}
                                        size="sm"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                        Delete
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={() => setActive(null)}
                                        size="sm"
                                        className="bg-transparent hover:bg-transparent hover:text-primary"
                                    >
                                        <X className="h-4 w-4" />
                                        Close
                                    </Button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                ) : null}
            </AnimatePresence>

            {/* Contact Cards Grid */}
            <ul className="grid grid-cols-1 sm:grid-cols-1 lg:grid-cols-2 gap-4">
                {filteredContacts.map((contact) => (
                    <motion.div
                        layoutId={`card-${contact.id}-${id}`}
                        key={contact.id}
                        onClick={() => setActive(contact)}
                        className="p-4 flex flex-col hover:bg-neutral-50 dark:hover:bg-neutral-800 rounded-xl cursor-pointer border border-border transition-colors"
                    >
                        <div className="flex items-center gap-4 mb-3">
                            <motion.div layoutId={`avatar-${contact.id}-${id}`}>
                                <Avatar className="h-12 w-12">
                                    {/* <AvatarImage src={contact.avatar} alt={contact.name} /> */}
                                    <AvatarFallback>{contact.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                                </Avatar>
                            </motion.div>
                            <div className="flex-1 min-w-0">
                                <motion.h3
                                    layoutId={`name-${contact.id}-${id}`}
                                    className="font-semibold text-neutral-800 dark:text-neutral-200 truncate"
                                >
                                    {contact.name}
                                </motion.h3>
                                <motion.p
                                    layoutId={`email-${contact.id}-${id}`}
                                    className="text-sm text-neutral-600 dark:text-neutral-400 truncate"
                                >
                                    {contact.email}
                                </motion.p>
                            </div>
                            <Button variant="outline" size="sm" className="bg-transparent hover:bg-transparent hover:text-primary">
                                View
                            </Button>
                        </div>
                    </motion.div>
                ))}
            </ul>

      {/* Empty State */}
      {filteredContacts.length === 0 && (
        <div className="text-center py-16">
          <Search className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">No contacts found</h3>
          <p className="text-sm text-muted-foreground">
            {searchQuery
              ? "Try searching with different keywords"
              : "No contacts available"}
          </p>
        </div>
      )}

      {/* Contact Dialog */}
      <ContactDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open)
          if (!open) setEditingContact(null)
        }}
        contact={editingContact}
        onSave={handleSaveContact}
      />
    </>
  )
}

