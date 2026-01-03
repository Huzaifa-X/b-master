import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { getOAuthAccessToken } from '@/lib/oauth-helper'

/**
 * Get OAuth access token for testing purposes
 * This is used in the schema preview to test OAuth-protected endpoints
 * before the assistant is actually created
 */
export async function POST(request: NextRequest) {
  try {
    // Verify user is authenticated
    const session = await getServerSession()
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized. Please sign in.' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { clientId, clientSecret, tokenUrl, scope, tokenExchangeMethod } = body

    // Validate required fields
    if (!clientId || !clientSecret || !tokenUrl) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: clientId, clientSecret, and tokenUrl are required'
        },
        { status: 400 }
      )
    }

    console.log('🔐 Test token request:', {
      tokenUrl,
      clientId: clientId.substring(0, 8) + '***',
      hasScope: !!scope
    })

    // Get OAuth access token
    const result = await getOAuthAccessToken({
      clientId,
      clientSecret,
      tokenUrl,
      scope,
      tokenExchangeMethod
    })

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error
        },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      accessToken: result.accessToken
    })

  } catch (error: any) {
    console.error('❌ Get test token error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to get OAuth test token'
      },
      { status: 500 }
    )
  }
}
