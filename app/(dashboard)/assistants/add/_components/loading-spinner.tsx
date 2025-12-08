"use client"

import { Spinner } from "@/components/ui/spinner"

export function LoadingSpinner() {
  return (
    <div className="flex flex-col items-center justify-center py-8">
      <Spinner className="w-12 h-12 mb-4 text-primary" />
      <p className="text-sm text-muted-foreground font-medium">
        Generating instructions...
      </p>
    </div>
  )
}
