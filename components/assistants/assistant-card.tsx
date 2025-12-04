"use client"

import { Grid } from "@/components/blocks/feature-section-with-card-gradient"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { EyeIcon, PencilIcon } from "lucide-react"
import { useState } from "react"

interface Assistant {
  id: string
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
}

export function AssistantCard({ assistant, tabType }: AssistantCardProps) {
  const router = useRouter()
  const [isHovered, setIsHovered] = useState(false)
  const isMyAssistants = tabType === "my"
  
  const handleClick = () => {
    // Don't route for marketplace assistants
    if (tabType === "marketplace") {
      return
    }
    router.push(`/assistants/${assistant.id}`)
  }

  const handleView = (e: React.MouseEvent) => {
    e.stopPropagation()
    router.push(`/assistants/${assistant.id}`)
  }

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation()
    router.push(`/assistants/${assistant.id}/edit`)
  }
  
  return (
    <div 
      className="relative bg-gradient-to-b dark:from-neutral-900 from-neutral-100 dark:to-neutral-950 to-white rounded-3xl overflow-hidden group hover:scale-102 transition-all duration-300 cursor-pointer" 
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
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
                ${assistant.price}
              </div>
            )}
          </div>
          
          <p className="text-neutral-600 dark:text-neutral-400 text-sm line-clamp-3">
            {assistant.description}
          </p>
        </div>
      </div>

      {/* Hover overlay with blur effect and buttons - only for "My Assistants" tab */}
      {isMyAssistants && isHovered && (
        <div className="absolute inset-0 rounded-3xl backdrop-blur-sm border-2 border-[#BDA76D] flex items-center justify-center gap-3 z-30 transition-all duration-300" style={{ backgroundColor: 'rgba(189, 167, 109, 0.1)' }}>
          <div className="flex items-center gap-3">
            <Button
              onClick={handleView}
              size="icon"
              variant="default"
              className="shadow-lg hover:scale-105 transition-transform bg-[#BDA76D] hover:bg-[#BDA76D]/90"
            >
              <EyeIcon className="h-4 w-4" />
            </Button>
            <Button
              onClick={handleEdit}
              size="icon"
              variant="default"
              className="shadow-lg hover:scale-105 transition-transform bg-[#BDA76D] hover:bg-[#BDA76D]/90"
            >
              <PencilIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

