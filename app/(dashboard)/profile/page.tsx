"use client"

import { useState, useMemo } from "react"
import { Tabs } from "@/components/ui/vercel-tabs"
import ProfileTab from "./_components/profile-tab"
import BillingTab from "./_components/billing-tab"
import WalletTab from "./_components/wallet-tab"
import SecurityTab from "./_components/security-tab"
import { useUser } from "@/hooks/useUser"
import { Skeleton } from "@/components/ui/skeleton"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { PresignedAvatarImage } from "@/components/ui/presigned-avatar-image"
import { useChangePasswordMutation } from "@/hooks/useAuth"
import { toast } from "sonner"
import { useSession } from "next-auth/react"
import { useLocale } from "@/lib/i18n"

export default function ProfilePage() {
    const { t } = useLocale()
    const [activeTab, setActiveTab] = useState("profile")
    const { user, loading, error, updateProfile, isUpdating } = useUser()
    const { data: session } = useSession()
    const changePasswordMutation = useChangePasswordMutation()

    const TABS = useMemo(() => [
        { id: "profile", label: t("profile.tabs.profile") },
        { id: "billing", label: t("profile.tabs.billing") },
        { id: "wallet", label: t("profile.tabs.wallet") },
        { id: "security", label: t("profile.tabs.security") },
    ], [t])

    const handleProfileSave = async (data: {
        name: string
        email: string
        organization: string
        gender: string
        address: string
        image: string
    }) => {
        await updateProfile(data)
    }

    const handlePasswordChange = async (
        currentPassword: string,
        newPassword: string,
        confirmPassword: string
    ) => {
        // Validation
        if (!currentPassword || !newPassword || !confirmPassword) {
            toast.error(t("profile.errors.fillAll"))
            return false
        }

        if (newPassword.length < 8) {
            toast.error(t("profile.errors.minLength", { n: 8 }))
            return false
        }

        if (newPassword !== confirmPassword) {
            toast.error(t("profile.errors.mismatch"))
            return false
        }

        if (!session?.user?.id) {
            toast.error(t("profile.errors.notLoggedIn"))
            return false
        }

        try {
            const result = await changePasswordMutation.mutateAsync({
                userId: session.user.id,
                currentPassword,
                newPassword
            })

            return result.success
        } catch (error) {
            console.error("Error changing password:", error)
            return false
        }
    }

    const renderContent = () => {
        if (loading) {
            return (
                <div className="space-y-6 max-w-xl">
                    <Skeleton className="h-32 w-32 rounded-full bg-muted" />
                    <Skeleton className="h-10 w-full bg-muted" />
                    <Skeleton className="h-10 w-full bg-muted" />
                    <Skeleton className="h-10 w-full bg-muted" />
                    <Skeleton className="h-24 w-full bg-muted" />
                </div>
            )
        }

        if (error || !user) {
            return (
                <div className="text-center py-12">
                    <p className="text-destructive">{error || t("profile.errors.loadFailed")}</p>
                </div>
            )
        }

        switch (activeTab) {
            case "profile":
                return (
                    <ProfileTab
                        initialData={{
                            name: user.name,
                            email: user.email,
                            organization: user.organization,
                            gender: user.gender,
                            address: user.address,
                            image: user.image,
                        }}
                        onSave={handleProfileSave}
                        isLoading={isUpdating}
                    />
                )
            case "billing":
                return <BillingTab />
            case "wallet":
                return <WalletTab />
            case "security":
                return <SecurityTab onPasswordChange={handlePasswordChange} />
            default:
                return null
        }
    }

    return (
        <div className="h-full flex flex-col">
            {/* Sticky Header */}
            <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="container mx-auto py-4 px-4 max-w-4xl">
                    <div className="flex items-center gap-3 mb-6">
                        {loading ? (
                            <>
                                <Skeleton className="w-16 h-16 rounded-full bg-muted" />
                                <div className="space-y-2">
                                    <Skeleton className="h-7 w-48 bg-muted" />
                                    <Skeleton className="h-4 w-64 bg-muted" />
                                </div>
                            </>
                        ) : (
                            <>

                                <Avatar className="h-16 w-16 rounded-full bg-muted">
                                    <PresignedAvatarImage src={user?.image || ""} />
                                    <AvatarFallback className="rounded-full">{user?.name?.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div className="space-y-2">
                                    <h1 className="text-2xl font-medium tracking-tight">
                                        {user?.name || t("contacts.roles.user")}
                                    </h1>
                                    <p className="text-muted-foreground text-sm">
                                        {t("profile.subtitle")}
                                    </p>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Tabs */}
                    <Tabs tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />
                </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto">
                <div className="container mx-auto py-6 px-4 max-w-4xl">
                    {renderContent()}
                </div>
            </div>
        </div>
    )
}

