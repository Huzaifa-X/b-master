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
import { useLocale } from "@/lib/i18n"

export interface ContactFormData {
  id?: string
  name: string
  email: string
  description: string
  avatar: File | string | null
  gender: string
  role: string
  address: string
  telephone?: string // Contact telephone number
  information?: string // Additional contact information
}

interface ContactDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  contact?: ContactFormData | null
  assistantId?: string
  onSave?: (contact: ContactFormData) => void | Promise<void>
}

export function ContactDialog({ open, onOpenChange, contact, assistantId, onSave }: ContactDialogProps) {
  const { t } = useLocale()
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
  const [isOtherRole, setIsOtherRole] = useState(false)
  const [customRole, setCustomRole] = useState("")

  const PREDEFINED_ROLES = [
    "user",
    "client",
    "prospect",
    "investor",
    "colleague",
    "associate",
    "coworker",
    "other",
  ]

  // Populate form when editing
  useEffect(() => {
    if (contact) {
      setFormData(contact)
      const isPredefined = PREDEFINED_ROLES.includes(contact.role) || contact.role === "other"
      if (!isPredefined) {
        setIsOtherRole(true)
        setCustomRole(contact.role)
      } else {
        setIsOtherRole(contact.role === "other")
        setCustomRole("")
      }
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
      setIsOtherRole(false)
      setCustomRole("")
    }
  }, [contact, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validation for adding new contact
    if (!contact) {
      if (!formData.email.trim()) {
        toast.error(t("auth.invalidEmail"))
        return
      }
      if (!formData.role) {
        toast.error(t("contacts.roles.user")) // Generic role error
        return
      }
      // Description is optional but we'll allow empty
    }

    // Validation for editing (role and description are editable)
    if (contact) {
      if (!formData.role) {
        toast.error(t("contacts.roles.user")) // Generic role error
        return
      }
    }

    setIsSubmitting(true)
    try {
      if (onSave) {
        // If "other" is selected, use the custom role value
        const dataToSave = {
          ...formData,
          role: isOtherRole ? customRole.trim() || t("contacts.roles.other") : formData.role,
        }
        await onSave(dataToSave)
      }
      // Don't close dialog or show success here - let the parent handle it
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
            {contact ? t("contacts.editContact") : t("contacts.addContact")}
          </DialogTitle>
          <DialogDescription>
            {contact
              ? t("contacts.editDescriptionPrompt")
              : t("contacts.addDescriptionPrompt")}
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
                  {t("contacts.emailInputHint")}
                </p>
              </div>

              {/* Description - Optional */}
              <div className="space-y-2">
                <Label htmlFor="description">{t("contacts.description")}</Label>
                <Textarea
                  id="description"
                  placeholder={t("contacts.descriptionPlaceholder")}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="resize-none"
                  disabled={isSubmitting}
                />
              </div>

              {/* Telephone - Optional */}
              <div className="space-y-2">
                <Label htmlFor="telephone">{t("contacts.telephone")}</Label>
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
                <Label htmlFor="information">{t("contacts.additionalInfo")}</Label>
                <Textarea
                  id="information"
                  placeholder={t("contacts.additionalInfoPlaceholder")}
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
                    {t("contacts.role")} <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={isOtherRole ? "other" : formData.role}
                    onValueChange={(value) => {
                      if (value === "other") {
                        setIsOtherRole(true)
                      } else {
                        setIsOtherRole(false)
                        setFormData({ ...formData, role: value })
                      }
                    }}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={t("contacts.role")} />
                    </SelectTrigger>
                    <SelectContent>
                      {PREDEFINED_ROLES.map((role) => (
                        <SelectItem
                          key={role}
                          value={role}
                          className="focus:bg-muted focus:text-foreground"
                        >
                          {t(`contacts.roles.${role}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {isOtherRole && (
                    <div className="pt-2">
                      <Input
                        placeholder={t("contacts.roles.custom")}
                        value={customRole}
                        onChange={(e) => setCustomRole(e.target.value)}
                        disabled={isSubmitting}
                        className="h-9 px-3"
                        autoFocus
                      />
                    </div>
                  )}
                </div>
            </>
          ) : (
            <>
              {/* When editing: Show all fields but only Role and Description are editable */}
              {/* Name - Read-only */}
              <div className="space-y-2">
                <Label htmlFor="name">{t("contacts.contactName")}</Label>
                <Input
                  id="name"
                  value={formData.name}
                  disabled
                  className="bg-muted"
                />
              </div>

              {/* Email - Read-only */}
              <div className="space-y-2">
                <Label htmlFor="email">{t("contacts.contactEmail")}</Label>
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
                <Label htmlFor="description">{t("contacts.description")}</Label>
                <Textarea
                  id="description"
                  placeholder={t("contacts.descriptionPlaceholder")}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="resize-none"
                  disabled={isSubmitting}
                />
              </div>

              {/* Telephone - Editable */}
              <div className="space-y-2">
                <Label htmlFor="telephone">{t("contacts.telephone")}</Label>
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
                <Label htmlFor="information">{t("contacts.additionalInfo")}</Label>
                <Textarea
                  id="information"
                  placeholder={t("contacts.additionalInfoPlaceholder")}
                  value={formData.information || ""}
                  onChange={(e) => setFormData({ ...formData, information: e.target.value })}
                  rows={3}
                  className="resize-none"
                  disabled={isSubmitting}
                />
              </div>

              {/* Gender - Read-only */}
              <div className="space-y-2">
                <Label htmlFor="gender">{t("contacts.gender")}</Label>
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
                    {t("contacts.role")} <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={isOtherRole ? "other" : formData.role}
                    onValueChange={(value) => {
                      if (value === "other") {
                        setIsOtherRole(true)
                      } else {
                        setIsOtherRole(false)
                        setFormData({ ...formData, role: value })
                      }
                    }}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={t("contacts.role")} />
                    </SelectTrigger>
                    <SelectContent>
                      {PREDEFINED_ROLES.map((role) => (
                        <SelectItem
                          key={role}
                          value={role}
                          className="focus:bg-muted focus:text-foreground"
                        >
                          {t(`contacts.roles.${role}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {isOtherRole && (
                    <div className="pt-2">
                      <Input
                        placeholder={t("contacts.roles.custom")}
                        value={customRole}
                        onChange={(e) => setCustomRole(e.target.value)}
                        disabled={isSubmitting}
                        className="h-9 px-3"
                        autoFocus
                      />
                    </div>
                  )}
                </div>

              {/* Address - Read-only */}
              <div className="space-y-2">
                <Label htmlFor="address">{t("contacts.address")}</Label>
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
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? t("contacts.processing")
                : contact
                  ? t("contacts.editContact")
                  : t("contacts.addContact")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

