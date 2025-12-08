"use client"

import { useState } from "react"
import { User, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
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

export interface SharedUser {
  id: string
  name: string
  email: string
  permissions: {
    chat: boolean
    contact: boolean
    newsFeed: boolean
    messenger: boolean
    artifact: boolean
  }
}

export interface Contact {
  id: string
  name: string
  email: string
}

interface PermissionsTableProps {
  sharedUsers: SharedUser[]
  availableContacts: Contact[]
  onAddUser: (userId: string) => void
  onRemoveUser: (userId: string) => void
  onUpdatePermission: (userId: string, permission: keyof SharedUser["permissions"], value: boolean) => void
}

export function PermissionsTable({
  sharedUsers,
  availableContacts,
  onAddUser,
  onRemoveUser,
  onUpdatePermission,
}: PermissionsTableProps) {
  return (
    <div className="space-y-4">
      <Label>Select Users</Label>

      {/* Select Contact Dropdown */}
      <Select value="" onValueChange={onAddUser}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select a contact to add..." />
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

      {/* Permissions Table */}
      {sharedUsers.length > 0 ? (
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
              {sharedUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <User className="h-4 w-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{user.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-center">
                      <Checkbox
                        checked={user.permissions.chat}
                        onCheckedChange={(checked) =>
                          onUpdatePermission(user.id, "chat", checked as boolean)
                        }
                      />
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-center">
                      <Checkbox
                        checked={user.permissions.contact}
                        onCheckedChange={(checked) =>
                          onUpdatePermission(user.id, "contact", checked as boolean)
                        }
                      />
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-center">
                      <Checkbox
                        checked={user.permissions.newsFeed}
                        onCheckedChange={(checked) =>
                          onUpdatePermission(user.id, "newsFeed", checked as boolean)
                        }
                      />
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-center">
                      <Checkbox
                        checked={user.permissions.messenger}
                        onCheckedChange={(checked) =>
                          onUpdatePermission(user.id, "messenger", checked as boolean)
                        }
                      />
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-center">
                      <Checkbox
                        checked={user.permissions.artifact}
                        onCheckedChange={(checked) =>
                          onUpdatePermission(user.id, "artifact", checked as boolean)
                        }
                      />
                    </div>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onRemoveUser(user.id)}
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
          <p className="text-xs text-muted-foreground">Select a contact from the dropdown above</p>
        </div>
      )}
    </div>
  )
}

