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
import { ImageUploadField } from "@/components/ui/image-uploader"
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
}

interface ContactDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  contact?: ContactFormData | null
  onSave: (contact: ContactFormData) => void
}

export function ContactDialog({ open, onOpenChange, contact, onSave }: ContactDialogProps) {
  const [formData, setFormData] = useState<ContactFormData>({
    name: "",
    email: "",
    description: "",
    avatar: null,
    gender: "",
    role: "user",
    address: "",
  })

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
      })
    }
  }, [contact, open])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Validation
    if (!formData.name.trim()) {
      toast.error("Please enter a name")
      return
    }
    if (!formData.email.trim()) {
      toast.error("Please enter an email")
      return
    }
    if (!formData.gender) {
      toast.error("Please select a gender")
      return
    }

    onSave(formData)
    onOpenChange(false)
    
    if (contact) {
      toast.success("Contact updated successfully")
    } else {
      toast.success("Contact added successfully")
    }
  }

  const handleImageChange = (value: File | string | null) => {
    setFormData({ ...formData, avatar: value })
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
              ? "Update the contact information below" 
              : "Fill in the details to add a new contact"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Image Upload */}
          <div className="space-y-2">
            <Label>Profile Image</Label>
            <div className="max-w-[150px] mx-auto">
              <ImageUploadField
                value={formData.avatar}
                onChange={handleImageChange}
                aspectRatio={1}
                maxSize={5 * 1024 * 1024}
                className="w-full h-[150px]"
              />
            </div>
          </div>

          {/* Name and Email */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                placeholder="John Doe"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

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
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Add a brief description about this contact..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="resize-none"
            />
          </div>

          {/* Gender and Role */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="gender">
                Gender <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.gender}
                onValueChange={(value) => setFormData({ ...formData, gender: value })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Male" className="focus:bg-muted focus:text-foreground">Male</SelectItem>
                  <SelectItem value="Female" className="focus:bg-muted focus:text-foreground">Female</SelectItem>
                  <SelectItem value="Other" className="focus:bg-muted focus:text-foreground">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select
                value={formData.role}
                onValueChange={(value) =>
                  setFormData({ ...formData, role: value as "user" | "client" | "investor" })
                }
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
          </div>

          {/* Address */}
          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Textarea
              id="address"
              placeholder="123 Main St, City, State, ZIP"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              rows={2}
              className="resize-none"
            />
          </div>

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
            <Button type="submit">
              {contact ? "Update Contact" : "Add Contact"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

