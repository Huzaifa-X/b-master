"use client"

import { useState, useEffect } from "react"
import { Tabs } from "@/components/ui/vercel-tabs"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { ImageUploadField } from "@/components/ui/image-uploader"
import { Card } from "@/components/ui/card"
import { User, CreditCard, FileText, XCircle, ChevronRight, Shield, Key } from "lucide-react"

const TABS = [
    { id: "profile", label: "Profile" },
    { id: "billing", label: "Billing" },
    { id: "security", label: "Security" },
]

export default function ProfilePage() {
    const [activeTab, setActiveTab] = useState("profile")

    // Initial profile data (this would come from your database/API)
    const [originalData, setOriginalData] = useState({
        name: "Huzaifa Tahir",
        email: "huzaifa@example.com",
        organization: "B-Master Inc.",
        image: ""
    })

    // Form state
    const [formData, setFormData] = useState(originalData)
    const [isModified, setIsModified] = useState(false)

    // Check if form has been modified
    useEffect(() => {
        const modified = 
            formData.name !== originalData.name ||
            formData.email !== originalData.email ||
            formData.organization !== originalData.organization ||
            formData.image !== originalData.image
        setIsModified(modified)
    }, [formData, originalData])

    const handleInputChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }))
    }

    const handleSave = () => {
        // TODO: Save to backend
        setOriginalData(formData)
        console.log("Saved:", formData)
    }

    const handleCancel = () => {
        setFormData(originalData)
    }

    const renderContent = () => {
        switch (activeTab) {
            case "profile":
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
                                    onChange={(value: File | string | null) => 
                                        handleInputChange("image", typeof value === "string" ? value : value instanceof File ? URL.createObjectURL(value) : "")
                                    }
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

                            {/* Email */}
                            <div className="space-y-2">
                                <Label htmlFor="email">Email Address</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => handleInputChange("email", e.target.value)}
                                    placeholder="Enter your email"
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

                            {/* Action Buttons - Only show when modified */}
                            {isModified && (
                                <div className="flex gap-3 pt-4">
                                    <Button onClick={handleSave}>
                                        Save Changes
                                    </Button>
                                    <Button variant="outline" onClick={handleCancel} className="hover:text-primary hover:bg-transparent">
                                        Cancel
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>
                )
            case "billing":
                return (
                    <div className="space-y-6">
                        <div>
                            <h2 className="text-xl font-semibold">Billing & Subscription</h2>
                            <p className="text-muted-foreground text-sm">
                                Manage your subscription and payment methods
                            </p>
                        </div>

                        <div className="space-y-6">
                            {/* Current Plan Card */}
                            <Card className="p-6 bg-transparent backdrop-blur-sm border-border/50">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                                            <div className="w-6 h-6 relative">
                                                <div className="absolute inset-0 rounded-full border-2 border-primary"></div>
                                                <div className="absolute top-1 left-1 w-1 h-1 rounded-full bg-primary"></div>
                                                <div className="absolute top-1 right-1 w-1 h-1 rounded-full bg-primary"></div>
                                                <div className="absolute bottom-1 left-1 w-1 h-1 rounded-full bg-primary"></div>
                                                <div className="absolute bottom-1 right-1 w-1 h-1 rounded-full bg-primary"></div>
                                            </div>
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-semibold">Pro plan</h3>
                                            <p className="text-sm text-muted-foreground">Monthly</p>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                Your subscription will auto renew on Nov 7, 2025.
                                            </p>
                                        </div>
                                    </div>
                                    <Button variant="outline" size="sm" className="hover:text-primary hover:bg-transparent">
                                        Adjust plan
                                    </Button>
                                </div>
                            </Card>

                            {/* Payment Method Card */}
                            <Card className="p-6 bg-transparent backdrop-blur-sm border-border/50">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                                            <CreditCard className="w-6 h-6 text-primary" />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-semibold">Payment</h3>
                                            <div className="flex items-center gap-2 mt-1">
                                                <CreditCard className="w-4 h-4 text-muted-foreground" />
                                                <span className="text-sm text-muted-foreground">Mastercard</span>
                                                <span className="text-sm text-muted-foreground">•••• 6458</span>
                                            </div>
                                        </div>
                                    </div>
                                    <Button variant="outline" size="sm" className="hover:text-primary hover:bg-transparent">
                                        Update
                                    </Button>
                                </div>
                            </Card>

                            {/* Invoices Card */}
                            <Card className="p-6 bg-transparent backdrop-blur-sm border-border/50">
                                <div className="space-y-4">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                                            <FileText className="w-6 h-6 text-primary" />
                                        </div>
                                        <h3 className="text-lg font-semibold">Invoices</h3>
                                    </div>
                                    
                                    <div className="overflow-hidden">
                                        <div className="grid grid-cols-4 gap-4 text-sm font-medium text-muted-foreground border-b border-border pb-2">
                                            <div>Date</div>
                                            <div>Total</div>
                                            <div>Status</div>
                                        </div>
                                        
                                        <div className="space-y-3 mt-3">
                                            <div className="grid grid-cols-4 gap-4 text-sm">
                                                <div>Oct 7, 2025</div>
                                                <div>US$20.00</div>
                                                <div className="text-green-500">Paid</div>
                                            </div>
                                            
                                            <div className="grid grid-cols-4 gap-4 text-sm">
                                                <div>Sep 7, 2025</div>
                                                <div>US$20.00</div>
                                                <div className="text-green-500">Paid</div>
                                            </div>
                                            
                                            <div className="grid grid-cols-4 gap-4 text-sm">
                                                <div>Aug 7, 2025</div>
                                                <div>US$20.00</div>
                                                <div className="text-green-500">Paid</div>
                                            </div>
                                            
                                            <div className="grid grid-cols-4 gap-4 text-sm">
                                                <div>Jul 31, 2025</div>
                                                <div>US$0.00</div>
                                                <div className="text-green-500">Paid</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </Card>

                            {/* Cancellation Card */}
                            <Card className="p-6 bg-transparent backdrop-blur-sm border-border/50">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-lg bg-destructive/10 flex items-center justify-center">
                                            <XCircle className="w-6 h-6 text-destructive" />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-semibold">Cancellation</h3>
                                            <p className="text-sm text-muted-foreground">Cancel plan</p>
                                        </div>
                                    </div>
                                    <Button variant="destructive" size="sm">
                                        Cancel
                                    </Button>
                                </div>
                            </Card>
                        </div>
                    </div>
                )
            case "security":
                return (
                    <div className="space-y-6">
                        <div>
                            <h2 className="text-xl font-semibold">Security Settings</h2>
                            <p className="text-muted-foreground text-sm">
                                Manage your password and security preferences
                            </p>
                        </div>

                        <div className="space-y-6">
                            {/* Password Change Card */}
                            <Card className="p-6 bg-transparent backdrop-blur-sm border-border/50">
                                <div className="space-y-4">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                                            <Key className="w-6 h-6 text-primary" />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-semibold">Password</h3>
                                            <p className="text-sm text-muted-foreground">
                                                Change your account password
                                            </p>
                                        </div>
                                    </div>
                                    
                                    <div className="space-y-4 max-w-md">
                                        <div className="space-y-2">
                                            <Label htmlFor="current-password">Current Password</Label>
                                            <Input
                                                id="current-password"
                                                type="password"
                                                placeholder="Enter current password"
                                            />
                                        </div>
                                        
                                        <div className="space-y-2">
                                            <Label htmlFor="new-password">New Password</Label>
                                            <Input
                                                id="new-password"
                                                type="password"
                                                placeholder="Enter new password"
                                            />
                                        </div>
                                        
                                        <div className="space-y-2">
                                            <Label htmlFor="confirm-password">Confirm New Password</Label>
                                            <Input
                                                id="confirm-password"
                                                type="password"
                                                placeholder="Confirm new password"
                                            />
                                        </div>
                                        
                                        <Button className="w-fit">
                                            Update Password
                                        </Button>
                                    </div>
                                </div>
                            </Card>

                            {/* MFA Card */}
                            <Card className="p-6 bg-transparent backdrop-blur-sm border-border/50">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                                            <Shield className="w-6 h-6 text-primary" />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-semibold">Two-Factor Authentication</h3>
                                            <p className="text-sm text-muted-foreground">
                                                Add an extra layer of security to your account
                                            </p>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                Currently disabled
                                            </p>
                                        </div>
                                    </div>
                                    <Button variant="outline" size="sm" className="hover:text-primary hover:bg-transparent">
                                        Enable MFA
                                    </Button>
                                </div>
                            </Card>
                        </div>
                    </div>
                )
            default:
                return null
        }
    }

    return (
        <div className="h-full overflow-y-auto">
            <div className="container mx-auto py-6 px-4 max-w-4xl">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="h-8 w-8 text-primary" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-medium tracking-tight">Huzaifa Tahir</h1>
                            <p className="text-muted-foreground text-sm">
                                Manage your account settings and preferences
                            </p>
                        </div>
                    </div>

                    {/* Tabs */}
                    <Tabs tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />
                </div>

                {/* Content */}
                <div className="mb-8">
                    {renderContent()}
                </div>
            </div>
        </div>
    )
}

