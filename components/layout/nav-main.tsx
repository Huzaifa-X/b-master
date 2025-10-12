"use client"

import { usePathname } from "next/navigation"
import { NavMainDefault } from "./nav-main-default"

export function NavMain() {
  const pathname = usePathname()

  // Route-based rendering logic
  if (pathname.startsWith("/home")) {
    return <NavMainDefault currentPath={pathname} />
  }

  // Add more route conditions here as needed
  // if (pathname.startsWith("/store")) {
  //   return <NavMainStore currentPath={pathname} />
  // }

  // Default fallback
  return <NavMainDefault currentPath={pathname} />
}
