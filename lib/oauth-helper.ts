/**
 * OAuth Helper Functions
 * Handles OAuth token retrieval for testing endpoints
 */

export interface OAuthConfig {
  clientId: string
  clientSecret: string
  tokenUrl: string
  scope?: string
  tokenExchangeMethod?: 'post' | 'basic_auth'
}

export interface OAuthTokenResponse {
  access_token: string
  token_type: string
  expires_in?: number
  refresh_token?: string
  scope?: string
}

/**
 * Get OAuth access token using client credentials flow
 * This is used for testing endpoints before the assistant is created
 */
export async function getOAuthAccessToken(
  config: OAuthConfig
): Promise<{ success: boolean; accessToken?: string; error?: string }> {
  try {
    const { clientId, clientSecret, tokenUrl, scope, tokenExchangeMethod = 'post' } = config

    // Validate required fields
    if (!clientId || !clientSecret || !tokenUrl) {
      return {
        success: false,
        error: 'Missing required OAuth configuration (clientId, clientSecret, or tokenUrl)'
      }
    }

    // Validate token URL
    if (!tokenUrl.startsWith('http://') && !tokenUrl.startsWith('https://')) {
      return {
        success: false,
        error: 'Token URL must be an absolute URL (http:// or https://)'
      }
    }

    console.log('🔐 Requesting OAuth token from:', tokenUrl)

    const headers: Record<string, string> = {}
    let body: string

    if (tokenExchangeMethod === 'basic_auth') {
      // Use Basic Auth (some providers like Spotify require this)
      headers['Authorization'] = `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`
      headers['Content-Type'] = 'application/x-www-form-urlencoded'

      const params = new URLSearchParams({
        grant_type: 'client_credentials',
      })
      if (scope) params.append('scope', scope)

      body = params.toString()
    } else {
      // Standard POST with credentials in body
      headers['Content-Type'] = 'application/x-www-form-urlencoded'

      const params = new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret,
      })
      if (scope) params.append('scope', scope)

      body = params.toString()
    }

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers,
      body,
    })

    const responseText = await response.text()
    const contentType = response.headers.get('content-type') || ''

    if (!response.ok) {
      let errorMessage = `OAuth token request failed with status ${response.status}`

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

      console.error('❌ OAuth token error:', errorMessage)
      return {
        success: false,
        error: errorMessage
      }
    }

    // Parse response - could be JSON or URL-encoded
    let tokenResponse: OAuthTokenResponse

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
    } else {
      // Try JSON as fallback
      try {
        tokenResponse = JSON.parse(responseText)
      } catch {
        return {
          success: false,
          error: 'Unable to parse OAuth token response. Unexpected format.'
        }
      }
    }

    if (!tokenResponse.access_token) {
      return {
        success: false,
        error: 'No access_token in response from token endpoint'
      }
    }

    console.log('✅ OAuth token obtained successfully', {
      tokenType: tokenResponse.token_type,
      expiresIn: tokenResponse.expires_in,
      hasRefreshToken: !!tokenResponse.refresh_token
    })

    return {
      success: true,
      accessToken: tokenResponse.access_token
    }
  } catch (error: any) {
    console.error('❌ OAuth token error:', error)

    // Handle specific error types
    if (error.cause?.code === 'ENOTFOUND' || error.code === 'ENOTFOUND') {
      return {
        success: false,
        error: 'OAuth token URL domain not found. Check the token URL is correct.'
      }
    }

    if (error.cause?.code === 'ECONNREFUSED' || error.code === 'ECONNREFUSED') {
      return {
        success: false,
        error: 'Connection refused by OAuth server. Server may be down.'
      }
    }

    return {
      success: false,
      error: error.message || 'Failed to get OAuth access token'
    }
  }
}

/**
 * Refresh an OAuth access token using a refresh token
 * This is for future use when implementing full authorization code flow
 */
export async function refreshOAuthAccessToken(
  tokenUrl: string,
  clientId: string,
  clientSecret: string,
  refreshToken: string
): Promise<{ success: boolean; accessToken?: string; refreshToken?: string; error?: string }> {
  try {
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken
      }).toString(),
    })

    if (!response.ok) {
      const errorText = await response.text()
      return {
        success: false,
        error: `Token refresh failed: ${errorText}`
      }
    }

    const tokenResponse: OAuthTokenResponse = await response.json()

    return {
      success: true,
      accessToken: tokenResponse.access_token,
      refreshToken: tokenResponse.refresh_token
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to refresh OAuth access token'
    }
  }
}
