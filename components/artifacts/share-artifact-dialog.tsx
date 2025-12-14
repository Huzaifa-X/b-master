"use client"

import { useState, useMemo } from "react"
import { useSession } from "next-auth/react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { User, Search, Loader2, Share2 } from "lucide-react"
import { useAssistantContacts } from "@/hooks/useContacts"
import { toast } from "sonner"
import { shareArtifact } from "@/app/actions/artifact.action"

interface Contact {
  id: string
  contactId: string
  userId?: string
  name: string
  email: string
  avatar: string
  description?: string
  role?: string
  telephone?: string
  information?: string
}

interface ShareArtifactDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  artifactId: string
  artifactName: string
  assistantId: string
}

export function ShareArtifactDialog({ 
  open, 
  onOpenChange, 
  artifactId, 
  artifactName,
  assistantId 
}: ShareArtifactDialogProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [isSharing, setIsSharing] = useState(false)
  const { data: session } = useSession()
  const { contacts, isLoading } = useAssistantContacts(assistantId, { enabled: open })

  // Filter out current user from contacts
  const filteredContacts = useMemo(() => {
    const contactsWithoutSelf = contacts.filter((contact) => {
      const userId = contact.userId || contact.contactId
      return userId !== session?.user?.id
    })

    if (!searchQuery.trim()) return contactsWithoutSelf

    const query = searchQuery.toLowerCase()
    return contactsWithoutSelf.filter((contact) =>
      contact.name.toLowerCase().includes(query) ||
      contact.email.toLowerCase().includes(query)
    )
  }, [searchQuery, contacts, session?.user?.id])

  const handleShare = async (contact: typeof contacts[0]) => {
    const userId = contact.userId || contact.contactId
    setIsSharing(true)

    try {
      const result = await shareArtifact({
        artifactId,
        artifactName,
        assistantId,
        recipientUserId: userId,
        recipientName: contact.name,
      })

      if (result.success) {
        toast.success(`Artifact shared with ${contact.name}!`)
        onOpenChange(false)
        setSearchQuery("")
      } else {
        toast.error(result.error || "Failed to share artifact")
      }
    } catch (error) {
      console.error("Error sharing artifact:", error)
      toast.error("Failed to share artifact. Please try again.")
    } finally {
      setIsSharing(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5 text-primary" />
            Share Artifact
          </DialogTitle>
          <DialogDescription>
            Share "{artifactName}" with users from this assistant
          </DialogDescription>
        </DialogHeader>

        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search contacts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Contacts List */}
        <ScrollArea className="h-[300px] rounded-md border">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredContacts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-6">
              <User className="h-12 w-12 text-muted-foreground mb-2" />
              <p className="text-sm font-medium">No contacts found</p>
              <p className="text-xs text-muted-foreground mt-1">
                {searchQuery ? "Try a different search" : "Add contacts to this assistant first"}
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {filteredContacts.map((contact) => {
                const userId = contact.userId || contact.contactId
                return (
                  <div
                    key={userId}
                    className="flex items-center justify-between p-3 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        {contact.avatar ? (
                          <img
                            src={contact.avatar}
                            alt={contact.name}
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          <User className="h-5 w-5 text-primary" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm truncate">{contact.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{contact.email}</p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleShare(contact)}
                      disabled={isSharing}
                      className="shrink-0"
                    >
                      {isSharing ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        "Share"
                      )}
                    </Button>
                  </div>
                )
              })}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}

