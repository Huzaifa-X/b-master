import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'

/**
 * OAuth Authorization Code Flow Callback
 * This endpoint handles the redirect from OAuth providers after user authorization
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')
    const errorDescription = searchParams.get('error_description')

    // Verify user is authenticated
    const session = await getServerSession()
    if (!session) {
      // Return HTML that sends message to opener and closes popup
      return new NextResponse(
        `<!DOCTYPE html>
        <html>
          <head><title>OAuth Callback</title></head>
          <body>
            <script>
              if (window.opener) {
                window.opener.postMessage({
                  type: 'oauth_callback',
                  error: 'unauthorized',
                  errorDescription: 'Please sign in first'
                }, window.location.origin);
                window.close();
              } else {
                window.location.href = '/assistants/add?oauth_error=unauthorized';
              }
            </script>
            <p>Unauthorized. Closing window...</p>
          </body>
        </html>`,
        {
          status: 200,
          headers: { 'Content-Type': 'text/html' },
        }
      )
    }

    console.log('✅ OAuth callback received:', {
      code: code?.substring(0, 10) + '***' || 'none',
      state: state?.substring(0, 10) + '***' || 'none',
      error: error || 'none'
    })

    // Return HTML that sends message to opener window and closes popup
    return new NextResponse(
      `<!DOCTYPE html>
      <html>
        <head><title>OAuth Callback</title></head>
        <body>
          <script>
            const data = {
              type: 'oauth_callback',
              code: ${code ? `'${code}'` : 'null'},
              state: ${state ? `'${state}'` : 'null'},
              error: ${error ? `'${error}'` : 'null'},
              errorDescription: ${errorDescription ? `'${errorDescription}'` : 'null'}
            };

            if (window.opener) {
              // Send message to parent window
              window.opener.postMessage(data, window.location.origin);
              // Close popup
              window.close();
            } else {
              // Fallback: redirect to main page if not opened as popup
              const params = new URLSearchParams();
              if (data.code) params.append('oauth_code', data.code);
              if (data.state) params.append('oauth_state', data.state);
              if (data.error) params.append('oauth_error', data.error);
              if (data.errorDescription) params.append('oauth_error_description', data.errorDescription);
              window.location.href = '/assistants/add?' + params.toString();
            }
          </script>
          <p>Authorization successful! Closing window...</p>
        </body>
      </html>`,
      {
        status: 200,
        headers: { 'Content-Type': 'text/html' },
      }
    )

  } catch (error: any) {
    console.error('❌ OAuth callback error:', error)

    return new NextResponse(
      `<!DOCTYPE html>
      <html>
        <head><title>OAuth Error</title></head>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage({
                type: 'oauth_callback',
                error: 'callback_failed',
                errorDescription: '${error.message.replace(/'/g, "\\'")}'
              }, window.location.origin);
              window.close();
            } else {
              window.location.href = '/assistants/add?oauth_error=callback_failed';
            }
          </script>
          <p>Error occurred. Closing window...</p>
        </body>
      </html>`,
      {
        status: 200,
        headers: { 'Content-Type': 'text/html' },
      }
    )
  }
}
