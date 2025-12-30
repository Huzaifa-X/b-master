import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { encrypt } from '@/lib/encryption';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  console.log('📥 Google callback received:', { code: !!code, state, error });

  // Helper function to get redirect URL
  const getRedirectUrl = (stateData: { returnUrl?: string } | undefined, error?: string) => {
    let baseUrl = stateData?.returnUrl || `${process.env.NEXTAUTH_URL}/assistants`;

    // Remove existing google-related query parameters to avoid duplicates
    try {
      const url = new URL(baseUrl);
      url.searchParams.delete('google');
      url.searchParams.delete('error');
      baseUrl = url.toString();
    } catch (e) {
      // If URL parsing fails, use baseUrl as is
    }

    const separator = baseUrl.includes('?') ? '&' : '?';
    if (error) {
      return `${baseUrl}${separator}google=error&error=${error}`;
    } else {
      return `${baseUrl}${separator}google=connected`;
    }
  };

  if (error) {
    console.error('Google OAuth error:', error);
    return Response.redirect(getRedirectUrl(undefined, error));
  }

  if (!code || !state) {
    console.error('❌ Missing code or state');
    return Response.redirect(getRedirectUrl(undefined, 'invalid_request'));
  }

  let returnUrl: string | undefined;

  try {
    // Verify state from database
    const oauthState = await prisma.oAuthState.findUnique({
      where: { state }
    });

    console.log('🔐 State verification:', {
      found: !!oauthState,
      expired: oauthState ? oauthState.expiresAt < new Date() : null
    });

    if (!oauthState) {
      console.error('❌ Invalid state - not found in database');
      return Response.redirect(getRedirectUrl(undefined, 'invalid_state'));
    }

    if (oauthState.expiresAt < new Date()) {
      console.error('❌ State expired');
      await prisma.oAuthState.delete({ where: { id: oauthState.id } });
      return Response.redirect(getRedirectUrl(undefined, 'state_expired'));
    }

    const userId = oauthState.userId;
    returnUrl = oauthState.data ? (oauthState.data as any).returnUrl : undefined;

    // Delete state immediately after verification (one-time use)
    await prisma.oAuthState.delete({ where: { id: oauthState.id } });

    console.log('🔄 Exchanging code for tokens...');

    // Exchange code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        grant_type: 'authorization_code',
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: `${process.env.NEXTAUTH_URL}/api/google/callback`
      })
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('❌ Token exchange failed:', errorData);
      throw new Error('Token exchange failed');
    }

    const tokens = await tokenResponse.json();
    console.log('✅ Tokens received:', {
      has_access: !!tokens.access_token,
      has_refresh: !!tokens.refresh_token,
      expires_in: tokens.expires_in
    });

    if (!tokens.access_token) {
      throw new Error('No access token received');
    }

    // Get user info from Google
    console.log('👤 Fetching Google user info...');
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${tokens.access_token}`,
      }
    });

    if (!userInfoResponse.ok) {
      const errorData = await userInfoResponse.text();
      console.error('❌ User info fetch failed:', errorData);
      throw new Error('Failed to get user info');
    }

    const userInfo = await userInfoResponse.json();
    console.log('✅ User info received:', {
      id: userInfo.id,
      email: userInfo.email
    });

    // Encrypt tokens
    const encryptedAccessToken = encrypt(tokens.access_token);
    const encryptedRefreshToken = encrypt(tokens.refresh_token);

    // Calculate token expiry (Google returns expires_in in seconds)
    const tokenExpiry = new Date(Date.now() + tokens.expires_in * 1000);

    // Create or update connector
    console.log('💾 Saving to database...');

    // Find existing user-level Google connector
    const existingConnector = await prisma.connector.findFirst({
      where: {
        userId,
        assistantId: null,
        provider: 'GOOGLE'
      }
    });

    const scopes = [
      'https://www.googleapis.com/auth/calendar.events',
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile'
    ];

    if (existingConnector) {
      // Update existing connector
      await prisma.connector.update({
        where: { id: existingConnector.id },
        data: {
          accessToken: encryptedAccessToken,
          refreshToken: encryptedRefreshToken,
          tokenExpiry,
          providerAccountId: userInfo.id,
          providerEmail: userInfo.email,
          scopes,
          status: 'ACTIVE',
          metadata: {
            name: userInfo.name,
            picture: userInfo.picture,
            locale: userInfo.locale,
            verified_email: userInfo.verified_email,
            reconnected_at: new Date().toISOString()
          }
        }
      });
    } else {
      // Create new connector
      await prisma.connector.create({
        data: {
          userId,
          assistantId: null,
          provider: 'GOOGLE',
          name: 'My Google Account',
          accessToken: encryptedAccessToken,
          refreshToken: encryptedRefreshToken,
          tokenExpiry,
          providerAccountId: userInfo.id,
          providerEmail: userInfo.email,
          scopes,
          status: 'ACTIVE',
          metadata: {
            name: userInfo.name,
            picture: userInfo.picture,
            locale: userInfo.locale,
            verified_email: userInfo.verified_email,
            connected_at: new Date().toISOString()
          }
        }
      });
    }

    console.log('✅ Google OAuth flow completed successfully');

    return Response.redirect(getRedirectUrl({ returnUrl }, undefined));
  } catch (error) {
    console.error('Google OAuth callback error:', error);
    return Response.redirect(getRedirectUrl({ returnUrl }, 'connection_failed'));
  }
}
