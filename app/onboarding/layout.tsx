import { ProtectedRoute } from "@/components/auth/protected-route"

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
    return (
        <ProtectedRoute>
            {children}
        </ProtectedRoute>
    )
}
