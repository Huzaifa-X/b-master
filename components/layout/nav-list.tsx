"use client"

import { usePathname } from "next/navigation"
import { NavListDefault } from "./nav-list-default"

export function NavList() {
  const pathname = usePathname()

  // Route-based rendering logic
  if (pathname.startsWith("/home")) {
    return <NavListDefault />
  }

  // Add more route conditions here as needed
  // if (pathname.startsWith("/store")) {
  //   return <NavListStore />
  // }

  // Default fallback
  return <NavListDefault />
}
