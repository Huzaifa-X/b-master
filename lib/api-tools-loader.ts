// lib/api-tools-loader.ts

import prisma from './prisma'
import { parseOpenAPISchema } from './openapi-parser'
import { convertToOpenAITools, OpenAPITool, AuthConfig } from './openapi-tool-converter'

/**
 * Load API tools for an assistant
 */
export async function loadAPITools(assistantId: string): Promise<{
  success: boolean
  tools: OpenAPITool[]
  error?: string
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

    if (!apiConfig.schema) {
      return {
        success: false,
        tools: [],
        error: 'No schema defined in API configuration'
      }
    }

    // Parse the schema
    const parsedSchema = parseOpenAPISchema(apiConfig.schema)

    // Build auth config
    const authConfig: AuthConfig = {
      type: apiConfig.authenticationType,
      apiKey: apiConfig.apiKey || undefined,
      authType: apiConfig.authType || undefined,
      customHeaderName: apiConfig.customHeaderName || undefined,
      clientId: apiConfig.clientId || undefined,
      clientSecret: apiConfig.clientSecret || undefined,
      tokenUrl: apiConfig.tokenUrl || undefined
    }

    // Convert to OpenAI tools
    const tools = convertToOpenAITools(parsedSchema, authConfig)

    console.log(`[API Tools] Loaded ${tools.length} tools for assistant ${assistantId}:`)
    tools.forEach(tool => {
      console.log(`  - ${tool.tool.function.name}: ${tool.metadata.method} ${tool.metadata.path}`)
    })

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
  const tool = tools.find(t => t.tool.function.name === functionName)

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
export function toOpenAIToolDefinitions(tools: OpenAPITool[]): any[] {
  return tools.map(tool => tool.tool)
}