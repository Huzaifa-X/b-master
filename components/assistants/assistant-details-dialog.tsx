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
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Assistant Details</DialogTitle>
          <DialogDescription>
            {canEdit ? "View or edit your assistant information" : "View assistant information"}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Logo */}
          <div className="flex justify-center">
            <div className="relative w-24 h-24 rounded-full overflow-hidden bg-neutral-100 dark:bg-neutral-800">
              {assistant.image ? (
                <PresignedNextImage
                  src={assistant.image}
                  alt={assistant.name}
                  fill
                  className="object-cover"
                  unoptimized
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
          <div className={`flex items-center gap-3 pt-4 ${canEdit ? '' : 'justify-center'}`}>
            <Button
              onClick={handleView}
              className={`${canEdit ? 'flex-1' : 'w-full'} bg-[#BDA76D] hover:bg-[#BDA76D]/90 text-white`}
            >
              <EyeIcon className="h-4 w-4 mr-2" />
              View Assistant
            </Button>
            {canEdit && (
              <>
                <Button
                  onClick={handleEdit}
                  className="flex-1 bg-[#BDA76D] hover:bg-[#BDA76D]/90 text-white"
                >
                  <PencilIcon className="h-4 w-4 mr-2" />
                  Edit Assistant
                </Button>
                <Button
                  onClick={handleDeleteClick}
                  variant="destructive"
                  className="flex-1"
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
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Assistant</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{assistant.name}"? This action cannot be undone and will permanently delete:
              <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                <li>All chat messages and conversations</li>
                <li>All artifacts and versions</li>
                <li>All contacts and permissions</li>
                <li>All knowledge base files</li>
                <li>All news feed posts</li>
                <li>All purchase records</li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
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
