"use client"

import { SidebarTrigger } from "@/components/ui/sidebar"
import { NotificationsDropdown } from "@/components/notifications-dropdown"

export function SiteHeader() {
  return (
    <header className="bg-background sticky top-0 z-50 flex w-full items-center">
      <div className="flex h-16 w-full items-center gap-2 px-4">
        {/* Mobile sidebar trigger - only visible on mobile */}
        <div className="flex md:hidden">
          <SidebarTrigger className="-ml-1" />
        </div>

        {/* Spacer for desktop layout */}
        <div className="hidden md:flex md:w-64" />

        {/* Center content area for breadcrumbs or page title */}
        <div className="flex-1" />

        {/* Right side actions */}
        <div className="flex items-center gap-2">
          <NotificationsDropdown />
        </div>
      </div>
    </header>
  )
}
