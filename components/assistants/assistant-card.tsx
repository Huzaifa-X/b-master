"use client"

import { Grid } from "@/components/blocks/feature-section-with-card-gradient"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

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
  tabType: "my" | "purchased" | "shared"
}

export function AssistantCard({ assistant, tabType }: AssistantCardProps) {
  const router = useRouter()
  
  return (
    <div className="relative bg-gradient-to-b dark:from-neutral-900 from-neutral-100 dark:to-neutral-950 to-white rounded-3xl overflow-hidden group hover:scale-102 transition-all duration-300 cursor-pointer">
      <Grid size={20} />
      <div className="relative z-20 p-6 flex flex-col h-full min-h-[200px]">
        <div className="flex-1 mb-4">
          <h3 className="text-lg font-bold text-neutral-800 dark:text-white mb-2 line-clamp-1">
            {assistant.name}
          </h3>
          
          <p className="text-neutral-600 dark:text-neutral-400 text-sm line-clamp-3">
            {assistant.description}
          </p>
        </div>
      </div>
    </div>
  )
}

