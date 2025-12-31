import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma  from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = BigInt(session.user.id);

    const connector = await prisma.connector.findFirst({
      where: {
        userId,
        assistantId: null, // User-level connector
        provider: 'DROPBOX',
        deletedAt: null
      }
    });

    // Convert BigInt fields to strings for JSON serialization
    const serializedConnector = connector ? {
      ...connector,
      id: connector.id.toString(),
      userId: connector.userId.toString(),
      assistantId: connector.assistantId?.toString() || null,
    } : null;

    return Response.json({ connector: serializedConnector });
  } catch (error) {
    console.error('Dropbox API error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
