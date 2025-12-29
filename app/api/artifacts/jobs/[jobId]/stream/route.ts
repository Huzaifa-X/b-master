import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/artifacts/jobs/[jobId]/stream
 * Attaches to an ongoing artifact generation job and streams progress
 * Returns SSE stream of progress updates
 * Can reconnect mid-generation
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const encoder = new TextEncoder();

  try {
    const { jobId } = await params;
    console.log('[Job Stream API] Request for job:', jobId);

    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      console.error('[Job Stream API] Unauthorized - no session');
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
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
      console.error('[Job Stream API] Job not found:', jobId);
      return new Response(JSON.stringify({ error: 'Job not found' }), { status: 404 });
    }

    // Check permissions
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
      return new Response(JSON.stringify({ error: 'Access denied' }), { status: 403 });
    }

    // Create streaming response
    const stream = new ReadableStream({
      async start(controller) {
        try {
          console.log('[Job Stream API] Starting stream for job:', jobId);

          // Send initial connection message
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: 'connected',
                jobId: jobId,
                artifactId: jobRecord.artifactId,
              })}\n\n`
            )
          );

          // Send current status immediately
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: 'status',
                status: jobRecord.status,
                progress: jobRecord.progress,
              })}\n\n`
            )
          );

          // If job is already completed, send the result and close
          if (jobRecord.status === 'completed') {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  type: 'completed',
                  result: jobRecord.result,
                  progress: 100,
                })}\n\n`
              )
            );
            controller.close();
            return;
          }

          // If job failed, send error and close
          if (jobRecord.status === 'failed') {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  type: 'error',
                  error: jobRecord.error || 'Job failed',
                })}\n\n`
              )
            );
            controller.close();
            return;
          }

          // Track if stream is closed
          let isClosed = false;

          // Poll for progress updates
          const pollInterval = setInterval(async () => {
            if (isClosed) {
              clearInterval(pollInterval);
              return;
            }

            try {
              // Get latest job record from database
              const latestJobRecord = await prisma.artifactGenerationJob.findUnique({
                where: { id: jobId },
              });

              if (!latestJobRecord) {
                clearInterval(pollInterval);
                if (!isClosed) {
                  controller.enqueue(
                    encoder.encode(
                      `data: ${JSON.stringify({
                        type: 'error',
                        error: 'Job record not found',
                      })}\n\n`
                    )
                  );
                  controller.close();
                  isClosed = true;
                }
                return;
              }

              // Send progress update with partial result for live code streaming
              if (!isClosed) {
                controller.enqueue(
                  encoder.encode(
                    `data: ${JSON.stringify({
                      type: 'progress',
                      status: latestJobRecord.status,
                      progress: latestJobRecord.progress,
                      partialResult: latestJobRecord.result || '', // Stream partial code
                    })}\n\n`
                  )
                );
              }

              // If job completed
              if (latestJobRecord.status === 'completed') {
                clearInterval(pollInterval);
                if (!isClosed) {
                  controller.enqueue(
                    encoder.encode(
                      `data: ${JSON.stringify({
                        type: 'completed',
                        result: latestJobRecord.result,
                        progress: 100,
                      })}\n\n`
                    )
                  );
                  controller.close();
                  isClosed = true;
                }
                return;
              }

              // If job failed
              if (latestJobRecord.status === 'failed') {
                clearInterval(pollInterval);
                if (!isClosed) {
                  controller.enqueue(
                    encoder.encode(
                      `data: ${JSON.stringify({
                        type: 'error',
                        error: latestJobRecord.error || 'Job failed',
                      })}\n\n`
                    )
                  );
                  controller.close();
                  isClosed = true;
                }
                return;
              }
            } catch (pollError) {
              console.error('[Job Stream API] Polling error:', pollError);
              clearInterval(pollInterval);
              if (!isClosed) {
                try {
                  controller.enqueue(
                    encoder.encode(
                      `data: ${JSON.stringify({
                        type: 'error',
                        error: 'Failed to poll job status',
                      })}\n\n`
                    )
                  );
                  controller.close();
                  isClosed = true;
                } catch (closeError) {
                  // Controller already closed, ignore
                  isClosed = true;
                }
              }
            }
          }, 1000); // Poll every second

          // Set timeout for stream (10 minutes)
          setTimeout(() => {
            clearInterval(pollInterval);
            if (!isClosed) {
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({
                    type: 'error',
                    error: 'Stream timeout',
                  })}\n\n`
                )
              );
              controller.close();
              isClosed = true;
            }
          }, 10 * 60 * 1000);

          // Handle client disconnect
          req.signal.addEventListener('abort', () => {
            console.log('[Job Stream API] Client disconnected');
            clearInterval(pollInterval);
            if (!isClosed) {
              controller.close();
              isClosed = true;
            }
          });
        } catch (error) {
          console.error('[Job Stream API] Streaming error:', error);
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: 'error',
                error: error instanceof Error ? error.message : 'Unknown error',
              })}\n\n`
            )
          );
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    console.error('[Job Stream API] Setup error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
