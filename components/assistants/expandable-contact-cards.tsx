"use client"

import React, { useEffect, useId, useRef, useState } from "react"
import { AnimatePresence, motion } from "motion/react"
import { useOutsideClick } from "@/hooks/use-outside-click"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { User, MapPin, Briefcase, Mail, Search, Edit, Trash2, X, FileText, Phone, FileCode, Newspaper, Loader2 } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { PresignedAvatarImage } from "@/components/ui/presigned-avatar-image"
import { toast } from "sonner"
import { ContactDialog, type ContactFormData } from "./contact-dialog"
import { useDeleteContact, useContactStatistics } from "@/hooks/useContacts"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface Contact {
    id: string
    contactId: string
    userId?: string // User ID
    name: string
    email: string
    description: string
    avatar: string
    gender: string
    role: "user" | "client" | "investor"
    address: string
    telephone?: string
    information?: string
    assistantName?: string
    assistantId?: string
}

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

interface ExpandableContactCardsProps {
    searchQuery: string
    assistantId?: string
    contacts?: Contact[]
    isLoading?: boolean
    onContactDeleted?: () => void
    viewOnly?: boolean
    canEdit?: boolean
}

export function ExpandableContactCards({ 
    searchQuery, 
    assistantId, 
    contacts = [],
    isLoading = false,
    onContactDeleted,
    viewOnly = false,
    canEdit = true,
}: ExpandableContactCardsProps) {
    const [active, setActive] = useState<Contact | null>(null)
    const [dialogOpen, setDialogOpen] = useState(false)
    const [editingContact, setEditingContact] = useState<ContactFormData | null>(null)
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const [contactToDelete, setContactToDelete] = useState<{ id: string; name: string } | null>(null)
    const ref = useRef<HTMLDivElement>(null)
    const id = useId()

    // Fetch contact statistics when viewing contact details (only for admin/owners)
    const { statistics, isLoading: isLoadingStats } = useContactStatistics(
        assistantId,
        active?.userId,
        { enabled: !!active && canEdit && !viewOnly }
    )

    // Delete contact mutation hook
    const { deleteContact: deleteContactMutation, isLoading: isDeleting } = useDeleteContact({
        assistantId: assistantId,
        onSuccess: () => {
            onContactDeleted?.()
            setDeleteDialogOpen(false)
            setContactToDelete(null)
        },
    })

    const filteredContacts = contacts.filter(
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
            setEditingContact({
                id: active.contactId,
                name: active.name,
                email: active.email,
                description: active.description,
                avatar: active.avatar,
                gender: active.gender,
                role: active.role,
                address: active.address,
                telephone: active.telephone,
                information: active.information,
            })
            setDialogOpen(true)
            setActive(null)
        }
    }

    const handleDeleteClick = () => {
        if (!active?.contactId) {
            toast.error("Contact ID is required")
            return
        }

        setContactToDelete({ id: active.contactId, name: active.name })
        setDeleteDialogOpen(true)
        setActive(null)
    }

    const handleDeleteConfirm = () => {
        if (!contactToDelete?.id) {
            toast.error("Contact ID is required")
            setDeleteDialogOpen(false)
            return
        }

        deleteContactMutation(contactToDelete.id)
    }

    const handleSaveContact = (contact: ContactFormData) => {
        console.log("Saved contact:", contact)
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
                            <div className="flex-1 overflow-y-auto">
                                <div className="p-4 sm:p-6">
                                    <div className="flex flex-col items-center text-center mb-6">
                                        <motion.div layoutId={`avatar-${active.id}-${id}`} className="mb-4">
                                            <Avatar className="h-24 w-24">
                                                <PresignedAvatarImage src={active.avatar || undefined} alt={active.name} />
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

                                        {!viewOnly && (
                                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor(active.role)}`}>
                                                {active.role.charAt(0).toUpperCase() + active.role.slice(1)}
                                            </span>
                                        )}
                                        {!viewOnly && active.assistantName && (
                                            <p className="text-xs text-muted-foreground mt-2">
                                                {viewOnly ? active.assistantName : `Assistant: ${active.assistantName}`}
                                            </p>
                                        )}
                                    </div>

                                    {/* Tabs for Admin/Owner - Show statistics */}
                                    {canEdit && !viewOnly && (
                                        <Tabs defaultValue="details" className="w-full mb-4">
                                            <TabsList className="grid w-full grid-cols-2">
                                                <TabsTrigger value="details">Details</TabsTrigger>
                                                <TabsTrigger value="activity">Activity</TabsTrigger>
                                            </TabsList>

                                            <TabsContent value="details" className="mt-4 space-y-4">
                                                {/* Description */}
                                                {active.description && active.description.trim() !== "" && (
                                                    <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                                                        <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                                                        <div className="flex-1">
                                                            <p className="text-xs text-muted-foreground mb-1">Description</p>
                                                            <p className="text-sm">{active.description}</p>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Contact Details */}
                                                {active.gender && active.gender.trim() !== "" && (
                                                    <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                                                        <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                                                        <div>
                                                            <p className="text-xs text-muted-foreground">Gender</p>
                                                            <p className="text-sm font-medium">{active.gender}</p>
                                                        </div>
                                                    </div>
                                                )}

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

                                                {active.address && active.address.trim() !== "" && (
                                                    <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                                                        <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                                                        <div>
                                                            <p className="text-xs text-muted-foreground">Address</p>
                                                            <p className="text-sm font-medium">{active.address}</p>
                                                        </div>
                                                    </div>
                                                )}

                                                {active.telephone && active.telephone.trim() !== "" && (
                                                    <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                                                        <Phone className="h-5 w-5 text-muted-foreground mt-0.5" />
                                                        <div>
                                                            <p className="text-xs text-muted-foreground">Telephone</p>
                                                            <p className="text-sm font-medium">{active.telephone}</p>
                                                        </div>
                                                    </div>
                                                )}

                                                {active.information && active.information.trim() !== "" && (
                                                    <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                                                        <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                                                        <div>
                                                            <p className="text-xs text-muted-foreground">Additional Information</p>
                                                            <p className="text-sm">{active.information}</p>
                                                        </div>
                                                    </div>
                                                )}
                                            </TabsContent>

                                            <TabsContent value="activity" className="mt-4">
                                                {isLoadingStats ? (
                                                    <div className="flex items-center justify-center py-8">
                                                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                                    </div>
                                                ) : statistics ? (
                                                    <div className="space-y-4">
                                                        {/* Artifacts Section */}
                                                        <div className="space-y-3">
                                                            <div className="flex items-center justify-between">
                                                                <div className="flex items-center gap-2">
                                                                    <FileCode className="h-5 w-5 text-primary" />
                                                                    <h4 className="font-semibold">Artifacts ({statistics.artifactCount})</h4>
                                                                </div>
                                                            </div>
                                                            
                                                            {statistics.artifacts.length > 0 ? (
                                                                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                                                                    {statistics.artifacts.map((artifact) => (
                                                                        <div 
                                                                            key={artifact.id} 
                                                                            className="p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
                                                                        >
                                                                            <div className="flex items-start justify-between gap-2">
                                                                                <div className="flex-1 min-w-0">
                                                                                    <p className="font-medium text-sm truncate">{artifact.name}</p>
                                                                                    {artifact.category && (
                                                                                        <p className="text-xs text-muted-foreground capitalize mt-0.5">
                                                                                            {artifact.category}
                                                                                        </p>
                                                                                    )}
                                                                                </div>
                                                                                <span className="text-xs text-muted-foreground whitespace-nowrap">
                                                                                    {new Date(artifact.createdAt).toLocaleDateString('en-US', { 
                                                                                        month: 'short', 
                                                                                        day: 'numeric' 
                                                                                    })}
                                                                                </span>
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            ) : (
                                                                <div className="text-center py-6 text-muted-foreground">
                                                                    <FileCode className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                                                    <p className="text-sm">No artifacts created yet</p>
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Divider */}
                                                        <div className="border-t" />

                                                        {/* News Feed Section */}
                                                        <div className="space-y-3">
                                                            <div className="flex items-center justify-between">
                                                                <div className="flex items-center gap-2">
                                                                    <Newspaper className="h-5 w-5 text-green-600 dark:text-green-400" />
                                                                    <h4 className="font-semibold">News Feed Posts ({statistics.newsfeedCount})</h4>
                                                                </div>
                                                            </div>
                                                            
                                                            {statistics.newsfeeds.length > 0 ? (
                                                                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                                                                    {statistics.newsfeeds.map((newsfeed) => (
                                                                        <div 
                                                                            key={newsfeed.id} 
                                                                            className="p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
                                                                        >
                                                                            <div className="space-y-1">
                                                                                <div className="flex items-start justify-between gap-2">
                                                                                    <p className="font-medium text-sm flex-1 line-clamp-1">{newsfeed.title}</p>
                                                                                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                                                                                        {new Date(newsfeed.createdAt).toLocaleDateString('en-US', { 
                                                                                            month: 'short', 
                                                                                            day: 'numeric' 
                                                                                        })}
                                                                                    </span>
                                                                                </div>
                                                                                {newsfeed.content && (
                                                                                    <p className="text-xs text-muted-foreground line-clamp-2">
                                                                                        {newsfeed.content}
                                                                                    </p>
                                                                                )}
                                                                                <div className="flex items-center gap-3 mt-2">
                                                                                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                                                                                        ❤️ {newsfeed.likeCount}
                                                                                    </span>
                                                                                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                                                                                        💬 {newsfeed.commentCount}
                                                                                    </span>
                                                                                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                                                                                        newsfeed.isPublic 
                                                                                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                                                                            : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                                                                                    }`}>
                                                                                        {newsfeed.isPublic ? 'Public' : 'Private'}
                                                                                    </span>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            ) : (
                                                                <div className="text-center py-6 text-muted-foreground">
                                                                    <Newspaper className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                                                    <p className="text-sm">No posts created yet</p>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="text-center py-8 text-muted-foreground">
                                                        <p className="text-sm">Unable to load activity data</p>
                                                    </div>
                                                )}
                                            </TabsContent>
                                        </Tabs>
                                    )}

                                    {/* Non-Admin View - Just show details */}
                                    {(!canEdit || viewOnly) && (
                                        <div className="space-y-4">
                                            {active.description && active.description.trim() !== "" && (
                                                <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                                                    <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                                                    <div className="flex-1">
                                                        <p className="text-xs text-muted-foreground mb-1">Description</p>
                                                        <p className="text-sm">{active.description}</p>
                                                    </div>
                                                </div>
                                            )}

                                            {!viewOnly && (
                                                <>
                                                    {active.gender && active.gender.trim() !== "" && (
                                                        <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                                                            <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                                                            <div>
                                                                <p className="text-xs text-muted-foreground">Gender</p>
                                                                <p className="text-sm font-medium">{active.gender}</p>
                                                            </div>
                                                        </div>
                                                    )}

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

                                                    {active.address && active.address.trim() !== "" && (
                                                        <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                                                            <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                                                            <div>
                                                                <p className="text-xs text-muted-foreground">Address</p>
                                                                <p className="text-sm font-medium">{active.address}</p>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {active.telephone && active.telephone.trim() !== "" && (
                                                        <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                                                            <Phone className="h-5 w-5 text-muted-foreground mt-0.5" />
                                                            <div>
                                                                <p className="text-xs text-muted-foreground">Telephone</p>
                                                                <p className="text-sm font-medium">{active.telephone}</p>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {active.information && active.information.trim() !== "" && (
                                                        <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                                                            <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                                                            <div>
                                                                <p className="text-xs text-muted-foreground">Additional Information</p>
                                                                <p className="text-sm">{active.information}</p>
                                                            </div>
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Action Buttons - Sticky at bottom */}
                            <div className="border-t bg-white dark:bg-neutral-900 p-4">
                                <div className="flex flex-col sm:flex-row justify-end gap-2">
                                    {!viewOnly && canEdit && (
                                        <>
                                            <Button
                                                variant="outline"
                                                onClick={handleEdit}
                                                size="sm"
                                                className="w-full sm:w-auto"
                                            >
                                                <Edit className="h-4 w-4 mr-2" />
                                                Edit
                                            </Button>
                                            <Button
                                                variant="destructive"
                                                onClick={handleDeleteClick}
                                                size="sm"
                                                className="w-full sm:w-auto"
                                            >
                                                <Trash2 className="h-4 w-4 mr-2" />
                                                Delete
                                            </Button>
                                        </>
                                    )}
                                    <Button
                                        variant="outline"
                                        onClick={() => setActive(null)}
                                        size="sm"
                                        className="w-full sm:w-auto bg-transparent hover:bg-transparent hover:text-primary"
                                    >
                                        <X className="h-4 w-4 mr-2" />
                                        Close
                                    </Button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                ) : null}
            </AnimatePresence>

            {/* Loading State */}
            {isLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-1 lg:grid-cols-2 gap-4">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="p-4 border border-border rounded-xl animate-pulse">
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 rounded-full bg-muted" />
                                <div className="flex-1 space-y-2">
                                    <div className="h-4 bg-muted rounded w-3/4" />
                                    <div className="h-3 bg-muted rounded w-1/2" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <>
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
                                            <PresignedAvatarImage src={contact.avatar || undefined} alt={contact.name} />
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
                    {filteredContacts.length === 0 && contacts.length === 0 && (
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

                    {/* No Results State */}
                    {contacts.length > 0 && filteredContacts.length === 0 && (
                        <div className="text-center py-16">
                            <Search className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                            <h3 className="text-lg font-semibold mb-2">No contacts found</h3>
                            <p className="text-sm text-muted-foreground">
                                Try searching with different keywords
                            </p>
                        </div>
                    )}
                </>
            )}

            {/* Contact Dialog */}
            <ContactDialog
                open={dialogOpen}
                onOpenChange={(open) => {
                    setDialogOpen(open)
                    if (!open) setEditingContact(null)
                }}
                contact={editingContact}
                assistantId={assistantId}
                onSave={handleSaveContact}
            />

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Contact</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete {contactToDelete?.name} from your contacts? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteConfirm}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            disabled={isDeleting}
                        >
                            {isDeleting ? "Deleting..." : "Delete"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}