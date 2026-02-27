import { processArtifactGeneration } from '@/lib/services/artifact-generation.service';
import {
  getPendingJobs,
  cleanupOldJobs,
} from '@/lib/queues/artifact-generation.queue';

// ================================================================
// CONFIGURATION
// ================================================================

const POLL_INTERVAL = 3000; // Poll database every 3 seconds
const CONCURRENT_JOBS = 3; // Process up to 3 jobs simultaneously
const CLEANUP_INTERVAL = 60 * 60 * 1000; // Cleanup old jobs every hour

// ================================================================
// POLLING LOOP
// ================================================================
/**
 * Note: the generation logic lives in
 * lib/services/artifact-generation.service.ts so it can also be
 * called inline from API routes (fire-and-forget) without depending
 * on this worker process being started separately.
 */

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
