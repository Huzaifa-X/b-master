// lib/api-tools-loader.ts

import prisma from './prisma'
import { parseOpenAPISchema } from './openapi-parser'
import { convertToOpenAITools, OpenAPITool, AuthConfig } from './openapi-tool-converter'
import { decrypt, encrypt } from './encryption'
import { isTokenExpired, refreshOAuthAccessToken } from './oauth-helper'

/**
 * Build auth config from database config with decryption and auto-refresh
 */
async function buildAuthConfig(config: any): Promise<AuthConfig> {
  let accessToken = config.accessToken ? decrypt(config.accessToken) : undefined

  // For OAuth, check if token is expired and refresh if needed
  if (config.authenticationType === 'oauth' && config.accessToken) {
    const expired = isTokenExpired(config.tokenExpiry)

    if (expired && config.refreshToken) {
      console.log('[API Tools] OAuth token expired, refreshing...')

      try {
        const refreshResult = await refreshOAuthAccessToken(
          config.tokenUrl,
          config.clientId,
          decrypt(config.clientSecret),
          decrypt(config.refreshToken),
          config.tokenExchangeMethod || 'post'
        )

        if (refreshResult.success && refreshResult.accessToken) {
          // Update token in database
          const tokenExpiry = refreshResult.expiresIn
            ? new Date(Date.now() + refreshResult.expiresIn * 1000)
            : null

          await prisma.assistantApiConfiguration.update({
            where: { assistantId: config.assistantId },
            data: {
              accessToken: encrypt(refreshResult.accessToken),
              refreshToken: refreshResult.refreshToken ? encrypt(refreshResult.refreshToken) : undefined,
              tokenExpiry,
            },
          })

          accessToken = refreshResult.accessToken
          console.log('[API Tools] ✅ OAuth token refreshed successfully')
        } else {
          console.error('[API Tools] Failed to refresh OAuth token:', refreshResult.error)
        }
      } catch (error) {
        console.error('[API Tools] OAuth refresh error:', error)
      }
    }
  }

  return {
    type: config.authenticationType,
    apiKey: config.apiKey ? decrypt(config.apiKey) : undefined,
    authType: config.authType || undefined,
    customHeaderName: config.customHeaderName || undefined,
    customQueryParamName: config.customQueryParamName || undefined,
    clientId: config.clientId || undefined,
    clientSecret: config.clientSecret ? decrypt(config.clientSecret) : undefined,
    tokenUrl: config.tokenUrl || undefined,
    accessToken: accessToken,
  }
}

/**
 * Load API tools for an assistant
 * Prefer stored tools field over re-parsing schema for performance
 */
export async function loadAPITools(assistantId: string): Promise<{
  success: boolean
  tools: OpenAPITool[]
  error?: string
  oauthRequired?: boolean
  oauthConfig?: {
    authorizationUrl: string
    clientId: string
    scope?: string
  }
}> {
  try {
    // Load API configuration
    const apiConfig = await prisma.assistantApiConfiguration.findUnique({
      where: { assistantId: BigInt(assistantId) }
    })

    if (!apiConfig || !apiConfig.isActive) {
      return {
        success: false,
        tools: [],
        error: 'No active API configuration found'
      }
    }

    // Check if OAuth is required but not connected
    if (apiConfig.authenticationType === 'oauth' && !apiConfig.accessToken) {
      console.log('[API Tools] OAuth required but not connected for assistant', assistantId)

      return {
        success: false,
        tools: [],
        error: 'oauth_required',
        oauthRequired: true,
        oauthConfig: {
          authorizationUrl: apiConfig.authorizationUrl!,
          clientId: apiConfig.clientId!,
          scope: apiConfig.scope || undefined,
        }
      }
    }

    // ✅ NEW: Load from tools field if available (performance optimization)
    const storedTools = (apiConfig as any).tools
    if (storedTools && Array.isArray(storedTools) && storedTools.length > 0) {
      // Build auth config with auto-refresh (await it since it's async now)
      const authConfig = await buildAuthConfig(apiConfig)

      // Reconstruct OpenAPITool objects from stored definitions
      const tools = storedTools.map((toolDef: any) => {
        // Reconstruct executor from metadata
        // IMPORTANT: Capture authConfig in closure, but refresh on each call
        const executor = async (args: any) => {
          const { executeAPICall } = await import('./openapi-tool-converter')

          // Refresh auth config before each call (in case token expired between calls)
          const freshAuthConfig = await buildAuthConfig(apiConfig)

          // Use stored parameter definitions from metadata
          const paramDefinitions = toolDef.metadata?.parameterDefinitions || []

          return await executeAPICall(
            toolDef.metadata.baseUrl,
            toolDef.metadata.method,
            toolDef.metadata.path,
            paramDefinitions,
            args,
            freshAuthConfig
          )
        }

        return {
          openaiTool: {
            type: toolDef.type,
            name: toolDef.name,
            description: toolDef.description,
            parameters: toolDef.parameters
          },
          executor,
          metadata: toolDef.metadata
        } as OpenAPITool
      })

      console.log(`[API Tools] Loaded ${tools.length} tools from database for assistant ${assistantId}`)
      tools.forEach(tool => {
        console.log(`  - ${tool.openaiTool.name}: ${tool.metadata.method} ${tool.metadata.path}`)
      })

      return {
        success: true,
        tools
      }
    }

    // ❌ Fallback: Parse schema if tools not stored (backward compatibility)
    if (!apiConfig.schema) {
      return {
        success: false,
        tools: [],
        error: 'No schema or tools found in API configuration'
      }
    }

    // Parse the schema (legacy path)
    const parsedSchema = parseOpenAPISchema(apiConfig.schema)
    const authConfig = await buildAuthConfig(apiConfig)
    const tools = convertToOpenAITools(parsedSchema, authConfig)

    console.log(`[API Tools] Loaded ${tools.length} tools from schema parsing for assistant ${assistantId} (legacy path)`)
    
    return {
      success: true,
      tools
    }
  } catch (error: any) {
    console.error('[API Tools] Error loading tools:', error)
    return {
      success: false,
      tools: [],
      error: error.message
    }
  }
}

/**
 * Execute an API tool by name
 */
export async function executeAPITool(
  tools: OpenAPITool[],
  functionName: string,
  args: any
): Promise<any> {
  const tool = tools.find(t => t.openaiTool.name === functionName)

  if (!tool) {
    throw new Error(`Tool "${functionName}" not found`)
  }

  console.log(`[API Tools] Executing ${functionName}`)
  console.log(`[API Tools] Args:`, JSON.stringify(args, null, 2))

  try {
    const result = await tool.executor(args)
    console.log(`[API Tools] Result:`, JSON.stringify(result, null, 2))
    return result
  } catch (error: any) {
    console.error(`[API Tools] Execution failed:`, error.message)
    throw error
  }
}

/**
 * Convert OpenAPI tools to the format expected by OpenAI API
 */
export function toOpenAIToolDefinitions(
  tools: OpenAPITool[]
) {
  return tools.map(t => t.openaiTool)
}
