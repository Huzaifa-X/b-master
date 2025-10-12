import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/layout/app-sidebar"
import { SiteHeader } from "@/components/layout/site-header"
import { Toaster } from "sonner"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SidebarProvider>
      <div className="flex h-dvh w-full pr-0.5">
        <AppSidebar />
        <SidebarInset>
          <SiteHeader />
          <div className="flex-1 overflow-hidden">
            {children}
          </div>
          <Toaster />
        </SidebarInset>
      </div>
    </SidebarProvider>
  )
}