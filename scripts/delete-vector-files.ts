import { openai } from "../lib/openai"

/**
 * Delete all files used in vector stores from your OpenAI account
 * Run: npx tsx scripts/delete-vector-files.ts
 * 
 * ⚠️  WARNING: This will permanently delete ALL files!
 * Use with caution - this action cannot be undone.
 */

/**
 * Delete a single file by ID
 */
async function deleteFile(fileId: string): Promise<boolean> {
  try {
    await openai.files.delete(fileId)
    return true
  } catch (error: any) {
    console.error(`   ❌ Failed to delete ${fileId}: ${error.message}`)
    return false
  }
}

/**
 * List all files and delete them
 */
async function deleteAllFiles(skipConfirmation: boolean = false, purpose?: string) {
  try {
    console.log("\n🔍 Fetching all files...\n")
    
    // Fetch all files
    const files = await openai.files.list({
      purpose: purpose, // Filter by purpose if specified
    })

    if (files.data.length === 0) {
      console.log("✅ No files found. Nothing to delete.\n")
      return
    }

    // Display files
    console.log("=" .repeat(80))
    console.log("FILES TO BE DELETED")
    console.log("=" .repeat(80))

    files.data.forEach((file, index) => {
      console.log(`\n[${index + 1}] ${file.filename}`)
      console.log(`    ID:          ${file.id}`)
      console.log(`    Purpose:     ${file.purpose}`)
      console.log(`    Size:        ${formatBytes(file.bytes)}`)
      console.log(`    Created:     ${new Date(file.created_at * 1000).toLocaleString()}`)
    })

    console.log("\n" + "=" .repeat(80))
    console.log(`Total files to delete: ${files.data.length}`)
    console.log("=" .repeat(80))

    // Confirmation prompt
    if (!skipConfirmation) {
      console.log("\n⚠️  WARNING: This will PERMANENTLY delete all files listed above!")
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
        console.log("\n❌ Deletion cancelled. No files were deleted.\n")
        return
      }
    }

    // Delete all files
    console.log("\n🗑️  Deleting files...\n")
    
    let successCount = 0
    let failCount = 0

    for (let i = 0; i < files.data.length; i++) {
      const file = files.data[i]
      process.stdout.write(`[${i + 1}/${files.data.length}] Deleting ${file.filename}...`)
      
      const success = await deleteFile(file.id)
      
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
    console.log(`📊 Total processed:      ${files.data.length}`)
    console.log("=" .repeat(80))
    console.log("\n✅ Deletion process complete!\n")

  } catch (error: any) {
    console.error("\n❌ Error during deletion process:")
    console.error(error.message)
    process.exit(1)
  }
}

/**
 * Delete files from a specific vector store
 */
