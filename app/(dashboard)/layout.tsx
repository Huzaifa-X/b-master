"use client"

import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/layout/sidebar/app-sidebar"
import { SiteHeader } from "@/components/layout/site-header"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { OnboardingTour } from "@/components/shared/onboarding-tour"
import { PromotionBanner } from "@/components/layout/promotion-banner"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ProtectedRoute>
        <SidebarProvider>
          <div className="flex h-dvh w-full pr-0.5">
            <AppSidebar />
            <SidebarInset>
              <PromotionBanner />
              <SiteHeader />
              <div className="flex-1 overflow-y-auto">
                {children}
              </div>
            </SidebarInset>
          </div>
          <OnboardingTour />
        </SidebarProvider>
    </ProtectedRoute>
  )
}