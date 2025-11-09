import yaml from "js-yaml"

export interface ParsedEndpoint {
  id: string
  method: string
  path: string
  operationId?: string
  summary?: string
  description?: string
  parameters: ParsedParameter[]
  requestBody?: ParsedRequestBody
  responses: Record<string, ParsedResponse>
}

export interface ParsedParameter {
  name: string
  in: "path" | "query" | "header" | "cookie"
  description?: string
  required: boolean
  schema: any
  example?: any
}

export interface ParsedRequestBody {
  description?: string
  required: boolean
  content: Record<string, { schema: any }>
}

export interface ParsedResponse {
  description: string
  content?: Record<string, { schema: any }>
}

export interface ParsedSecurityScheme {
  name: string
  type: 'apiKey' | 'http' | 'oauth2' | 'openIdConnect'
  in?: 'query' | 'header' | 'cookie'
  scheme?: string
  bearerFormat?: string
  flows?: any
  openIdConnectUrl?: string
}

export interface ParsedSchema {
  title?: string
  description?: string
  version?: string
  servers: string[]
  endpoints: ParsedEndpoint[]
  securitySchemes?: Record<string, ParsedSecurityScheme>
  security?: any[]
}

/**
 * Parse schema text (supports both JSON and YAML)
 */
export function parseSchemaText(schemaText: string): {
  success: boolean
  data?: any
  error?: string
} {
  try {
    const trimmed = schemaText.trim()

    if (!trimmed) {
      return {
        success: false,
        error: "Schema text cannot be empty",
      }
    }

    // Use yaml.load - it handles BOTH YAML and JSON!
    const parsed = yaml.load(trimmed)

    // Validate that we got an object
    if (!parsed || typeof parsed !== "object") {
      return {
        success: false,
        error: "Schema must be a valid YAML or JSON object",
      }
    }

    return {
      success: true,
      data: parsed,
    }
  } catch (error: any) {
    return {
      success: false,
      error: `Parsing failed. Ensure the format is valid YAML or JSON. Error: ${error.message}`,
    }
  }
}

/**
 * Validate OpenAPI schema structure
 */
export function validateOpenAPISchema(schema: any): {
  valid: boolean
  error?: string
} {
  try {
    if (!schema || typeof schema !== "object") {
      return { valid: false, error: "Schema must be an object" }
    }

    // Check OpenAPI version
    if (!schema.openapi && !schema.swagger) {
      return {
        valid: false,
        error: "Missing 'openapi' or 'swagger' field. This must be an OpenAPI/Swagger schema.",
      }
    }

    // Check required fields
    if (!schema.info) {
      return { valid: false, error: "Missing required 'info' field" }
    }

    if (!schema.info.title) {
      return { valid: false, error: "Missing required 'info.title' field" }
    }

    if (!schema.paths || typeof schema.paths !== "object") {
      return {
        valid: false,
        error: "Missing or invalid 'paths' field. OpenAPI schema must define at least one path.",
      }
    }

    // Check if paths has at least one endpoint
    if (Object.keys(schema.paths).length === 0) {
      return {
        valid: false,
        error: "Schema must define at least one endpoint in 'paths'",
      }
    }

    return { valid: true }
  } catch (error: any) {
    return { valid: false, error: error.message }
  }
}

/**
 * Parse OpenAPI schema
 */
