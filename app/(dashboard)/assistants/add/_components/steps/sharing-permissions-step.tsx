"use client"

import { useEffect, useState } from "react"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { SharingPermissionsStepProps, SharedUser, PermissionType } from "@/types/assistant"
import { cn } from "@/lib/utils"
import { Lock, Globe, Check, Plus, X, User } from "lucide-react"
import { toast } from "sonner"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { getAvailableContacts } from "@/app/actions/user.action"
import { UserContact } from "@/types/user"



const PERMISSION_OPTIONS = [
  {
    value: "private" as const,
    icon: Lock,
    title: "Private",
    description: "You and selected users can access",
  },
  {
    value: "public" as const,
    icon: Globe,
    title: "Public",
    description: "Available in BMaster Store for everyone",
  },
]

// Mock contacts list - replace with actual data from your system
const AVAILABLE_CONTACTS = [
  { id: "1", name: "John Doe", email: "john@example.com" },
  { id: "2", name: "Jane Smith", email: "jane@example.com" },
  { id: "3", name: "Mike Johnson", email: "mike@example.com" },
  { id: "4", name: "Sarah Williams", email: "sarah@example.com" },
  { id: "5", name: "David Brown", email: "david@example.com" },
]

export function SharingPermissionsStep({
  formData,
  updateFormData,
}: SharingPermissionsStepProps) {
  const [availableContacts, setAvailableContacts] = useState<UserContact[]>([])

  useEffect(() => {
    getAvailableContacts().then(setAvailableContacts)
  }, [])

  const availableContactsNotAdded = availableContacts.filter(
    (contact) => !formData.sharedUsers.some((user: SharedUser) => user.id === contact.id)
  )

  const handleSelectContact = (contactId: string) => {
    if (!contactId || contactId === "none") return

    const contact = availableContacts.find((c) => c.id === contactId)
    if (!contact) return

    // Check if user already added
    if (formData.sharedUsers.some((u: SharedUser) => u.id === contact.id)) {
      toast.error("This user is already added")
      return
    }

    const newUser = {
      id: contact.id,
      name: contact.name || "",
      email: contact.email,
      permissions: {
        chat: true,
        contact: true,
        messenger: true,
        artifact: true,
        newsFeed: true,
      },
    }

    updateFormData({
      sharedUsers: [...formData.sharedUsers, newUser as SharedUser],
    })

    toast.success("User added successfully")
  }

  const removeUser = (userId: string) => {
    updateFormData({
      sharedUsers: formData.sharedUsers.filter((user: SharedUser) => user.id !== userId),
    })
    toast.success("User removed")
  }

  const updateUserPermission = (
    userId: string,
    permission: PermissionType,
    value: boolean
  ) => {
    updateFormData({
      sharedUsers: formData.sharedUsers.map((user: SharedUser) =>
        user.id === userId
          ? {
              ...user,
              permissions: { ...user.permissions, [permission]: value },
            }
          : user
      ),
    })
  }

  const updateBuyerPermission = (
    permission: PermissionType,
    value: boolean
  ) => {
    updateFormData({
      buyerPermissions: {
        ...formData.buyerPermissions,
        [permission]: value,
      },
    })
  }

  // Get available contacts (not already added)
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Sharing & Permissions</h2>
        <p className="text-muted-foreground">
          Control who can access and use your AI assistant
        </p>
      </div>

      <div className="space-y-6">
        {/* Permission Level Selection */}
        <div className="space-y-3">
          <Label>Access Level</Label>
          <div className="grid gap-3">
            {PERMISSION_OPTIONS.map((option) => {
              const Icon = option.icon
              const isSelected = formData.permissionLevel === option.value

              return (
                <button
                  key={option.value}
                  onClick={() => updateFormData({ permissionLevel: option.value })}
                  className={cn(
                    "relative flex items-start gap-4 p-4 border-2 rounded-lg text-left transition-all",
                    isSelected
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  )}
                >
                  <div
                    className={cn(
                      "flex items-center justify-center w-10 h-10 rounded-full",
                      isSelected ? "bg-primary text-primary-foreground" : "bg-muted"
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{option.title}</h3>
                      {isSelected && (
                        <Check className="h-4 w-4 text-primary" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {option.description}
                    </p>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* User Management - Only show for Private */}
        {formData.permissionLevel === "private" && (
          <div className="space-y-4">
            <Label>Select Users</Label>
            
            {/* Select Contact Dropdown */}
            <Select value="" onValueChange={handleSelectContact}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a contact to add..." />
              </SelectTrigger>
              <SelectContent>
                {availableContactsNotAdded.length > 0 ? (
                  availableContactsNotAdded.map((contact) => (
                    <SelectItem 
                      key={contact.id} 
                      value={contact.id}
                      className="focus:bg-muted focus:text-foreground"
                    >
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-primary" />
                        <div>
                          <p className="font-medium">{contact.name}</p>
                          <p className="text-xs text-muted-foreground">{contact.email}</p>
                        </div>
                      </div>
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="none" disabled>
                    All contacts have been added
                  </SelectItem>
                )}
              </SelectContent>
            </Select>

            {/* Permissions Table */}
            {formData.sharedUsers.length > 0 ? (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[250px]">User</TableHead>
                      <TableHead className="text-center">Chat</TableHead>
                      <TableHead className="text-center">Contact</TableHead>
                      <TableHead className="text-center">News Feed</TableHead>
                      <TableHead className="text-center">Messenger</TableHead>
                      <TableHead className="text-center">Artifact</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {formData.sharedUsers.map((user: SharedUser) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                              <User className="h-4 w-4 text-primary" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-sm truncate">{user.name}</p>
                              <p className="text-xs text-muted-foreground truncate">
                                {user.email}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-center">
                            <Checkbox
                              checked={user.permissions.chat}
                              onCheckedChange={(checked) =>
                                updateUserPermission(user.id, "chat", checked as boolean)
                              }
                            />
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-center">
                            <Checkbox
                              checked={user.permissions.contact}
                              onCheckedChange={(checked) =>
                                updateUserPermission(user.id, "contact", checked as boolean)
                              }
                            />
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-center">
                            <Checkbox
                              checked={user.permissions.newsFeed}
                              onCheckedChange={(checked) =>
                                updateUserPermission(user.id, "newsFeed", checked as boolean)
                              }
                            />
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-center">
                            <Checkbox
                              checked={user.permissions.messenger}
                              onCheckedChange={(checked) =>
                                updateUserPermission(user.id, "messenger", checked as boolean)
                              }
                            />
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-center">
                            <Checkbox
                              checked={user.permissions.artifact}
                              onCheckedChange={(checked) =>
                                updateUserPermission(user.id, "artifact", checked as boolean)
                              }
                            />
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeUser(user.id)}
                            className="hover:bg-destructive/10 hover:text-destructive"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8 border rounded-lg border-dashed">
                <User className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                <p className="text-sm font-medium mb-1">No users added yet</p>
                <p className="text-xs text-muted-foreground">
                  Select a contact from the dropdown above
                </p>
              </div>
            )}
          </div>
        )}

        {/* Public Access Info */}
        {formData.permissionLevel === "public" && (
          <div className="border rounded-lg p-6 bg-primary/5 border-primary/20">
            <div className="space-y-4">
            <div className="flex gap-3">
              <Globe className="h-6 w-6 text-primary shrink-0 mt-0.5" />
                <div className="flex-1">
                <h4 className="font-medium mb-1">Public Assistant</h4>
                  <p className="text-sm text-muted-foreground">
                  This assistant will be available to all users in the BMaster Store.
                </p>
                </div>
              </div>
              
              <div className="space-y-3">
                <Label className="text-sm font-medium">
                  Select permissions for buyers/users:
                </Label>
                
                <div className="space-y-2 bg-background rounded-lg p-4 border">
                  {/* Chat Permission */}
                  <div className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-3">
                      <Checkbox
                        id="buyer-chat"
                        checked={formData.buyerPermissions.chat}
                        onCheckedChange={(checked) =>
                          updateBuyerPermission("chat", checked as boolean)
                        }
                      />
                      <label
                        htmlFor="buyer-chat"
                        className="text-sm font-medium leading-none cursor-pointer"
                      >
                      Chat
                      </label>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Private AI conversations
                    </p>
                  </div>

                  {/* Contacts Permission */}
                  <div className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-3">
                      <Checkbox
                        id="buyer-contact"
                        checked={formData.buyerPermissions.contact}
                        onCheckedChange={(checked) =>
                          updateBuyerPermission("contact", checked as boolean)
                        }
                      />
                      <label
                        htmlFor="buyer-contact"
                        className="text-sm font-medium leading-none cursor-pointer"
                      >
                        Contacts
                      </label>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      View team directory
                    </p>
                  </div>

                  {/* News Feed Permission */}
                  <div className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-3">
                      <Checkbox
                        id="buyer-newsfeed"
                        checked={formData.buyerPermissions.newsFeed}
                        onCheckedChange={(checked) =>
                          updateBuyerPermission("newsFeed", checked as boolean)
                        }
                      />
                      <label
                        htmlFor="buyer-newsfeed"
                        className="text-sm font-medium leading-none cursor-pointer"
                      >
                      News Feed
                      </label>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      View & post updates
                    </p>
                  </div>

                  {/* Messenger Permission */}
                  <div className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-3">
                      <Checkbox
                        id="buyer-messenger"
                        checked={formData.buyerPermissions.messenger}
                        onCheckedChange={(checked) =>
                          updateBuyerPermission("messenger", checked as boolean)
                        }
                      />
                      <label
                        htmlFor="buyer-messenger"
                        className="text-sm font-medium leading-none cursor-pointer"
                      >
                      Messenger
                      </label>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Chat with team members
                    </p>
                  </div>

                  {/* Artifacts Permission */}
                  <div className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-3">
                      <Checkbox
                        id="buyer-artifact"
                        checked={formData.buyerPermissions.artifact}
                        onCheckedChange={(checked) =>
                          updateBuyerPermission("artifact", checked as boolean)
                        }
                      />
                      <label
                        htmlFor="buyer-artifact"
                        className="text-sm font-medium leading-none cursor-pointer"
                      >
                        Artifacts
                      </label>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Create & share artifacts
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