async function deleteFilesFromVectorStore(vectorStoreId: string, skipConfirmation: boolean = false) {
  try {
    console.log("\n🔍 Fetching files from vector store...\n")
    
    // Get vector store details
    const vectorStore = await openai.vectorStores.retrieve(vectorStoreId)
    
    console.log("=" .repeat(80))
    console.log(`VECTOR STORE: ${vectorStore.name || "Unnamed"}`)
    console.log("=" .repeat(80))
    console.log(`ID:              ${vectorStore.id}`)
    console.log(`Total Files:     ${vectorStore.file_counts?.total || 0}`)
    console.log("=" .repeat(80))
    
    // Get all files in the vector store
    const vectorStoreFiles = await openai.vectorStores.files.list(vectorStoreId, {
      limit: 100,
    })

    if (vectorStoreFiles.data.length === 0) {
      console.log("\n✅ No files found in this vector store. Nothing to delete.\n")
      return
    }

    // Get detailed file information
    console.log("\n" + "=" .repeat(80))
    console.log("FILES TO BE DELETED FROM VECTOR STORE")
    console.log("=" .repeat(80))

    const fileDetails = []
    for (const vsFile of vectorStoreFiles.data) {
      try {
        const file = await openai.files.retrieve(vsFile.id)
        fileDetails.push(file)
        
        console.log(`\n[${fileDetails.length}] ${file.filename}`)
        console.log(`    ID:          ${file.id}`)
        console.log(`    Purpose:     ${file.purpose}`)
        console.log(`    Size:        ${formatBytes(file.bytes)}`)
        console.log(`    Created:     ${new Date(file.created_at * 1000).toLocaleString()}`)
      } catch (error) {
        console.log(`\n[${fileDetails.length + 1}] File ID: ${vsFile.id}`)
        console.log(`    ⚠️  Could not retrieve file details`)
      }
    }

    console.log("\n" + "=" .repeat(80))
    console.log(`Total files to delete: ${vectorStoreFiles.data.length}`)
    console.log("=" .repeat(80))

    // Confirmation prompt
    if (!skipConfirmation) {
      console.log("\n⚠️  WARNING: This will PERMANENTLY delete all files listed above!")
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
        console.log("\n❌ Deletion cancelled. No files were deleted.\n")
        return
      }
    }

    // Delete all files
    console.log("\n🗑️  Deleting files...\n")
    
    let successCount = 0
    let failCount = 0

    for (let i = 0; i < vectorStoreFiles.data.length; i++) {
      const file = vectorStoreFiles.data[i]
      process.stdout.write(`[${i + 1}/${vectorStoreFiles.data.length}] Deleting ${file.id}...`)
      
      const success = await deleteFile(file.id)
      
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
    console.log(`📊 Total processed:      ${vectorStoreFiles.data.length}`)
    console.log("=" .repeat(80))
    console.log("\n✅ Deletion process complete!\n")

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
 * Delete a specific file by ID
 */
async function deleteSpecificFile(fileId: string, skipConfirmation: boolean = false) {
  try {
    // First, get the file details
    console.log("\n🔍 Fetching file information...\n")
    
    const file = await openai.files.retrieve(fileId)
    
    console.log("=" .repeat(80))
    console.log("FILE TO BE DELETED")
    console.log("=" .repeat(80))
    console.log(`Filename:    ${file.filename}`)
    console.log(`ID:          ${file.id}`)
    console.log(`Purpose:     ${file.purpose}`)
    console.log(`Size:        ${formatBytes(file.bytes)}`)
    console.log(`Created:     ${new Date(file.created_at * 1000).toLocaleString()}`)
    console.log("=" .repeat(80))

    // Confirmation prompt
    if (!skipConfirmation) {
      console.log("\n⚠️  WARNING: This will PERMANENTLY delete this file!")
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
        console.log("\n❌ Deletion cancelled. File was not deleted.\n")
        return
      }
    }

    // Delete the file
    console.log("\n🗑️  Deleting file...\n")
    
    const success = await deleteFile(fileId)
    
    if (success) {
      console.log("✅ File successfully deleted!\n")
    } else {
      console.log("❌ Failed to delete file.\n")
      process.exit(1)
    }

  } catch (error: any) {
    console.error("\n❌ Error:")
    console.error(error.message)
    
    if (error.status === 404) {
      console.error(`\n💡 File "${fileId}" not found.`)
      console.error("   Make sure the ID is correct and the file exists.")
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
🗑️  Vector Store Files Deletion Tool
====================================

⚠️  WARNING: This tool will PERMANENTLY delete files!
Use with extreme caution - deletions cannot be undone.

Usage:
  npx tsx scripts/delete-vector-files.ts [options] [file_id]

Options:
  --all, -a                Delete ALL files in your account
  --vector-store <id>      Delete all files from a specific vector store
  --purpose <purpose>      Delete files with specific purpose (assistants, fine-tune, etc.)
  --yes, -y                Skip confirmation prompt (use with caution!)
  --help, -h               Show this help message
  [file_id]                Delete a specific file by ID

Examples:
  # Delete all files (with confirmation)
  npx tsx scripts/delete-vector-files.ts --all

  # Delete all files (skip confirmation - DANGEROUS!)
  npx tsx scripts/delete-vector-files.ts --all --yes

  # Delete all files from a specific vector store
  npx tsx scripts/delete-vector-files.ts --vector-store vs_abc123xyz

  # Delete all files with purpose "assistants"
  npx tsx scripts/delete-vector-files.ts --all --purpose assistants

  # Delete a specific file
  npx tsx scripts/delete-vector-files.ts file-abc123xyz

  # Delete a specific file without confirmation
  npx tsx scripts/delete-vector-files.ts file-abc123xyz --yes

File Purposes:
  - assistants        Files uploaded for use with Assistants
  - assistants_output Output files from Assistants
  - batch             Files for batch processing
  - fine-tune         Files for fine-tuning models
  - fine-tune-results Results from fine-tuning

Environment Variables:
  OPENAI_API_KEY     Your OpenAI API key (required)
`)
    return
  }

  const skipConfirmation = args.includes("--yes") || args.includes("-y")
  const deleteAll = args.includes("--all") || args.includes("-a")
  
  // Get vector store ID if specified
  const vectorStoreIndex = args.indexOf("--vector-store")
  const vectorStoreId = vectorStoreIndex !== -1 ? args[vectorStoreIndex + 1] : null
  
  // Get purpose if specified
  const purposeIndex = args.indexOf("--purpose")
  const purpose = purposeIndex !== -1 ? args[purposeIndex + 1] : undefined
  
  // Filter out flags to get the file ID
  const fileId = args.find(arg => 
    !arg.startsWith("--") && 
    !arg.startsWith("-") && 
    arg !== vectorStoreId && 
    arg !== purpose
  )

  if (vectorStoreId) {
    // Delete files from specific vector store
    if (!vectorStoreId.startsWith("vs_")) {
      console.error("\n⚠️  Warning: Vector store IDs typically start with 'vs_'")
      console.error(`   You provided: ${vectorStoreId}\n`)
    }
    
    await deleteFilesFromVectorStore(vectorStoreId, skipConfirmation)
  } else if (deleteAll) {
    // Delete all files (optionally filtered by purpose)
    await deleteAllFiles(skipConfirmation, purpose)
  } else if (fileId) {
    // Delete specific file
    if (!fileId.startsWith("file-")) {
      console.error("\n⚠️  Warning: File IDs typically start with 'file-'")
      console.error(`   You provided: ${fileId}\n`)
    }
    
    await deleteSpecificFile(fileId, skipConfirmation)
  } else {
    console.error("\n❌ Error: You must specify either --all, --vector-store, or a file ID")
    console.error("\nUsage:")
    console.error("  npx tsx scripts/delete-vector-files.ts --all")
    console.error("  npx tsx scripts/delete-vector-files.ts --vector-store vs_abc123")
    console.error("  npx tsx scripts/delete-vector-files.ts <file_id>")
    console.error("  npx tsx scripts/delete-vector-files.ts --help\n")
    process.exit(1)
  }
}

// Run the script
main()