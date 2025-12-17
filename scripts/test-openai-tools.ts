// scripts/test-openapi-tools.ts

import { parseSchemaText, validateOpenAPISchema, parseOpenAPISchema } from '@/lib/openapi-parser'
import { convertToOpenAITools, testTool } from '@/lib/openapi-tool-converter'

// Example: Advice Slip API schema
const adviceSlipSchemaYAML = `
openapi: 3.0.1
info:
  title: Advice Slip API
  version: 1.0.0
  description: Get random advice quotes
servers:
  - url: https://api.adviceslip.com
paths:
  /advice:
    get:
      summary: Get random advice
      operationId: getAdvice
      responses:
        "200":
          description: Random advice response
          content:
            application/json:
              schema:
                type: object
                properties:
                  slip:
                    type: object
                    properties:
                      id:
                        type: integer
                      advice:
                        type: string
  /advice/search/{query}:
    get:
      summary: Search for advice
      operationId: searchAdvice
      parameters:
        - name: query
          in: path
          required: true
          schema:
            type: string
          description: Search term
      responses:
        "200":
          description: Search results
          content:
            application/json:
              schema:
                type: object
`

async function testOpenAPITools() {
  console.log('🧪 Testing OpenAPI Tool Conversion\n')
  console.log('=' .repeat(60))
  
  // Step 1: Parse the schema text
  console.log('\n📝 Step 1: Parsing schema text...')
  const parseResult = parseSchemaText(adviceSlipSchemaYAML)
  
  if (!parseResult.success) {
    console.error('❌ Failed to parse schema:', parseResult.error)
    return
  }
  
  console.log('✅ Schema parsed successfully')
  console.log('   Title:', parseResult.data.info.title)
  console.log('   Version:', parseResult.data.info.version)
  
  // Step 2: Validate the schema
  console.log('\n✔️  Step 2: Validating schema...')
  const validationResult = validateOpenAPISchema(parseResult.data)
  
  if (!validationResult.valid) {
    console.error('❌ Schema validation failed:', validationResult.error)
    return
  }
  
  console.log('✅ Schema is valid')
  
  // Step 3: Parse OpenAPI schema
  console.log('\n🔍 Step 3: Parsing OpenAPI schema...')
  const parsedSchema = parseOpenAPISchema(parseResult.data)
  
  console.log('✅ Schema parsed:')
  console.log('   Servers:', parsedSchema.servers)
  console.log('   Endpoints:', parsedSchema.endpoints.length)
  
  parsedSchema.endpoints.forEach((endpoint, idx) => {
    console.log(`\n   Endpoint ${idx + 1}:`)
    console.log(`     ID: ${endpoint.id}`)
    console.log(`     Method: ${endpoint.method}`)
    console.log(`     Path: ${endpoint.path}`)
    console.log(`     Operation: ${endpoint.operationId}`)
    console.log(`     Summary: ${endpoint.summary}`)
    console.log(`     Parameters: ${endpoint.parameters.length}`)
  })
  
  // Step 4: Convert to OpenAI tools
  console.log('\n🔧 Step 4: Converting to OpenAI tools...')
  const tools = convertToOpenAITools(parsedSchema)
  
  console.log(`✅ Converted to ${tools.length} OpenAI function tools:\n`)
  
  tools.forEach((tool, idx) => {
    console.log(`   Tool ${idx + 1}: ${tool.openaiTool.name}`)
    console.log(`     Description: ${tool.openaiTool.description}`)
    console.log(`     Metadata:`)
    console.log(`       Method: ${tool.metadata.method}`)
    console.log(`       Path: ${tool.metadata.path}`)
    console.log(`       Base URL: ${tool.metadata.baseUrl}`)
    
    const params = tool.openaiTool.parameters
    console.log(`     Parameters:`)
    console.log(`       Required: ${params.required.join(', ') || 'none'}`)
    console.log(`       Properties: ${Object.keys(params.properties).join(', ') || 'none'}`)
  })
  
  // Step 5: Test the first tool (getAdvice)
  console.log('\n🚀 Step 5: Testing API call...')
  console.log('   Calling getAdvice()...')
  
  const testResult = await testTool(tools[0])
  
  if (testResult.success) {
    console.log('✅ API call successful!')
    console.log('\n📊 Result:')
    console.log(JSON.stringify(testResult.result, null, 2))
    
    if (testResult.result?.slip?.advice) {
      console.log(`\n💡 Advice: "${testResult.result.slip.advice}"`)
    }
  } else {
    console.log('❌ API call failed:', testResult.error)
  }
  
  // Step 6: Test search endpoint (if available)
  if (tools.length > 1) {
    console.log('\n🔍 Step 6: Testing search endpoint...')
    console.log('   Calling searchAdvice({ query: "love" })...')
    
    const searchResult = await testTool(tools[1], { query: 'love' })
    
    if (searchResult.success) {
      console.log('✅ Search successful!')
      console.log('\n📊 Result:')
      console.log(JSON.stringify(searchResult.result, null, 2))
    } else {
      console.log('❌ Search failed:', searchResult.error)
    }
  }
  
  console.log('\n' + '='.repeat(60))
  console.log('✅ All tests completed!')
}

// Run the test
testOpenAPITools()
  .then(() => {
    console.log('\n✨ Done!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Test failed:', error)
    process.exit(1)
  })