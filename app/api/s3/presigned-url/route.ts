import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const s3Client = new S3Client({
  region: process.env.AWS_S3_REGION_NAME || process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
  ...(process.env.AWS_S3_ENDPOINT && {
    endpoint: process.env.AWS_S3_ENDPOINT,
    forcePathStyle: true,
  }),
})

const BUCKET_NAME = process.env.AWS_STORAGE_BUCKET_NAME!

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { fileName, fileType } = await request.json()

    if (!fileName || !fileType) {
      return NextResponse.json(
        { error: 'fileName and fileType are required' },
        { status: 400 }
      )
    }

    // Generate unique key
    const timestamp = Date.now()
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_')
    const key = `chat-files/${session.user.id}/${timestamp}-${sanitizedFileName}`

    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      ContentType: fileType,
    })

    const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 })

    // Construct public URL
    const endpoint = process.env.AWS_S3_ENDPOINT
    let publicUrl: string
    if (endpoint) {
      publicUrl = `${endpoint}/${BUCKET_NAME}/${key}`
    } else {
      const region = process.env.AWS_S3_REGION_NAME || process.env.AWS_REGION || 'us-east-1'
      publicUrl = `https://${BUCKET_NAME}.s3.${region}.amazonaws.com/${key}`
    }

    return NextResponse.json({
      url,
      key,
      publicUrl
    })
  } catch (error) {
    console.error('Presigned URL error:', error)
    return NextResponse.json(
      { error: 'Failed to generate upload URL' },
      { status: 500 }
    )
  }
}

