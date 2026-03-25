"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Key } from "lucide-react"
import { useLocale } from "@/lib/i18n"

interface SecurityTabProps {
    onPasswordChange: (
        currentPassword: string,
        newPassword: string,
        confirmPassword: string
    ) => Promise<boolean>
}

export default function SecurityTab({ onPasswordChange }: SecurityTabProps) {
    const [passwords, setPasswords] = useState({
        current: "",
        new: "",
        confirm: "",
    })
    const [isLoading, setIsLoading] = useState(false)
    const { t } = useLocale()

    const handlePasswordChange = (field: keyof typeof passwords, value: string) => {
        setPasswords((prev) => ({ ...prev, [field]: value }))
    }

    const handleUpdatePassword = async () => {
        setIsLoading(true)

        try {
            const success = await onPasswordChange(
                passwords.current,
                passwords.new,
                passwords.confirm
            )

            if (success) {
                // Clear form on success
                setPasswords({
                    current: "",
                    new: "",
                    confirm: "",
                })
            }
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-xl font-semibold">{t("profile.security.title")}</h2>
                <p className="text-muted-foreground text-sm">
                    {t("profile.security.description")}
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
                                <h3 className="text-lg font-semibold">{t("profile.security.password")}</h3>
                                <p className="text-sm text-muted-foreground">
                                    {t("profile.security.changePassword")}
                                </p>
                            </div>
                        </div>

                        <div className="space-y-4 max-w-md">
                            <div className="space-y-2">
                                <Label htmlFor="current-password">{t("profile.security.currentPassword")}</Label>
                                <Input
                                    id="current-password"
                                    type="password"
                                    value={passwords.current}
                                    onChange={(e) => handlePasswordChange("current", e.target.value)}
                                    placeholder={t("profile.security.currentPlaceholder")}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="new-password">{t("profile.security.newPassword")}</Label>
                                <Input
                                    id="new-password"
                                    type="password"
                                    value={passwords.new}
                                    onChange={(e) => handlePasswordChange("new", e.target.value)}
                                    placeholder={t("profile.security.newPlaceholder")}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="confirm-password">{t("profile.security.confirmPassword")}</Label>
                                <Input
                                    id="confirm-password"
                                    type="password"
                                    value={passwords.confirm}
                                    onChange={(e) => handlePasswordChange("confirm", e.target.value)}
                                    placeholder={t("profile.security.confirmPlaceholder")}
                                />
                            </div>

                            <Button 
                                className="w-fit" 
                                onClick={handleUpdatePassword}
                                disabled={isLoading}
                            >
                                {isLoading ? t("profile.security.updating") : t("profile.security.updatePassword")}
                            </Button>
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    )
}

