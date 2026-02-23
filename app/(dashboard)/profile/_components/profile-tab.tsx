"use client"

import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { ImageUploadField } from "@/components/ui/image-uploader"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { ProfileData, ProfileTabProps } from "@/types/profile"
import { updateEmailVisibility } from "@/app/actions/user.action"
import { toast } from "sonner"
import { useLocale } from "@/lib/i18n"

export default function ProfileTab({ initialData, onSave, isLoading }: ProfileTabProps) {
    const { t } = useLocale()
    const [formData, setFormData] = useState<ProfileData>(initialData)
    const [isModified, setIsModified] = useState(false)
    const [emailVisible, setEmailVisible] = useState<boolean>(
        (initialData as any).emailVisible ?? false
    )
    const [isUpdatingVisibility, setIsUpdatingVisibility] = useState(false)

    // Reset form when initialData changes (after successful update)
    useEffect(() => {
        setFormData(initialData)
        setEmailVisible((initialData as any).emailVisible ?? false)
    }, [initialData])

    // Check if form has been modified (excluding email as it's read-only)
    useEffect(() => {
        const modified =
            formData.name !== initialData.name ||
            formData.organization !== initialData.organization ||
            formData.gender !== initialData.gender ||
            formData.address !== initialData.address ||
            formData.image !== initialData.image
        setIsModified(modified)
    }, [formData, initialData])

    const handleInputChange = (field: keyof ProfileData, value: string) => {
        setFormData((prev) => ({ ...prev, [field]: value }))
    }

    const handleSave = () => {
        onSave(formData)
    }

    const handleCancel = () => {
        setFormData(initialData)
    }

    const handleEmailVisibilityToggle = async (checked: boolean) => {
        setIsUpdatingVisibility(true)
        const result = await updateEmailVisibility(checked)
        if (result.success) {
            setEmailVisible(checked)
            toast.success(checked
                ? t("profile.privacy.madeDiscoverable")
                : t("profile.privacy.madeHidden")
            )
        } else {
            toast.error(result.error || "Failed to update privacy setting")
        }
        setIsUpdatingVisibility(false)
    }

    const handleImageChange = async (value: File | string | null) => {
        if (typeof value === "string") {
            // Already a URL string
            handleInputChange("image", value)
        } else if (value instanceof File) {
            // Convert File to base64
            const reader = new FileReader()
            reader.onloadend = () => {
                const base64String = reader.result as string
                handleInputChange("image", base64String)
            }
            reader.onerror = () => {
                console.error("Error reading file")
                handleInputChange("image", "")
            }
            reader.readAsDataURL(value)
        } else {
            // null value
            handleInputChange("image", "")
        }
    }

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-xl font-semibold">{t("profile.profileInformation")}</h2>
                <p className="text-muted-foreground text-sm">
                    {t("profile.profileDescription")}
                </p>
            </div>

            <div className="space-y-6 max-w-xl">
                {/* Profile Image */}
                <div className="space-y-2">
                    <Label htmlFor="profile-image">{t("profile.profilePicture")}</Label>
                    <ImageUploadField
                        value={formData.image}
                        onChange={handleImageChange}
                        className="w-32 h-32"
                        aspectRatio={1}
                    />
                </div>

                {/* Name */}
                <div className="space-y-2">
                    <Label htmlFor="name">{t("profile.fullName")}</Label>
                    <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => handleInputChange("name", e.target.value)}
                        placeholder={t("profile.fullNamePlaceholder")}
                    />
                </div>

                {/* Organization */}
                <div className="space-y-2">
                    <Label htmlFor="organization">{t("profile.organization")}</Label>
                    <Input
                        id="organization"
                        value={formData.organization}
                        onChange={(e) => handleInputChange("organization", e.target.value)}
                        placeholder={t("profile.organizationPlaceholder")}
                    />
                </div>

                {/* Gender */}
                <div className="space-y-2">
                    <Label htmlFor="gender">{t("profile.gender")}</Label>
                    <Select
                        value={formData.gender}
                        onValueChange={(value) => handleInputChange("gender", value)}
                    >
                        <SelectTrigger id="gender">
                            <SelectValue placeholder={t("profile.genderPlaceholder")} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="male" className="focus:bg-muted focus:text-foreground">{t("profile.male")}</SelectItem>
                            <SelectItem value="female" className="focus:bg-muted focus:text-foreground">{t("profile.female")}</SelectItem>
                            <SelectItem value="other" className="focus:bg-muted focus:text-foreground">{t("profile.other")}</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Address */}
                <div className="space-y-2">
                    <Label htmlFor="address">{t("profile.address")}</Label>
                    <Textarea
                        id="address"
                        value={formData.address}
                        onChange={(e) => handleInputChange("address", e.target.value)}
                        placeholder={t("profile.addressPlaceholder")}
                        rows={4}
                        className="resize-none"
                    />
                </div>

                {/* Action Buttons - Only show when modified */}
                {isModified && (
                    <div className="flex gap-3 pt-4">
                        <Button 
                            onClick={handleSave}
                            disabled={isLoading}
                        >
                            {isLoading ? t("common.saving") : t("profile.saveProfile")}
                        </Button>
                        <Button
                            variant="outline"
                            onClick={handleCancel}
                            disabled={isLoading}
                            className="hover:text-primary hover:bg-transparent"
                        >
                            {t("common.cancel")}
                        </Button>
                    </div>
                )}

                {/* Privacy Settings */}
                <div className="pt-4 border-t space-y-4">
                    <div>
                        <h3 className="text-base font-semibold">{t("profile.privacy.title")}</h3>
                        <p className="text-muted-foreground text-sm">
                            {t("profile.privacy.description")}
                        </p>
                    </div>

                    <div className="flex items-center justify-between rounded-lg border p-4 bg-muted/20">
                        <div className="space-y-0.5">
                            <Label htmlFor="email-visible" className="text-sm font-medium">
                                {t("profile.privacy.emailVisible")}
                            </Label>
                            <p className="text-xs text-muted-foreground">
                                {t("profile.privacy.emailVisibleDescription")}
                            </p>
                        </div>
                        <Switch
                            id="email-visible"
                            checked={emailVisible}
                            onCheckedChange={handleEmailVisibilityToggle}
                            disabled={isUpdatingVisibility}
                        />
                    </div>
                </div>
            </div>
        </div>
    )
}

