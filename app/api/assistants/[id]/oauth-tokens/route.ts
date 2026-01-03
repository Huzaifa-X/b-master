import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { encrypt } from '@/lib/encryption'

/**
 * POST /api/assistants/[id]/oauth-tokens
 * Store OAuth tokens in database after successful authorization
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: assistantId } = await params

    // Verify assistant belongs to user
    const assistant = await prisma.assistant.findFirst({
      where: {
        id: BigInt(assistantId),
        userId: BigInt(session.user.id)
      }
    })

    if (!assistant) {
      return NextResponse.json({ error: 'Assistant not found' }, { status: 404 })
    }

    const body = await request.json()
    const { accessToken, refreshToken, expiresIn } = body

    if (!accessToken) {
      return NextResponse.json(
        { error: 'accessToken is required' },
        { status: 400 }
      )
    }

    // Calculate token expiry
    const tokenExpiry = expiresIn
      ? new Date(Date.now() + expiresIn * 1000)
      : null

    // Update API configuration with OAuth tokens
    await prisma.assistantApiConfiguration.update({
      where: { assistantId: BigInt(assistantId) },
      data: {
        accessToken: encrypt(accessToken),
        refreshToken: refreshToken ? encrypt(refreshToken) : null,
        tokenExpiry
      }
    })

    console.log(`✅ OAuth tokens stored successfully for assistant ${assistantId}`)

    return NextResponse.json({
      success: true,
      message: 'OAuth tokens stored successfully'
    })

  } catch (error: any) {
    console.error('Error storing OAuth tokens:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to store OAuth tokens' },
      { status: 500 }
    )
  }
}
