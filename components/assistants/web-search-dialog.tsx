"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Globe, Search } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"

interface WebSearchOptions {
  query?: string
  includeSources?: boolean
  maxResults?: number
  safeSearch?: boolean
}

interface WebSearchDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (options: WebSearchOptions) => void
}

export function WebSearchDialog({
  open,
  onOpenChange,
  onConfirm,
}: WebSearchDialogProps) {
  const [query, setQuery] = useState("")
  const [includeSources, setIncludeSources] = useState(true)
  const [maxResults, setMaxResults] = useState(10)
  const [safeSearch, setSafeSearch] = useState(true)

  const handleConfirm = () => {
    const options: WebSearchOptions = {
      query: query.trim() || undefined,
      includeSources,
      maxResults,
      safeSearch,
    }
    onConfirm(options)
    onOpenChange(false)

    // Reset form
    setQuery("")
    setIncludeSources(true)
    setMaxResults(10)
    setSafeSearch(true)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Web Search Configuration
          </DialogTitle>
          <DialogDescription>
            Configure your web search parameters. The AI will search the web and include relevant results in the conversation.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="search-query">Search Query (Optional)</Label>
            <Input
              id="search-query"
              placeholder="Enter specific search terms..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              If left empty, the AI will generate search queries based on your message.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="max-results">Maximum Results</Label>
            <Input
              id="max-results"
              type="number"
              min="1"
              max="20"
              value={maxResults}
              onChange={(e) => setMaxResults(Number(e.target.value))}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="include-sources"
              checked={includeSources}
              onCheckedChange={setIncludeSources}
            />
            <Label htmlFor="include-sources" className="text-sm">
              Include source links in response
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="safe-search"
              checked={safeSearch}
              onCheckedChange={setSafeSearch}
            />
            <Label htmlFor="safe-search" className="text-sm">
              Enable safe search filtering
            </Label>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} className="gap-2">
            <Search className="h-4 w-4" />
            Enable Web Search
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
