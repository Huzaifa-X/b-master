"use client"

import { useState } from "react"
import { Tabs } from "@/components/ui/vercel-tabs"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { User } from "lucide-react"

const TABS = [
    { id: "profile", label: "Profile" },
    { id: "billing", label: "Billing" },
    { id: "security", label: "Security" },
]

export default function ProfilePage() {
    const [activeTab, setActiveTab] = useState("profile")

    const renderContent = () => {
        switch (activeTab) {
            case "profile":
                return (
                    <div className="space-y-6">
                        <h2 className="text-xl font-semibold">Profile Information</h2>
                        <p className="text-muted-foreground">
                            Manage your personal information and preferences
                        </p>
                        {/* TODO: Add profile form */}
                    </div>
                )
            case "billing":
                return (
                    <div className="space-y-6">
                        <h2 className="text-xl font-semibold">Billing & Subscription</h2>
                        <p className="text-muted-foreground">
                            Manage your subscription and payment methods
                        </p>
                        {/* TODO: Add billing information */}
                    </div>
                )
            case "security":
                return (
                    <div className="space-y-6">
                        <h2 className="text-xl font-semibold">Security Settings</h2>
                        <p className="text-muted-foreground">
                            Manage your password and security preferences
                        </p>
                        {/* TODO: Add security settings */}
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
                            <h1 className="text-3xl font-bold tracking-tight">My Profile</h1>
                            <p className="text-muted-foreground">
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
