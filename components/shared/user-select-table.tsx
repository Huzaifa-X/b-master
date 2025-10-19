"use client"

import { User, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export interface SelectedUser {
  id: string
  name: string
  email: string
}

export interface Contact {
  id: string
  name: string
  email: string
}

interface UserSelectTableProps {
  selectedUsers: SelectedUser[]
  availableContacts: Contact[]
  onAddUser: (userId: string) => void
  onRemoveUser: (userId: string) => void
}

export function UserSelectTable({
  selectedUsers,
  availableContacts,
  onAddUser,
  onRemoveUser,
}: UserSelectTableProps) {
  return (
    <div className="space-y-4">
      <Label>Select Users Who Can Access</Label>

      {/* Select Contact Dropdown */}
      <Select value="" onValueChange={onAddUser}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select a user to add..." />
        </SelectTrigger>
        <SelectContent>
          {availableContacts.length > 0 ? (
            availableContacts.map((contact) => (
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

      {/* Selected Users List */}
      {selectedUsers.length > 0 ? (
        <div className="border rounded-lg divide-y">
          {selectedUsers.map((user) => (
            <div
              key={user.id}
              className="flex items-center justify-between p-3 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <User className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{user.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onRemoveUser(user.id)}
                className="hover:bg-destructive/10 hover:text-destructive shrink-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 border rounded-lg border-dashed">
          <User className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
          <p className="text-sm font-medium mb-1">No users added yet</p>
          <p className="text-xs text-muted-foreground">
            Select users from the dropdown above to grant access
          </p>
        </div>
      )}

      {selectedUsers.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {selectedUsers.length} {selectedUsers.length === 1 ? "user" : "users"} will have full access to this artifact
        </p>
      )}
    </div>
  )
}

