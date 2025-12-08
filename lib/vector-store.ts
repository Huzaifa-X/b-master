import { openai } from "@/lib/openai"
import { uploadToS3 } from "@/lib/aws-s3"

// ============================================
// VECTOR STORE OPERATIONS
// ============================================

/**
 * Create a new vector store in OpenAI
 * @param name - Name of the vector store
 * @returns Vector store ID
 */
export async function createVectorStore(name: string): Promise<string> {
  try {
    const vectorStore = await openai.vectorStores.create({
      name: name,
    })

    console.log(`✅ Vector store created: ${vectorStore.id}`)
    return vectorStore.id
  } catch (error) {
    console.error("❌ Error creating vector store:", error)
    throw new Error(
      `Failed to create vector store: ${error instanceof Error ? error.message : "Unknown error"}`
    )
  }
}

/**
 * Upload a file to OpenAI Files API
 * @param fileBuffer - Buffer containing file data
 * @param fileName - Name of the file
 * @returns OpenAI file ID
 */
export async function uploadFileToOpenAI(
  fileBuffer: Buffer,
  fileName: string
): Promise<string> {
  try {
    // Convert Buffer to Uint8Array (compatible with Blob)
    const uint8Array = new Uint8Array(fileBuffer)
    const blob = new Blob([uint8Array])
    const file = new File([blob], fileName)

    // Upload to OpenAI Files API
    const uploadedFile = await openai.files.create({
      file: file,
      purpose: "assistants",
    })

    console.log(`✅ File uploaded to OpenAI: ${uploadedFile.id}`)
    return uploadedFile.id
  } catch (error) {
    console.error("❌ Error uploading file to OpenAI:", error)
    throw new Error(
      `Failed to upload file to OpenAI: ${error instanceof Error ? error.message : "Unknown error"}`
    )
  }
}

/**
 * Add a file to a vector store
 * @param vectorStoreId - ID of the vector store
 * @param fileId - OpenAI file ID
 * @param attributes - Optional metadata for filtering
 * @returns vector_store.file object
 */
export async function addFileToVectorStore(
  vectorStoreId: string,
  fileId: string,
  attributes?: Record<string, string | number>
): Promise<any> {
  try {
    const result = await openai.vectorStores.files.createAndPoll(
      vectorStoreId,
      {
        file_id: fileId,
        ...(attributes && { 
          // @ts-ignore - OpenAI types may not include attributes yet
          attributes 
        }),
      }
    )

    console.log(`✅ File added to vector store: ${fileId}`)
    return result
  } catch (error) {
    console.error("❌ Error adding file to vector store:", error)
    throw new Error(
      `Failed to add file to vector store: ${error instanceof Error ? error.message : "Unknown error"}`
    )
  }
}

/**
 * Upload file directly to vector store (combines upload + add)
 * @param vectorStoreId - ID of the vector store
 * @param fileBuffer - Buffer containing file data
 * @param fileName - Name of the file
 * @param attributes - Optional metadata for filtering
 * @returns OpenAI file ID
 */
export async function uploadAndAddToVectorStore(
  vectorStoreId: string,
  fileBuffer: Buffer,
  fileName: string,
  attributes?: Record<string, string | number>
): Promise<string> {
  try {
    // Convert Buffer to Uint8Array (compatible with Blob)
    const uint8Array = new Uint8Array(fileBuffer)
    const blob = new Blob([uint8Array])
    const file = new File([blob], fileName)

    // Upload directly to vector store
    const result = await openai.vectorStores.files.uploadAndPoll(
      vectorStoreId,
      file
    )

    console.log(`✅ File uploaded and added to vector store: ${result.id}`)
    return result.id
  } catch (error) {
    console.error("❌ Error uploading to vector store:", error)
    throw new Error(
      `Failed to upload to vector store: ${error instanceof Error ? error.message : "Unknown error"}`
    )
  }
}

/**
 * Add text note to vector store by creating a temporary text file
 * @param vectorStoreId - ID of the vector store
 * @param noteContent - Text content to add
 * @param noteName - Name for the note
 * @returns OpenAI file ID
 */
