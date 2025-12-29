import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/artifacts/jobs/[jobId]/status
 * Returns the current status and progress of an artifact generation job
 * Non-streaming, quick response for polling
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params;
    console.log('[Job Status API] Request for job:', jobId);

    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      console.error('[Job Status API] Unauthorized - no session');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    // Get job from database
    const jobRecord = await prisma.artifactGenerationJob.findUnique({
      where: { id: jobId },
      include: {
        artifact: {
          select: {
            id: true,
            userId: true,
            assistantId: true,
            name: true,
          },
        },
      },
    });

    if (!jobRecord) {
      console.error('[Job Status API] Job not found:', jobId);
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Check permissions - user must own the artifact
    const userIdBigInt = BigInt(userId);
    const isOwner = jobRecord.artifact.userId === userIdBigInt;

    let hasPermission = false;
    if (!isOwner) {
      const permission = await prisma.artifactPermission.findFirst({
        where: {
          userId: userIdBigInt,
          artifactId: jobRecord.artifactId,
          assistantId: jobRecord.artifact.assistantId,
        },
      });
      hasPermission = !!permission;
    }

    if (!isOwner && !hasPermission) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Return job status from database
    const response = {
      id: jobRecord.id,
      artifactId: jobRecord.artifactId,
      artifactName: jobRecord.artifact.name,
      status: jobRecord.status,
      progress: jobRecord.progress,
      error: jobRecord.error,
      createdAt: jobRecord.createdAt,
      startedAt: jobRecord.startedAt,
      completedAt: jobRecord.completedAt,
    };

    console.log('[Job Status API] Returning status:', response.status, response.progress);

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('[Job Status API] Error:', error);
    return NextResponse.json(
      {
        error: error.message || 'Failed to get job status',
      },
      { status: 500 }
    );
  }
}
