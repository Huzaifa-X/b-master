# Artifact Generation Queue System (Database-Based)

This document explains the database-only queue system that processes long-running AI artifact generation tasks in the background.

## Overview

The artifact generation system uses **PostgreSQL database polling** to handle long-running AI tasks asynchronously. No external services required!

**Benefits:**
- ✅ No 60-second timeout limits
- ✅ Jobs can run as long as needed
- ✅ Idempotent job creation (no duplicates)
- ✅ Users can navigate away and reconnect
- ✅ Full progress tracking (0-100%)
- ✅ Resumable streaming
- ✅ **No Redis or external queue needed**
- ✅ Simple infrastructure

## Architecture

```
User Request → API creates Job → Database → Worker polls DB → Generates Artifact
                ↓                                                      ↓
         Returns Job ID                                    Updates Job Status in DB
                ↓                                                      ↓
    Frontend polls/streams ← Status/Stream API ← Database ←───────────┘
```

## How It Works

### 1. Job Creation
- User clicks "Generate Artifact"
- API creates job record in `ArtifactGenerationJob` table with status `pending`
- Returns job ID to frontend immediately

### 2. Worker Polling
- Separate worker process polls database every **3 seconds**
- Fetches pending jobs (oldest first)
- Processes up to **3 jobs concurrently**
- Updates job progress in database (0-100%)

### 3. Frontend Streaming
- Frontend connects to `/api/artifacts/jobs/[jobId]/stream`
- Server polls database every **1 second**
- Streams progress updates via Server-Sent Events (SSE)
- Completes when job status is `completed` or `failed`

## Required Services

### PostgreSQL Database (Already Setup)

The system uses your existing PostgreSQL database with the `ArtifactGenerationJob` table:

```sql
CREATE TABLE artifact_generation_jobs (
  id TEXT PRIMARY KEY,
  artifact_id INTEGER NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  progress INTEGER DEFAULT 0,
  result TEXT,
  error TEXT,
  metadata JSONB,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**No other services required!**

## Running the System

### Development

You need **TWO processes** running:

1. **Next.js App** (handles API requests):
   ```bash
   pnpm dev
   ```

2. **Worker Process** (processes jobs):
   ```bash
   pnpm worker:dev
   ```

### Production

1. **Next.js App**:
   ```bash
   pnpm build
   pnpm start
   ```

2. **Worker Process**:
   ```bash
   pnpm worker
   ```

**Important:** The worker should run as a separate process, ideally managed by a process manager like PM2 or systemd.

### Using PM2 (Recommended for Production)

```bash
# Install PM2
npm install -g pm2

# Start Next.js app
pm2 start npm --name "b-master-app" -- start

# Start worker
pm2 start pnpm --name "b-master-worker" -- worker

# View logs
pm2 logs

# Monitor
pm2 monit

# Save configuration
pm2 save
pm2 startup
```

### Using Docker

```dockerfile
# Start both processes in one container
CMD ["sh", "-c", "pnpm worker & pnpm start"]
```

Or use separate containers (recommended):

```yaml
# docker-compose.yml
services:
  app:
    build: .
    command: pnpm start
    environment:
      - DATABASE_URL=${DATABASE_URL}

  worker:
    build: .
    command: pnpm worker
    environment:
      - DATABASE_URL=${DATABASE_URL}
```

## API Endpoints

### 1. Create Generation Job

**Endpoint:** `POST /api/artifacts/[id]/generate`

**Response:**
```json
{
  "success": true,
  "jobId": "clxxx123...",
  "artifactId": 123,
  "status": "pending"
}
```

### 2. Check Job Status

**Endpoint:** `GET /api/artifacts/jobs/[jobId]/status`

**Response:**
```json
{
  "id": "clxxx123...",
  "artifactId": 123,
  "artifactName": "My Artifact",
  "status": "processing",
  "progress": 45,
  "createdAt": "2025-12-28T10:00:00Z",
  "startedAt": "2025-12-28T10:00:05Z"
}
```

### 3. Stream Job Progress

**Endpoint:** `GET /api/artifacts/jobs/[jobId]/stream`

**Response:** Server-Sent Events (SSE)

```
data: {"type":"connected","jobId":"..."}
data: {"type":"status","status":"processing","progress":10}
data: {"type":"progress","status":"processing","progress":25}
data: {"type":"progress","status":"processing","progress":50}
data: {"type":"completed","result":"<html>...</html>","progress":100}
```

### 4. Legacy Stream Endpoint (Redirects to Queue)

**Endpoint:** `POST /api/artifacts/stream`

This endpoint now creates a queue job and returns job info for the frontend to connect to.

## Frontend Integration

### Example: Starting Generation

```typescript
// Start generation
const response = await fetch(`/api/artifacts/${artifactId}/generate`, {
  method: 'POST',
});

