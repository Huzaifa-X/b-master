"use client"

import { usePathname } from "next/navigation"
import { NavListDefault } from "./nav-list-default"
import { NavListAskB } from "./nav-list-askb"
import { NavListAssistant } from "./nav-list-assistant"

export function NavList() {
  const pathname = usePathname()

  if (pathname.startsWith("/assistants/") && !pathname.startsWith("/assistants/add") && !pathname.includes("/edit")) {
    return <NavListAssistant />
  }

  if (pathname.startsWith("/assistants/add") || pathname.startsWith("/assistants/new") || (pathname.startsWith("/assistants/") && pathname.includes("/edit"))) {
    return null
  }

  // Route-based rendering logic
  if (pathname.startsWith("/home")) {
    return <NavListDefault />
  }

  if (pathname.startsWith("/ask-b")) {
    return <NavListAskB />
  }

  // Add more route conditions here as needed
  // if (pathname.startsWith("/store")) {
  //   return <NavListStore />
  // }

  // Default fallback
  return <NavListDefault />
}
