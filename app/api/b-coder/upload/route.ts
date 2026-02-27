import { uploadToS3 } from '@/lib/aws-s3'

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

const ALLOWED_TYPES = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    'application/pdf',
]

const MAX_SIZE_MB = 20

export async function POST(req: Request) {
    try {
        const formData = await req.formData()
        const file = formData.get('file') as File | null

        if (!file) {
            return Response.json({ error: 'No file provided' }, { status: 400 })
        }

        if (!ALLOWED_TYPES.includes(file.type)) {
            return Response.json(
                { error: `File type '${file.type}' is not allowed. Allowed: images and PDFs.` },
                { status: 400 }
            )
        }

        const sizeMB = file.size / (1024 * 1024)
        if (sizeMB > MAX_SIZE_MB) {
            return Response.json(
                { error: `File too large (${sizeMB.toFixed(1)}MB). Max ${MAX_SIZE_MB}MB.` },
                { status: 400 }
            )
        }

        const arrayBuffer = await file.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)

        const url = await uploadToS3(buffer, file.name, file.type, 'b-coder')

        return Response.json({
            url,
            fileName: file.name,
            mediaType: file.type,
        })
    } catch (error: any) {
        console.error('[b-coder/upload] Error:', error)
        return Response.json(
            { error: error.message || 'Upload failed' },
            { status: 500 }
        )
    }
}
