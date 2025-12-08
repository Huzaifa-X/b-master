import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"

export default async function AuthLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const session = await getServerSession(authOptions)

    // If user is already logged in, redirect to home
    if (session) {
        redirect("/home")
    }

    return <>{children}</>
}