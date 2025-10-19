"use client"

import { usePathname } from "next/navigation"
import { NavMainDefault } from "./nav-main-default"
import { NavMainAskB } from "./nav-main-askb"
import { NavWizardProgress } from "./nav-wizard-progress"

export function NavMain() {
  const pathname = usePathname()

  // Show wizard progress on assistant creation routes
  if (pathname.startsWith("/assistants/add") || pathname.startsWith("/assistants/new")) {
    return <NavWizardProgress />
  }

  // Route-based rendering logic
  if (pathname.startsWith("/home")) {
    return <NavMainDefault currentPath={pathname} />
  }

  if (pathname.startsWith("/ask-b")) {
    return <NavMainAskB currentPath={pathname} />
  }

  // Add more route conditions here as needed
  // if (pathname.startsWith("/store")) {
  //   return <NavMainStore currentPath={pathname} />
  // }

  // Default fallback
  return <NavMainDefault currentPath={pathname} />
}
