import { openai } from "../lib/openai"

/**
 * Delete all vector stores from your OpenAI account
 * Run: npx ts-node scripts/delete-all-vector-stores.ts
 * 
 * ⚠️  WARNING: This will permanently delete ALL vector stores!
 * Use with caution - this action cannot be undone.
 */

/**
 * Delete a single vector store by ID
 */
async function deleteVectorStore(vectorStoreId: string): Promise<boolean> {
  try {
    await openai.vectorStores.delete(vectorStoreId)
    return true
  } catch (error: any) {
    console.error(`   ❌ Failed to delete ${vectorStoreId}: ${error.message}`)
    return false
  }
}

/**
 * List all vector stores and delete them
 */
async function deleteAllVectorStores(skipConfirmation: boolean = false) {
  try {
    console.log("\n🔍 Fetching all vector stores...\n")
    
    // Fetch all vector stores
    const vectorStores = await openai.vectorStores.list({
      limit: 100, // Adjust if you have more than 100
    })

    if (vectorStores.data.length === 0) {
      console.log("✅ No vector stores found. Nothing to delete.\n")
      return
    }

    // Display vector stores
    console.log("=" .repeat(80))
    console.log("VECTOR STORES TO BE DELETED")
    console.log("=" .repeat(80))

    vectorStores.data.forEach((vs, index) => {
      console.log(`\n[${index + 1}] ${vs.name || "Unnamed"}`)
      console.log(`    ID:          ${vs.id}`)
      console.log(`    Status:      ${vs.status}`)
      console.log(`    Files:       ${vs.file_counts?.total || 0} total`)
      console.log(`    Created:     ${new Date(vs.created_at * 1000).toLocaleString()}`)
      console.log(`    Size:        ${formatBytes(vs.usage_bytes)}`)
    })

    console.log("\n" + "=" .repeat(80))
    console.log(`Total vector stores to delete: ${vectorStores.data.length}`)
    console.log("=" .repeat(80))

    // Confirmation prompt
    if (!skipConfirmation) {
      console.log("\n⚠️  WARNING: This will PERMANENTLY delete all vector stores listed above!")
      console.log("⚠️  This action CANNOT be undone!\n")
      
      const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
      })

      const answer = await new Promise<string>((resolve) => {
        readline.question('Type "DELETE ALL" to confirm: ', resolve)
      })
      
      readline.close()

      if (answer.trim() !== "DELETE ALL") {
        console.log("\n❌ Deletion cancelled. No vector stores were deleted.\n")
        return
      }
    }

    // Delete all vector stores
    console.log("\n🗑️  Deleting vector stores...\n")
    
    let successCount = 0
    let failCount = 0

    for (let i = 0; i < vectorStores.data.length; i++) {
      const vs = vectorStores.data[i]
      process.stdout.write(`[${i + 1}/${vectorStores.data.length}] Deleting ${vs.id}...`)
      
      const success = await deleteVectorStore(vs.id)
      
      if (success) {
        console.log(" ✅ Deleted")
        successCount++
      } else {
        failCount++
      }
    }

    // Summary
    console.log("\n" + "=" .repeat(80))
    console.log("DELETION SUMMARY")
    console.log("=" .repeat(80))
    console.log(`✅ Successfully deleted: ${successCount}`)
    console.log(`❌ Failed to delete:     ${failCount}`)
    console.log(`📊 Total processed:      ${vectorStores.data.length}`)
    console.log("=" .repeat(80))
    console.log("\n✅ Deletion process complete!\n")

  } catch (error: any) {
    console.error("\n❌ Error during deletion process:")
    console.error(error.message)
    process.exit(1)
  }
}

/**
 * Delete a specific vector store by ID
 */
