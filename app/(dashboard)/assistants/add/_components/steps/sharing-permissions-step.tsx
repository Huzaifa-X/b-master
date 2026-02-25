"use client"

import { useState } from "react"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { SharingPermissionsStepProps, SharedUser, PermissionType } from "@/types/assistant"
import { cn } from "@/lib/utils"
import { Lock, Globe, Check, X, User, Loader2 } from "lucide-react"
import { toast } from "sonner"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { verifyUserByEmail } from "@/app/actions/user.action"
import {
  TagsInput,
  TagsInputInput,
  TagsInputItem,
  TagsInputList,
} from "@/components/ui/tags-input"

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

export function SharingPermissionsStep({
  formData,
  updateFormData,
}: SharingPermissionsStepProps) {
  const [isVerifying, setIsVerifying] = useState(false)
  // Derive email tags from sharedUsers for display in TagsInput
  const emailTags = formData.sharedUsers.map((u: SharedUser) => u.email)

  const handleAddEmails = async (newEmails: string[]) => {
    // Find the newly added email (diff between new and current)
    const currentEmails = formData.sharedUsers.map((u: SharedUser) => u.email.toLowerCase())
    const addedEmails = newEmails.filter(
      (email) => !currentEmails.includes(email.toLowerCase())
    )

    if (addedEmails.length === 0) return

    // Process each new email
    for (const rawEmail of addedEmails) {
      const email = rawEmail.trim().toLowerCase()

      if (!email) continue

      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email)) {
        toast.error(`Invalid email format: ${rawEmail}`)
        continue
      }

      // Check if already added
      if (formData.sharedUsers.some((u: SharedUser) => u.email.toLowerCase() === email)) {
        toast.error("This user is already added")
        continue
      }

      setIsVerifying(true)
      try {
        const result = await verifyUserByEmail(email)

        if (!result.success || !result.user) {
          toast.error(result.error || `User not found: ${email}`)
          continue
        }

        const newUser: SharedUser = {
          id: result.user.id,
          name: result.user.name || "",
          email: result.user.email,
          permissions: {
            chat: true,
            contact: true,
            messenger: true,
            artifact: true,
            newsFeed: true,
          },
        }

        updateFormData({
          sharedUsers: [...formData.sharedUsers, newUser],
        })

        toast.success(`${result.user.name || result.user.email} added successfully`)
      } catch {
        toast.error(`Failed to verify user: ${email}`)
      } finally {
        setIsVerifying(false)
      }
    }
  }

  const handleRemoveEmail = (removedEmails: string[]) => {
    // Find which email was removed
    const removedEmail = emailTags.find(
      (email: string) => !removedEmails.includes(email)
    )
    if (removedEmail) {
      updateFormData({
        sharedUsers: formData.sharedUsers.filter(
          (user: SharedUser) => user.email.toLowerCase() !== removedEmail.toLowerCase()
        ),
      })
      toast.success("User removed")
    }
  }

  const handleTagsChange = (newEmails: string[]) => {
    if (newEmails.length > emailTags.length) {
      // Email added
      handleAddEmails(newEmails)
    } else if (newEmails.length < emailTags.length) {
      // Email removed
      handleRemoveEmail(newEmails)
    }
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
            <Label>Add Users by Email</Label>

            {/* Email Tags Input */}
            <TagsInput
              value={emailTags}
              onValueChange={handleTagsChange}
              className="w-full"
            >
              <TagsInputList className="w-full">
                {emailTags.map((email: string) => (
                  <TagsInputItem key={email} value={email}>
                    {email}
                  </TagsInputItem>
                ))}
                <TagsInputInput
                  placeholder={isVerifying ? "Verifying..." : "Type email and press Enter..."}
                  disabled={isVerifying}
                  className="min-w-[200px]"
                />
              </TagsInputList>
            </TagsInput>

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
                  Add the User's email above
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
