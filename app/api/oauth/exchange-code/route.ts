import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'

/**
 * Exchange OAuth authorization code for access token
 * This endpoint is called by the frontend after receiving the auth code from the callback
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
    const { code, clientId, clientSecret, tokenUrl, redirectUri, tokenExchangeMethod } = body

    // Validate required fields
    if (!code || !clientId || !clientSecret || !tokenUrl) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: code, clientId, clientSecret, and tokenUrl are required'
        },
        { status: 400 }
      )
    }

    console.log('🔐 Exchanging authorization code:', {
      tokenUrl,
      clientId: clientId.substring(0, 8) + '***',
      hasRedirectUri: !!redirectUri
    })

    const headers: Record<string, string> = {}
    let body_params: URLSearchParams

    if (tokenExchangeMethod === 'basic_auth') {
      // Use Basic Auth (some providers require this)
      headers['Authorization'] = `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`
      headers['Content-Type'] = 'application/x-www-form-urlencoded'

      body_params = new URLSearchParams({
        grant_type: 'authorization_code',
        code,
      })
      if (redirectUri) body_params.append('redirect_uri', redirectUri)
    } else {
      // Standard POST with credentials in body
      headers['Content-Type'] = 'application/x-www-form-urlencoded'
      headers['Accept'] = 'application/json' // GitHub requires this

      body_params = new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: clientId,
        client_secret: clientSecret,
      })
      if (redirectUri) body_params.append('redirect_uri', redirectUri)
    }

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers,
      body: body_params.toString(),
    })

    const responseText = await response.text()
    const contentType = response.headers.get('content-type') || ''

    if (!response.ok) {
      let errorMessage = `Token exchange failed with status ${response.status}`

      // Try to parse error as JSON first
      try {
        const errorData = JSON.parse(responseText)
        if (errorData.error_description) {
          errorMessage = errorData.error_description
        } else if (errorData.error) {
          errorMessage = errorData.error
        } else if (errorData.message) {
          errorMessage = errorData.message
        }
      } catch {
        // If not JSON, try URL-encoded format
        if (responseText.includes('=')) {
          const params = new URLSearchParams(responseText)
          const error = params.get('error_description') || params.get('error') || responseText
          errorMessage = error.substring(0, 200)
        } else if (responseText) {
          errorMessage = responseText.substring(0, 200)
        }
      }

      console.error('❌ Token exchange error:', errorMessage)
      return NextResponse.json(
        {
          success: false,
          error: errorMessage
        },
        { status: 400 }
      )
    }

    // Parse response - could be JSON or URL-encoded
    let tokenResponse: any

    console.log('📥 Token response content-type:', contentType)
    console.log('📥 Token response text (first 200 chars):', responseText.substring(0, 200))

    if (contentType.includes('application/json')) {
      tokenResponse = JSON.parse(responseText)
    } else if (contentType.includes('application/x-www-form-urlencoded') || responseText.includes('=')) {
      // Parse URL-encoded response (GitHub uses this format)
      const params = new URLSearchParams(responseText)
      tokenResponse = {
        access_token: params.get('access_token') || '',
        token_type: params.get('token_type') || 'bearer',
        expires_in: params.get('expires_in') ? parseInt(params.get('expires_in')!) : undefined,
        refresh_token: params.get('refresh_token') || undefined,
        scope: params.get('scope') || undefined,
      }
      console.log('📥 Parsed URL-encoded token response:', {
        hasAccessToken: !!tokenResponse.access_token,
        tokenType: tokenResponse.token_type,
        expiresIn: tokenResponse.expires_in
      })
    } else {
      // Try JSON as fallback
      try {
        tokenResponse = JSON.parse(responseText)
      } catch {
        console.error('❌ Failed to parse token response. Response text:', responseText)
        return NextResponse.json(
          {
            success: false,
            error: 'Unable to parse token response. Unexpected format.'
          },
          { status: 500 }
        )
      }
    }

    if (!tokenResponse.access_token) {
      console.error('❌ No access_token in parsed response:', tokenResponse)
      return NextResponse.json(
        {
          success: false,
          error: 'No access_token in response from token endpoint'
        },
        { status: 400 }
      )
    }

    console.log('✅ OAuth token obtained successfully', {
      tokenType: tokenResponse.token_type,
      expiresIn: tokenResponse.expires_in,
      hasRefreshToken: !!tokenResponse.refresh_token
    })

    return NextResponse.json({
      success: true,
      accessToken: tokenResponse.access_token,
      refreshToken: tokenResponse.refresh_token,
      expiresIn: tokenResponse.expires_in,
      tokenType: tokenResponse.token_type,
      scope: tokenResponse.scope
    })

  } catch (error: any) {
    console.error('❌ Token exchange error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to exchange authorization code for token'
      },
      { status: 500 }
    )
  }
}
