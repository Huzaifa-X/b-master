"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { Loader2 } from "lucide-react"
import { ProtectedRouteProps } from "@/types/auth"

export function ProtectedRoute({
    children,
    redirectTo = "/login"
}: ProtectedRouteProps) {
    const { data: session, status } = useSession()
    const router = useRouter()

    useEffect(() => {
        if (status === "unauthenticated") {
            router.push(redirectTo)
        }
    }, [status, router, redirectTo])

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