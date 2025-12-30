import prisma from '@/lib/prisma';
import { encrypt, decrypt } from '@/lib/encryption';

export async function refreshGoogleToken(connectorId: number) {
  const connector = await prisma.connector.findUnique({
    where: { id: connectorId }
  });

  if (!connector || !connector.refreshToken) {
    throw new Error('Connector not found or no refresh token');
  }

  if (connector.provider !== 'GOOGLE') {
    throw new Error('Connector is not a Google connector');
  }

  const decryptedRefreshToken = decrypt(connector.refreshToken);

  // Request new tokens from Google
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: decryptedRefreshToken,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!
    })
  });

  const tokens = await tokenResponse.json();

  if (!tokens.access_token) {
    // Token refresh failed, mark as expired
    await prisma.connector.update({
      where: { id: connectorId },
      data: { status: 'EXPIRED' }
    });
    throw new Error('Failed to refresh Google token');
  }

  // Update connector with new tokens
  const tokenExpiry = new Date(Date.now() + tokens.expires_in * 1000);

  await prisma.connector.update({
    where: { id: connectorId },
    data: {
      accessToken: encrypt(tokens.access_token),
      refreshToken: encrypt(tokens.refresh_token || decryptedRefreshToken), // Google may not return new refresh token
      tokenExpiry,
      status: 'ACTIVE'
    }
  });

  return tokens.access_token;
}
