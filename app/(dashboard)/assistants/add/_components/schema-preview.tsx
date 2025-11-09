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
          {parsedSchema.securitySchemes && Object.keys(parsedSchema.securitySchemes).length > 0 && (
            <span className="block mt-1 text-sm">
              ⚠️ Requires authentication: {Object.keys(parsedSchema.securitySchemes).join(', ')}
            </span>
          )}
        </AlertDescription>
      </Alert>

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

  const buildUrl = () => {
    let url = endpoint.path

    // Replace path parameters
    endpoint.parameters
      .filter((p) => p.in === "path")
      .forEach((param) => {
        url = url.replace(`{${param.name}}`, paramValues[param.name] || "")
      })

    // Collect query parameters
    const queryParams: string[] = []

    // Add endpoint query parameters
    endpoint.parameters
      .filter((p) => p.in === "query" && paramValues[p.name])
      .forEach((param) => {
        queryParams.push(`${param.name}=${encodeURIComponent(paramValues[param.name])}`)
      })

    // Add API key to query parameters if required by global security
    if (authConfig?.authenticationType === 'api_key' &&
        authConfig.apiKey &&
        securitySchemes &&
        globalSecurity &&
        globalSecurity.length > 0) {

      // Check each global security requirement
      globalSecurity.forEach((securityReq: any) => {
        Object.keys(securityReq).forEach((schemeName) => {
          const scheme = securitySchemes[schemeName]
          if (scheme && scheme.type === 'apiKey' && scheme.in === 'query' && scheme.name) {
            // Add the API key as a query parameter
            queryParams.push(`${scheme.name}=${encodeURIComponent(authConfig.apiKey!)}`)
          }
        })
      })
    }

    if (queryParams.length > 0) {
      url += `?${queryParams.join("&")}`
    }

    return (baseUrl || "") + url
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

      const url = buildUrl()

      console.log(url)

      // Build headers with authentication if configured
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      }

      // Add authentication headers based on auth config
      if (authConfig?.authenticationType === 'api_key' && authConfig.apiKey) {
        if (authConfig.authType === 'bearer') {
          headers['Authorization'] = `Bearer ${authConfig.apiKey}`
        } else if (authConfig.authType === 'basic') {
          headers['Authorization'] = `Basic ${btoa(authConfig.apiKey)}`
        } else if (authConfig.authType === 'custom' && authConfig.customHeaderName) {
          headers[authConfig.customHeaderName] = authConfig.apiKey
        }
      }

      const response = await fetch(url, {
        method: endpoint.method,
        headers,
      })

      const data = await response.json()

      if (!response.ok) {
        setTestError(`Error ${response.status}: ${JSON.stringify(data)}`)
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

  return (
    <>
      <TableRow>
        <TableCell className="font-medium">
          {endpoint.operationId || endpoint.summary || "Unnamed"}
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
            </DialogTitle>
            <DialogDescription>
              {endpoint.summary || endpoint.description || "Test this endpoint"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* URL */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Request URL</Label>
              <div className="p-2 bg-muted rounded font-mono text-sm break-all">
                {buildUrl()}
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
            <Button onClick={handleTest} disabled={isTesting} className="w-full">
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
                <AlertDescription>{testError}</AlertDescription>
              </Alert>
            )}

            {/* Success Result */}
            {testResult && (
              <div className="space-y-2">
                <Label className="text-sm font-medium text-green-600">
                  ✓ Response
                </Label>
                <pre className="bg-muted p-4 rounded-lg overflow-auto text-xs max-h-64 whitespace-pre-wrap break-words">
                  {JSON.stringify(testResult, null, 2).replace(/\\n/g, "\n")}
                </pre>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}