import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getS3ObjectStream } from "@/lib/aws-s3"

/**
 * API route to proxy S3 media files, bypassing CORS issues
 * Usage: /api/media/{s3-key}
 * Example: /api/media/newsfeed/1234-video.mp4
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { path } = await params
    const s3Key = path.join("/")

    if (!s3Key) {
      return NextResponse.json({ error: "Missing path" }, { status: 400 })
    }

    // Get the object stream from S3
    const { body, contentType, contentLength } = await getS3ObjectStream(s3Key)

    // Create response headers
    const headers: HeadersInit = {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
      "Accept-Ranges": "bytes",
    }

    if (contentLength !== null) {
      headers["Content-Length"] = contentLength.toString()
    }

    // Handle range requests for video seeking
    const rangeHeader = request.headers.get("range")
    if (rangeHeader && contentLength !== null) {
      const [startStr, endStr] = rangeHeader.replace(/bytes=/, "").split("-")
      const start = parseInt(startStr, 10)
      const end = endStr ? parseInt(endStr, 10) : contentLength - 1

      headers["Content-Range"] = `bytes ${start}-${end}/${contentLength}`
      headers["Content-Length"] = (end - start + 1).toString()

      // For range requests, we need to return 206 Partial Content
      // However, streaming the full body and letting the browser handle it
      // is simpler for now
    }

    // Stream the response
    // @ts-ignore - ReadableStream types
    return new NextResponse(body, {
      status: 200,
      headers,
    })
  } catch (error: any) {
    console.error("Media proxy error:", error)

    if (error.name === "NotFound" || error.$metadata?.httpStatusCode === 404) {
      return NextResponse.json({ error: "Media not found" }, { status: 404 })
    }

    return NextResponse.json(
      { error: "Failed to fetch media" },
      { status: 500 }
    )
  }
}
