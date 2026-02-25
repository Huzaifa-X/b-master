import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getS3ObjectStream, extractKeyFromUrl } from "@/lib/aws-s3"
import { Readable } from "stream"

/**
 * GET /api/attachments?url=<encoded-s3-url>
 *
 * Proxies any S3 attachment (image, file) through the Next.js server using
 * the AWS SDK directly via getS3ObjectStream. This avoids ERR_CONNECTION_RESET
 * that occurs when the browser tries to access a private S3 bucket directly.
 *
 * Used by direct messages and group chat message attachments.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const { searchParams } = req.nextUrl
    const rawUrl = searchParams.get("url")

    if (!rawUrl) {
      return new NextResponse("Missing url parameter", { status: 400 })
    }

    let decodedUrl: string
    try {
      decodedUrl = decodeURIComponent(rawUrl)
    } catch {
      return new NextResponse("Invalid url parameter", { status: 400 })
    }

    // Extract the S3 key from the stored URL
    const key = extractKeyFromUrl(decodedUrl)
    if (!key) {
      return new NextResponse("Invalid S3 URL", { status: 422 })
    }

    // Stream directly from S3 via SDK — browser never touches S3 directly
    const { body, contentType, contentLength } = await getS3ObjectStream(key)

    // Derive a clean filename from the key (strip timestamp prefix)
    const rawName = key.split("/").pop() ?? "file"
    const fileName = rawName.replace(/^\d+-/, "")

    const headers = new Headers({
      "Content-Type": contentType,
      "Content-Disposition": `inline; filename="${encodeURIComponent(fileName)}"`,
      "Cache-Control": "private, max-age=3600",
    })

    if (contentLength !== null) {
      headers.set("Content-Length", String(contentLength))
    }

    // Convert Node.js Readable to Web ReadableStream for NextResponse
    const webStream = Readable.toWeb(body as Readable) as ReadableStream

    return new NextResponse(webStream, { status: 200, headers })
  } catch (error: any) {
    console.error("❌ Attachment proxy error:", error)
    return new NextResponse("Internal server error", { status: 500 })
  }
}