const { jobId, streamUrl } = await response.json();

// Connect to progress stream
const eventSource = new EventSource(streamUrl);

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);

  switch (data.type) {
    case 'connected':
      console.log('Connected to job stream');
      break;
    case 'progress':
      console.log(`Progress: ${data.progress}%`);
      updateProgressBar(data.progress);
      break;
    case 'completed':
      console.log('Generation complete!');
      displayResult(data.result);
      eventSource.close();
      break;
    case 'error':
      console.error('Error:', data.error);
      eventSource.close();
      break;
  }
};
```

### Example: Polling for Status

```typescript
async function pollJobStatus(jobId: string) {
  const interval = setInterval(async () => {
    const response = await fetch(`/api/artifacts/jobs/${jobId}/status`);
    const status = await response.json();

    console.log(`Status: ${status.status}, Progress: ${status.progress}%`);

    if (status.status === 'completed' || status.status === 'failed') {
      clearInterval(interval);
    }
  }, 2000); // Poll every 2 seconds
}
```

## File Structure

```
/Users/hassanmuzaffar/Documents/Side Gigs/b-master/
├── lib/
│   ├── queues/
│   │   └── artifact-generation.queue.ts    # Queue functions (database-based)
│   └── workers/
│       └── artifact-generation.worker.ts   # Worker with polling loop
├── app/api/artifacts/
│   ├── [id]/
│   │   └── generate/
│   │       └── route.ts                    # Create job endpoint
│   ├── jobs/
│   │   └── [jobId]/
│   │       ├── status/
│   │       │   └── route.ts                # Status check endpoint
│   │       └── stream/
│   │           └── route.ts                # Stream progress endpoint
│   ├── stream/
│   │   └── route.ts                        # Updated to use queue
│   └── stream-legacy/
│       └── route.ts                        # Original implementation
├── scripts/
│   └── start-worker.ts                     # Worker startup script
├── prisma/
│   └── schema.prisma                       # Includes ArtifactGenerationJob model
└── docs/
    └── QUEUE_SETUP.md                      # This file
```

## Worker Configuration

The worker can be configured in `/lib/workers/artifact-generation.worker.ts`:

```typescript
const POLL_INTERVAL = 3000;        // Poll database every 3 seconds
const CONCURRENT_JOBS = 3;         // Process 3 jobs simultaneously
const CLEANUP_INTERVAL = 3600000;  // Cleanup old jobs every hour
```

### Tuning for Your Needs

**Low traffic (< 10 jobs/hour):**
```typescript
const POLL_INTERVAL = 5000;   // Poll every 5 seconds
const CONCURRENT_JOBS = 2;    // 2 concurrent jobs
```

**High traffic (> 100 jobs/hour):**
```typescript
const POLL_INTERVAL = 2000;   // Poll every 2 seconds
const CONCURRENT_JOBS = 5;    // 5 concurrent jobs
```

**Very high traffic:**
Run multiple worker processes with PM2:
```bash
pm2 start pnpm --name "worker-1" -- worker
pm2 start pnpm --name "worker-2" -- worker
pm2 start pnpm --name "worker-3" -- worker
```

## Monitoring and Debugging

### View Worker Logs

```bash
# With PM2
pm2 logs b-master-worker

# Direct execution
pnpm worker:dev  # Shows real-time logs
```

### Database Queries

```sql
-- Check job statuses
SELECT status, COUNT(*) FROM artifact_generation_jobs GROUP BY status;

-- Recent jobs
SELECT * FROM artifact_generation_jobs ORDER BY created_at DESC LIMIT 10;

