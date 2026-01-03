import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { decrypt } from '@/lib/encryption'

/**
 * GET /api/assistants/[id]/api-config
 * Get API configuration for OAuth (excluding sensitive encrypted data)
 */
export async function GET(
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

    // Get API configuration
    const apiConfig = await prisma.assistantApiConfiguration.findUnique({
      where: { assistantId: BigInt(assistantId) },
      select: {
        clientId: true,
        clientSecret: true, // Encrypted in database
        tokenUrl: true,
        authorizationUrl: true,
        scope: true,
        tokenExchangeMethod: true,
        authenticationType: true
      }
    })

    if (!apiConfig) {
      return NextResponse.json({ error: 'API configuration not found' }, { status: 404 })
    }

    // Decrypt client secret before returning
    const decryptedConfig = {
      ...apiConfig,
      clientSecret: apiConfig.clientSecret ? decrypt(apiConfig.clientSecret) : null
    }

    return NextResponse.json(decryptedConfig)

  } catch (error: any) {
    console.error('Error fetching API config:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch API configuration' },
      { status: 500 }
    )
  }
}