export function parseOpenAPISchema(schema: any): ParsedSchema {
  try {
    const parsed: ParsedSchema = {
      title: schema.info?.title,
      description: schema.info?.description,
      version: schema.info?.version,
      servers: [],
      endpoints: [],
    }

    // Parse servers
    if (schema.servers && Array.isArray(schema.servers)) {
      parsed.servers = schema.servers.map((server: any) => server.url)
    }

    // Parse paths
    if (schema.paths) {
      for (const [path, pathItem] of Object.entries(schema.paths)) {
        const methods = ["get", "post", "put", "patch", "delete", "options", "head"]

        for (const method of methods) {
          const operation = (pathItem as any)[method]
          if (!operation) continue

          const endpoint: ParsedEndpoint = {
            id: `${method.toUpperCase()}_${path.replace(/\//g, "_")}`,
            method: method.toUpperCase(),
            path: path,
            operationId: operation.operationId,
            summary: operation.summary,
            description: operation.description,
            parameters: [],
            responses: {},
          }

          // Parse parameters
          if (operation.parameters && Array.isArray(operation.parameters)) {
            endpoint.parameters = operation.parameters.map((param: any) => ({
              name: param.name,
              in: param.in,
              description: param.description,
              required: param.required || false,
              schema: param.schema,
              example: param.example,
            }))
          }

          // Parse request body
          if (operation.requestBody) {
            endpoint.requestBody = {
              description: operation.requestBody.description,
              required: operation.requestBody.required || false,
              content: operation.requestBody.content || {},
            }
          }

          // Parse responses
          if (operation.responses) {
            endpoint.responses = operation.responses
          }

          parsed.endpoints.push(endpoint)
        }
      }
    }

    // Parse security schemes
    if (schema.components?.securitySchemes) {
      parsed.securitySchemes = {}
      for (const [name, scheme] of Object.entries(schema.components.securitySchemes)) {
        const securityScheme = scheme as any
        parsed.securitySchemes[name] = {
          name,
          type: securityScheme.type,
          in: securityScheme.in,
          scheme: securityScheme.scheme,
          bearerFormat: securityScheme.bearerFormat,
          flows: securityScheme.flows,
          openIdConnectUrl: securityScheme.openIdConnectUrl,
        }
      }
    }

    // Parse global security
    if (schema.security && Array.isArray(schema.security)) {
      parsed.security = schema.security
    }

    return parsed
  } catch (error) {
    console.error("Failed to parse OpenAPI schema:", error)
    throw new Error("Invalid OpenAPI schema format")
  }
}

/**
 * Generate example values for parameters
 */
export function generateExampleValue(schema: any): any {
  if (!schema) return ""

  if (schema.example !== undefined) {
    return schema.example
  }

  switch (schema.type) {
    case "string":
      if (schema.enum) return schema.enum[0]
      if (schema.format === "date") return new Date().toISOString().split("T")[0]
      if (schema.format === "date-time") return new Date().toISOString()
      if (schema.format === "email") return "user@example.com"
      if (schema.format === "uri") return "https://example.com"
      return "example"

    case "number":
    case "integer":
      return schema.minimum !== undefined ? schema.minimum : 0

    case "boolean":
      return true

    case "array":
      return []

    case "object":
      if (schema.properties) {
        const obj: any = {}
        for (const [key, prop] of Object.entries(schema.properties)) {
          obj[key] = generateExampleValue(prop)
        }
        return obj
      }
      return {}

    default:
      return ""
  }
}

/**
 * Validate parameter value against schema
 */
export function validateParameter(value: any, schema: any): {
  valid: boolean
  error?: string
} {
  try {
    if (!schema) return { valid: true }

    switch (schema.type) {
      case "string":
        if (typeof value !== "string") {
          return { valid: false, error: "Must be a string" }
        }
        if (schema.minLength && value.length < schema.minLength) {
          return {
            valid: false,
            error: `Must be at least ${schema.minLength} characters`,
          }
        }
        if (schema.maxLength && value.length > schema.maxLength) {
          return {
            valid: false,
            error: `Must be at most ${schema.maxLength} characters`,
          }
        }
        if (schema.pattern) {
          const regex = new RegExp(schema.pattern)
          if (!regex.test(value)) {
            return { valid: false, error: `Must match pattern: ${schema.pattern}` }
          }
        }
        break

      case "number":
      case "integer":
        const num = Number(value)
        if (isNaN(num)) {
          return { valid: false, error: "Must be a number" }
        }
        if (schema.minimum !== undefined && num < schema.minimum) {
          return { valid: false, error: `Must be at least ${schema.minimum}` }
        }
        if (schema.maximum !== undefined && num > schema.maximum) {
          return { valid: false, error: `Must be at most ${schema.maximum}` }
        }
        break

      case "boolean":
        if (typeof value !== "boolean" && value !== "true" && value !== "false") {
          return { valid: false, error: "Must be true or false" }
        }
        break
    }

    return { valid: true }
  } catch (error) {
    return { valid: false, error: "Validation failed" }
  }
}