"use client"

import { Grid } from "@/components/blocks/feature-section-with-card-gradient"
import { useState } from "react"
import { AssistantDetailsDialog } from "./assistant-details-dialog"

interface Assistant {
  id: string
  userId?: string
  name: string
  price: number
  description: string
  image: string
  category?: string
  createdAt?: string
}

interface AssistantCardProps {
  assistant: Assistant
  tabType: "my" | "purchased" | "shared" | "marketplace"
  onMarketplaceClick?: (assistant: Assistant) => void
}

export function AssistantCard({ assistant, tabType, onMarketplaceClick }: AssistantCardProps) {
  const [dialogOpen, setDialogOpen] = useState(false)
  
  const handleClick = () => {
    // Always open dialog to show assistant details
    if ( tabType === "marketplace"){
      onMarketplaceClick?.(assistant)
      return
    } else {
      setDialogOpen(true)
    }
  }
  
  return (
    <>
      <div 
        className="relative bg-gradient-to-b dark:from-neutral-900 from-neutral-100 dark:to-neutral-950 to-white rounded-3xl overflow-hidden group hover:scale-102 transition-all duration-300 cursor-pointer" 
        onClick={handleClick}
      >
        <Grid size={20} />
        <div className="relative z-20 p-6 flex flex-col h-full min-h-[200px]">
          <div className="flex-1 mb-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-bold text-neutral-800 dark:text-white line-clamp-1">
                {assistant.name}
              </h3>
              {tabType === "marketplace" && (
                <div className="bg-primary/10 text-primary px-2 py-1 rounded-md text-sm font-semibold">
                  CHF{assistant.price}
                </div>
              )}
            </div>
            
            <p className="text-neutral-600 dark:text-neutral-400 text-sm line-clamp-3">
              {assistant.description}
            </p>
          </div>
        </div>
      </div>

      {/* Assistant Details Dialog - Rendered outside card container */}
      <AssistantDetailsDialog
        assistant={assistant}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </>
  )
}

