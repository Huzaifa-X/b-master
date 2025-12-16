import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { nanoid } from 'nanoid';
import prisma from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return Response.redirect(`${process.env.NEXTAUTH_URL}/login`);
    }

    const userId = BigInt(session.user.id);

    // Get return URL from query parameter
    const url = new URL(req.url);
    const returnUrl = url.searchParams.get('returnUrl');

    // Generate state for security
    const state = nanoid();

    // ✅ Store state in database (expires in 10 minutes)
    await prisma.oAuthState.create({
      data: {
        state,
        userId,
        provider: 'dropbox',
        data: returnUrl ? { returnUrl } : undefined,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
      }
    });

    // ✅ Clean up expired states
    await prisma.oAuthState.deleteMany({
      where: {
        expiresAt: { lt: new Date() }
      }
    });

    // Build redirect URI
    const redirectUri = `${process.env.NEXTAUTH_URL}/api/dropbox/callback`;

    console.log('🔗 Dropbox OAuth Starting:', {
      userId: userId.toString(),
      state,
      redirect_uri: redirectUri,
      returnUrl
    });

    // Build Dropbox authorization URL
    const authUrl = new URL('https://www.dropbox.com/oauth2/authorize');
    authUrl.searchParams.set('client_id', process.env.DROPBOX_CLIENT_ID!);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('token_access_type', 'offline'); // Get refresh token
    authUrl.searchParams.set('state', state);

    return Response.redirect(authUrl.toString());
  } catch (error) {
    console.error('Dropbox connect error:', error);
    return Response.redirect(`${process.env.NEXTAUTH_URL}/dashboard/profile?tab=security&dropbox=error&error=connection_failed`);
  }
}
