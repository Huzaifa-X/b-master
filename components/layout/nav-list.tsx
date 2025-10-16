"use client"

import { usePathname } from "next/navigation"
import { NavListDefault } from "./nav-list-default"
import { NavListAskB } from "./nav-list-askb"

export function NavList() {
  const pathname = usePathname()

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
