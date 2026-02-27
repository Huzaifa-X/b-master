"use client"

import { useSession } from "next-auth/react"
import { useRouter, usePathname } from "next/navigation"
import { useEffect } from "react"
import { Loader2 } from "lucide-react"
import { ProtectedRouteProps } from "@/types/auth"

export function ProtectedRoute({
    children,
    redirectTo = "/login"
}: ProtectedRouteProps) {
    const { data: session, status } = useSession()
    const router = useRouter()
    const pathname = usePathname()

    useEffect(() => {
        if (status === "unauthenticated") {
            router.push(redirectTo)
            return
        }

        if (status === "authenticated" && session?.user) {
            // Check onboarding status
            const isOnboardingRoute = pathname === "/onboarding"
            const hasCompletedOnboarding = session.user.hasCompletedOnboarding

            if (!hasCompletedOnboarding && !isOnboardingRoute) {
                router.push("/onboarding")
            } else if (hasCompletedOnboarding && isOnboardingRoute) {
                // Prevent going back to onboarding if already completed
                router.push("/home")
            }
        }
    }, [status, session, router, pathname, redirectTo])

    if (status === "loading") {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        )
    }

    if (!session) {
        return null
    }

    return <>{children}</>
}