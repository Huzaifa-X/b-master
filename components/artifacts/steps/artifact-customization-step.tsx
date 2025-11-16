"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  ChevronDown,
  Settings,
  Plus,
  Trash2,
  Cpu,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { UserSelectTable, type SelectedUser } from "@/components/shared/user-select-table"
import { ICON_MAP } from "./constants"
import type { Template, ArtifactFormData, ApiConfig, Contact } from "@/types/artifacts"
import { ArtifactAIInstructionDialog } from "./artifact-ai-instruction-dialog"

interface ArtifactCustomizationStepProps {
  selectedTemplate: Template
  formData: ArtifactFormData
  setFormData: (data: ArtifactFormData | ((prev: ArtifactFormData) => ArtifactFormData)) => void
  errors: Partial<Record<keyof ArtifactFormData, string>>
  setErrors: (errors: Partial<Record<keyof ArtifactFormData, string>>) => void
  onBack: () => void
  contacts: Contact[]
  loadingContacts: boolean
}

export function ArtifactCustomizationStep({
  selectedTemplate,
  formData,
  setFormData,
  errors,
  setErrors,
  onBack,
  contacts,
  loadingContacts,
}: ArtifactCustomizationStepProps) {
  const [apiSectionOpen, setApiSectionOpen] = useState(false)
  const [aiDialogOpen, setAiDialogOpen] = useState(false)

  // Get available contacts (not yet added)
  const availableContacts = contacts.filter(
    (contact) => !formData.selectedUsers.some((user) => user.id === contact.id)
  )

  // User Select Handlers
  const handleAddUser = (userId: string) => {
    const contact = contacts.find((c) => c.id === userId)
    if (contact) {
      const newUser: SelectedUser = {
        id: contact.id,
        name: contact.name,
        email: contact.email,
      }
      setFormData((prev) => ({
        ...prev,
        selectedUsers: [...prev.selectedUsers, newUser],
      }))
    }
  }

  const handleRemoveUser = (userId: string) => {
    setFormData((prev) => ({
      ...prev,
      selectedUsers: prev.selectedUsers.filter((user) => user.id !== userId),
    }))
  }

  // API Config Handlers
  const handleAddApiConfig = () => {
    const newConfig: ApiConfig = {
      id: Date.now().toString(),
      key: "",
      value: "",
    }
    setFormData((prev) => ({
      ...prev,
      apiConfigs: [...prev.apiConfigs, newConfig],
    }))
  }

  const handleRemoveApiConfig = (configId: string) => {
    setFormData((prev) => ({
      ...prev,
      apiConfigs: prev.apiConfigs.filter((config) => config.id !== configId),
    }))
  }

  const handleUpdateApiConfig = (configId: string, field: "key" | "value", newValue: string) => {
    setFormData((prev) => ({
      ...prev,
      apiConfigs: prev.apiConfigs.map((config) =>
        config.id === configId ? { ...config, [field]: newValue } : config
      ),
    }))
  }

  // AI Instruction Handler
  const handleAIInstructionInsert = (instructions: string) => {
    setFormData((prev) => ({
      ...prev,
      instructions: instructions,
    }))
    if (errors.instructions) {
      setErrors({ ...errors, instructions: undefined })
    }
  }

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="space-y-6 max-w-3xl mx-auto">
        {/* Selected Template Display */}
        <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-background">
              {(() => {
                const Icon = ICON_MAP[selectedTemplate.icon]
                return <Icon className="h-5 w-5" />
              })()}
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Selected Template</p>
              <p className="font-semibold">{selectedTemplate.name}</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={onBack}>
            Change Template
          </Button>
        </div>

        {/* Basic Information */}
        <div className="space-y-4">
          <div>
            <Label htmlFor="name">
              Artifact Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => {
                setFormData({ ...formData, name: e.target.value })
                if (errors.name) setErrors({ ...errors, name: undefined })
              }}
              placeholder="Enter artifact name"
              className="mt-2"
            />
            {errors.name && <p className="text-xs text-destructive mt-1">{errors.name}</p>}
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label htmlFor="instructions">
                Instructions <span className="text-destructive">*</span>
              </Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setAiDialogOpen(true)}
                className="h-8 gap-2"
              >
                <Cpu className="h-3.5 w-3.5" />
              </Button>
            </div>
            <Textarea
              id="instructions"
              value={formData.instructions}
              onChange={(e) => {
                setFormData({ ...formData, instructions: e.target.value })
                if (errors.instructions) setErrors({ ...errors, instructions: undefined })
              }}
              placeholder="Describe what this artifact should do..."
              className="min-h-[120px]"
              rows={5}
            />
            {errors.instructions && (
              <p className="text-xs text-destructive mt-1">{errors.instructions}</p>
            )}
          </div>
        </div>

        {/* Sharing & Permissions */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Sharing & Permissions</h3>
          {loadingContacts ? (
            <div className="text-center py-8 border rounded-lg border-dashed">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Loading contacts...</p>
            </div>
          ) : (
            <UserSelectTable
              selectedUsers={formData.selectedUsers}
              availableContacts={availableContacts}
              onAddUser={handleAddUser}
              onRemoveUser={handleRemoveUser}
            />
          )}
        </div>

        {/* API Configuration */}
        <Collapsible open={apiSectionOpen} onOpenChange={setApiSectionOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" className="w-full justify-between hover:text-primary hover:bg-transparent">
              <div className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                <span>Advanced: API Configuration</span>
                {formData.apiConfigs.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {formData.apiConfigs.length}
                  </Badge>
                )}
              </div>
              <ChevronDown
                className={cn("h-4 w-4 transition-transform", apiSectionOpen && "rotate-180")}
              />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-4 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Add API key-value pairs to configure external integrations
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddApiConfig}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Config
              </Button>
            </div>

            {formData.apiConfigs.length > 0 ? (
              <div className="space-y-3">
                {formData.apiConfigs.map((config) => (
                  <div key={config.id} className="flex gap-2 items-start p-3 border rounded-lg">
                    <div className="flex-1 grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs text-muted-foreground">Key</Label>
                        <Input
                          value={config.key}
                          onChange={(e) => handleUpdateApiConfig(config.id, "key", e.target.value)}
                          placeholder="API_KEY"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Value</Label>
                        <Input
                          value={config.value}
                          onChange={(e) => handleUpdateApiConfig(config.id, "value", e.target.value)}
                          placeholder="your-api-key-value"
                          type="password"
                          className="mt-1"
                        />
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveApiConfig(config.id)}
                      className="hover:bg-destructive/10 hover:text-destructive mt-6"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 border rounded-lg border-dashed">
                <Settings className="h-10 w-10 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">No API configurations added</p>
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* AI Instruction Dialog */}
      <ArtifactAIInstructionDialog
        open={aiDialogOpen}
        onOpenChange={setAiDialogOpen}
        onInsert={handleAIInstructionInsert}
      />
    </div>
  )
}
