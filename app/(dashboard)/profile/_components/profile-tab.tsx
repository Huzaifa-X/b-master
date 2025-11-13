"use client"

import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { ImageUploadField } from "@/components/ui/image-uploader"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { ProfileData, ProfileTabProps } from "@/types/profile"

export default function ProfileTab({ initialData, onSave }: ProfileTabProps) {
    const [formData, setFormData] = useState<ProfileData>(initialData)
    const [isModified, setIsModified] = useState(false)

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
                <h2 className="text-xl font-semibold">Profile Information</h2>
                <p className="text-muted-foreground text-sm">
                    Manage your personal information and preferences
                </p>
            </div>

            <div className="space-y-6 max-w-xl">
                {/* Profile Image */}
                <div className="space-y-2">
                    <Label htmlFor="profile-image">Profile Picture</Label>
                    <ImageUploadField
                        value={formData.image}
                        onChange={handleImageChange}
                        className="w-32 h-32"
                        aspectRatio={1}
                    />
                </div>

                {/* Name */}
                <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => handleInputChange("name", e.target.value)}
                        placeholder="Enter your full name"
                    />
                </div>

                {/* Organization */}
                <div className="space-y-2">
                    <Label htmlFor="organization">Organization</Label>
                    <Input
                        id="organization"
                        value={formData.organization}
                        onChange={(e) => handleInputChange("organization", e.target.value)}
                        placeholder="Enter your organization"
                    />
                </div>

                {/* Gender */}
                <div className="space-y-2">
                    <Label htmlFor="gender">Gender</Label>
                    <Select
                        value={formData.gender}
                        onValueChange={(value) => handleInputChange("gender", value)}
                    >
                        <SelectTrigger id="gender">
                            <SelectValue placeholder="Select your gender" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="male" className="focus:bg-muted focus:text-foreground">Male</SelectItem>
                            <SelectItem value="female" className="focus:bg-muted focus:text-foreground">Female</SelectItem>
                            <SelectItem value="other" className="focus:bg-muted focus:text-foreground">Other</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Address */}
                <div className="space-y-2">
                    <Label htmlFor="address">Address</Label>
                    <Textarea
                        id="address"
                        value={formData.address}
                        onChange={(e) => handleInputChange("address", e.target.value)}
                        placeholder="Enter your address"
                        rows={4}
                        className="resize-none"
                    />
                </div>

                {/* Action Buttons - Only show when modified */}
                {isModified && (
                    <div className="flex gap-3 pt-4">
                        <Button onClick={handleSave}>Save Changes</Button>
                        <Button
                            variant="outline"
                            onClick={handleCancel}
                            className="hover:text-primary hover:bg-transparent"
                        >
                            Cancel
                        </Button>
                    </div>
                )}
            </div>
        </div>
    )
}

