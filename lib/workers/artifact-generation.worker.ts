import { openai } from '@/lib/openai';
import prisma from '@/lib/prisma';
import { getArtifactCodingPrompt } from '@/utils/prompts';
import { createArtifactVersion } from '@/app/actions/update-artifact.action';
import {
  getPendingJobs,
  markJobAsProcessing,
  updateJobProgress,
  updateJobProgressWithResult,
  markJobAsCompleted,
  markJobAsFailed,
  cleanupOldJobs,
} from '@/lib/queues/artifact-generation.queue';

// ================================================================
// CONFIGURATION
// ================================================================

const POLL_INTERVAL = 3000; // Poll database every 3 seconds
const CONCURRENT_JOBS = 3; // Process up to 3 jobs simultaneously
const CLEANUP_INTERVAL = 60 * 60 * 1000; // Cleanup old jobs every hour

// ================================================================
// JOB PROCESSOR
// ================================================================

/**
 * Process a single artifact generation job
 */
async function processArtifactGeneration(jobId: string, artifactId: number) {
  console.log(`[Worker] 🔄 Processing artifact generation job ${jobId} for artifact ${artifactId}`);

  try {
    // Mark job as processing
    await markJobAsProcessing(jobId);
    await updateJobProgress(jobId, 10);

    // Get artifact with all necessary data
    const artifact = await prisma.assistantArtifact.findUnique({
      where: { id: artifactId },
      include: {
        assistant: {
          select: {
            id: true,
            name: true,
            vectorStoreId: true,
          },
        },
      },
    });

    if (!artifact) {
      throw new Error(`Artifact ${artifactId} not found`);
    }

    await updateJobProgress(jobId, 20);

    // Extract content from uploaded files if any
    let extractedContent = '';
    if (artifact.files && Array.isArray(artifact.files)) {
      const extractedTexts: string[] = [];
      for (const file of artifact.files as any[]) {
        if (file.extractedContent?.text) {
          extractedTexts.push(
            `\n\n--- Content from ${file.name} ---\n${file.extractedContent.text}\n--- End of ${file.name} ---\n`
          );
        }
      }
      if (extractedTexts.length > 0) {
        extractedContent = extractedTexts.join('\n\n');
      }
    }

    // Build enhanced instructions
    let enhancedInstructions = artifact.instructions || '';

    // Add document content
    if (extractedContent && extractedContent.trim()) {
      enhancedInstructions +=
        '\n\n=== EXTRACTED DOCUMENT CONTENT ===\n' + extractedContent + '\n=== END DOCUMENT CONTENT ===\n';
    }

    // Add image URLs
    if (artifact.images && Array.isArray(artifact.images)) {
      enhancedInstructions += '\n\n=== IMAGES TO EMBED ===\n';
      (artifact.images as any[]).forEach((img, idx) => {
        enhancedInstructions += `Image ${idx + 1}: ${img.url} (${img.name})\n`;
      });
      enhancedInstructions += '=== END IMAGES ===\n';
    }

    await updateJobProgress(jobId, 30);

    // Check if there's a selected chat for context
    let chatContext = '';
    const jobRecord = await prisma.artifactGenerationJob.findUnique({
      where: { id: jobId },
    });

    if (jobRecord?.metadata && typeof jobRecord.metadata === 'object') {
      const metadata = jobRecord.metadata as any;
      if (metadata.selectedChatId) {
        console.log('[Worker] Found selectedChatId, fetching chat messages:', metadata.selectedChatId);
        try {
          // Fetch chat messages directly from database (bypass auth for worker)
          const chatMessages = await prisma.assistantUserChatMessage.findMany({
            where: {
              assistantUserChatId: parseInt(metadata.selectedChatId),
            },
            orderBy: {
              createdAt: 'asc',
            },
            take: 20,
            select: {
              role: true,
              message: true,
            },
          });

          if (chatMessages && chatMessages.length > 0) {
            chatContext = '\n\n=== CHAT CONTEXT (for reference) ===\n';
            chatMessages.forEach((msg) => {
              const role = msg.role === 'user' ? 'User' : 'Assistant';
              const content = msg.message || '';
              chatContext += `${role}: ${content}\n\n`;
            });
            chatContext += '=== END CHAT CONTEXT ===\n';
            console.log('[Worker] Chat context added, messages count:', chatMessages.length);
          }
        } catch (chatError) {
          console.error('[Worker] Error fetching chat messages:', chatError);
          // Continue without chat context if there's an error
        }
      }
    }

    await updateJobProgress(jobId, 40);

    // Get artifact generation prompt
    const ARTIFACT_GENERATION_PROMPT = await getArtifactCodingPrompt();

    // Prepare input for AI generation
    const input = `Create a complete HTML artifact.

Name: ${artifact.name}
Category: ${artifact.category}

${enhancedInstructions}${chatContext}

CRITICAL: Output ONLY the complete HTML code starting with <!DOCTYPE html> and ending with </html>. Do not include any explanations, descriptions, or additional text. Do not use markdown formatting.`;

    const vectorStoreId = artifact.assistant?.vectorStoreId;
    const model = 'gpt-5.2';

    console.log('[Worker] Starting OpenAI generation');

    await updateJobProgress(jobId, 50);

    let generatedCode = '';

    try {
      // Build system instructions
      const systemInstructions = ARTIFACT_GENERATION_PROMPT + '\n\nCRITICAL REMINDER: Your response must be ONLY HTML code starting with <!DOCTYPE html> and ending with </html>. No explanations, no descriptions, no markdown formatting.';

      // Create AI response with streaming
      const response = await openai.responses.create({
        model: model,
        instructions: systemInstructions,
        input: input,
        stream: true,
        ...(vectorStoreId && {
          tools: [
            {
              type: 'file_search',
              vector_store_ids: [vectorStoreId],
            },
          ],
        }),
      });

      console.log('[Worker] AI response received, processing stream');

      let progressPercentage = 50;
      const progressIncrement = 0.3; // Small increment per chunk
      let chunkCounter = 0;
      const STREAM_UPDATE_FREQUENCY = 10; // Update database every 10 chunks

      for await (const event of response) {
        switch (event.type) {
          case 'response.output_text.delta':
            if (event.delta) {
              generatedCode += event.delta;
              chunkCounter++;

              // Update progress incrementally
              progressPercentage = Math.min(80, progressPercentage + progressIncrement);

              // Stream code to database every N chunks to show live progress
              if (chunkCounter % STREAM_UPDATE_FREQUENCY === 0) {
                await updateJobProgressWithResult(jobId, Math.floor(progressPercentage), generatedCode);
                console.log(`[Worker] Streamed ${generatedCode.length} characters to database`);
              }
            }
            break;

          case 'response.completed':
            console.log('[Worker] Generation completed');
            break;

          case 'error':
            console.error('[Worker] Error event:', event);
            throw new Error('Stream error');
        }
      }

      console.log('[Worker] Finished streaming, total code length:', generatedCode.length);
    } catch (streamError: any) {
      console.error('[Worker] Streaming failed, trying fallback:', streamError);

      // Fallback to non-streaming
      const fallbackResponse = await openai.responses.create({
        model: model,
        instructions:
          ARTIFACT_GENERATION_PROMPT +
          '\n\nCRITICAL REMINDER: Your response must be ONLY HTML code starting with <!DOCTYPE html> and ending with </html>. No explanations, no descriptions, no markdown formatting.',
        input: input,
        stream: false,
        ...(vectorStoreId && {
          tools: [
            {
              type: 'file_search',
              vector_store_ids: [vectorStoreId],
            },
          ],
        }),
      });

      generatedCode = fallbackResponse.output_text || '';
      console.log('[Worker] Fallback completed, code length:', generatedCode.length);
    }

    await updateJobProgress(jobId, 85);

    // Clean up the generated code
    if (generatedCode) {
      generatedCode = generatedCode
        .replace(/^```html\n?/i, '')
        .replace(/^```\n?/i, '')
        .replace(/\n?```$/i, '')
        .trim();
    }

    await updateJobProgress(jobId, 90);

    // Get userId from job metadata
    const userId = jobRecord?.metadata && typeof jobRecord.metadata === 'object'
      ? (jobRecord.metadata as any).userId
      : null;

    if (!userId) {
      throw new Error('User ID not found in job metadata');
    }

    // Create a new version with the generated code and set it as active
    const versionResult = await createArtifactVersion({
      artifactId: artifactId,
      userId: BigInt(userId),
      code: generatedCode,
      description: 'AI-generated artifact via background job',
      changeType: 'ai',
      setAsActive: true,
    });

    if (!versionResult.success) {
      throw new Error(versionResult.error || 'Failed to create artifact version');
    }

    console.log('[Worker] Artifact version created:', versionResult.version?.versionNumber);

    await updateJobProgress(jobId, 95);

    // Mark job as completed
    await markJobAsCompleted(jobId, generatedCode);

    await updateJobProgress(jobId, 100);

    console.log(`[Worker] ✅ Completed artifact generation job ${jobId}`);

    return { success: true, code: generatedCode, versionNumber: versionResult.version?.versionNumber };
  } catch (error: any) {
    console.error(`[Worker] ❌ Failed artifact generation job ${jobId}:`, error);

    // Mark job as failed
    await markJobAsFailed(jobId, error.message || 'Unknown error');

    throw error;
  }
}

// ================================================================
// POLLING LOOP
// ================================================================

let isProcessing = false;
const activeJobs = new Set<string>();

async function pollForJobs() {
  if (isProcessing) {
    return; // Skip if already processing
  }

  try {
    isProcessing = true;

    // Get number of available slots
    const availableSlots = CONCURRENT_JOBS - activeJobs.size;

    if (availableSlots <= 0) {
      return; // All slots occupied
    }

    // Fetch pending jobs
    const pendingJobs = await getPendingJobs(availableSlots);

    if (pendingJobs.length === 0) {
      return; // No jobs to process
    }

    console.log(`[Worker] 📥 Found ${pendingJobs.length} pending job(s)`);

    // Process jobs concurrently
    for (const job of pendingJobs) {
      activeJobs.add(job.id);

      // Process job in background (don't await)
      processArtifactGeneration(job.id, job.artifactId)
        .catch((error) => {
          console.error(`[Worker] Error processing job ${job.id}:`, error);
        })
        .finally(() => {
          activeJobs.delete(job.id);
        });
    }
  } catch (error) {
    console.error('[Worker] ⚠️ Error in polling loop:', error);
  } finally {
    isProcessing = false;
  }
}

// ================================================================
// STARTUP
// ================================================================

console.log('[Worker] 🚀 Artifact generation worker started');
console.log(`[Worker] ⚙️  Configuration: Poll interval=${POLL_INTERVAL}ms, Concurrent jobs=${CONCURRENT_JOBS}`);

// Start polling loop
const pollingInterval = setInterval(pollForJobs, POLL_INTERVAL);

// Start cleanup job
const cleanupInterval = setInterval(async () => {
  try {
    await cleanupOldJobs();
  } catch (error) {
    console.error('[Worker] Error during cleanup:', error);
  }
}, CLEANUP_INTERVAL);

// ================================================================
// GRACEFUL SHUTDOWN
// ================================================================

async function gracefulShutdown() {
  console.log('[Worker] 🛑 Shutting down worker...');

  clearInterval(pollingInterval);
  clearInterval(cleanupInterval);

  // Wait for active jobs to complete (with timeout)
  const timeout = Date.now() + 30000; // 30 second timeout
  while (activeJobs.size > 0 && Date.now() < timeout) {
    console.log(`[Worker] ⏳ Waiting for ${activeJobs.size} active job(s) to complete...`);
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('[Worker] 👋 Worker shut down gracefully');
  process.exit(0);
}

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// ================================================================
// EXPORT
// ================================================================

export default {
  pollForJobs,
  gracefulShutdown,
};
