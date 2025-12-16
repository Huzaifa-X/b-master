import prisma from '@/lib/prisma';
import { encrypt, decrypt } from '@/lib/encryption';

export async function refreshDropboxToken(connectorId: number) {
  const connector = await prisma.dropboxConnector.findUnique({
    where: { id: connectorId }
  });

  if (!connector || !connector.refreshToken) {
    throw new Error('Connector not found or no refresh token');
  }

  const decryptedRefreshToken = decrypt(connector.refreshToken);

  // Request new tokens from Dropbox
  const tokenResponse = await fetch('https://api.dropboxapi.com/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: decryptedRefreshToken,
      client_id: process.env.DROPBOX_CLIENT_ID!,
      client_secret: process.env.DROPBOX_CLIENT_SECRET!
    })
  });

  const tokens = await tokenResponse.json();

  if (!tokens.access_token) {
    // Token refresh failed, mark as expired
    await prisma.dropboxConnector.update({
      where: { id: connectorId },
      data: { status: 'EXPIRED' }
    });
    throw new Error('Failed to refresh Dropbox token');
  }

  // Update connector with new tokens
  const tokenExpiry = new Date(Date.now() + 4 * 60 * 60 * 1000); // 4 hours

  await prisma.dropboxConnector.update({
    where: { id: connectorId },
    data: {
      accessToken: encrypt(tokens.access_token),
      refreshToken: encrypt(tokens.refresh_token || decryptedRefreshToken), // Some providers don't return new refresh token
      tokenExpiry,
      status: 'ACTIVE'
    }
  });

  return tokens.access_token;
}
