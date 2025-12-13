"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"

export interface ContactFormData {
  id?: string
  name: string
  email: string
  description: string
  avatar: File | string | null
  gender: string
  role: "user" | "client" | "investor"
  address: string
  telephone?: string // Contact telephone number
  information?: string // Additional contact information
}

interface ContactDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  contact?: ContactFormData | null
  assistantId?: string
  onSave: (contact: ContactFormData) => void | Promise<void>
}

export function ContactDialog({ open, onOpenChange, contact, assistantId, onSave }: ContactDialogProps) {
  const [formData, setFormData] = useState<ContactFormData>({
    name: "",
    email: "",
    description: "",
    avatar: null,
    gender: "",
    role: "user",
    address: "",
    telephone: "",
    information: "",
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Populate form when editing
  useEffect(() => {
    if (contact) {
      setFormData(contact)
    } else {
      // Reset form when adding new
      setFormData({
        name: "",
        email: "",
        description: "",
        avatar: null,
        gender: "",
        role: "user",
        address: "",
        telephone: "",
        information: "",
      })
    }
  }, [contact, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validation for adding new contact
    if (!contact) {
    if (!formData.email.trim()) {
      toast.error("Please enter an email")
      return
    }
      if (!formData.role) {
        toast.error("Please select a role")
      return
      }
      // Description is optional but we'll allow empty
    }

    // Validation for editing (role and description are editable)
    if (contact) {
      if (!formData.role) {
        toast.error("Please select a role")
        return
      }
    }

    setIsSubmitting(true)
    try {
      await onSave(formData)
      // Don't close dialog or show success here - let the parent handle it
      // The parent will handle success/error messages and closing
    } catch (error) {
      // Error handling is done in the parent component
    } finally {
      setIsSubmitting(false)
  }
  }


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {contact ? "Edit Contact" : "Add New Contact"}
          </DialogTitle>
          <DialogDescription>
            {contact 
              ? "You can only edit the role and description for this contact" 
              : "Enter the email of a registered user to add them as a contact. Only email, role, and description are required."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* When adding: Only show Email, Description, and Role */}
          {!contact ? (
            <>
              {/* Email - Required */}
            <div className="space-y-2">
              <Label htmlFor="email">
                Email <span className="text-destructive">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="john@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                  disabled={isSubmitting}
              />
                <p className="text-xs text-muted-foreground">
                  Enter the email of a registered user in b-master
                </p>
          </div>

              {/* Description - Optional */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Add a brief description about this contact..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="resize-none"
                  disabled={isSubmitting}
            />
          </div>

              {/* Telephone - Optional */}
          <div className="space-y-2">
            <Label htmlFor="telephone">Telephone</Label>
            <Input
              id="telephone"
              type="tel"
              placeholder="+1 (555) 123-4567"
              value={formData.telephone || ""}
              onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
              disabled={isSubmitting}
            />
          </div>

              {/* Information - Optional */}
          <div className="space-y-2">
            <Label htmlFor="information">Additional Information</Label>
            <Textarea
              id="information"
              placeholder="Any additional information about this contact..."
              value={formData.information || ""}
              onChange={(e) => setFormData({ ...formData, information: e.target.value })}
              rows={3}
              className="resize-none"
              disabled={isSubmitting}
            />
          </div>

              {/* Role - Required */}
            <div className="space-y-2">
                <Label htmlFor="role">
                  Role <span className="text-destructive">*</span>
              </Label>
              <Select
                  value={formData.role}
                  onValueChange={(value) =>
                    setFormData({ ...formData, role: value as "user" | "client" | "investor" })
                  }
                  disabled={isSubmitting}
              >
                <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="user" className="focus:bg-muted focus:text-foreground">User</SelectItem>
                    <SelectItem value="client" className="focus:bg-muted focus:text-foreground">Client</SelectItem>
                    <SelectItem value="investor" className="focus:bg-muted focus:text-foreground">Investor</SelectItem>
                </SelectContent>
              </Select>
            </div>
            </>
          ) : (
            <>
              {/* When editing: Show all fields but only Role and Description are editable */}
              {/* Name - Read-only */}
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  disabled
                  className="bg-muted"
                />
              </div>

              {/* Email - Read-only */}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  disabled
                  className="bg-muted"
                />
              </div>

              {/* Description - Editable */}
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Add a brief description about this contact..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="resize-none"
                  disabled={isSubmitting}
                />
              </div>

              {/* Telephone - Editable */}
              <div className="space-y-2">
                <Label htmlFor="telephone">Telephone</Label>
                <Input
                  id="telephone"
                  type="tel"
                  placeholder="+1 (555) 123-4567"
                  value={formData.telephone || ""}
                  onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
                  disabled={isSubmitting}
                />
              </div>

              {/* Information - Editable */}
              <div className="space-y-2">
                <Label htmlFor="information">Additional Information</Label>
                <Textarea
                  id="information"
                  placeholder="Any additional information about this contact..."
                  value={formData.information || ""}
                  onChange={(e) => setFormData({ ...formData, information: e.target.value })}
                  rows={3}
                  className="resize-none"
                  disabled={isSubmitting}
                />
              </div>

              {/* Gender - Read-only */}
              <div className="space-y-2">
                <Label htmlFor="gender">Gender</Label>
                <Input
                  id="gender"
                  value={formData.gender}
                  disabled
                  className="bg-muted"
                />
              </div>

              {/* Role - Editable */}
            <div className="space-y-2">
                <Label htmlFor="role">
                  Role <span className="text-destructive">*</span>
                </Label>
              <Select
                value={formData.role}
                onValueChange={(value) =>
                  setFormData({ ...formData, role: value as "user" | "client" | "investor" })
                }
                  disabled={isSubmitting}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user" className="focus:bg-muted focus:text-foreground">User</SelectItem>
                  <SelectItem value="client" className="focus:bg-muted focus:text-foreground">Client</SelectItem>
                  <SelectItem value="investor" className="focus:bg-muted focus:text-foreground">Investor</SelectItem>
                </SelectContent>
              </Select>
          </div>

              {/* Address - Read-only */}
          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Textarea
              id="address"
              value={formData.address}
                  disabled
              rows={2}
                  className="resize-none bg-muted"
            />
          </div>
            </>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="bg-muted text-foreground hover:bg-muted/80 hover:text-primary"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? "Processing..."
                : contact
                ? "Update Contact"
                : "Add Contact"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

