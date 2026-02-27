import { NextRequest } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Image proxy for B-Coder attached images.
 * Fetches S3 images server-side and streams them to the browser,
 * bypassing any S3 CORS / access-control restrictions on <img> tags.
 *
 * Usage: /api/b-coder/image-proxy?url=<encoded-s3-url>
 */
export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url)
    const imageUrl = searchParams.get('url')

    if (!imageUrl) {
        return new Response('Missing url parameter', { status: 400 })
    }

    // Only allow fetching from our own S3 bucket domain to prevent open-proxy abuse
    let parsed: URL
    try {
        parsed = new URL(imageUrl)
    } catch {
        return new Response('Invalid url parameter', { status: 400 })
    }

    const bucketName = process.env.S3_AWS_STORAGE_BUCKET_NAME ?? ''
    const region = process.env.S3_AWS_S3_REGION_NAME ?? ''
    const customEndpoint = process.env.S3_AWS_S3_ENDPOINT ?? ''

    const allowedHosts = [
        `${bucketName}.s3.${region}.amazonaws.com`,
        ...(customEndpoint ? [new URL(customEndpoint).host] : []),
    ].filter(Boolean)

    if (!allowedHosts.some(host => parsed.host === host || parsed.host.endsWith(`.${host}`))) {
        return new Response('URL not allowed', { status: 403 })
    }

    try {
        const upstream = await fetch(imageUrl, {
            // Pass through the request headers so presigned URLs work too
            headers: { Accept: 'image/*' },
        })

        if (!upstream.ok) {
            return new Response(`Upstream error: ${upstream.status}`, { status: upstream.status })
        }

        const contentType = upstream.headers.get('content-type') ?? 'image/jpeg'
        const body = upstream.body

        return new Response(body, {
            status: 200,
            headers: {
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=86400, immutable',
                'Access-Control-Allow-Origin': '*',
            },
        })
    } catch (err: any) {
        console.error('[image-proxy] Error fetching image:', err)
        return new Response('Failed to fetch image', { status: 502 })
    }
}
