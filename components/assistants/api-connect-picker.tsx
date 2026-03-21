// components/assistants/api-connect-picker.tsx
"use client"

import { Cable, Loader2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { useConnectedAPIs } from "@/hooks/useConnectedAPIs"
import { cn } from "@/lib/utils"

const MAX_CONNECTED_APIS = 2

interface ApiConnectPickerProps {
  /** The currently open assistant */
  currentAssistantId?: string
  /** The currently selected API assistant IDs */
  selectedIds: string[]
  /** Callback when the selection changes */
  onChange: (ids: string[]) => void
  disabled?: boolean
}

export function ApiConnectPicker({
  currentAssistantId,
  selectedIds,
  onChange,
  disabled = false,
}: ApiConnectPickerProps) {
  const { apiAssistants, isLoading } = useConnectedAPIs({
    excludeAssistantId: currentAssistantId,
    enabled: !disabled,
  })

  const toggleItem = (id: string) => {
    if (selectedIds.includes(id)) {
      // Remove
      onChange(selectedIds.filter((s) => s !== id))
    } else {
      // Add – enforce max 2
      if (selectedIds.length >= MAX_CONNECTED_APIS) return
      onChange([...selectedIds, id])
    }
  }

  const removeSelection = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    onChange(selectedIds.filter((s) => s !== id))
  }

  const hasSelections = selectedIds.length > 0
  const atMax = selectedIds.length >= MAX_CONNECTED_APIS

  return (
    <div className="flex items-center gap-1">
      {/* Show selected API badges */}
      {selectedIds.map((id) => {
        const assistant = apiAssistants.find((a) => a.assistantId === id)
        if (!assistant) return null
        return (
          <Badge
            key={id}
            variant="secondary"
            className="flex items-center gap-1 h-6 text-xs pr-1 cursor-default"
          >
            <Cable className="h-3 w-3 shrink-0" />
            <span className="max-w-[80px] truncate">{assistant.assistantName}</span>
            <button
              type="button"
              onClick={(e) => removeSelection(id, e)}
              disabled={disabled}
              className="ml-0.5 rounded-full hover:bg-muted p-0.5 transition-colors"
              aria-label={`Remove ${assistant.assistantName}`}
            >
              <X className="h-2.5 w-2.5" />
            </button>
          </Badge>
        )
      })}

      {/* Picker trigger */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant={hasSelections ? "secondary" : "ghost"}
            size="icon"
            disabled={disabled}
            className={cn(
              "h-7 w-7 rounded-full",
              hasSelections && "text-primary"
            )}
            title="Enable API connectors (max 2)"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Cable className="h-4 w-4" />
            )}
          </Button>
        </PopoverTrigger>

        <PopoverContent className="w-64 p-2" side="top" align="start">
          <p className="text-xs font-medium text-muted-foreground mb-2 px-1">
            Your API connectors (max {MAX_CONNECTED_APIS})
          </p>

          {isLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : apiAssistants.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-3 px-1">
              No assistants with active API configurations found. Set one up in an assistant&apos;s API settings.
            </p>
          ) : (
            <div className="flex flex-col gap-1">
              {apiAssistants.map((a) => {
                const isSelected = selectedIds.includes(a.assistantId)
                const isDisabledItem = !isSelected && atMax
                return (
                  <label
                    key={a.assistantId}
                    className={cn(
                      "flex items-center gap-2 rounded-md px-2 py-1.5 cursor-pointer transition-colors",
                      isDisabledItem
                        ? "opacity-40 cursor-not-allowed"
                        : "hover:bg-muted"
                    )}
                  >
                    <Checkbox
                      checked={isSelected}
                      disabled={isDisabledItem}
                      onCheckedChange={() => !isDisabledItem && toggleItem(a.assistantId)}
                      className="shrink-0"
                    />
                    <span className="text-sm truncate">{a.assistantName}</span>
                  </label>
                )
              })}
            </div>
          )}

          {atMax && (
            <p className="text-xs text-muted-foreground mt-2 px-1">
              Maximum of {MAX_CONNECTED_APIS} APIs selected.
            </p>
          )}
        </PopoverContent>
      </Popover>
    </div>
  )
}
