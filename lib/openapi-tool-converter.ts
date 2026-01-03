// lib/openapi-tool-converter.ts

import { ParsedSchema, ParsedEndpoint, ParsedParameter } from './openapi-parser'

export interface OpenAPITool {
  openaiTool: {
    type: "function"
    name: string
    description: string
    parameters: {
      type: "object"
      properties: Record<string, any>
      required: string[]
    }
  }
  executor: (args: any, authConfig?: AuthConfig) => Promise<any>
  metadata: {
    method: string
    path: string
    baseUrl: string
    operationId?: string
    parameterDefinitions?: Array<{
      name: string
      in: "path" | "query" | "header" | "cookie"
      description?: string
      required: boolean
      schema: any
    }>
  }
}

export interface AuthConfig {
  type: string // 'none', 'api_key', 'oauth'
  apiKey?: string
  authType?: string // 'bearer', 'basic', 'custom', 'query'
  customHeaderName?: string
  customQueryParamName?: string // For query parameter authentication
  clientId?: string
  clientSecret?: string
  tokenUrl?: string
  accessToken?: string
}

/**
 * Convert parsed OpenAPI schema to OpenAI function tools
 */
export function convertToOpenAITools(
  parsedSchema: ParsedSchema,
  authConfig?: AuthConfig
): OpenAPITool[] {
  const tools: OpenAPITool[] = []
  const baseUrl = parsedSchema.servers[0] || ''

  for (const endpoint of parsedSchema.endpoints) {
    const tool = convertEndpointToTool(endpoint, baseUrl, authConfig)
    tools.push(tool)
  }

  return tools
}

/**
 * Convert a single endpoint to an OpenAI function tool
 */
function convertEndpointToTool(
  endpoint: ParsedEndpoint,
  baseUrl: string,
  authConfig?: AuthConfig
): OpenAPITool {
  // Build function parameters from endpoint parameters and request body
  const functionParams: any = {
    type: "object",
    properties: {},
    required: []
  }

  // Add path and query parameters
  for (const param of endpoint.parameters) {
    if (param.in === 'path' || param.in === 'query') {
      functionParams.properties[param.name] = {
        type: param.schema?.type || 'string',
        description: param.description || param.name
      }

      if (param.required) {
        functionParams.required.push(param.name)
      }

      // Add enum if available
      if (param.schema?.enum) {
        functionParams.properties[param.name].enum = param.schema.enum
      }
    }
  }

  // Add request body parameters (for POST, PUT, PATCH)
  if (endpoint.requestBody?.content?.['application/json']?.schema) {
    const bodySchema = endpoint.requestBody.content['application/json'].schema

    if (bodySchema.properties) {
      // Merge body properties into function parameters
      Object.assign(functionParams.properties, bodySchema.properties)
    }

    if (bodySchema.required && Array.isArray(bodySchema.required)) {
      functionParams.required.push(...bodySchema.required)
    }
  }

  // Generate function name and description
  const functionName = endpoint.operationId ||
    `${endpoint.method.toLowerCase()}_${endpoint.path.replace(/[^a-zA-Z0-9]/g, '_')}`

  const description = endpoint.summary ||
    endpoint.description ||
    `${endpoint.method} ${endpoint.path}`

  return {
    openaiTool: {
      type: "function",
      name: functionName,
      description,
      parameters: functionParams
    },
    executor: async (args: any, auth?: AuthConfig) => {
      return await executeAPICall(
        baseUrl,
        endpoint.method,
        endpoint.path,
        endpoint.parameters,
        args,
        auth || authConfig
      )
    },
    metadata: {
      method: endpoint.method,
      path: endpoint.path,
      baseUrl,
      operationId: endpoint.operationId,
      // Store parameter definitions so we can reconstruct executors later
      parameterDefinitions: endpoint.parameters.map(p => ({
        name: p.name,
        in: p.in,
        description: p.description,
        required: p.required,
        schema: p.schema
      }))
    }
  }

}

/**
 * Execute an API call with proper authentication and parameter handling
 * Exported so it can be used to reconstruct executors from stored tools
 */
