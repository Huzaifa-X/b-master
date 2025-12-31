import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = BigInt(session.user.id);

    // Soft delete the Google connector
    await prisma.connector.updateMany({
      where: {
        userId,
        provider: 'GOOGLE',
        deletedAt: null
      },
      data: {
        deletedAt: new Date(),
        status: 'REVOKED'
      }
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error('Google disconnect error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
