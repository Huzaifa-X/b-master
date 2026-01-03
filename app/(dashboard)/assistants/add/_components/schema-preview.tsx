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
import { Textarea } from "@/components/ui/textarea"
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
  const [requestBody, setRequestBody] = useState<string>('')
  const [isTesting, setIsTesting] = useState(false)
  const [isGettingToken, setIsGettingToken] = useState(false)
  const [oauthAccessToken, setOauthAccessToken] = useState<string | null>(null)
  const [testResult, setTestResult] = useState<any>(null)
  const [testError, setTestError] = useState<string | null>(null)

  // Initialize parameter values with examples and request body
  useEffect(() => {
    const initialValues: Record<string, any> = {}
    endpoint.parameters.forEach((param) => {
      initialValues[param.name] = generateExampleValue(param.schema)
    })
    setParamValues(initialValues)

    // Initialize request body for POST/PUT/PATCH methods
    if (['POST', 'PUT', 'PATCH'].includes(endpoint.method) && endpoint.requestBody) {
      const contentType = Object.keys(endpoint.requestBody.content || {})[0]
      if (contentType === 'application/json') {
        const schema = endpoint.requestBody.content[contentType]?.schema
        if (schema) {
          const exampleBody = generateExampleValue(schema)
          setRequestBody(JSON.stringify(exampleBody, null, 2))
        }
      }
    }
  }, [endpoint])

  // Detect OAuth flow type from security schemes
  const detectOAuthFlow = () => {
    if (!securitySchemes) return null

    for (const scheme of Object.values(securitySchemes)) {
      if (scheme.type === 'oauth2' && scheme.flows) {
        // Check for authorization code flow
        if (scheme.flows.authorizationCode) {
          return 'authorizationCode'
        }
        // Check for client credentials flow
        if (scheme.flows.clientCredentials) {
          return 'clientCredentials'
        }
      }
    }
    return null
  }

  const oauthFlowType = detectOAuthFlow()

  // Get OAuth access token for testing (Client Credentials Flow)
  const getOAuthTokenForTesting = async () => {
    if (!authConfig || authConfig.authenticationType !== 'oauth') {
      return { success: false, error: 'OAuth not configured' }
    }

    setIsGettingToken(true)
    try {
      const response = await fetch('/api/oauth/get-test-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: authConfig.clientId,
          clientSecret: authConfig.clientSecret,
          tokenUrl: authConfig.tokenUrl,
          scope: authConfig.scope,
          tokenExchangeMethod: authConfig.tokenExchangeMethod || 'post'
        })
      })

      const data = await response.json()

      if (!data.success) {
        toast.error('Failed to get OAuth token', { description: data.error })
        return { success: false, error: data.error }
      }

      setOauthAccessToken(data.accessToken)
      toast.success('OAuth token obtained successfully!')
      return { success: true, accessToken: data.accessToken }
    } catch (error: any) {
      toast.error('Failed to get OAuth token', { description: error.message })
      return { success: false, error: error.message }
    } finally {
      setIsGettingToken(false)
    }
  }

  // Initiate OAuth Authorization Code Flow
  const initiateOAuthFlow = () => {
    if (!authConfig || authConfig.authenticationType !== 'oauth') {
      toast.error('OAuth not configured')
      return
    }

    if (!authConfig.authorizationUrl || !authConfig.clientId) {
      toast.error('Missing authorization URL or client ID')
      return
    }

    // Store OAuth config in sessionStorage so we can retrieve it after callback
    sessionStorage.setItem('oauth_config', JSON.stringify({
      clientId: authConfig.clientId,
      clientSecret: authConfig.clientSecret,
      tokenUrl: authConfig.tokenUrl,
      tokenExchangeMethod: authConfig.tokenExchangeMethod || 'post'
    }))

    // Build authorization URL
    const params = new URLSearchParams({
      client_id: authConfig.clientId,
      redirect_uri: `${window.location.origin}/api/oauth/callback`,
      response_type: 'code',
    })

    if (authConfig.scope) {
      params.append('scope', authConfig.scope)
    }

    // Generate and store state for CSRF protection
    const state = Math.random().toString(36).substring(7)
    sessionStorage.setItem('oauth_state', state)
    params.append('state', state)

    const authUrl = `${authConfig.authorizationUrl}?${params.toString()}`

    // Open OAuth in popup window (better UX - preserves form state)
    const width = 600
    const height = 700
    const left = window.screenX + (window.outerWidth - width) / 2
    const top = window.screenY + (window.outerHeight - height) / 2

    const popup = window.open(
      authUrl,
      'OAuth Authorization',
      `width=${width},height=${height},left=${left},top=${top},popup=yes,toolbar=no,menubar=no,location=no,status=no`
    )

    if (!popup) {
      toast.error('Popup blocked. Please allow popups for this site and try again.')
      return
    }

    // Listen for message from popup/callback
    const handleMessage = (event: MessageEvent) => {
      // Verify origin for security
      if (event.origin !== window.location.origin) return

      if (event.data.type === 'oauth_callback') {
        const { code, state: returnedState, error, errorDescription } = event.data

        // Remove listener
        window.removeEventListener('message', handleMessage)

        // Close popup
        if (popup && !popup.closed) {
          popup.close()
        }

        if (error) {
          toast.error('OAuth authorization failed', { description: errorDescription || error })
          return
        }

        if (code) {
          // Verify state
          const savedState = sessionStorage.getItem('oauth_state')
          if (returnedState && savedState && returnedState !== savedState) {
            toast.error('OAuth state mismatch. Possible CSRF attack.')
            return
          }

          // Exchange code for token
          exchangeCodeForToken(code)
          sessionStorage.removeItem('oauth_state')
        }
      }
    }

    window.addEventListener('message', handleMessage)

    // Fallback: Check if popup was blocked or closed
    const checkPopup = setInterval(() => {
      if (!popup || popup.closed) {
        clearInterval(checkPopup)
        window.removeEventListener('message', handleMessage)
      }
    }, 1000)
  }

  // Handle OAuth callback (when redirected back from OAuth provider)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const code = urlParams.get('oauth_code')
    const state = urlParams.get('oauth_state')
    const error = urlParams.get('oauth_error')
    const errorDescription = urlParams.get('oauth_error_description')

    if (error) {
      toast.error('OAuth authorization failed', { description: errorDescription || error })
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname)
      return
    }

    if (code && authConfig?.authenticationType === 'oauth') {
      // Verify state for CSRF protection
      const savedState = sessionStorage.getItem('oauth_state')
      if (state && savedState && state !== savedState) {
        toast.error('OAuth state mismatch. Possible CSRF attack.')
        window.history.replaceState({}, '', window.location.pathname)
        return
      }

      // Exchange code for token
      exchangeCodeForToken(code)

      // Clean up
      sessionStorage.removeItem('oauth_state')
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [authConfig])

  // Exchange authorization code for access token
  const exchangeCodeForToken = async (code: string) => {
    // Try to get config from sessionStorage first (after redirect), then fall back to authConfig
    const storedConfigStr = sessionStorage.getItem('oauth_config')
    let config = authConfig

    if (storedConfigStr) {
      try {
        config = JSON.parse(storedConfigStr)
      } catch (error) {
        console.error('Failed to parse stored OAuth config:', error)
      }
    }

    if (!config) {
      toast.error('OAuth configuration not found. Please try again.')
      return
    }

    setIsGettingToken(true)
    try {
      const response = await fetch('/api/oauth/exchange-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          clientId: config.clientId,
          clientSecret: config.clientSecret,
          tokenUrl: config.tokenUrl,
          redirectUri: `${window.location.origin}/api/oauth/callback`,
          tokenExchangeMethod: config.tokenExchangeMethod || 'post'
        })
      })

      const data = await response.json()

      if (!data.success) {
        toast.error('Failed to exchange code for token', { description: data.error })
        return
      }

      setOauthAccessToken(data.accessToken)
      toast.success('Successfully connected! OAuth token obtained.')

      // Clean up stored config
      sessionStorage.removeItem('oauth_config')
    } catch (error: any) {
      toast.error('Failed to exchange code for token', { description: error.message })
    } finally {
      setIsGettingToken(false)
    }
  }

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
              if (authConfig.authenticationType === 'oauth') {
                // Use the OAuth access token if we have it
                if (oauthAccessToken) {
                  headers['Authorization'] = `Bearer ${oauthAccessToken}`
                }
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

        if (authConfig.authenticationType === 'oauth') {
          if (!authConfig.clientId || !authConfig.clientSecret || !authConfig.tokenUrl) {
            throw new Error("OAuth configuration is incomplete. Please configure clientId, clientSecret, and tokenUrl.")
          }

          // Get OAuth token if we don't have one yet
          if (!oauthAccessToken) {
            // For authorization code flow, user must click "Connect OAuth Account" first
            if (oauthFlowType === 'authorizationCode') {
              throw new Error("Please connect your OAuth account first by clicking 'Connect OAuth Account' button above.")
            }

            // For client credentials flow, automatically get token
            console.log('🔐 Getting OAuth access token...')
            const tokenResult = await getOAuthTokenForTesting()
            if (!tokenResult.success) {
              throw new Error(`Failed to get OAuth token: ${tokenResult.error}`)
            }
          }
        }
      }

      const { url, headers } = buildUrlAndHeaders()

      // Validate absolute URL
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        throw new Error(
          "Invalid API URL. Your OpenAPI schema must include a 'servers' field with a valid base URL."
        )
      }

      // Parse request body if needed
      let parsedRequestBody = null
      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(endpoint.method) && requestBody.trim()) {
        try {
          parsedRequestBody = JSON.parse(requestBody)
        } catch (error) {
          throw new Error('Request body is not valid JSON')
        }
      }

      console.log('Testing endpoint:', {
        method: endpoint.method,
        url,
        headers: { ...headers, Authorization: headers.Authorization ? '***' : undefined },
        hasBody: !!parsedRequestBody
      })

      // Call proxy with the correct method
      const response = await fetch('/api/proxy-openapi', {
        method: 'POST', // ← Proxy endpoint is always POST
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url,
          method: endpoint.method, // ✅ Pass GET, POST, PUT, DELETE, etc.
          headers,
          requestBody: parsedRequestBody // ✅ Include request body
        }),
      })

      const responseData = await response.json()

      if (!response.ok) {
        // Handle error from proxy
        const errorMessage = responseData.error || 'Request failed'
        setTestError(`Error ${response.status}: ${errorMessage}`)
        toast.error(`Request failed`, { description: errorMessage })
      } else {
        // Success - the proxy returns { success, status, data, headers }
        setTestResult(responseData.data)
        toast.success(`Request successful (${responseData.status} ${responseData.statusText})`)
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
        <DialogContent className="w-[95vw] max-w-2xl max-h-[80vh] overflow-hidden flex flex-col p-0">
          <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-4 border-b shrink-0">
            <DialogTitle className="flex flex-col sm:flex-row sm:items-center gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className={cn("text-white", getMethodColor(endpoint.method))}>
                  {endpoint.method}
                </Badge>
                <span className="font-mono text-sm sm:text-base break-all">{endpoint.path}</span>
              </div>
              {requiresAuth && (
                <Badge variant={isAuthConfigured ? "default" : "destructive"} className="self-start sm:self-auto sm:ml-2">
                  <Lock className="h-3 w-3 mr-1" />
                  {isAuthConfigured ? "Auth Configured" : "Auth Required"}
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription className="text-sm">
              {endpoint.summary || endpoint.description || "Test this endpoint"}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 min-h-0">
            <div className="space-y-4">
              {/* Authentication Info */}
              {requiresAuth && (
                <Alert className={isAuthConfigured ? "border-green-200 bg-green-50" : "border-yellow-200 bg-yellow-50"}>
                  <Key className="h-4 w-4 shrink-0" />
                  <AlertDescription className="text-sm">
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
                <div className="p-2 sm:p-3 bg-muted rounded font-mono text-xs sm:text-sm break-all">
                  {buildUrlAndHeaders().url}
                </div>
              </div>

              {/* Headers Preview */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Request Headers</Label>
                <div className="p-2 sm:p-3 bg-muted rounded font-mono text-xs space-y-1">
                  {Object.entries(buildUrlAndHeaders().headers).map(([key, value]) => (
                    <div key={key} className="flex flex-col sm:flex-row sm:gap-2">
                      <span className="text-muted-foreground font-semibold sm:font-normal">{key}:</span>
                      <span className="break-all pl-2 sm:pl-0">
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
                      <div className="flex flex-wrap items-center gap-2">
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

              {/* Request Body for POST/PUT/PATCH */}
              {['POST', 'PUT', 'PATCH'].includes(endpoint.method) && endpoint.requestBody && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Request Body (JSON)</Label>
                    {endpoint.requestBody.required && (
                      <Badge variant="destructive" className="text-xs">Required</Badge>
                    )}
                  </div>
                  <Textarea
                    value={requestBody}
                    onChange={(e) => setRequestBody(e.target.value)}
                    placeholder='{"key": "value"}'
                    className="font-mono text-xs"
                    rows={8}
                  />
                  {endpoint.requestBody.description && (
                    <p className="text-xs text-muted-foreground">
                      {endpoint.requestBody.description}
                    </p>
                  )}
                </div>
              )}

              {/* OAuth Token Status */}
              {authConfig?.authenticationType === 'oauth' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">OAuth Status</Label>
                    <div className="flex items-center gap-2">
                      {oauthFlowType && (
                        <Badge variant="secondary" className="text-xs">
                          {oauthFlowType === 'authorizationCode' ? 'Auth Code Flow' : 'Client Credentials'}
                        </Badge>
                      )}
                      {oauthAccessToken ? (
                        <Badge variant="default" className="text-xs bg-green-600">
                          Token Available
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs">
                          No Token
                        </Badge>
                      )}
                    </div>
                  </div>
                  {!oauthAccessToken && (
                    <>
                      {oauthFlowType === 'authorizationCode' ? (
                        <Button
                          onClick={initiateOAuthFlow}
                          disabled={isGettingToken}
                          variant="outline"
                          size="sm"
                          className="w-full"
                        >
                          {isGettingToken ? (
                            <>
                              <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                              Connecting...
                            </>
                          ) : (
                            <>
                              <Shield className="mr-2 h-3 w-3" />
                              Connect OAuth Account
                            </>
                          )}
                        </Button>
                      ) : (
                        <Button
                          onClick={getOAuthTokenForTesting}
                          disabled={isGettingToken}
                          variant="outline"
                          size="sm"
                          className="w-full"
                        >
                          {isGettingToken ? (
                            <>
                              <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                              Getting Token...
                            </>
                          ) : (
                            <>
                              <Key className="mr-2 h-3 w-3" />
                              Get OAuth Token
                            </>
                          )}
                        </Button>
                      )}
                    </>
                  )}
                  {oauthAccessToken && (
                    <p className="text-xs text-muted-foreground">
                      Access token is ready. You can now test the endpoints below.
                    </p>
                  )}
                </div>
              )}

              {/* Test Button */}
              <Button
                onClick={handleTest}
                disabled={isTesting || !canTest || isGettingToken}
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
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <AlertDescription className="whitespace-pre-wrap break-words text-sm">
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
                  <pre className="bg-muted p-3 sm:p-4 rounded-lg overflow-auto text-xs max-h-48 sm:max-h-64 whitespace-pre-wrap break-words">
                    {JSON.stringify(testResult, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}