export async function addNoteToVectorStore(
  vectorStoreId: string,
  noteContent: string,
  noteName: string
): Promise<string> {
  try {
    // Create text file from note
    const noteBuffer = Buffer.from(noteContent, "utf-8")
    const fileName = `${noteName.replace(/[^a-zA-Z0-9]/g, "_")}.txt`

    // Upload to vector store
    const fileId = await uploadAndAddToVectorStore(
      vectorStoreId,
      noteBuffer,
      fileName,
      {
        type: "note",
        created_at: Math.floor(Date.now() / 1000),
      }
    )

    return fileId
  } catch (error) {
    console.error("❌ Error adding note to vector store:", error)
    throw new Error(
      `Failed to add note to vector store: ${error instanceof Error ? error.message : "Unknown error"}`
    )
  }
}

/**
 * Check the status of files in a vector store
 * @param vectorStoreId - ID of the vector store
 * @returns List of files with their status
 */
export async function checkVectorStoreFiles(vectorStoreId: string): Promise<any> {
  try {
    const result = await openai.vectorStores.files.list(vectorStoreId)
    return result
  } catch (error) {
    console.error("❌ Error checking vector store files:", error)
    throw new Error(
      `Failed to check vector store files: ${error instanceof Error ? error.message : "Unknown error"}`
    )
  }
}

/**
 * Delete a file from vector store
 * @param vectorStoreId - ID of the vector store
 * @param fileId - OpenAI file ID
 */
export async function deleteFileFromVectorStore(
  vectorStoreId: string,
  fileId: string
): Promise<void> {
  try {
    await openai.vectorStores.files.delete(fileId, {
      vector_store_id: vectorStoreId
    })
    console.log(`✅ File deleted from vector store: ${fileId}`)
  } catch (error) {
    console.error("❌ Error deleting file from vector store:", error)
    throw new Error(
      `Failed to delete file from vector store: ${error instanceof Error ? error.message : "Unknown error"}`
    )
  }
}

/**
 * Delete entire vector store
 * @param vectorStoreId - ID of the vector store
 */
export async function deleteVectorStore(vectorStoreId: string): Promise<void> {
  try {
    await openai.vectorStores.delete(vectorStoreId)
    console.log(`✅ Vector store deleted: ${vectorStoreId}`)
  } catch (error) {
    console.error("❌ Error deleting vector store:", error)
    throw new Error(
      `Failed to delete vector store: ${error instanceof Error ? error.message : "Unknown error"}`
    )
  }
}

/**
 * Search in vector store (for retrieval)
 * @param vectorStoreId - ID of the vector store
 * @param query - Search query
 * @param maxResults - Maximum number of results (default: 10)
 * @returns Search results
 */
export async function searchVectorStore(
  vectorStoreId: string,
  query: string,
  maxResults: number = 10
): Promise<any> {
  try {
    const results = await openai.vectorStores.search(
      vectorStoreId,
      {
        query: query,
        // @ts-ignore - OpenAI types may not include max_num_results yet
        max_num_results: maxResults,
      }
    )

    return results
  } catch (error) {
    console.error("❌ Error searching vector store:", error)
    throw new Error(
      `Failed to search vector store: ${error instanceof Error ? error.message : "Unknown error"}`
    )
  }
}

/**
 * Batch add files to vector store
 * @param vectorStoreId - ID of the vector store
 * @param files - Array of file objects with buffer and metadata
 * @returns Array of OpenAI file IDs
 */
export async function batchAddFilesToVectorStore(
  vectorStoreId: string,
  files: Array<{
    buffer: Buffer
    fileName: string
    attributes?: Record<string, string | number>
  }>
): Promise<string[]> {
  try {
    const filePromises = files.map((file) =>
      uploadAndAddToVectorStore(
        vectorStoreId,
        file.buffer,
        file.fileName,
        file.attributes
      )
    )

    const fileIds = await Promise.all(filePromises)
    console.log(`✅ ${fileIds.length} files added to vector store`)

    return fileIds
  } catch (error) {
    console.error("❌ Error in batch add to vector store:", error)
    throw new Error(
      `Failed to batch add files: ${error instanceof Error ? error.message : "Unknown error"}`
    )
  }
}