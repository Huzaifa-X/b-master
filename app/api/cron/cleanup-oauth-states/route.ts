import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const result = await prisma.oAuthState.deleteMany({
      where: {
        expiresAt: { lt: new Date() }
      }
    });

    console.log(`🧹 Cleaned up ${result.count} expired OAuth states`);

    return Response.json({
      success: true,
      deleted: result.count
    });
  } catch (error) {
    console.error('❌ Cleanup error:', error);
    return Response.json({
      success: false,
      error: 'Cleanup failed'
    }, { status: 500 });
  }
}
