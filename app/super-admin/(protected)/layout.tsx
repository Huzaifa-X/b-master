import { redirect } from "next/navigation"
import { getSuperAdminSession } from "@/lib/super-admin-auth"
import { SaNav } from "./_components/sa-nav"

export default async function SuperAdminProtectedLayout({ children }: { children: React.ReactNode }) {
  const session = await getSuperAdminSession()
  if (!session) redirect("/super-admin/login")

  return (
    <div className="min-h-screen bg-background flex">
      <SaNav />
      <main className="flex-1 min-h-screen overflow-auto">
        <div className="p-6 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  )
}
