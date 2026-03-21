"use server"

import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import {
  checkVectorStoreFiles,
  uploadAndAddToVectorStoreNoPoll,
  deleteFileFromVectorStore,
  createVectorStore,
} from "@/lib/vector-store"
import { uploadToS3, deleteFromS3 } from "@/lib/aws-s3"
import { openai } from "@/lib/openai"
import { getPresignedImageUrl } from "@/app/actions/image.actions"

// ============================================================
// TYPES
// ============================================================

export interface LibraryFile {
  id: number
  type: "file" | "url" | "text"
  name: string
  /** S3 URL (for type=file) or original URL (for type=url) */
  url: string | null
  /** OpenAI file ID in the vector store */
  vectorFileId: string | null
  /** OpenAI vector store status if known */
  vectorStatus?: string | null
  isCrawled?: boolean
  createdAt: Date
}

// ============================================================
// GET LIBRARY FILES
// ============================================================

/**
 * Fetch all knowledge-base entries for an assistant and augment
 * file/url entries with their OpenAI vector-store status.
 */
export async function getAssistantLibrary(assistantId: string): Promise<{
  success: boolean
  files?: LibraryFile[]
  vectorStoreId?: string | null
  error?: string
}> {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return { success: false, error: "Authentication required" }
    }

    const assistantBigInt = BigInt(assistantId)

    // Verify the assistant belongs to the user
    const assistant = await prisma.assistant.findUnique({
      where: { id: assistantBigInt, deletedAt: null },
      select: { id: true, vectorStoreId: true, userId: true },
    })

    if (!assistant) {
      return { success: false, error: "Assistant not found" }
    }

    // Verify ownership
    if (assistant.userId.toString() !== session.user.id) {
      return { success: false, error: "Access denied" }
    }

    const kbEntries = await prisma.assistantKnowledgebase.findMany({
      where: { assistantId: assistantBigInt },
      orderBy: { createdAt: "desc" },
    })

    // Optionally fetch vector store statuses for file/text entries
    let vectorStatusMap: Record<string, string> = {}
    if (assistant.vectorStoreId && kbEntries.length > 0) {
      try {
        const vsFiles = await checkVectorStoreFiles(assistant.vectorStoreId)
        for (const f of vsFiles.data || []) {
          vectorStatusMap[f.id] = f.status
        }
      } catch (err) {
        console.warn("Could not fetch vector-store file statuses:", err)
      }
    }

    const files: LibraryFile[] = kbEntries.map((entry) => {
      const vectorStatus = entry.vectorFileId
        ? vectorStatusMap[entry.vectorFileId] ?? null
        : null

      if (entry.type === "file") {
        return {
          id: entry.id,
          type: "file",
          name: entry.file
            ? entry.file.split("/").pop() ?? "file"
            : "file",
          url: entry.file,
          vectorFileId: entry.vectorFileId,
          vectorStatus,
          createdAt: entry.createdAt,
        }
      }

      if (entry.type === "url") {
        return {
          id: entry.id,
          type: "url",
          name: entry.url ?? "URL",
          url: entry.url,
          vectorFileId: entry.vectorFileId,
          vectorStatus,
          isCrawled: entry.isCrawled,
          createdAt: entry.createdAt,
        }
      }

      // text / note
      return {
        id: entry.id,
        type: "text",
        name: entry.note
          ? entry.note.substring(0, 60) + (entry.note.length > 60 ? "…" : "")
          : "Note",
        url: null,
        vectorFileId: entry.vectorFileId,
        vectorStatus,
        createdAt: entry.createdAt,
      }
    })

    return {
      success: true,
      files,
      vectorStoreId: assistant.vectorStoreId,
    }
  } catch (error) {
    console.error("❌ getAssistantLibrary error:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

// ============================================================
// UPLOAD FILE TO LIBRARY
// ============================================================

/**
 * Upload a file (from the browser) to S3, then enqueue it in the
 * assistant's vector store and save the knowledge-base record.
 */
export async function uploadLibraryFile(
  assistantId: string,
  formData: FormData
): Promise<{
  success: boolean
  file?: LibraryFile
  error?: string
}> {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return { success: false, error: "Authentication required" }
    }

    const assistantBigInt = BigInt(assistantId)

    const assistant = await prisma.assistant.findUnique({
      where: { id: assistantBigInt, deletedAt: null },
      select: { id: true, vectorStoreId: true, userId: true },
    })

    if (!assistant) {
      return { success: false, error: "Assistant not found" }
    }

    if (assistant.userId.toString() !== session.user.id) {
      return { success: false, error: "Access denied" }
    }

    const file = formData.get("file") as File
    if (!file) {
      return { success: false, error: "No file provided" }
    }

    const fileSizeMB = file.size / (1024 * 1024)
    if (fileSizeMB > 50) {
      return {
        success: false,
        error: `File (${fileSizeMB.toFixed(1)} MB) exceeds the 50 MB limit`,
      }
    }

    // 1. Upload to S3
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const timestamp = Date.now()
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_")
    const s3Key = `${timestamp}_${safeName}`

    const s3Url = await uploadToS3(buffer, s3Key, file.type || "application/octet-stream", "library")

    // 2. Ensure the assistant has a vector store
    let vectorStoreId = assistant.vectorStoreId
    if (!vectorStoreId) {
      const vs = await createVectorStore(`assistant_${assistantId}`)
      vectorStoreId = vs
      await prisma.assistant.update({
        where: { id: assistantBigInt },
        data: { vectorStoreId },
      })
    }

    // 3. Enqueue in vector store WITHOUT polling (avoids server action timeout of minutes)
    let vectorFileId: string | null = null
    try {
      vectorFileId = await uploadAndAddToVectorStoreNoPoll(
        vectorStoreId,
        buffer,
        file.name
      )
    } catch (vsErr) {
      console.warn("Vector store upload failed (non-fatal):", vsErr)
    }

    // 4. Save to database
    const kbEntry = await prisma.assistantKnowledgebase.create({
      data: {
        assistantId: assistantBigInt,
        file: s3Url,
        vectorFileId,
        type: "file",
      },
    })

    const libraryFile: LibraryFile = {
      id: kbEntry.id,
      type: "file",
      name: file.name,
      url: s3Url,
      vectorFileId,
      vectorStatus: null,
      createdAt: kbEntry.createdAt,
    }

    return { success: true, file: libraryFile }
  } catch (error) {
    console.error("❌ uploadLibraryFile error:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

// ============================================================
// DELETE LIBRARY FILE
// ============================================================

export async function deleteLibraryFile(
  assistantId: string,
  kbEntryId: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return { success: false, error: "Authentication required" }
    }

    const assistantBigInt = BigInt(assistantId)

    const assistant = await prisma.assistant.findUnique({
      where: { id: assistantBigInt, deletedAt: null },
      select: { id: true, vectorStoreId: true, userId: true },
    })

    if (!assistant) return { success: false, error: "Assistant not found" }
    if (assistant.userId.toString() !== session.user.id) {
      return { success: false, error: "Access denied" }
    }

    const entry = await prisma.assistantKnowledgebase.findUnique({
      where: { id: kbEntryId },
    })

    if (!entry || entry.assistantId !== assistantBigInt) {
      return { success: false, error: "Entry not found" }
    }

    // 1. Remove from vector store
    if (entry.vectorFileId && assistant.vectorStoreId) {
      try {
        await deleteFileFromVectorStore(assistant.vectorStoreId, entry.vectorFileId)
      } catch (err) {
        console.warn("Vector store delete failed (non-fatal):", err)
      }

      // Also delete the file from OpenAI files
      try {
        await openai.files.delete(entry.vectorFileId)
      } catch (err) {
        console.warn("OpenAI file delete failed (non-fatal):", err)
      }
    }

    // 2. Remove from S3 (for file types)
    if (entry.type === "file" && entry.file) {
      try {
        await deleteFromS3(entry.file)
      } catch (err) {
        console.warn("S3 delete failed (non-fatal):", err)
      }
    }

    // 3. Remove from database
    await prisma.assistantKnowledgebase.delete({ where: { id: kbEntryId } })

    return { success: true }
  } catch (error) {
    console.error("❌ deleteLibraryFile error:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

// ============================================================
// ADD URL TO LIBRARY
// ============================================================

export async function addLibraryUrl(
  assistantId: string,
  url: string
): Promise<{
  success: boolean
  file?: LibraryFile
  error?: string
}> {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return { success: false, error: "Authentication required" }
    }

    if (!url || !url.trim()) {
      return { success: false, error: "URL is required" }
    }

    const trimmedUrl = url.trim()

    const assistantBigInt = BigInt(assistantId)

    const assistant = await prisma.assistant.findUnique({
      where: { id: assistantBigInt, deletedAt: null },
      select: { id: true, vectorStoreId: true, userId: true },
    })

    if (!assistant) return { success: false, error: "Assistant not found" }
    if (assistant.userId.toString() !== session.user.id) {
      return { success: false, error: "Access denied" }
    }

    const kbEntry = await prisma.assistantKnowledgebase.create({
      data: {
        assistantId: assistantBigInt,
        url: trimmedUrl,
        type: "url",
        isCrawled: false,
      },
    })

    const libraryFile: LibraryFile = {
      id: kbEntry.id,
      type: "url",
      name: trimmedUrl,
      url: trimmedUrl,
      vectorFileId: null,
      vectorStatus: null,
      isCrawled: false,
      createdAt: kbEntry.createdAt,
    }

    return { success: true, file: libraryFile }
  } catch (error) {
    console.error("❌ addLibraryUrl error:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

// ============================================================
// ADD NOTE TO LIBRARY
// ============================================================

export async function addLibraryNote(
  assistantId: string,
  title: string,
  content: string
): Promise<{
  success: boolean
  file?: LibraryFile
  error?: string
}> {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return { success: false, error: "Authentication required" }
    }

    if (!content || !content.trim()) {
      return { success: false, error: "Note content is required" }
    }

    const assistantBigInt = BigInt(assistantId)

    const assistant = await prisma.assistant.findUnique({
      where: { id: assistantBigInt, deletedAt: null },
      select: { id: true, vectorStoreId: true, userId: true },
    })

    if (!assistant) return { success: false, error: "Assistant not found" }
    if (assistant.userId.toString() !== session.user.id) {
      return { success: false, error: "Access denied" }
    }

    const noteText = content.trim()
    const noteName = title.trim() || noteText.substring(0, 60) + (noteText.length > 60 ? "…" : "")

    // Optionally index to vector store
    let vectorStoreId = assistant.vectorStoreId
    let vectorFileId: string | null = null

    if (!vectorStoreId) {
      try {
        const vs = await createVectorStore(`assistant_${assistantId}`)
        vectorStoreId = vs
        await prisma.assistant.update({
          where: { id: assistantBigInt },
          data: { vectorStoreId },
        })
      } catch (err) {
        console.warn("Vector store creation failed (non-fatal):", err)
      }
    }

    if (vectorStoreId) {
      try {
        const buffer = Buffer.from(noteText, "utf-8")
        vectorFileId = await uploadAndAddToVectorStoreNoPoll(
          vectorStoreId,
          buffer,
          `${noteName.substring(0, 40)}.txt`
        )
      } catch (vsErr) {
        console.warn("Vector store upload failed (non-fatal):", vsErr)
      }
    }

    const kbEntry = await prisma.assistantKnowledgebase.create({
      data: {
        assistantId: assistantBigInt,
        note: noteText,
        vectorFileId,
        type: "text",
      },
    })

    const libraryFile: LibraryFile = {
      id: kbEntry.id,
      type: "text",
      name: noteName,
      url: null,
      vectorFileId,
      vectorStatus: null,
      createdAt: kbEntry.createdAt,
    }

    return { success: true, file: libraryFile }
  } catch (error) {
    console.error("❌ addLibraryNote error:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

// ============================================================
// GET PRESIGNED DOWNLOAD URL
// ============================================================

export async function getLibraryFilePresignedUrl(
  assistantId: string,
  kbEntryId: number
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return { success: false, error: "Authentication required" }
    }

    const assistantBigInt = BigInt(assistantId)

    const assistant = await prisma.assistant.findUnique({
      where: { id: assistantBigInt, deletedAt: null },
      select: { userId: true },
    })

    if (!assistant) return { success: false, error: "Assistant not found" }
    if (assistant.userId.toString() !== session.user.id) {
      return { success: false, error: "Access denied" }
    }

    const entry = await prisma.assistantKnowledgebase.findUnique({
      where: { id: kbEntryId },
    })

    if (!entry || entry.assistantId !== assistantBigInt) {
      return { success: false, error: "Entry not found" }
    }

    if (!entry.file) {
      return { success: false, error: "No file URL available" }
    }

    const result = await getPresignedImageUrl(entry.file)
    if (!result.success || !result.url) {
      return { success: false, error: "Failed to generate presigned URL" }
    }

    return { success: true, url: result.url }
  } catch (error) {
    console.error("❌ getLibraryFilePresignedUrl error:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}
