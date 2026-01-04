"use client"

import { useRef, useState } from "react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { KnowledgeBaseStepProps } from "@/types/assistant"
import { Plus, X, Upload, File, Download, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { uploadFileToS3, deleteFileFromS3 } from "@/app/actions/upload.action"

export function KnowledgeBaseStep({ formData, updateFormData }: KnowledgeBaseStepProps) {
  const [newNote, setNewNote] = useState("")
  const [newUrl, setNewUrl] = useState("")
  const [isUploading, setIsUploading] = useState(false)
  const [uploadingFiles, setUploadingFiles] = useState<Set<string>>(new Set())
  const fileInputRef = useRef<HTMLInputElement>(null)

  const addNote = () => {
    if (newNote.trim()) {
      updateFormData({ notes: [...formData.notes, newNote.trim()] })
      setNewNote("")
    }
  }

  const removeNote = (index: number) => {
    updateFormData({
      notes: formData.notes.filter((_, i) => i !== index),
    })
  }

  const addUrl = () => {
    if (newUrl.trim()) {
      try {
        new URL(newUrl)
        updateFormData({ urls: [...formData.urls, newUrl.trim()] })
        setNewUrl("")
      } catch {
        toast.error("Please enter a valid URL")
      }
    }
  }

  const removeUrl = (index: number) => {
    updateFormData({
      urls: formData.urls.filter((_, i) => i !== index),
    })
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    // Allowed file types
    const allowedTypes = [
      // PDFs
      'application/pdf',
      // Text files
      'text/plain',
      'text/csv',
      'text/markdown',
      'text/html',
      // Microsoft Office documents
      'application/msword', // .doc
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
      'application/vnd.ms-excel', // .xls
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-powerpoint', // .ppt
      'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
      // Other document formats
      'application/rtf',
      'application/vnd.oasis.opendocument.text', // .odt
      'application/vnd.oasis.opendocument.spreadsheet', // .ods
    ]

    const maxFileSize = 50 * 1024 * 1024 // 50MB in bytes

    // Validate files before processing
    const validFiles: File[] = []
    const invalidFiles: Array<{ name: string; reason: string }> = []

    for (const file of files) {
      // Check file size
      if (file.size > maxFileSize) {
        invalidFiles.push({
          name: file.name,
          reason: `File size exceeds 50MB limit (${(file.size / 1024 / 1024).toFixed(2)}MB)`
        })
        continue
      }

      // Check file type
      const fileExtension = file.name.split('.').pop()?.toLowerCase()
      const isValidType = allowedTypes.includes(file.type) || 
        (fileExtension && [
          'pdf', 'txt', 'csv', 'md', 'html', 'doc', 'docx', 
          'xls', 'xlsx', 'ppt', 'pptx', 'rtf', 'odt', 'ods'
        ].includes(fileExtension))

      if (!isValidType) {
        invalidFiles.push({
          name: file.name,
          reason: 'File type not allowed. Only documents, PDFs, and text files are permitted'
        })
        continue
      }

      validFiles.push(file)
    }

    // Show errors for invalid files
    if (invalidFiles.length > 0) {
      invalidFiles.forEach(({ name, reason }) => {
        toast.error(`${name}: ${reason}`)
      })
    }

    if (validFiles.length === 0) {
      // Reset file input if no valid files
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
      return
    }

    setIsUploading(true)
    const successfulUploads: Array<{ url: string; fileName: string; fileSize: number }> = []
    let failedCount = 0

    for (const file of validFiles) {
      // Add to uploading set
      setUploadingFiles(prev => new Set(prev).add(file.name))

      try {
        // Create FormData for this file
        const formDataObj = new FormData()
        formDataObj.append("file", file)
        formDataObj.append("folder", "knowledge-base")

        // Upload to S3
        const uploadResult = await uploadFileToS3(formDataObj)

        if (uploadResult.success && uploadResult.url) {
          successfulUploads.push({
            url: uploadResult.url,
            fileName: uploadResult.fileName || file.name,
            fileSize: uploadResult.fileSize || file.size
          })
        } else {
          failedCount++
          toast.error(`Failed to upload ${file.name}: ${uploadResult.error}`)
        }
      } catch (error: any) {
        console.error(`Error uploading ${file.name}:`, error)
        failedCount++
        toast.error(`Failed to upload ${file.name}`)
      } finally {
        // Remove from uploading set
        setUploadingFiles(prev => {
          const newSet = new Set(prev)
          newSet.delete(file.name)
          return newSet
        })
      }
    }

    // Update form data with successfully uploaded files
    if (successfulUploads.length > 0) {
      updateFormData({
        fileURLs: [...(formData.fileURLs || []), ...successfulUploads]
      })
      toast.success(`${successfulUploads.length} file(s) uploaded successfully`)
    }

    if (failedCount > 0) {
      toast.error(`${failedCount} file(s) failed to upload`)
    }

    setIsUploading(false)

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const removeFile = async (index: number) => {
    const fileToRemove = formData.fileURLs?.[index]

    if (!fileToRemove) return

    // Delete from S3 first
    try {
      const deleteResult = await deleteFileFromS3(fileToRemove.url)
      if (deleteResult.success) {
        // Remove from form data after successful S3 deletion
        updateFormData({
          fileURLs: (formData.fileURLs || []).filter((_, i) => i !== index)
        })
        toast.success("File removed from storage")
      } else {
        console.warn("Failed to delete file from S3:", deleteResult.error)
        // Still remove from form data, but warn user
        updateFormData({
          fileURLs: (formData.fileURLs || []).filter((_, i) => i !== index)
        })
        toast.warning("File removed locally, but may still exist in storage")
      }
    } catch (error) {
      console.error("Error deleting file:", error)
      // Still remove from form data, but warn user
      updateFormData({
        fileURLs: (formData.fileURLs || []).filter((_, i) => i !== index)
      })
      toast.warning("File removed locally, but may still exist in storage")
    }
  }

  const handleDownloadFile = (fileUrl: string, fileName: string) => {
    try {
      // Open the S3 URL in a new tab to download
      const link = document.createElement('a')
      link.href = fileUrl
      link.download = fileName
      link.target = '_blank'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      toast.success("Download started")
    } catch (error) {
      console.error("Error downloading file:", error)
      toast.error("Failed to download file")
    }
  }

  const handleCardClick = () => {
    fileInputRef.current?.click()
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Knowledge Base</h2>
        <p className="text-muted-foreground">
          Add information sources for your assistant to reference
        </p>
      </div>

      <div className="space-y-6">
        {/* Notes Section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Notes</Label>
            <Button onClick={addNote} size="icon" className="self-start">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex gap-2">
            <Textarea
              placeholder="Add notes, guidelines, or knowledge for your assistant..."
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && e.ctrlKey && addNote()}
              rows={3}
              className="resize-none"
            />
          </div>
          {formData.notes.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-3">
              {formData.notes.map((note, index) => (
                <div
                  key={index}
                  className="group relative bg-muted rounded-md p-4"
                >
                  <p className="text-sm whitespace-pre-wrap text-foreground pr-8 break-words">
                    {note}
                  </p>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeNote(index)}
                    className="absolute top-2 right-2 h-6 w-6 hover:bg-destructive/10 hover:text-destructive"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
          <p className="text-sm text-muted-foreground">
            Add notes and context for your assistant
          </p>
        </div>

        {/* URLs Section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Reference URLs</Label>
            <Button onClick={addUrl} size="icon" className="self-start">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="https://example.com/documentation"
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && addUrl()}
            />
          </div>
          {formData.urls.length > 0 && (
            <div className="space-y-2 mt-3">
              {formData.urls.map((url, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between bg-muted p-3 rounded-md"
                >
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline truncate flex-1"
                  >
                    {url}
                  </a>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeUrl(index)}
                    className="ml-2 bg-transparent hover:bg-transparent text-muted-foreground hover:text-black"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
          <p className="text-sm text-muted-foreground">
            Add URLs that your assistant can reference
          </p>
        </div>

        {/* Files Section */}
        <div className="space-y-2">
          <Label>Upload Files</Label>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileChange}
            className="hidden"
            id="files-upload"
            accept=".pdf,.txt,.csv,.md,.html,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.rtf,.odt,.ods,application/pdf,text/plain,text/csv,text/markdown,text/html,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/rtf,application/vnd.oasis.opendocument.text,application/vnd.oasis.opendocument.spreadsheet"
          />

          <div
            onClick={isUploading ? undefined : handleCardClick}
            className={cn(
              "border-2 border-dashed rounded-lg p-8 text-center transition-all",
              isUploading
                ? "cursor-not-allowed opacity-60"
                : "cursor-pointer hover:border-primary hover:bg-muted/50 active:scale-[0.99]"
            )}
          >
            {isUploading ? (
              <>
                <Loader2 className="h-10 w-10 mx-auto mb-3 text-primary animate-spin" />
                <p className="text-sm font-medium mb-1">
                  Uploading files...
                </p>
                <p className="text-xs text-muted-foreground">
                  Please wait while files are being uploaded to cloud storage
                </p>
              </>
            ) : (
              <>
                <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                <p className="text-sm font-medium mb-1">
                  Click to upload files
                </p>
                <p className="text-xs text-muted-foreground">
                  Upload documents, PDFs, or text files (max 50MB each)
                </p>
              </>
            )}
          </div>

          {uploadingFiles.size > 0 && (
            <div className="space-y-2 mt-3">
              <p className="text-sm font-medium text-muted-foreground">
                Uploading... ({uploadingFiles.size} file{uploadingFiles.size > 1 ? 's' : ''})
              </p>
              {Array.from(uploadingFiles).map((fileName) => (
                <div
                  key={fileName}
                  className="flex items-center gap-2 bg-muted p-3 rounded-md"
                >
                  <Loader2 className="h-4 w-4 text-primary animate-spin flex-shrink-0" />
                  <span className="text-sm truncate">{fileName}</span>
                </div>
              ))}
            </div>
          )}

          {(formData.fileURLs?.length ?? 0) > 0 && (
            <div className="space-y-2 mt-3">
              <p className="text-sm font-medium">
                Uploaded Files ({formData.fileURLs?.length ?? 0})
              </p>
              {(formData.fileURLs || []).map((file, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between bg-muted p-3 rounded-md"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <File className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-sm truncate break-words">{file.fileName}</span>
                    <span className="text-xs text-muted-foreground flex-shrink-0">
                      ({(file.fileSize / 1024).toFixed(1)} KB)
                    </span>
                  </div>
                  <div className="flex items-center gap-1 ml-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDownloadFile(file.url, file.fileName)}
                      className="h-8 w-8 bg-transparent hover:bg-transparent text-muted-foreground hover:text-primary"
                      title="Download file"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeFile(index)}
                      className="h-8 w-8 bg-transparent hover:bg-transparent text-muted-foreground hover:text-destructive"
                      title="Remove file"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

