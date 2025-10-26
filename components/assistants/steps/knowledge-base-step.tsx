"use client"

import { useRef, useState } from "react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { KnowledgeBaseStepProps } from "@/types/assistant"
import { Plus, X, Upload, File } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

export function KnowledgeBaseStep({ formData, updateFormData }: KnowledgeBaseStepProps) {
  const [newUrl, setNewUrl] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length > 0) {
      updateFormData({
        files: [...formData.files, ...files],
      })
      toast.success(`${files.length} file(s) added`)
    }
  }

  const removeFile = (index: number) => {
    updateFormData({
      files: formData.files.filter((_, i) => i !== index),
    })
    toast.success("File removed")
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
          <Label htmlFor="notes">Notes & Instructions</Label>
          <Textarea
            id="notes"
            placeholder="Add custom instructions, guidelines, or knowledge for your assistant..."
            value={formData.notes}
            onChange={(e) => updateFormData({ notes: e.target.value })}
            rows={6}
            className="resize-none"
          />
          <p className="text-sm text-muted-foreground">
            Provide context and instructions for your assistant
          </p>
        </div>

        {/* URLs Section */}
        <div className="space-y-2">
          <Label>Reference URLs</Label>
          <div className="flex gap-2">
            <Input
              placeholder="https://example.com/documentation"
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && addUrl()}
            />
            <Button onClick={addUrl} size="icon">
              <Plus className="h-4 w-4" />
            </Button>
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
          />
          
          <div
            onClick={handleCardClick}
            className={cn(
              "border-2 border-dashed rounded-lg p-8 text-center transition-all cursor-pointer",
              "hover:border-primary hover:bg-muted/50 active:scale-[0.99]"
            )}
          >
            <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
            <p className="text-sm font-medium mb-1">
              Click to upload files
            </p>
            <p className="text-xs text-muted-foreground">
              Upload documents, PDFs, or text files
            </p>
          </div>

          {formData.files.length > 0 && (
            <div className="space-y-2 mt-3">
              <p className="text-sm font-medium">
                Uploaded Files ({formData.files.length})
              </p>
              {formData.files.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between bg-muted p-3 rounded-md"
                >
                  <div className="flex items-center gap-2 flex-1">
                    <File className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm truncate">{file.name}</span>
                    <span className="text-xs text-muted-foreground">
                      ({(file.size / 1024).toFixed(1)} KB)
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeFile(index)}
                    className="ml-2 bg-transparent hover:bg-transparent text-muted-foreground hover:text-black"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