async function deleteSpecificVectorStore(vectorStoreId: string, skipConfirmation: boolean = false) {
  try {
    // First, get the vector store details
    console.log("\n🔍 Fetching vector store information...\n")
    
    const vectorStore = await openai.vectorStores.retrieve(vectorStoreId)
    
    console.log("=" .repeat(80))
    console.log("VECTOR STORE TO BE DELETED")
    console.log("=" .repeat(80))
    console.log(`Name:        ${vectorStore.name || "Unnamed"}`)
    console.log(`ID:          ${vectorStore.id}`)
    console.log(`Status:      ${vectorStore.status}`)
    console.log(`Files:       ${vectorStore.file_counts?.total || 0} total`)
    console.log(`Created:     ${new Date(vectorStore.created_at * 1000).toLocaleString()}`)
    console.log(`Size:        ${formatBytes(vectorStore.usage_bytes)}`)
    console.log("=" .repeat(80))

    // Confirmation prompt
    if (!skipConfirmation) {
      console.log("\n⚠️  WARNING: This will PERMANENTLY delete this vector store!")
      console.log("⚠️  This action CANNOT be undone!\n")
      
      const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
      })

      const answer = await new Promise<string>((resolve) => {
        readline.question('Type "DELETE" to confirm: ', resolve)
      })
      
      readline.close()

      if (answer.trim() !== "DELETE") {
        console.log("\n❌ Deletion cancelled. Vector store was not deleted.\n")
        return
      }
    }

    // Delete the vector store
    console.log("\n🗑️  Deleting vector store...\n")
    
    const success = await deleteVectorStore(vectorStoreId)
    
    if (success) {
      console.log("✅ Vector store successfully deleted!\n")
    } else {
      console.log("❌ Failed to delete vector store.\n")
      process.exit(1)
    }

  } catch (error: any) {
    console.error("\n❌ Error:")
    console.error(error.message)
    
    if (error.status === 404) {
      console.error(`\n💡 Vector store "${vectorStoreId}" not found.`)
      console.error("   Make sure the ID is correct and the vector store exists.")
    }
    
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
🗑️  Vector Store Deletion Tool
==============================

⚠️  WARNING: This tool will PERMANENTLY delete vector stores!
Use with extreme caution - deletions cannot be undone.

Usage:
  npx ts-node scripts/delete-all-vector-stores.ts [options] [vector_store_id]

Options:
  --all, -a          Delete ALL vector stores in your account
  --yes, -y          Skip confirmation prompt (use with caution!)
  --help, -h         Show this help message
  [vector_store_id]  Delete a specific vector store by ID

Examples:
  # Delete all vector stores (with confirmation)
  npx ts-node scripts/delete-all-vector-stores.ts --all

  # Delete all vector stores (skip confirmation - DANGEROUS!)
  npx ts-node scripts/delete-all-vector-stores.ts --all --yes

  # Delete a specific vector store
  npx ts-node scripts/delete-all-vector-stores.ts vs_abc123xyz

  # Delete a specific vector store without confirmation
  npx ts-node scripts/delete-all-vector-stores.ts vs_abc123xyz --yes

Environment Variables:
  OPENAI_API_KEY     Your OpenAI API key (required)
`)
    return
  }

  const skipConfirmation = args.includes("--yes") || args.includes("-y")
  const deleteAll = args.includes("--all") || args.includes("-a")
  
  // Filter out flags to get the vector store ID
  const vectorStoreId = args.find(arg => !arg.startsWith("--") && !arg.startsWith("-"))

  if (deleteAll) {
    await deleteAllVectorStores(skipConfirmation)
  } else if (vectorStoreId) {
    // Validate vector store ID format
    if (!vectorStoreId.startsWith("vs_")) {
      console.error("\n⚠️  Warning: Vector store IDs typically start with 'vs_'")
      console.error(`   You provided: ${vectorStoreId}\n`)
    }
    
    await deleteSpecificVectorStore(vectorStoreId, skipConfirmation)
  } else {
    console.error("\n❌ Error: You must specify either --all or a vector store ID")
    console.error("\nUsage:")
    console.error("  npx ts-node scripts/delete-all-vector-stores.ts --all")
    console.error("  npx ts-node scripts/delete-all-vector-stores.ts <vector_store_id>")
    console.error("  npx ts-node scripts/delete-all-vector-stores.ts --help\n")
    process.exit(1)
  }
}

// Run the script
main()