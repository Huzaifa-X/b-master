"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { EyeIcon, PencilIcon, Trash2, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { PresignedNextImage } from "@/components/ui/presigned-next-image"
import { useSession } from "next-auth/react"
import { useAssistantPermissions } from "@/hooks/usePermissions"
import { hardDeleteAssistant } from "@/app/actions/assistant.action"
import { toast } from "sonner"

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
  const { data: session } = useSession()
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  
  // Check permissions to see if user can edit/delete
  const { permissions } = useAssistantPermissions(assistant?.id || null)
  const canEdit = permissions?.access === 'admin' || permissions?.isOwner

  if (!assistant) return null

  const handleView = () => {
    onOpenChange(false)
    router.push(`/assistants/${assistant.id}`)
  }

  const handleEdit = () => {
    onOpenChange(false)
    router.push(`/assistants/${assistant.id}/edit`)
  }

  const handleDeleteClick = () => {
    setShowDeleteDialog(true)
  }

  const handleDeleteConfirm = async () => {
    if (!assistant?.id) return

    setIsDeleting(true)
    try {
      const result = await hardDeleteAssistant(assistant.id)
      
      if (result.success) {
        toast.success("Assistant deleted successfully")
        onOpenChange(false)
        router.push("/assistants")
      } else {
        toast.error(result.error || "Failed to delete assistant")
      }
    } catch (error) {
      console.error("Error deleting assistant:", error)
      toast.error("An error occurred while deleting the assistant")
    } finally {
      setIsDeleting(false)
      setShowDeleteDialog(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-[500px] mx-4 sm:mx-auto">
        <DialogHeader>
          <DialogTitle className="text-xl sm:text-2xl font-bold">Assistant Details</DialogTitle>
          <DialogDescription className="text-sm sm:text-base">
            {canEdit ? "View or edit your assistant information" : "View assistant information"}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 sm:space-y-6 py-2 sm:py-4">
          {/* Logo */}
          <div className="flex justify-center">
            <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden bg-neutral-100 dark:bg-neutral-800">
              {assistant.image ? (
                <PresignedNextImage
                  src={assistant.image}
                  alt={assistant.name}
                  fill
                  className="object-cover"
                  unoptimized
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-2xl sm:text-3xl font-bold text-neutral-400">
                  {assistant.name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="text-xs sm:text-sm font-semibold text-neutral-600 dark:text-neutral-400">
              Name
            </label>
            <p className="text-base sm:text-lg font-bold text-neutral-800 dark:text-white mt-1 break-words">
              {assistant.name}
            </p>
          </div>

          {/* Category */}
          {assistant.category && (
            <div>
              <label className="text-xs sm:text-sm font-semibold text-neutral-600 dark:text-neutral-400">
                Category
              </label>
              <p className="text-sm sm:text-base text-neutral-800 dark:text-white mt-1 break-words">
                {assistant.category}
              </p>
            </div>
          )}

          {/* Description */}
          <div>
            <label className="text-xs sm:text-sm font-semibold text-neutral-600 dark:text-neutral-400">
              Description
            </label>
            <p className="text-sm sm:text-base text-neutral-800 dark:text-white mt-1 leading-relaxed break-words">
              {assistant.description}
            </p>
          </div>

          {/* Action Buttons */}
          <div className={`flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 pt-2 sm:pt-4 ${canEdit ? '' : 'sm:justify-center'}`}>
            <Button
              onClick={handleView}
              className={`w-full ${canEdit ? 'sm:flex-1' : 'sm:w-full'} bg-[#BDA76D] hover:bg-[#BDA76D]/90 text-white text-sm sm:text-base`}
            >
              <EyeIcon className="h-4 w-4 mr-2" />
              View Assistant
            </Button>
            {canEdit && (
              <>
                <Button
                  onClick={handleEdit}
                  className="w-full sm:flex-1 bg-[#BDA76D] hover:bg-[#BDA76D]/90 text-white text-sm sm:text-base"
                >
                  <PencilIcon className="h-4 w-4 mr-2" />
                  Edit Assistant
                </Button>
                <Button
                  onClick={handleDeleteClick}
                  variant="destructive"
                  className="w-full sm:flex-1 text-sm sm:text-base"
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </>
                  )}
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="w-[95vw] max-w-[500px] mx-4 sm:mx-auto">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg sm:text-xl">Delete Assistant</AlertDialogTitle>
            <AlertDialogDescription className="text-sm sm:text-base">
              Are you sure you want to delete "{assistant.name}"? This action cannot be undone and will permanently delete:
              <ul className="list-disc list-inside mt-2 space-y-1 text-xs sm:text-sm">
                <li>All chat messages and conversations</li>
                <li>All artifacts and versions</li>
                <li>All contacts and permissions</li>
                <li>All knowledge base files</li>
                <li>All news feed posts</li>
                <li>All purchase records</li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
            <AlertDialogCancel disabled={isDeleting} className="w-full sm:w-auto order-2 sm:order-1">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 w-full sm:w-auto order-1 sm:order-2 text-sm sm:text-base"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete Forever"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  )
}
