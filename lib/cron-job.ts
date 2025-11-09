import { NextRequest, NextResponse } from "next/server"
import { processPendingUrlCrawls, retryFailedCrawls } from "@/lib/web-scraper"

/**
 * Cron job endpoint to process pending URL crawls
 * This should be triggered periodically (e.g., every 5 minutes)
 * 
 * Example cron setup (using Vercel Cron or similar):
 * - Schedule: 5 * * * * (every 5 minutes)
 * - Endpoint: /api/cron/process-url-crawls
 * 
 * Security: Add authorization header validation in production
 */

export async function GET(request: NextRequest) {
  try {
    // Verify the request is from an authorized source
    const authHeader = request.headers.get("authorization")
    const cronSecret = process.env.CRON_SECRET || "your-secret-key"

    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    console.log("🔄 Starting URL crawl processing cron job...")

    // Process pending URL crawls
    await processPendingUrlCrawls()

    // Also retry failed crawls
    await retryFailedCrawls()

    console.log("✅ URL crawl processing cron job completed")

    return NextResponse.json(
      {
        success: true,
        message: "URL crawl processing completed",
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    )
  } catch (error) {
    console.error("❌ Error in URL crawl cron job:", error)

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}

/**
 * POST endpoint to manually trigger URL crawl processing
 * This can be used for testing or manual intervention
 */
export async function POST(request: NextRequest) {
  try {
    // Verify the request is from an authorized source
    const authHeader = request.headers.get("authorization")
    const cronSecret = process.env.CRON_SECRET || "your-secret-key"

    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { retryFailed = true } = body

    console.log("🔄 Manually triggered URL crawl processing...")

    // Process pending URL crawls
    await processPendingUrlCrawls()

    // Optionally retry failed crawls
    if (retryFailed) {
      await retryFailedCrawls()
    }

    console.log("✅ Manual URL crawl processing completed")

    return NextResponse.json(
      {
        success: true,
        message: "URL crawl processing completed",
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    )
  } catch (error) {
    console.error("❌ Error in manual URL crawl processing:", error)

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}