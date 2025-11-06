"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { AdvancedConfigStepProps } from "@/types/assistant"
import { Settings } from "lucide-react"

export function AdvancedConfigStep({ formData, updateFormData }: AdvancedConfigStepProps) {
  const [authDialogOpen, setAuthDialogOpen] = useState(false)

  const handleAuthTypeChange = (value: "none" | "api_key" | "oauth") => {
    updateFormData({ 
      authenticationType: value,
      // Clear related fields when changing auth type
      apiKey: undefined,
      authType: undefined,
      clientId: undefined,
      clientSecret: undefined,
      authorizationUrl: undefined,
      tokenUrl: undefined,
      scope: undefined,
      tokenExchangeMethod: undefined,
    })
    setAuthDialogOpen(false)
  }

  const getAuthTypeLabel = () => {
    switch (formData.authenticationType || "none") {
      case "api_key":
        return "API Key"
      case "oauth":
        return "OAuth"
      default:
        return "None"
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Advanced Configuration</h2>
        <p className="text-muted-foreground">
          Configure API settings and authentication for your assistant
        </p>
      </div>

      <div className="space-y-6">
        {/* Authentication Type Selection */}
        <div className="space-y-2">
          <Label>Authentication</Label>
          <Dialog open={authDialogOpen} onOpenChange={setAuthDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                variant="outline" 
                className="w-full justify-start"
                type="button"
              >
                <Settings className="mr-2 h-4 w-4" />
                {getAuthTypeLabel()}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Select Authentication Type</DialogTitle>
                <DialogDescription>
                  Choose how your assistant will authenticate with external APIs
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-2 py-4">
                <Button
                  variant={formData.authenticationType === "none" ? "default" : "outline"}
                  className="w-full justify-start"
                  onClick={() => handleAuthTypeChange("none")}
                >
                  None
                </Button>
                <Button
                  variant={formData.authenticationType === "api_key" ? "default" : "outline"}
                  className="w-full justify-start"
                  onClick={() => handleAuthTypeChange("api_key")}
                >
                  API Key
                </Button>
                <Button
                  variant={formData.authenticationType === "oauth" ? "default" : "outline"}
                  className="w-full justify-start"
                  onClick={() => handleAuthTypeChange("oauth")}
                >
                  OAuth
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          <p className="text-sm text-muted-foreground">
            Configure how your assistant authenticates with external APIs
          </p>
        </div>

        {/* API Key Authentication Fields */}
        {formData.authenticationType === "api_key" && (
          <div className="space-y-4 border-t pt-4">
            <div className="space-y-2">
              <Label htmlFor="apiKey">API Key</Label>
              <Input
                id="apiKey"
                type="password"
                placeholder="Enter your API key"
                value={formData.apiKey || ""}
                onChange={(e) => updateFormData({ apiKey: e.target.value })}
              />
              <p className="text-sm text-muted-foreground">
                Your API key for authentication (stored securely)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="authType">Auth Type</Label>
              <Select
                value={formData.authType || "bearer"}
                onValueChange={(value: "basic" | "bearer" | "custom") => 
                  updateFormData({ authType: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select auth type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="basic" className="focus:bg-muted focus:text-foreground">
                    Basic
                  </SelectItem>
                  <SelectItem value="bearer" className="focus:bg-muted focus:text-foreground">
                    Bearer
                  </SelectItem>
                  <SelectItem value="custom" className="focus:bg-muted focus:text-foreground">
                    Custom
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                Select how the API key should be sent in requests
              </p>
            </div>
          </div>
        )}

        {/* OAuth Authentication Fields */}
        {formData.authenticationType === "oauth" && (
          <div className="space-y-4 border-t pt-4">
            <div className="space-y-2">
              <Label htmlFor="clientId">Client ID</Label>
              <Input
                id="clientId"
                placeholder="Enter client ID"
                value={formData.clientId || ""}
                onChange={(e) => updateFormData({ clientId: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="clientSecret">Client Secret</Label>
              <Input
                id="clientSecret"
                type="password"
                placeholder="Enter client secret"
                value={formData.clientSecret || ""}
                onChange={(e) => updateFormData({ clientSecret: e.target.value })}
              />
              <p className="text-sm text-muted-foreground">
                Client secret (stored securely)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="authorizationUrl">Authorization URL</Label>
              <Input
                id="authorizationUrl"
                type="url"
                placeholder="https://example.com/oauth/authorize"
                value={formData.authorizationUrl || ""}
                onChange={(e) => updateFormData({ authorizationUrl: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tokenUrl">Token URL</Label>
              <Input
                id="tokenUrl"
                type="url"
                placeholder="https://example.com/oauth/token"
                value={formData.tokenUrl || ""}
                onChange={(e) => updateFormData({ tokenUrl: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="scope">Scope</Label>
              <Input
                id="scope"
                placeholder="read write"
                value={formData.scope || ""}
                onChange={(e) => updateFormData({ scope: e.target.value })}
              />
              <p className="text-sm text-muted-foreground">
                OAuth scopes (space-separated)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tokenExchangeMethod">Token Exchange Method</Label>
              <Select
                value={formData.tokenExchangeMethod || "post"}
                onValueChange={(value: "post" | "basic_auth") => 
                  updateFormData({ tokenExchangeMethod: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="post" className="focus:bg-muted focus:text-foreground">
                    POST
                  </SelectItem>
                  <SelectItem value="basic_auth" className="focus:bg-muted focus:text-foreground">
                    Basic Auth
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                Method used for token exchange
              </p>
            </div>
          </div>
        )}

        {/* OpenAPI Schema Field */}
        <div className="space-y-2 border-t pt-4">
          <Label htmlFor="schema">OpenAPI Schema (JSON)</Label>
          <Textarea
            id="schema"
            placeholder='{"openapi": "3.0.0", ...}'
            value={formData.schema ? JSON.stringify(formData.schema, null, 2) : ""}
            onChange={(e) => {
              try {
                const parsed = e.target.value ? JSON.parse(e.target.value) : undefined
                updateFormData({ schema: parsed })
              } catch {
                // Invalid JSON, store as-is for now
              }
            }}
            rows={20}
            style={{ height: '300px' }}
            className="resize-none font-mono text-sm overflow-y-auto"
          />
          <p className="text-sm text-muted-foreground">
            Optional: Paste your OpenAPI/Swagger schema JSON
          </p>
        </div>
      </div>
    </div>
  )
}

