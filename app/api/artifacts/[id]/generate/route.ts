import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { enqueueArtifactGeneration } from '@/lib/queues/artifact-generation.queue';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/artifacts/[id]/generate
 * Creates a job to generate artifact code in the background
 * Returns job ID immediately for tracking progress
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('[Generate API] Request received for artifact:', params.id);

    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      console.error('[Generate API] Unauthorized - no session');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    console.log('[Generate API] User authenticated:', userId);

    const artifactId = parseInt(params.id);
    if (isNaN(artifactId)) {
      return NextResponse.json({ error: 'Invalid artifact ID' }, { status: 400 });
    }

    // Get artifact
    const artifact = await prisma.assistantArtifact.findUnique({
      where: { id: artifactId },
      select: {
        id: true,
        userId: true,
        assistantId: true,
        name: true,
        instructions: true,
        tools: true,
      },
    });

    if (!artifact) {
      console.error('[Generate API] Artifact not found:', artifactId);
      return NextResponse.json({ error: 'Artifact not found' }, { status: 404 });
    }

    // Check permissions - user must be the owner or have permissions
    const userIdBigInt = BigInt(userId);
    const isOwner = artifact.userId === userIdBigInt;

    let hasPermission = false;
    if (!isOwner) {
      const permission = await prisma.artifactPermission.findFirst({
        where: {
          userId: userIdBigInt,
          artifactId: artifactId,
          assistantId: artifact.assistantId,
        },
      });
      hasPermission = !!permission;
    }

    if (!isOwner && !hasPermission) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Extract selectedChatId if exists
    let selectedChatId: number | undefined;
    if (artifact.tools && typeof artifact.tools === 'object') {
      const toolsData = artifact.tools as any;
      selectedChatId = toolsData.selectedChatId;
    }

    // Check if there's already a pending or processing job for this artifact
    const existingJob = await prisma.artifactGenerationJob.findFirst({
      where: {
        artifactId: artifactId,
        status: {
          in: ['pending', 'processing'],
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (existingJob) {
      console.log('[Generate API] Found existing job:', existingJob.id);
      return NextResponse.json({
        success: true,
        jobId: existingJob.id,
        status: existingJob.status,
        message: 'Job already in progress',
      });
    }

    // Create database record for the job first
    const jobRecord = await prisma.artifactGenerationJob.create({
      data: {
        artifactId: artifactId,
        status: 'pending',
        progress: 0,
        metadata: {
          userId: userId,
          assistantId: artifact.assistantId.toString(),
          selectedChatId: selectedChatId,
        },
      },
    });

    console.log('[Generate API] Created job record:', jobRecord.id);

    // Enqueue the generation job in BullMQ
    const jobId = await enqueueArtifactGeneration({
      artifactId: artifactId,
      userId: userId,
      assistantId: artifact.assistantId.toString(),
      instructions: artifact.instructions || '',
      selectedChatId: selectedChatId,
    });

    // Update the job record with the BullMQ job ID if different
    if (jobId !== jobRecord.id) {
      await prisma.artifactGenerationJob.update({
        where: { id: jobRecord.id },
        data: { id: jobId },
      });
    }

    console.log('[Generate API] ✅ Job enqueued successfully:', jobId);

    return NextResponse.json({
      success: true,
      jobId: jobId,
      artifactId: artifactId,
      status: 'pending',
      message: 'Artifact generation started',
    });
  } catch (error: any) {
    console.error('[Generate API] Error:', error);
    return NextResponse.json(
      {
        error: error.message || 'Failed to start artifact generation',
      },
      { status: 500 }
    );
  }
}
