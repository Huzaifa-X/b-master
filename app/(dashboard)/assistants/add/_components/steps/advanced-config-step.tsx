"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { AdvancedConfigStepProps } from "@/types/assistant"
import { SchemaPreview } from "@/app/(dashboard)/assistants/add/_components/schema-preview"
import { Shield, Key, Lock } from "lucide-react"
import { parseSchemaText, parseOpenAPISchema } from "@/lib/openapi-parser"

export function AdvancedConfigStep({ formData, updateFormData }: AdvancedConfigStepProps) {

  const handleAuthTypeChange = (value: "none" | "api_key" | "oauth") => {
    updateFormData({
      authenticationType: value,
      apiKey: undefined,
      authType: undefined,
      customHeaderName: undefined,
      clientId: undefined,
      clientSecret: undefined,
      authorizationUrl: undefined,
      tokenUrl: undefined,
      scope: undefined,
      tokenExchangeMethod: undefined,
      schema: undefined,
      schemaText: undefined,
    })
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
        <div className="space-y-4">
          <Label>Authentication</Label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card
              className={`cursor-pointer transition-all hover:shadow-md ${formData.authenticationType === "none"
                  ? "ring-2 ring-primary bg-primary/5"
                  : "hover:bg-muted/50"
                }`}
              onClick={() => handleAuthTypeChange("none")}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-muted-foreground" />
                  <CardTitle className="text-base">None</CardTitle>
                </div>
                <CardDescription className="text-sm">
                  No authentication required
                </CardDescription>
              </CardHeader>
            </Card>

            <Card
              className={`cursor-pointer transition-all hover:shadow-md ${formData.authenticationType === "api_key"
                  ? "ring-2 ring-primary bg-primary/5"
                  : "hover:bg-muted/50"
                }`}
              onClick={() => handleAuthTypeChange("api_key")}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Key className="h-5 w-5 text-muted-foreground" />
                  <CardTitle className="text-base">API Key</CardTitle>
                </div>
                <CardDescription className="text-sm">
                  Use API keys for authentication
                </CardDescription>
              </CardHeader>
            </Card>

            <Card
              className={`cursor-pointer transition-all hover:shadow-md ${formData.authenticationType === "oauth"
                  ? "ring-2 ring-primary bg-primary/5"
                  : "hover:bg-muted/50"
                }`}
              onClick={() => handleAuthTypeChange("oauth")}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Lock className="h-5 w-5 text-muted-foreground" />
                  <CardTitle className="text-base">OAuth</CardTitle>
                </div>
                <CardDescription className="text-sm">
                  OAuth 2.0 authentication flow
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
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

            {formData.authType === "custom" && (
              <div className="space-y-2">
                <Label htmlFor="customHeaderName">Custom Header Name</Label>
                <Input
                  id="customHeaderName"
                  placeholder="e.g., X-API-Key, Authorization"
                  value={formData.customHeaderName || ""}
                  onChange={(e) => updateFormData({ customHeaderName: e.target.value })}
                />
                <p className="text-sm text-muted-foreground">
                  Specify the custom header name to send the API key
                </p>
              </div>
            )}
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
          <Label htmlFor="schema">OpenAPI Schema (JSON or YAML)</Label>
          <Textarea
            id="schema"
            placeholder='Paste your OpenAPI schema here (JSON or YAML format)...'
            value={formData.schemaText || ""}
            onChange={(e) => {
              const value = e.target.value
              updateFormData({ schemaText: value })

              if (!value.trim()) {
                // Clear schema when empty
                updateFormData({ schema: undefined })
                return
              }

              try {
                // Parse the schema text (supports both JSON and YAML)
                const parsedSchema = parseSchemaText(value)

                if (parsedSchema) {
                  // Check for security requirements and auto-populate authentication
                  const parsedOpenAPI = parseOpenAPISchema(parsedSchema)

                  // Auto-populate authentication if security schemes are detected
                  if (parsedOpenAPI.securitySchemes && parsedOpenAPI.security && parsedOpenAPI.security.length > 0) {
                    // Get the first security requirement
                    const firstSecurityReq = parsedOpenAPI.security[0]
                    const securitySchemeName = Object.keys(firstSecurityReq)[0]

                    if (securitySchemeName && parsedOpenAPI.securitySchemes[securitySchemeName]) {
                      const scheme = parsedOpenAPI.securitySchemes[securitySchemeName]

                      if (scheme.type === 'apiKey') {
                        // Auto-populate API key authentication
                        updateFormData({
                          authenticationType: 'api_key',
                          authType: scheme.in === 'header' ? 'bearer' : 'basic',
                          customHeaderName: scheme.in === 'header' ? scheme.name : undefined,
                          // Note: API key value still needs to be entered by user
                        })
                      } else if (scheme.type === 'http' && scheme.scheme === 'bearer') {
                        // Auto-populate bearer token authentication
                        updateFormData({
                          authenticationType: 'api_key',
                          authType: 'bearer',
                        })
                      } else if (scheme.type === 'oauth2') {
                        // Auto-populate OAuth authentication
                        updateFormData({
                          authenticationType: 'oauth',
                          authorizationUrl: scheme.flows?.authorizationCode?.authorizationUrl,
                          tokenUrl: scheme.flows?.authorizationCode?.tokenUrl,
                          scope: scheme.flows?.authorizationCode?.scopes ? Object.keys(scheme.flows.authorizationCode.scopes).join(' ') : undefined,
                        })
                      }
                    }
                  }

                  updateFormData({ schema: parsedSchema })
                } else {
                  updateFormData({ schema: undefined })
                }
              } catch {
                // Invalid JSON - keep the schema as undefined until valid
                updateFormData({ schema: undefined })
              }
            }}
            rows={20}
            style={{ height: '300px' }}
            className="resize-none font-mono text-sm overflow-y-auto"
          />
          <p className="text-sm text-muted-foreground">
            Supports both JSON and YAML formats
          </p>
        </div>

        {/* Schema Preview */}
        {formData.schemaText && (
          <div className="space-y-2">
            <SchemaPreview
              schemaText={formData.schemaText}
              authConfig={{
                authenticationType: formData.authenticationType,
                apiKey: formData.apiKey,
                authType: formData.authType,
                customHeaderName: formData.customHeaderName,
                clientId: formData.clientId,
                clientSecret: formData.clientSecret,
                authorizationUrl: formData.authorizationUrl,
                tokenUrl: formData.tokenUrl,
                scope: formData.scope,
                tokenExchangeMethod: formData.tokenExchangeMethod,
              }}
            />
          </div>
        )}
      </div>
    </div>
  )
}

