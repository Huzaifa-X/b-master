"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  parseSchemaText,
  parseOpenAPISchema,
  validateOpenAPISchema,
  generateExampleValue,
  validateParameter,
  ParsedEndpoint,
  ParsedSchema,
} from "@/lib/openapi-parser"
import { cn } from "@/lib/utils"
import {
  Play,
  AlertCircle,
  Loader2,
  CheckCircle,
  Lock,
  Key,
  Shield,
} from "lucide-react"
import { toast } from "sonner"

interface SchemaPreviewProps {
  schemaText: string
  authConfig?: {
    authenticationType: string
    apiKey?: string
    authType?: string
    customHeaderName?: string
    clientId?: string
    clientSecret?: string
    authorizationUrl?: string
    tokenUrl?: string
    scope?: string
    tokenExchangeMethod?: string
  }
}

export function SchemaPreview({ schemaText, authConfig }: SchemaPreviewProps) {
  const [parsedSchema, setParsedSchema] = useState<ParsedSchema | null>(null)
  const [parseError, setParseError] = useState<string | null>(null)
  const [securitySchemes, setSecuritySchemes] = useState<Record<string, any> | null>(null)
  const [globalSecurity, setGlobalSecurity] = useState<any[] | null>(null)

  useEffect(() => {
    if (!schemaText.trim()) {
      setParsedSchema(null)
      setParseError(null)
      setSecuritySchemes(null)
      setGlobalSecurity(null)
      return
    }

    try {
      // Parse schema text (supports both JSON and YAML)
      const parseResult = parseSchemaText(schemaText)

      if (!parseResult.success) {
        setParseError(parseResult.error || "Invalid schema format")
        setParsedSchema(null)
        setSecuritySchemes(null)
        setGlobalSecurity(null)
        return
      }

      // Validate OpenAPI schema
      const validation = validateOpenAPISchema(parseResult.data)
      if (!validation.valid) {
        setParseError(validation.error || "Invalid schema")
        setParsedSchema(null)
        setSecuritySchemes(null)
        setGlobalSecurity(null)
        return
      }

      // Parse schema
      const parsed = parseOpenAPISchema(parseResult.data)
      setParsedSchema(parsed)
      setSecuritySchemes(parsed.securitySchemes || null)
      setGlobalSecurity(parsed.security || null)
      setParseError(null)
    } catch (error: any) {
      setParseError(error.message || "Invalid schema format")
      setParsedSchema(null)
      setSecuritySchemes(null)
      setGlobalSecurity(null)
    }
  }, [schemaText])

  // Check if authentication is required but not configured
  const isAuthRequired = securitySchemes && Object.keys(securitySchemes).length > 0
  const isAuthConfigured = authConfig?.authenticationType && authConfig.authenticationType !== 'none'
  const showAuthWarning = isAuthRequired && !isAuthConfigured

  if (!schemaText.trim()) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Enter an OpenAPI schema (JSON or YAML format) above to see available actions
        </AlertDescription>
      </Alert>
    )
  }

  if (parseError) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <div className="space-y-1">
            <p className="font-semibold">Schema Validation Failed</p>
            <p className="text-sm">{parseError}</p>
          </div>
        </AlertDescription>
      </Alert>
    )
  }

  if (!parsedSchema) {
    return null
  }

  return (
    <div className="space-y-4">
      {/* Validation Success */}
      <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
        <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
        <AlertDescription className="text-green-800 dark:text-green-200">
          Schema validated successfully! Found {parsedSchema.endpoints.length} action(s)
        </AlertDescription>
      </Alert>

      {/* Authentication Warning */}
      {showAuthWarning && (
        <Alert variant="destructive">
          <Lock className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-1">
              <p className="font-semibold">Authentication Required</p>
              <p className="text-sm">
                This API requires authentication ({Object.keys(securitySchemes).join(', ')}). 
                Please configure authentication above to test endpoints.
              </p>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Authentication Status */}
      {isAuthRequired && isAuthConfigured && (
        <Alert className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
          <Shield className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <AlertDescription className="text-blue-800 dark:text-blue-200">
            <div className="flex items-center gap-2">
              <span className="font-semibold">Authentication Configured:</span>
              <Badge variant="outline" className="bg-white dark:bg-gray-800">
                {authConfig.authenticationType === 'api_key' ? 'API Key' : 'OAuth 2.0'}
              </Badge>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Actions Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[200px]">Name</TableHead>
              <TableHead className="w-[100px]">Method</TableHead>
              <TableHead>Path</TableHead>
              <TableHead className="w-[100px] text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {parsedSchema.endpoints.map((endpoint) => (
              <ActionRow
                key={endpoint.id}
                endpoint={endpoint}
                baseUrl={parsedSchema.servers[0]}
                authConfig={authConfig}
                securitySchemes={securitySchemes || undefined}
                globalSecurity={globalSecurity || undefined}
              />
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

interface ActionRowProps {
  endpoint: ParsedEndpoint
  baseUrl?: string
  authConfig?: {
    authenticationType: string
    apiKey?: string
    authType?: string
    customHeaderName?: string
    clientId?: string
    clientSecret?: string
    authorizationUrl?: string
    tokenUrl?: string
    scope?: string
    tokenExchangeMethod?: string
  }
  securitySchemes?: Record<string, any>
  globalSecurity?: any[]
}

function ActionRow({ endpoint, baseUrl, authConfig, securitySchemes, globalSecurity }: ActionRowProps) {
  const [testDialogOpen, setTestDialogOpen] = useState(false)
  const [paramValues, setParamValues] = useState<Record<string, any>>({})
  const [isTesting, setIsTesting] = useState(false)
  const [testResult, setTestResult] = useState<any>(null)
  const [testError, setTestError] = useState<string | null>(null)

  // Initialize parameter values with examples
  useEffect(() => {
    const initialValues: Record<string, any> = {}
    endpoint.parameters.forEach((param) => {
      initialValues[param.name] = generateExampleValue(param.schema)
    })
    setParamValues(initialValues)
  }, [endpoint])

  const getMethodColor = (method: string) => {
    switch (method) {
      case "GET":
        return "bg-blue-500 hover:bg-blue-600"
      case "POST":
        return "bg-green-500 hover:bg-green-600"
      case "PUT":
        return "bg-yellow-500 hover:bg-yellow-600"
      case "PATCH":
        return "bg-orange-500 hover:bg-orange-600"
      case "DELETE":
        return "bg-red-500 hover:bg-red-600"
      default:
        return "bg-gray-500 hover:bg-gray-600"
    }
  }

  const buildUrlAndHeaders = (): { url: string; headers: Record<string, string> } => {
    let url = endpoint.path
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    }

    // Replace path parameters
    endpoint.parameters
      .filter((p) => p.in === "path")
      .forEach((param) => {
        url = url.replace(`{${param.name}}`, paramValues[param.name] || "")
      })

    // Collect query parameters from endpoint definition
    const queryParams: string[] = []
    endpoint.parameters
      .filter((p) => p.in === "query" && paramValues[p.name])
      .forEach((param) => {
        queryParams.push(`${param.name}=${encodeURIComponent(paramValues[param.name])}`)
      })

    // Handle authentication based on configuration
    if (authConfig && securitySchemes && globalSecurity && globalSecurity.length > 0) {
      // Iterate through global security requirements
      globalSecurity.forEach((securityReq: any) => {
        Object.keys(securityReq).forEach((schemeName) => {
          const scheme = securitySchemes[schemeName]
          
          if (!scheme) return

          // Handle different authentication types
          switch (scheme.type) {
            case 'apiKey':
              if (authConfig.authenticationType === 'api_key' && authConfig.apiKey) {
                if (scheme.in === 'query' && scheme.name) {
                  // Add API key to query parameters
                  queryParams.push(`${scheme.name}=${encodeURIComponent(authConfig.apiKey)}`)
                } else if (scheme.in === 'header' && scheme.name) {
                  // Add API key to headers
                  headers[scheme.name] = authConfig.apiKey
                } else if (scheme.in === 'cookie' && scheme.name) {
                  // Add API key to cookies (via Cookie header)
                  headers['Cookie'] = `${scheme.name}=${authConfig.apiKey}`
                }
              }
              break

            case 'http':
              if (authConfig.authenticationType === 'api_key' && authConfig.apiKey) {
                if (scheme.scheme === 'bearer') {
                  headers['Authorization'] = `Bearer ${authConfig.apiKey}`
                } else if (scheme.scheme === 'basic') {
                  headers['Authorization'] = `Basic ${btoa(authConfig.apiKey)}`
                }
              }
              break

            case 'oauth2':
              if (authConfig.authenticationType === 'oauth' && authConfig.clientId) {
                // For OAuth, we would typically need an access token
                // In a real scenario, you'd implement the OAuth flow first
                // For now, we'll just indicate that OAuth is configured
                headers['X-OAuth-Configured'] = 'true'
                // Note: This is a placeholder. In production, you'd:
                // 1. Implement OAuth flow to get access token
                // 2. Store the token
                // 3. Use it here: headers['Authorization'] = `Bearer ${accessToken}`
              }
              break
          }
        })
      })
    } else if (authConfig?.authenticationType === 'api_key' && authConfig.apiKey) {
      // Fallback: If no security schemes defined but API key configured
      // Use the auth type configuration
      if (authConfig.authType === 'bearer') {
        headers['Authorization'] = `Bearer ${authConfig.apiKey}`
      } else if (authConfig.authType === 'basic') {
        headers['Authorization'] = `Basic ${btoa(authConfig.apiKey)}`
      } else if (authConfig.authType === 'custom' && authConfig.customHeaderName) {
        headers[authConfig.customHeaderName] = authConfig.apiKey
      }
    }

    // Add header parameters from endpoint definition
    endpoint.parameters
      .filter((p) => p.in === "header" && paramValues[p.name])
      .forEach((param) => {
        headers[param.name] = paramValues[param.name]
      })

    // Build final URL with query parameters
    if (queryParams.length > 0) {
      url += `?${queryParams.join("&")}`
    }

    return {
      url: (baseUrl || "") + url,
      headers
    }
  }

  const handleTest = async () => {
    setIsTesting(true)
    setTestError(null)
    setTestResult(null)

    try {
      // Validate required parameters
      for (const param of endpoint.parameters) {
        if (param.required && !paramValues[param.name]) {
          throw new Error(`${param.name} is required`)
        }

        const validation = validateParameter(paramValues[param.name], param.schema)
        if (!validation.valid) {
          throw new Error(`${param.name}: ${validation.error}`)
        }
      }

      // Check if authentication is required but not configured
      if (securitySchemes && Object.keys(securitySchemes).length > 0) {
        if (!authConfig?.authenticationType || authConfig.authenticationType === 'none') {
          throw new Error("This endpoint requires authentication. Please configure authentication above.")
        }

        if (authConfig.authenticationType === 'api_key' && !authConfig.apiKey) {
          throw new Error("API key is required but not configured.")
        }

        if (authConfig.authenticationType === 'oauth' && !authConfig.clientId) {
          throw new Error("OAuth client ID is required but not configured.")
        }
      }

      const { url, headers } = buildUrlAndHeaders()

      console.log('Testing endpoint:', { url, headers: { ...headers, Authorization: headers.Authorization ? '***' : undefined } })

      const response = await fetch(url, {
        method: endpoint.method,
        headers,
      })

      let data
      const contentType = response.headers.get('content-type')
      
      if (contentType?.includes('application/json')) {
        data = await response.json()
      } else {
        const text = await response.text()
        data = { response: text }
      }

      if (!response.ok) {
        setTestError(`Error ${response.status}: ${JSON.stringify(data, null, 2)}`)
        toast.error(`Request failed with status ${response.status}`)
      } else {
        setTestResult(data)
        toast.success("Request successful!")
      }
    } catch (error: any) {
      setTestError(error.message || "Request failed")
      toast.error("Request failed", { description: error.message })
    } finally {
      setIsTesting(false)
    }
  }

  const openTestDialog = () => {
    setTestDialogOpen(true)
    setTestResult(null)
    setTestError(null)
  }

  // Check if this endpoint requires authentication
  const requiresAuth = securitySchemes && Object.keys(securitySchemes).length > 0
  const isAuthConfigured = authConfig?.authenticationType && authConfig.authenticationType !== 'none'
  const canTest = !requiresAuth || isAuthConfigured

  return (
    <>
      <TableRow>
        <TableCell className="font-medium">
          <div className="flex items-center gap-2">
            {endpoint.operationId || endpoint.summary || "Unnamed"}
            {requiresAuth && (
              <Lock className={cn(
                "h-3 w-3",
                isAuthConfigured ? "text-green-500" : "text-yellow-500"
              )} />
            )}
          </div>
        </TableCell>
        <TableCell>
          <Badge className={cn("text-white", getMethodColor(endpoint.method))}>
            {endpoint.method}
          </Badge>
        </TableCell>
        <TableCell className="font-mono text-sm">{endpoint.path}</TableCell>
        <TableCell className="text-right">
          <Button
            size="sm"
            variant="outline"
            onClick={openTestDialog}
            className="gap-2"
            disabled={!canTest}
          >
            <Play className="h-3 w-3" />
            Test
          </Button>
        </TableCell>
      </TableRow>

      {/* Test Dialog */}
      <Dialog open={testDialogOpen} onOpenChange={setTestDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Badge className={cn("text-white", getMethodColor(endpoint.method))}>
                {endpoint.method}
              </Badge>
              <span className="font-mono">{endpoint.path}</span>
              {requiresAuth && (
                <Badge variant={isAuthConfigured ? "default" : "destructive"} className="ml-2">
                  <Lock className="h-3 w-3 mr-1" />
                  {isAuthConfigured ? "Auth Configured" : "Auth Required"}
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription>
              {endpoint.summary || endpoint.description || "Test this endpoint"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Authentication Info */}
            {requiresAuth && (
              <Alert className={isAuthConfigured ? "border-green-200 bg-green-50" : "border-yellow-200 bg-yellow-50"}>
                <Key className="h-4 w-4" />
                <AlertDescription>
                  {isAuthConfigured ? (
                    <span className="text-green-800">
                      Authentication configured: {authConfig.authenticationType === 'api_key' ? 'API Key' : 'OAuth 2.0'}
                    </span>
                  ) : (
                    <span className="text-yellow-800">
                      This endpoint requires authentication. Please configure it in the form above.
                    </span>
                  )}
                </AlertDescription>
              </Alert>
            )}

            {/* URL */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Request URL</Label>
              <div className="p-2 bg-muted rounded font-mono text-sm break-all">
                {buildUrlAndHeaders().url}
              </div>
            </div>

            {/* Headers Preview */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Request Headers</Label>
              <div className="p-2 bg-muted rounded font-mono text-xs space-y-1">
                {Object.entries(buildUrlAndHeaders().headers).map(([key, value]) => (
                  <div key={key} className="flex gap-2">
                    <span className="text-muted-foreground">{key}:</span>
                    <span className="break-all">
                      {key.toLowerCase().includes('auth') || key.toLowerCase().includes('key') 
                        ? '***' + value.slice(-4) 
                        : value}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Parameters */}
            {endpoint.parameters.length > 0 && (
              <div className="space-y-3">
                <Label className="text-sm font-medium">Parameters</Label>
                {endpoint.parameters.map((param) => (
                  <div key={param.name} className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <Label htmlFor={`test-${param.name}`} className="text-sm">
                        {param.name}
                        {param.required && (
                          <span className="text-destructive ml-1">*</span>
                        )}
                      </Label>
                      <Badge variant="outline" className="text-xs">
                        {param.in}
                      </Badge>
                    </div>
                    <Input
                      id={`test-${param.name}`}
                      value={paramValues[param.name] || ""}
                      onChange={(e) =>
                        setParamValues((prev) => ({
                          ...prev,
                          [param.name]: e.target.value,
                        }))
                      }
                      placeholder={param.description || `Enter ${param.name}`}
                      className="font-mono text-sm"
                    />
                    {param.description && (
                      <p className="text-xs text-muted-foreground break-words">
                        {param.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Test Button */}
            <Button 
              onClick={handleTest} 
              disabled={isTesting || !canTest} 
              className="w-full"
            >
              {isTesting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  Test Endpoint
                </>
              )}
            </Button>

            {/* Error */}
            {testError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="whitespace-pre-wrap break-words">
                  {testError}
                </AlertDescription>
              </Alert>
            )}

            {/* Success Result */}
            {testResult && (
              <div className="space-y-2">
                <Label className="text-sm font-medium text-green-600">
                  ✓ Response
                </Label>
                <pre className="bg-muted p-4 rounded-lg overflow-auto text-xs max-h-64 whitespace-pre-wrap break-words">
                  {JSON.stringify(testResult, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}