import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { getS3ObjectStream, extractKeyFromUrl } from "@/lib/aws-s3"
import { Readable } from "stream"

/**
 * GET /api/assistants/[id]/library/[fileId]
 *
 * Streams the S3 file back to the browser using the AWS SDK directly.
 * This avoids the ConnectTimeoutError caused by the server trying to reach
 * s3.<region>.amazonaws.com via HTTP (the presigned-URL fetch approach).
 * The SDK uses the internal AWS network / configured endpoint which is
 * always reachable from the server.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; fileId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const { id: assistantId, fileId } = await params
    const assistantBigInt = BigInt(assistantId)
    const kbEntryId = parseInt(fileId, 10)

    if (isNaN(kbEntryId)) {
      return new NextResponse("Invalid file ID", { status: 400 })
    }

    // Verify the assistant belongs to the user (or user has access)
    const assistant = await prisma.assistant.findUnique({
      where: { id: assistantBigInt, deletedAt: null },
      select: { userId: true },
    })

    if (!assistant) {
      return new NextResponse("Assistant not found", { status: 404 })
    }

    if (assistant.userId.toString() !== session.user.id) {
      return new NextResponse("Forbidden", { status: 403 })
    }

    // Find the knowledge-base entry
    const entry = await prisma.assistantKnowledgebase.findUnique({
      where: { id: kbEntryId },
    })

    if (!entry || entry.assistantId !== assistantBigInt) {
      return new NextResponse("File not found", { status: 404 })
    }

    if (!entry.file) {
      return new NextResponse("No file URL available", { status: 404 })
    }

    const key = extractKeyFromUrl(entry.file)
    if (!key) {
      return new NextResponse("Invalid S3 URL", { status: 422 })
    }

    // Stream directly from S3 via SDK — no outbound HTTPS to S3 URL required
    const { body, contentType, contentLength } = await getS3ObjectStream(key)

    // Determine a clean filename (strip timestamp prefix added during upload)
    const rawName = entry.file.split("/").pop() ?? "file"
    const fileName = rawName.replace(/^\d+_/, "")

    const headers = new Headers({
      "Content-Type": contentType,
      "Content-Disposition": `inline; filename="${encodeURIComponent(fileName)}"`,
      "Cache-Control": "private, max-age=300",
    })

    if (contentLength !== null) {
      headers.set("Content-Length", String(contentLength))
    }

    // Convert Node.js Readable to Web ReadableStream for NextResponse
    const webStream = Readable.toWeb(body as Readable) as ReadableStream

    return new NextResponse(webStream, { status: 200, headers })
  } catch (error) {
    console.error("❌ Library preview proxy error:", error)
    return new NextResponse("Internal server error", { status: 500 })
  }
}
