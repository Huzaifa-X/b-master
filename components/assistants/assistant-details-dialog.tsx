"use client"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { EyeIcon, PencilIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import Image from "next/image"

interface Assistant {
  id: string
  name: string
  price: number
  description: string
  image: string
  category?: string
  createdAt?: string
}

interface AssistantDetailsDialogProps {
  assistant: Assistant | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AssistantDetailsDialog({
  assistant,
  open,
  onOpenChange,
}: AssistantDetailsDialogProps) {
  const router = useRouter()

  if (!assistant) return null

  const handleView = () => {
    onOpenChange(false)
    router.push(`/assistants/${assistant.id}`)
  }

  const handleEdit = () => {
    onOpenChange(false)
    router.push(`/assistants/${assistant.id}/edit`)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Assistant Details</DialogTitle>
          <DialogDescription>
            View or edit your assistant information
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Logo */}
          <div className="flex justify-center">
            <div className="relative w-24 h-24 rounded-full overflow-hidden bg-neutral-100 dark:bg-neutral-800">
              {assistant.image ? (
                <Image
                  src={assistant.image}
                  alt={assistant.name}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-neutral-400">
                  {assistant.name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="text-sm font-semibold text-neutral-600 dark:text-neutral-400">
              Name
            </label>
            <p className="text-lg font-bold text-neutral-800 dark:text-white mt-1">
              {assistant.name}
            </p>
          </div>

          {/* Category */}
          {assistant.category && (
            <div>
              <label className="text-sm font-semibold text-neutral-600 dark:text-neutral-400">
                Category
              </label>
              <p className="text-base text-neutral-800 dark:text-white mt-1">
                {assistant.category}
              </p>
            </div>
          )}

          {/* Description */}
          <div>
            <label className="text-sm font-semibold text-neutral-600 dark:text-neutral-400">
              Description
            </label>
            <p className="text-base text-neutral-800 dark:text-white mt-1 leading-relaxed">
              {assistant.description}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-4">
            <Button
              onClick={handleView}
              className="flex-1 bg-[#BDA76D] hover:bg-[#BDA76D]/90 text-white"
            >
              <EyeIcon className="h-4 w-4 mr-2" />
              View Assistant
            </Button>
            <Button
              onClick={handleEdit}
              className="flex-1 bg-[#BDA76D] hover:bg-[#BDA76D]/90 text-white"
            >
              <PencilIcon className="h-4 w-4 mr-2" />
              Edit Assistant
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
