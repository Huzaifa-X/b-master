import { openai } from "../lib/openai"

/**
 * View all information about a vector store
 * Run: npx ts-node scripts/view-vector-store.ts <vector_store_id>
 */
async function viewVectorStore(vectorStoreId: string) {
  try {
    console.log("\n🔍 Fetching vector store information...\n")

    // 1. Get vector store details
    const vectorStore = await openai.vectorStores.retrieve(vectorStoreId)
    
    console.log("=" .repeat(60))
    console.log("📦 VECTOR STORE DETAILS")
    console.log("=" .repeat(60))
    console.log(`ID:              ${vectorStore.id}`)
    console.log(`Name:            ${vectorStore.name}`)
    console.log(`Status:          ${vectorStore.status}`)
    console.log(`Created:         ${new Date(vectorStore.created_at * 1000).toLocaleString()}`)
    console.log(`File Count:      ${vectorStore.file_counts?.total || 0}`)
    console.log(`  - Completed:   ${vectorStore.file_counts?.completed || 0}`)
    console.log(`  - In Progress: ${vectorStore.file_counts?.in_progress || 0}`)
    console.log(`  - Failed:      ${vectorStore.file_counts?.failed || 0}`)
    console.log(`  - Cancelled:   ${vectorStore.file_counts?.cancelled || 0}`)
    console.log(`Usage (bytes):   ${vectorStore.usage_bytes}`)
    console.log(`Expires:         ${vectorStore.expires_at ? new Date(vectorStore.expires_at * 1000).toLocaleString() : 'Never'}`)
    console.log("=" .repeat(60))

    // 2. Get all files in the vector store
    console.log("\n📄 FILES IN VECTOR STORE")
    console.log("=" .repeat(60))
    
    const files = await openai.vectorStores.files.list(vectorStoreId, {
      limit: 100,
    })

    if (files.data.length === 0) {
      console.log("No files found in this vector store.")
    } else {
      files.data.forEach((file, index) => {
        console.log(`\n[${index + 1}] File ID: ${file.id}`)
        console.log(`    Status:      ${file.status}`)
        console.log(`    Created:     ${new Date(file.created_at * 1000).toLocaleString()}`)
        
        if (file.last_error) {
          console.log(`    ❌ Error:    ${file.last_error.message}`)
        }
      })
    }

    console.log("\n" + "=" .repeat(60))
    console.log(`Total files: ${files.data.length}`)
    console.log("=" .repeat(60))

    // 3. Get detailed file information for each file
    if (files.data.length > 0 && files.data.length <= 5) {
      console.log("\n📋 DETAILED FILE INFORMATION")
      console.log("=" .repeat(60))
      
      for (const vectorStoreFile of files.data) {
        try {
          const fileDetails = await openai.files.retrieve(vectorStoreFile.id)
          
          console.log(`\nFile: ${fileDetails.filename}`)
          console.log(`  ID:       ${fileDetails.id}`)
          console.log(`  Purpose:  ${fileDetails.purpose}`)
          console.log(`  Size:     ${formatBytes(fileDetails.bytes)}`)
          console.log(`  Created:  ${new Date(fileDetails.created_at * 1000).toLocaleString()}`)
        } catch (error) {
          console.log(`\nFile: ${vectorStoreFile.id}`)
          console.log(`  ⚠️  Could not retrieve detailed information`)
        }
      }
      
      console.log("\n" + "=" .repeat(60))
    } else if (files.data.length > 5) {
      console.log(`\n⚠️  Too many files (${files.data.length}) to show detailed info.`)
      console.log(`   Use the file IDs above to inspect individual files.`)
    }

    // 4. Summary
    console.log("\n✅ Vector store information retrieved successfully!\n")

  } catch (error: any) {
    console.error("\n❌ Error retrieving vector store information:")
    console.error(error.message)
    
    if (error.status === 404) {
      console.error(`\n💡 Vector store "${vectorStoreId}" not found.`)
      console.error("   Make sure the ID is correct and the vector store exists.")
    }
    
    process.exit(1)
  }
}

/**
 * List all vector stores in your account
 */
async function listAllVectorStores() {
  try {
    console.log("\n📚 Fetching all vector stores...\n")
    
    const vectorStores = await openai.vectorStores.list({
      limit: 20,
    })

    if (vectorStores.data.length === 0) {
      console.log("No vector stores found in your account.")
      return
    }

    console.log("=" .repeat(80))
    console.log("ALL VECTOR STORES")
    console.log("=" .repeat(80))

    vectorStores.data.forEach((vs, index) => {
      console.log(`\n[${index + 1}] ${vs.name || "Unnamed"}`)
      console.log(`    ID:          ${vs.id}`)
      console.log(`    Status:      ${vs.status}`)
      console.log(`    Files:       ${vs.file_counts?.total || 0} total`)
      console.log(`    Created:     ${new Date(vs.created_at * 1000).toLocaleString()}`)
      console.log(`    Usage:       ${formatBytes(vs.usage_bytes)}`)
    })

    console.log("\n" + "=" .repeat(80))
    console.log(`Total vector stores: ${vectorStores.data.length}`)
    console.log("=" .repeat(80))
    console.log("\n💡 To view details of a specific vector store, run:")
    console.log("   npx ts-node scripts/view-vector-store.ts <vector_store_id>\n")

  } catch (error: any) {
    console.error("\n❌ Error listing vector stores:")
    console.error(error.message)
    process.exit(1)
  }
}

/**
 * Format bytes to human-readable format
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes"
  
  const k = 1024
  const sizes = ["Bytes", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i]
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2)
  
  // Check for help flag
  if (args.includes("--help") || args.includes("-h")) {
    console.log(`
📚 Vector Store Viewer
=====================

Usage:
  npx ts-node scripts/view-vector-store.ts [vector_store_id]
  npx ts-node scripts/view-vector-store.ts --list
  npx ts-node scripts/view-vector-store.ts --help

Options:
  [vector_store_id]  View detailed information about a specific vector store
  --list, -l         List all vector stores in your account
  --help, -h         Show this help message

Examples:
  npx ts-node scripts/view-vector-store.ts vs_abc123xyz
  npx ts-node scripts/view-vector-store.ts --list

Environment Variables:
  OPENAI_API_KEY     Your OpenAI API key (required)
`)
    return
  }

  // Check for list flag
  if (args.includes("--list") || args.includes("-l")) {
    await listAllVectorStores()
    return
  }

  // Check for vector store ID
  if (args.length === 0) {
    console.error("\n❌ Error: Vector store ID is required")
    console.error("\nUsage:")
    console.error("  npx ts-node scripts/view-vector-store.ts <vector_store_id>")
    console.error("  npx ts-node scripts/view-vector-store.ts --list")
    console.error("  npx ts-node scripts/view-vector-store.ts --help\n")
    process.exit(1)
  }

  const vectorStoreId = args[0]
  
  // Validate vector store ID format
  if (!vectorStoreId.startsWith("vs_")) {
    console.error("\n⚠️  Warning: Vector store IDs typically start with 'vs_'")
    console.error(`   You provided: ${vectorStoreId}\n`)
  }

  await viewVectorStore(vectorStoreId)
}

// Run the script
main()