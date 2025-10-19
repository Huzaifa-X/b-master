"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"
import { NavMainDefault } from "./nav-main-default"
import { NavMainAskB } from "./nav-main-askb"
import { NavWizardProgress } from "./nav-wizard-progress"
import { NavMainAssistant } from "./nav-main-assistant"
import { useAssistantStore } from "@/lib/stores/assistant-store"

export function NavMain() {
  const pathname = usePathname()
  const setAssistantMode = useAssistantStore((state) => state.setAssistantMode)
  const clearAssistantMode = useAssistantStore((state) => state.clearAssistantMode)

  // Update assistant mode based on pathname
  useEffect(() => {
    if (pathname.startsWith("/assistants/") && !pathname.startsWith("/assistants/add")) {
      const assistantId = pathname.split("/")[2]
      setAssistantMode(assistantId, "Assistant Name")
    } else {
      clearAssistantMode()
    }
  }, [pathname, setAssistantMode, clearAssistantMode])

  // Show wizard progress on assistant creation routes
  if (pathname.startsWith("/assistants/add") || pathname.startsWith("/assistants/new")) {
    return <NavWizardProgress />
  }

  // Show assistant navigation when viewing an assistant
  if (pathname.startsWith("/assistants/") && !pathname.startsWith("/assistants/add")) {
    return <NavMainAssistant currentPath={pathname} />
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