export async function executeAPICall(
  baseUrl: string,
  method: string,
  path: string,
  paramDefinitions: ParsedParameter[],
  args: any = {},
  authConfig?: AuthConfig
): Promise<any> {
  // Separate parameters by location
  const pathParams: Record<string, any> = {}
  const queryParams: Record<string, any> = {}
  const headerParams: Record<string, any> = {}
  const bodyParams: Record<string, any> = {}

  // Categorize provided arguments based on parameter definitions
  for (const paramDef of paramDefinitions) {
    const value = args[paramDef.name]
    if (value !== undefined) {
      switch (paramDef.in) {
        case 'path':
          pathParams[paramDef.name] = value
          break
        case 'query':
          queryParams[paramDef.name] = value
          break
        case 'header':
          headerParams[paramDef.name] = value
          break
      }
    }
  }

  // Any remaining args go to body (for POST/PUT/PATCH)
  for (const [key, value] of Object.entries(args)) {
    const isDefined = paramDefinitions.some(p => p.name === key)
    if (!isDefined && value !== undefined) {
      bodyParams[key] = value
    }
  }

  // Build URL with path parameters
  let url = `${baseUrl}${path}`
  for (const [key, value] of Object.entries(pathParams)) {
    url = url.replace(`{${key}}`, encodeURIComponent(String(value)))
  }

  // Add API key to query params if auth type is 'query'
  if (authConfig?.type === 'api_key' && authConfig.authType === 'query' && authConfig.apiKey) {
    const paramName = authConfig.customQueryParamName || 'apikey'
    queryParams[paramName] = authConfig.apiKey
  }

  // Add query parameters
  if (Object.keys(queryParams).length > 0) {
    const queryString = new URLSearchParams(
      Object.entries(queryParams).reduce((acc, [key, value]) => {
        acc[key] = String(value)
        return acc
      }, {} as Record<string, string>)
    ).toString()
    url += `?${queryString}`
  }

  // Build headers
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...headerParams
  }

  // Add authentication to headers (for non-query auth types)
  if (authConfig?.type === 'api_key' && authConfig.apiKey && authConfig.authType !== 'query') {
    switch (authConfig.authType) {
      case 'bearer':
        headers['Authorization'] = `Bearer ${authConfig.apiKey}`
        break
      case 'basic':
        headers['Authorization'] = `Basic ${authConfig.apiKey}`
        break
      case 'custom':
        if (authConfig.customHeaderName) {
          headers[authConfig.customHeaderName] = authConfig.apiKey
        } else {
          headers['X-API-Key'] = authConfig.apiKey
        }
        break
      default:
        headers['X-API-Key'] = authConfig.apiKey
    }
  } else if (authConfig?.type === 'oauth' && authConfig.accessToken) {
    headers['Authorization'] = `Bearer ${authConfig.accessToken}`
  }

  console.log(`[OpenAPI] ${method} ${url}`)
  if (Object.keys(bodyParams).length > 0) {
    console.log(`[OpenAPI] Body:`, bodyParams)
  }

  // Make the request
  const fetchOptions: RequestInit = {
    method: method.toUpperCase(),
    headers
  }

  // Add body for non-GET/DELETE requests
  if (method !== 'GET' && method !== 'DELETE' && method !== 'HEAD') {
    if (Object.keys(bodyParams).length > 0) {
      fetchOptions.body = JSON.stringify(bodyParams)
    }
  }

  try {
    const response = await fetch(url, fetchOptions)

    // Handle non-JSON responses
    const contentType = response.headers.get('content-type')

    if (!response.ok) {
      let errorMessage = `API request failed: ${response.status} ${response.statusText}`

      try {
        if (contentType?.includes('application/json')) {
          const errorData = await response.json()
          errorMessage += ` - ${JSON.stringify(errorData)}`
        } else {
          const errorText = await response.text()
          if (errorText) {
            errorMessage += ` - ${errorText}`
          }
        }
      } catch (e) {
        // Ignore parse errors
      }

      throw new Error(errorMessage)
    }

    // Parse response based on content type
    if (contentType?.includes('application/json')) {
      return await response.json()
    } else if (contentType?.includes('text/')) {
      return { text: await response.text() }
    } else {
      // For other content types, return basic info
      return {
        status: response.status,
        statusText: response.statusText,
        contentType: contentType
      }
    }
  } catch (error: any) {
    console.error(`[OpenAPI] Error calling ${method} ${url}:`, error.message)
    throw error
  }
}

/**
 * Test a tool with example parameters
 */
export async function testTool(
  tool: OpenAPITool,
  exampleArgs?: any
): Promise<{ success: boolean; result?: any; error?: string }> {
  try {
    // Use provided args or generate empty object
    const args = exampleArgs || {}

    console.log(`[OpenAPI Test] Testing ${tool.openaiTool.name}`)
    console.log(`[OpenAPI Test] Args:`, args)

    const result = await tool.executor(args)

    console.log(`[OpenAPI Test] Success:`, result)

    return {
      success: true,
      result
    }
  } catch (error: any) {
    console.error(`[OpenAPI Test] Error:`, error.message)

    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * Get OAuth access token
 */
export async function getOAuthToken(authConfig: AuthConfig): Promise<string> {
  if (!authConfig.tokenUrl || !authConfig.clientId || !authConfig.clientSecret) {
    throw new Error('Missing OAuth configuration')
  }

  const response = await fetch(authConfig.tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: authConfig.clientId,
      client_secret: authConfig.clientSecret,
      scope: authConfig.tokenUrl || ''
    })
  })

  if (!response.ok) {
    throw new Error(`OAuth token request failed: ${response.statusText}`)
  }

  const data = await response.json()
  return data.access_token
}