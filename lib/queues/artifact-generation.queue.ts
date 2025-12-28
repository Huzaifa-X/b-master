import prisma from '@/lib/prisma';

// ================================================================
// JOB DATA TYPES
// ================================================================

export interface ArtifactGenerationJobData {
  artifactId: number;
  userId: string;
  assistantId: string;
  instructions: string;
  selectedChatId?: number;
  contextData?: {
    chatHistory?: Array<{
      role: string;
      content: string;
    }>;
    additionalContext?: string;
  };
}

// ================================================================
// QUEUE FUNCTIONS (Database-based)
// ================================================================

/**
 * Add a new artifact generation job to the queue
 * Idempotent - won't create duplicate jobs for same artifact
 */
export async function enqueueArtifactGeneration(
  data: ArtifactGenerationJobData
): Promise<string> {

  // Check if there's already a pending or processing job for this artifact
  const existingJob = await prisma.artifactGenerationJob.findFirst({
    where: {
      artifactId: data.artifactId,
      status: {
        in: ['pending', 'processing'],
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  if (existingJob) {
    console.log('[Queue] ♻️  Found existing job for artifact:', data.artifactId, '- Job ID:', existingJob.id);
    return existingJob.id;
  }

  // Create new job in database
  const job = await prisma.artifactGenerationJob.create({
    data: {
      artifactId: data.artifactId,
      status: 'pending',
      progress: 0,
      metadata: {
        userId: data.userId,
        assistantId: data.assistantId,
        selectedChatId: data.selectedChatId,
        instructions: data.instructions,
      },
    },
  });

  console.log('[Queue] ✅ Enqueued artifact generation job:', job.id);
  return job.id;
}

/**
 * Get job status and progress from database
 */
export async function getJobStatus(jobId: string) {
  const job = await prisma.artifactGenerationJob.findUnique({
    where: { id: jobId },
    include: {
      artifact: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  if (!job) {
    return null;
  }

  return {
    id: job.id,
    artifactId: job.artifactId,
    artifactName: job.artifact.name,
    status: job.status,
    progress: job.progress,
    result: job.result,
    error: job.error,
    createdAt: job.createdAt,
    startedAt: job.startedAt,
    completedAt: job.completedAt,
  };
}

/**
 * Get pending jobs from database (used by worker)
 */
export async function getPendingJobs(limit: number = 5) {
  const jobs = await prisma.artifactGenerationJob.findMany({
    where: {
      status: 'pending',
    },
    orderBy: {
      createdAt: 'asc', // Process oldest first
    },
    take: limit,
  });

  return jobs;
}

/**
 * Mark job as processing
 */
export async function markJobAsProcessing(jobId: string) {
  await prisma.artifactGenerationJob.update({
    where: { id: jobId },
    data: {
      status: 'processing',
      startedAt: new Date(),
    },
  });
}

/**
 * Update job progress
 */
export async function updateJobProgress(jobId: string, progress: number) {
  await prisma.artifactGenerationJob.update({
    where: { id: jobId },
    data: {
      progress: Math.min(100, Math.max(0, progress)),
    },
  });
}

/**
 * Update job progress with streaming result (for live code streaming)
 */
export async function updateJobProgressWithResult(jobId: string, progress: number, partialResult: string) {
  await prisma.artifactGenerationJob.update({
    where: { id: jobId },
    data: {
      progress: Math.min(100, Math.max(0, progress)),
      result: partialResult, // Update with partial code
    },
  });
}

/**
 * Mark job as completed
 */
export async function markJobAsCompleted(jobId: string, result: string) {
  await prisma.artifactGenerationJob.update({
    where: { id: jobId },
    data: {
      status: 'completed',
      progress: 100,
      result: result,
      completedAt: new Date(),
    },
  });
}

/**
 * Mark job as failed
 */
export async function markJobAsFailed(jobId: string, error: string) {
  await prisma.artifactGenerationJob.update({
    where: { id: jobId },
    data: {
      status: 'failed',
      error: error,
      completedAt: new Date(),
    },
  });
}

/**
 * Clean up old completed jobs (run periodically)
 */
export async function cleanupOldJobs() {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  // Delete completed jobs older than 24 hours
  const deletedCompleted = await prisma.artifactGenerationJob.deleteMany({
    where: {
      status: 'completed',
      completedAt: {
        lt: oneDayAgo,
      },
    },
  });

  // Delete failed jobs older than 7 days
  const deletedFailed = await prisma.artifactGenerationJob.deleteMany({
    where: {
      status: 'failed',
      completedAt: {
        lt: oneWeekAgo,
      },
    },
  });

  console.log('[Queue] 🧹 Cleaned up old jobs:', {
    completed: deletedCompleted.count,
    failed: deletedFailed.count,
  });

  return {
    completed: deletedCompleted.count,
    failed: deletedFailed.count,
  };
}
