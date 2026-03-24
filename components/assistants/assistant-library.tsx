"use client"

import { useRef, useState, useCallback } from "react"
import { useLocale } from "@/lib/i18n"
import {
  Upload,
  Trash2,
  Eye,
  FileText,
  Globe,
  FileIcon,
  Loader2,
  BookOpen,
  Plus,
  CheckCircle2,
  Clock,
  XCircle,
  Link,
  StickyNote,
  ChevronDown,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import {
  useAssistantLibrary,
  useUploadLibraryFile,
  useDeleteLibraryFile,
  useAddLibraryUrl,
  useAddLibraryNote,
} from "@/hooks/useAssistantLibrary"
import type { LibraryFile } from "@/app/actions/library.action"

// ---------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------

function getFileIcon(file: LibraryFile) {
  if (file.type === "url") return <Globe className="h-4 w-4 shrink-0 text-blue-500" />
  if (file.type === "text") return <FileText className="h-4 w-4 shrink-0 text-amber-500" />
  const ext = file.name.split(".").pop()?.toLowerCase() ?? ""
  if (["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(ext))
    return <FileIcon className="h-4 w-4 shrink-0 text-green-500" />
  if (["pdf"].includes(ext))
    return <FileIcon className="h-4 w-4 shrink-0 text-red-500" />
  return <FileIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
}

function VectorStatusBadge({ status }: { status: string | null | undefined }) {
  const { t } = useLocale()
  if (!status) return null
  if (status === "completed")
    return (
      <span className="inline-flex items-center gap-1 text-xs text-green-600">
        <CheckCircle2 className="h-3 w-3" />
        {t("library.indexed")}
      </span>
    )
  if (status === "in_progress" || status === "cancelling")
    return (
      <span className="inline-flex items-center gap-1 text-xs text-amber-500">
        <Clock className="h-3 w-3" />
        {t("library.indexing")}
      </span>
    )
  if (status === "failed" || status === "cancelled")
    return (
      <span className="inline-flex items-center gap-1 text-xs text-destructive">
        <XCircle className="h-3 w-3" />
        {t("library.failed")}
      </span>
    )
  return (
    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
      <Clock className="h-3 w-3" />
      {status}
    </span>
  )
}

// ---------------------------------------------------------------
// File row
// ---------------------------------------------------------------

interface FileRowProps {
  file: LibraryFile
  assistantId: string
  onDeleteRequest: (file: LibraryFile) => void
  readonly?: boolean
}

function FileRow({ file, assistantId, onDeleteRequest, readonly = false }: FileRowProps) {
  const { t } = useLocale()
  const [previewOpen, setPreviewOpen] = useState(false)

  // Proxy URL routes through our Next.js server – browser never connects to S3 directly
  const proxyUrl =
    file.type === "file"
      ? `/api/assistants/${assistantId}/library/${file.id}`
      : null

  const handlePreview = () => {
    if (file.type === "url") {
      window.open(file.url ?? "#", "_blank", "noopener,noreferrer")
      return
    }
    if (file.type === "text" || file.type === "file") {
      setPreviewOpen(true)
    }
  }

  const canPreview = file.type === "url" || file.type === "text" || !!proxyUrl

  // Derive extension for inline preview decisions
  const ext = file.name.split(".").pop()?.toLowerCase() ?? ""
  const isImage = ["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(ext)
  const isPdf = ext === "pdf"

  return (
    <>
      <div className="group flex items-center gap-3 rounded-lg border px-3 py-2.5 bg-card hover:bg-accent/40 transition-colors">
        <div className="flex items-center justify-center w-7 h-7 rounded bg-muted shrink-0">
          {getFileIcon(file)}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{file.name}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <Badge variant="secondary" className="text-xs h-4 px-1.5 py-0 capitalize">
              {file.type}
            </Badge>
            {file.type === "url" && file.isCrawled !== undefined && (
              <span className="text-xs text-muted-foreground">
                {file.isCrawled ? t("library.crawled") : t("library.pendingCrawl")}
              </span>
            )}
            <VectorStatusBadge status={file.vectorStatus} />
          </div>
        </div>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {canPreview && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handlePreview}
              title={t("common.preview")}
            >
              <Eye className="h-3.5 w-3.5" />
            </Button>
          )}

          {!readonly && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive hover:text-destructive"
              onClick={() => onDeleteRequest(file)}
              title={t("common.delete")}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* Preview dialog for files */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="truncate">{file.name}</DialogTitle>
          </DialogHeader>

          {file.type === "text" ? (
            <ScrollArea className="max-h-[60vh] rounded border p-4">
              <pre className="text-sm whitespace-pre-wrap font-sans">{file.name}</pre>
            </ScrollArea>
          ) : proxyUrl ? (
            isImage ? (
              <div className="flex justify-center max-h-[60vh] overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={proxyUrl}
                  alt={file.name}
                  className="object-contain max-h-[60vh]"
                />
              </div>
            ) : isPdf ? (
              <iframe
                src={proxyUrl}
                className="w-full h-[60vh] rounded border"
                title={file.name}
              />
            ) : (
              <div className="flex flex-col items-center gap-4 py-8">
                <FileIcon className="h-16 w-16 text-muted-foreground" />
                <p className="text-sm text-muted-foreground text-center">
                  {t("library.previewNotAvailable")}
                </p>
                <Button asChild variant="outline">
                  <a href={proxyUrl} download={file.name}>
                    {t("common.downloadFile")}
                  </a>
                </Button>
              </div>
            )
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  )
}

// ---------------------------------------------------------------
// Add URL Dialog
// ---------------------------------------------------------------

interface AddUrlDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  assistantId: string
}

function AddUrlDialog({ open, onOpenChange, assistantId }: AddUrlDialogProps) {
  const { t } = useLocale()
  const [url, setUrl] = useState("")
  const { addUrl, isAdding } = useAddLibraryUrl(assistantId, {
    onSuccess: () => {
      setUrl("")
      onOpenChange(false)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!url.trim()) return
    addUrl(url.trim())
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("library.addUrl")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="lib-url">{t("common.url")}</Label>
            <Input
              id="lib-url"
              placeholder="https://example.com/page"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              autoFocus
              disabled={isAdding}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={isAdding}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isAdding || !url.trim()}>
              {isAdding ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  {t("common.adding")}
                </>
              ) : (
                t("library.addUrl")
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------
// Add Note Dialog
// ---------------------------------------------------------------

interface AddNoteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  assistantId: string
}

function AddNoteDialog({ open, onOpenChange, assistantId }: AddNoteDialogProps) {
  const { t } = useLocale()
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const { addNote, isAdding } = useAddLibraryNote(assistantId, {
    onSuccess: () => {
      setTitle("")
      setContent("")
      onOpenChange(false)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim()) return
    addNote({ title: title.trim(), content: content.trim() })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("library.addNote")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="lib-note-title">{t("library.noteTitle")}</Label>
            <Input
              id="lib-note-title"
              placeholder={t("library.noteTitlePlaceholder")}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
              disabled={isAdding}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lib-note-content">{t("common.note")}</Label>
            <Textarea
              id="lib-note-content"
              placeholder={t("library.noteContentPlaceholder")}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={6}
              disabled={isAdding}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={isAdding}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isAdding || !content.trim()}>
              {isAdding ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  {t("common.adding")}
                </>
              ) : (
                t("library.addNote")
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------
// Main component
// ---------------------------------------------------------------

const ACCEPTED_TYPES = [
  ".pdf",
  ".txt",
  ".md",
  ".csv",
  ".json",
  ".docx",
  ".doc",
  ".xlsx",
  ".xls",
  ".pptx",
  ".ppt",
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".gif",
].join(",")

interface AssistantLibraryProps {
  assistantId: string
  /** When true the component only shows view (no add/delete) */
  readonly?: boolean
}

export function AssistantLibrary({
  assistantId,
  readonly = false,
}: AssistantLibraryProps) {
  const { t } = useLocale()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<LibraryFile | null>(null)
  const [addUrlOpen, setAddUrlOpen] = useState(false)
  const [addNoteOpen, setAddNoteOpen] = useState(false)

  const { files, isLoading } = useAssistantLibrary(assistantId)
  const { uploadFile, isUploading } = useUploadLibraryFile(assistantId)
  const { deleteFile, isDeleting } = useDeleteLibraryFile(assistantId)

  const handleFiles = useCallback(
    (fileList: FileList | null) => {
      if (!fileList) return
      Array.from(fileList).forEach((file) => {
        const fd = new FormData()
        fd.append("file", file)
        uploadFile(fd)
      })
    },
    [uploadFile]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      handleFiles(e.dataTransfer.files)
    },
    [handleFiles]
  )

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => setIsDragging(false)

  const handleDeleteConfirm = () => {
    if (deleteTarget) {
      deleteFile(deleteTarget.id)
      setDeleteTarget(null)
    }
  }

  // Group files by type
  const fileItems = files.filter((f) => f.type === "file")
  const urlItems = files.filter((f) => f.type === "url")
  const textItems = files.filter((f) => f.type === "text")

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">{t("library.title")}</span>
          {!isLoading && (
            <Badge variant="secondary" className="text-xs tabular-nums">
              {files.length}
            </Badge>
          )}
        </div>

        {!readonly && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 gap-1 text-xs px-2"
                disabled={isUploading}
              >
                {isUploading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Plus className="h-3.5 w-3.5" />
                )}
                {t("common.add")}
                <ChevronDown className="h-3 w-3 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
                <Upload className="h-3.5 w-3.5 mr-2" />
                {t("common.file")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setAddUrlOpen(true)}>
                <Link className="h-3.5 w-3.5 mr-2" />
                {t("common.url")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setAddNoteOpen(true)}>
                <StickyNote className="h-3.5 w-3.5 mr-2" />
                {t("common.note")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={ACCEPTED_TYPES}
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {/* Drop zone + list */}
      <ScrollArea className="flex-1">
        <div
          className={cn(
            "flex flex-col gap-1.5 p-3 min-h-full transition-colors",
            isDragging && "bg-primary/5 ring-2 ring-primary/30 ring-inset rounded-lg"
          )}
          onDrop={!readonly ? handleDrop : undefined}
          onDragOver={!readonly ? handleDragOver : undefined}
          onDragLeave={!readonly ? handleDragLeave : undefined}
        >
          {/* Loading skeleton */}
          {isLoading && (
            <>
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 rounded-lg border px-3 py-2.5"
                >
                  <Skeleton className="h-7 w-7 rounded" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3.5 w-3/4" />
                    <Skeleton className="h-3 w-1/4" />
                  </div>
                </div>
              ))}
            </>
          )}

          {/* Empty state */}
          {!isLoading && files.length === 0 && (
            <div
              className={cn(
                "flex flex-col items-center justify-center gap-3 py-12 text-center rounded-lg border-2 border-dashed",
                isDragging ? "border-primary" : "border-muted-foreground/25"
              )}
            >
              {!readonly ? (
                <>
                  <Upload className="h-8 w-8 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      {t("library.noItems")}
                    </p>
                    <p className="text-xs text-muted-foreground/70 mt-0.5">
                      {t("library.addItemsDescription")}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                  >
                    <Upload className="h-3.5 w-3.5 mr-1.5" />
                    {t("common.chooseFiles")}
                  </Button>
                </>
              ) : (
                <>
                  <BookOpen className="h-8 w-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    {t("library.noFilesInLibrary")}
                  </p>
                </>
              )}
            </div>
          )}

          {/* Files */}
          {!isLoading && files.length > 0 && (
            <>
              {/* Drop zone hint when dragging */}
              {isDragging && (
                <div className="flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-primary py-4 mb-1">
                  <Upload className="h-4 w-4 text-primary" />
                  <span className="text-sm text-primary font-medium">
                    {t("library.dropToUpload")}
                  </span>
                </div>
              )}

              {fileItems.length > 0 && (
                <section>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground px-1 mb-1 mt-1">
                    {t("library.filesCount", { n: fileItems.length })}
                  </p>
                  <div className="flex flex-col gap-1">
                    {fileItems.map((f) => (
                      <FileRow
                        key={f.id}
                        file={f}
                        assistantId={assistantId}
                        onDeleteRequest={setDeleteTarget}
                        readonly={readonly}
                      />
                    ))}
                  </div>
                </section>
              )}

              {urlItems.length > 0 && (
                <section className={fileItems.length > 0 ? "mt-3" : ""}>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground px-1 mb-1 mt-1">
                    {t("library.urlsCount", { n: urlItems.length })}
                  </p>
                  <div className="flex flex-col gap-1">
                    {urlItems.map((f) => (
                      <FileRow
                        key={f.id}
                        file={f}
                        assistantId={assistantId}
                        onDeleteRequest={setDeleteTarget}
                        readonly={readonly}
                      />
                    ))}
                  </div>
                </section>
              )}

              {textItems.length > 0 && (
                <section
                  className={
                    fileItems.length > 0 || urlItems.length > 0 ? "mt-3" : ""
                  }
                >
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground px-1 mb-1 mt-1">
                    {t("library.notesCount", { n: textItems.length })}
                  </p>
                  <div className="flex flex-col gap-1">
                    {textItems.map((f) => (
                      <FileRow
                        key={f.id}
                        file={f}
                        assistantId={assistantId}
                        onDeleteRequest={setDeleteTarget}
                        readonly={readonly}
                      />
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      </ScrollArea>

      {/* Add Dialogs */}
      <AddUrlDialog
        open={addUrlOpen}
        onOpenChange={setAddUrlOpen}
        assistantId={assistantId}
      />
      <AddNoteDialog
        open={addNoteOpen}
        onOpenChange={setAddNoteOpen}
        assistantId={assistantId}
      />

      {/* Delete confirmation */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("library.deleteConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("library.deleteConfirmDescription", { name: deleteTarget?.name ?? "" })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  {t("common.removing")}
                </>
              ) : (
                t("common.remove")
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
