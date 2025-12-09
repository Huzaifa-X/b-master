"use client"

import { useEffect, useState } from "react"
import { createPortal } from "react-dom"

interface MentionDropdownPortalProps {
  children: React.ReactNode
}

export function MentionDropdownPortal({ children }: MentionDropdownPortalProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  if (!mounted) return null

  return createPortal(children, document.body)
}

