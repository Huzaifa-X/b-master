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
import { EyeIcon, PencilIcon, Trash2, Loader2, Copy, LogOut, Link2, Check } from "lucide-react"
import { useRouter } from "next/navigation"
import { PresignedNextImage } from "@/components/ui/presigned-next-image"
import { useAssistantPermissions } from "@/hooks/usePermissions"
import { useHardDeleteAssistant } from "@/hooks/useAssistantMutations"
import { leaveAssistant, duplicateAssistant } from "@/app/actions/assistant.action"
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
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showLeaveDialog, setShowLeaveDialog] = useState(false)
  const [isDuplicating, setIsDuplicating] = useState(false)
  const [isLeaving, setIsLeaving] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)

  // Check permissions to see if user can edit/delete
  const { permissions } = useAssistantPermissions(assistant?.id || null)
  const canEdit = permissions?.access === 'admin' || permissions?.isOwner
  const isOwner = permissions?.isOwner
  // A shared (non-owner) user can leave
  const isSharedUser = permissions !== null && !isOwner

  // Delete assistant mutation
  const { deleteAssistantAsync, isDeleting } = useHardDeleteAssistant({
    onSuccess: () => {
      onOpenChange(false)
      router.push("/assistants")
    }
  })

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
    await deleteAssistantAsync(assistant.id)
    setShowDeleteDialog(false)
  }

  const handleCopyLink = async () => {
    const link = `${window.location.origin}/assistants/${assistant.id}`
    await navigator.clipboard.writeText(link)
    setLinkCopied(true)
    toast.success("Link copied to clipboard!")
    setTimeout(() => setLinkCopied(false), 2000)
  }

  const handleDuplicate = async () => {
    if (!assistant?.id) return
    setIsDuplicating(true)
    try {
      const result = await duplicateAssistant(assistant.id)
      if (result.success && result.newAssistantId) {
        toast.success(`"Copy of ${assistant.name}" created!`)
        onOpenChange(false)
        router.push(`/assistants/${result.newAssistantId}/edit`)
      } else {
        toast.error(result.error || "Failed to duplicate assistant")
      }
    } catch {
      toast.error("Failed to duplicate assistant")
    } finally {
      setIsDuplicating(false)
    }
  }

  const handleLeaveConfirm = async () => {
    if (!assistant?.id) return
    setIsLeaving(true)
    try {
      const result = await leaveAssistant(assistant.id)
      if (result.success) {
        toast.success(`You have left "${assistant.name}"`)
        setShowLeaveDialog(false)
        onOpenChange(false)
        router.push("/assistants")
      } else {
        toast.error(result.error || "Failed to leave assistant")
      }
    } catch {
      toast.error("Failed to leave assistant")
    } finally {
      setIsLeaving(false)
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
          <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2 sm:gap-3 pt-2 sm:pt-4">
            <Button
              onClick={handleView}
              className="w-full sm:flex-1 bg-[#BDA76D] hover:bg-[#BDA76D]/90 text-white text-sm sm:text-base"
            >
              <EyeIcon className="h-4 w-4 mr-2" />
              View Assistant
            </Button>

            {/* Copy shareable link — available to all users */}
            <Button
              onClick={handleCopyLink}
              variant="outline"
              className="w-full sm:flex-1 text-sm sm:text-base"
            >
              {linkCopied ? (
                <>
                  <Check className="h-4 w-4 mr-2 text-green-500" />
                  Copied!
                </>
              ) : (
                <>
                  <Link2 className="h-4 w-4 mr-2" />
                  Copy Link
                </>
              )}
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
                  onClick={handleDuplicate}
                  variant="outline"
                  className="w-full sm:flex-1 text-sm sm:text-base"
                  disabled={isDuplicating}
                >
                  {isDuplicating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Duplicating...
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-2" />
                      Duplicate
                    </>
                  )}
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

            {/* Leave button — only for shared (non-owner) users */}
            {isSharedUser && (
              <Button
                onClick={() => setShowLeaveDialog(true)}
                variant="outline"
                className="w-full sm:flex-1 border-orange-300 text-orange-600 hover:bg-orange-50 dark:border-orange-700 dark:text-orange-400 dark:hover:bg-orange-950 text-sm sm:text-base"
                disabled={isLeaving}
              >
                {isLeaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Leaving...
                  </>
                ) : (
                  <>
                    <LogOut className="h-4 w-4 mr-2" />
                    Leave Assistant
                  </>
                )}
              </Button>
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

      {/* Leave Confirmation Dialog */}
      <AlertDialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
        <AlertDialogContent className="w-[95vw] max-w-[500px] mx-4 sm:mx-auto">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg sm:text-xl">Leave Assistant</AlertDialogTitle>
            <AlertDialogDescription className="text-sm sm:text-base">
              Are you sure you want to leave &quot;{assistant.name}&quot;? You will lose access to this assistant and all its features. The owner can re-add you later if needed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
            <AlertDialogCancel disabled={isLeaving} className="w-full sm:w-auto order-2 sm:order-1">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLeaveConfirm}
              disabled={isLeaving}
              className="bg-orange-500 text-white hover:bg-orange-600 w-full sm:w-auto order-1 sm:order-2 text-sm sm:text-base"
            >
              {isLeaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Leaving...
                </>
              ) : (
                "Leave Assistant"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  )
}
