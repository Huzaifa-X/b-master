/**
 * Artifact Generation Worker Startup Script
 *
 * This script starts the worker that processes artifact generation jobs
 * in the background. It should be run as a separate process from the main app.
 *
 * Usage:
 *   pnpm worker                  # Start worker
 *   pnpm worker:dev              # Start in development mode with auto-reload
 */

// Load environment variables from .env file FIRST before any other imports
import 'dotenv/config';
import '../lib/workers/artifact-generation.worker';

console.log('[Worker Script] ✅ Artifact generation worker is running');
console.log('[Worker Script] Press Ctrl+C to stop');

// Keep the process alive
process.stdin.resume();