-- Failed jobs
SELECT * FROM artifact_generation_jobs WHERE status = 'failed';

-- Average completion time
SELECT
  AVG(EXTRACT(EPOCH FROM (completed_at - started_at))) as avg_seconds
FROM artifact_generation_jobs
WHERE status = 'completed';
```

## Troubleshooting

### Worker not processing jobs

1. **Check if worker is running:**
   ```bash
   pm2 list
   # or
   ps aux | grep worker
   ```

2. **Check worker logs:**
   ```bash
   pm2 logs b-master-worker
   ```

3. **Restart the worker:**
   ```bash
   pm2 restart b-master-worker
   ```

### Jobs stuck in "pending"

1. **Check database connection:**
   - Verify `DATABASE_URL` in `.env`
   - Test connection: `psql $DATABASE_URL -c "SELECT 1"`

2. **Check for errors in worker logs**

3. **Manually check pending jobs:**
   ```sql
   SELECT * FROM artifact_generation_jobs WHERE status = 'pending';
   ```

### Frontend not receiving updates

1. Check if stream endpoint is accessible
2. Verify EventSource is properly implemented
3. Check browser console for errors
4. Verify job exists in database

### High database load

If you're processing many jobs and see high database load:

1. **Increase poll interval:**
   ```typescript
   const POLL_INTERVAL = 5000; // 5 seconds instead of 3
   ```

2. **Add database index** (already exists):
   ```sql
   CREATE INDEX idx_jobs_status ON artifact_generation_jobs(status);
   ```

3. **Run multiple workers** instead of increasing `CONCURRENT_JOBS`

## Performance Characteristics

### Database Polling vs Redis

| Aspect | Database Polling | Redis (BullMQ) |
|--------|-----------------|----------------|
| Infrastructure | PostgreSQL only | PostgreSQL + Redis |
| Job pickup delay | 2-5 seconds | Instant (<100ms) |
| Throughput | Good (< 100 jobs/hour) | Excellent (1000s/hour) |
| Complexity | Simple | Complex |
| Horizontal scaling | Multiple workers | Multiple workers |
| Cost | No additional cost | Redis hosting cost |
| Persistence | Built-in | Requires Redis persistence |

**Recommendation:** Database polling is perfect for most use cases. Only consider Redis if you need:
- Instant job execution (< 1 second delay)
- Very high throughput (> 500 jobs/hour)
- Advanced queue features (priorities, delays, rate limiting)

## Security Considerations

1. **Job Permissions:** All endpoints check user permissions
2. **Rate Limiting:** Worker has built-in concurrency limits
3. **Error Handling:** Failed jobs are logged and retried
4. **Data Sanitization:** Generated HTML is sanitized before saving

## Cleanup and Maintenance

The worker automatically cleans up old jobs every hour:

- **Completed jobs:** Deleted after 24 hours
- **Failed jobs:** Deleted after 7 days

You can manually trigger cleanup:

```sql
-- Delete old completed jobs
DELETE FROM artifact_generation_jobs
WHERE status = 'completed'
  AND completed_at < NOW() - INTERVAL '24 hours';

-- Delete old failed jobs
DELETE FROM artifact_generation_jobs
WHERE status = 'failed'
  AND completed_at < NOW() - INTERVAL '7 days';
```

## Migration from Sync to Queue

The old synchronous endpoint still exists at `/api/artifacts/stream-legacy` but is deprecated. The new `/api/artifacts/stream` endpoint now creates queue jobs.

**No frontend changes required** - the new endpoint returns job info that the frontend uses to connect to the stream.

## Summary

✅ **Simple** - No Redis or external services needed
✅ **Reliable** - Database persistence built-in
✅ **Scalable** - Run multiple workers for more throughput
✅ **Cost-effective** - Uses existing PostgreSQL
✅ **Production-ready** - 2-5 second job pickup delay is acceptable for most use cases

**Perfect for:**
- Small to medium traffic applications
- Teams wanting simple infrastructure
- When 2-5 second delay is acceptable
- Cost-conscious deployments

**Consider Redis/BullMQ if:**
- You need instant job execution
- Processing > 500 jobs/hour
- Need advanced queue features
