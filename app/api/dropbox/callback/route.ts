import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { encrypt } from '@/lib/encryption';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  console.log('📥 Dropbox callback received:', { code: !!code, state, error });

  // Helper function to get redirect URL
  const getRedirectUrl = (stateData: { returnUrl?: string } | undefined, error?: string) => {
    let baseUrl = stateData?.returnUrl || `${process.env.NEXTAUTH_URL}/assistants`;

    // Remove existing dropbox-related query parameters to avoid duplicates
    try {
      const url = new URL(baseUrl);
      url.searchParams.delete('dropbox');
      url.searchParams.delete('error');
      baseUrl = url.toString();
    } catch (e) {
      // If URL parsing fails, use baseUrl as is
    }

    const separator = baseUrl.includes('?') ? '&' : '?';
    if (error) {
      return `${baseUrl}${separator}dropbox=error&error=${error}`;
    } else {
      return `${baseUrl}${separator}dropbox=connected`;
    }
  };

  if (error) {
    console.error('Dropbox OAuth error:', error);
    return Response.redirect(getRedirectUrl(undefined, error));
  }

  if (!code || !state) {
    console.error('❌ Missing code or state');
    return Response.redirect(getRedirectUrl(undefined, 'invalid_request'));
  }

  let returnUrl: string | undefined;

  try {
    // ✅ Verify state from database
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

    // ✅ Delete state immediately after verification (one-time use)
    await prisma.oAuthState.delete({ where: { id: oauthState.id } });

    console.log('🔄 Exchanging code for tokens...');

    // Exchange code for tokens
    const tokenResponse = await fetch('https://api.dropboxapi.com/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        grant_type: 'authorization_code',
        client_id: process.env.DROPBOX_CLIENT_ID!,
        client_secret: process.env.DROPBOX_CLIENT_SECRET!,
        redirect_uri: `${process.env.NEXTAUTH_URL}/api/dropbox/callback`
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
      has_refresh: !!tokens.refresh_token
    });

    if (!tokens.access_token) {
      throw new Error('No access token received');
    }

    // Get user info from Dropbox
    console.log('👤 Fetching Dropbox user info...');
    const userInfoResponse = await fetch('https://api.dropboxapi.com/2/users/get_current_account', {
      method: 'POST',
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
      account_id: userInfo.account_id,
      email: userInfo.email
    });

    // Encrypt tokens
    const encryptedAccessToken = encrypt(tokens.access_token);
    const encryptedRefreshToken = encrypt(tokens.refresh_token);

    // Calculate token expiry (Dropbox tokens expire in 4 hours)
    const tokenExpiry = new Date(Date.now() + 4 * 60 * 60 * 1000);

    // Create or update connector
    console.log('💾 Saving to database...');

    // Find existing user-level connector
    const existingConnector = await prisma.dropboxConnector.findFirst({
      where: {
        userId,
        assistantId: null
      }
    });

    if (existingConnector) {
      // Update existing connector
      await prisma.dropboxConnector.update({
        where: { id: existingConnector.id },
        data: {
          accessToken: encryptedAccessToken,
          refreshToken: encryptedRefreshToken,
          tokenExpiry,
          accountId: userInfo.account_id,
          accountEmail: userInfo.email,
          status: 'ACTIVE',
          metadata: {
            display_name: userInfo.name?.display_name,
            country: userInfo.country,
            locale: userInfo.locale,
            scopes: ['files.content.read', 'files.content.write'],
            reconnected_at: new Date().toISOString()
          }
        }
      });
    } else {
      // Create new connector
      await prisma.dropboxConnector.create({
        data: {
          userId,
          assistantId: null,
          name: 'My Dropbox',
          accessToken: encryptedAccessToken,
          refreshToken: encryptedRefreshToken,
          tokenExpiry,
          accountId: userInfo.account_id,
          accountEmail: userInfo.email,
          status: 'ACTIVE',
          metadata: {
            display_name: userInfo.name?.display_name,
            country: userInfo.country,
            locale: userInfo.locale,
            scopes: ['files.content.read', 'files.content.write'],
            connected_at: new Date().toISOString()
          }
        }
      });
    }

    return Response.redirect(getRedirectUrl({ returnUrl }, undefined));
  } catch (error) {
    console.error('Dropbox OAuth callback error:', error);
    return Response.redirect(getRedirectUrl({ returnUrl }, 'connection_failed'));
  }
}
