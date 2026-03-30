import prisma from "@/lib/prisma"
import axios from "axios"

interface ScrapeJobParams {
  url: string
  vectorStoreId: string
  maxPages?: number
}

/**
 * Trigger web scraping job for a URL
 * This function calls the web crawler API to scrape a website
 * and store the extracted information in a vector store
 * @param params - Scraping parameters
 * @returns Job status
 */
export async function triggerWebScraping(
  params: ScrapeJobParams
): Promise<{ success: boolean; error?: string; vectorFileId: string }> {
  try {
    const response = await axios.post(process.env.WEB_CRAWLER_API!, {
      url: params.url,
      vector_store_id: params.vectorStoreId,
      max_pages: params.maxPages || 20,
    })

    console.log(`✅ Web scraping triggered for: ${params.url}`)
    return { success: true, vectorFileId: response.data.file_id }
  } catch (error) {
    console.error("❌ Error triggering web scraping:", error)
    return { success: false, error: error instanceof Error ? error.message : "Unknown error", vectorFileId: "" }
  }
}
/**
 * Process pending URL crawling jobs
 * This function should be called by a cron job
 * It finds all uncrawled URLs and triggers scraping for them
 */
export async function processPendingUrlCrawls(): Promise<void> {
  try {
    console.log("🔄 Processing pending URL crawls...")

    // Find all uncrawled URLs
    const pendingUrls = await prisma.assistantKnowledgebase.findMany({
      where: {
        type: "url",
        isCrawled: false,
        url: {
          not: null,
        },
      },
      include: {
        assistant: {
          select: {
            id: true,
            vectorStoreId: true,
          },
        },
      },
      take: 10, // Process 10 URLs at a time to avoid overload
    })

    if (pendingUrls.length === 0) {
      console.log("✅ No pending URLs to crawl")
      return
    }

    console.log(`📋 Found ${pendingUrls.length} pending URLs to crawl`)

    // Process each URL
    for (const item of pendingUrls) {
      try {
        if (!item.assistant.vectorStoreId || !item.url) {
          console.warn(`⚠️ Skipping item ${item.id}: missing vector store ID or URL`)
          continue
        }

        console.log(`🌐 Crawling URL: ${item.url}`)

        // Trigger web scraping
        const result = await triggerWebScraping({
          url: item.url,
          vectorStoreId: item.assistant.vectorStoreId,
          maxPages: 20,
        })

        if (result.success && result.vectorFileId) {
          // Mark as crawled
          await prisma.assistantKnowledgebase.update({
            where: { id: item.id },
            data: {
              isCrawled: true,
              vectorFileId: result.vectorFileId,
              updatedAt: new Date(),
            },
          })

          console.log(`✅ Successfully crawled: ${item.url}`)
        } else {
          console.error(`❌ Failed to crawl ${item.url}: ${result.error}`)
        }

        // Add delay between requests to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 2000))
      } catch (error) {
        console.error(`❌ Error processing URL ${item.url}:`, error)
        // Continue with next URL even if one fails
      }
    }

    console.log("✅ Finished processing pending URL crawls")
  } catch (error) {
    console.error("❌ Error in processPendingUrlCrawls:", error)
    throw error
  }
}

/**
 * Retry failed crawls
 * This function finds URLs that failed to crawl and retries them
 * @param maxRetries - Maximum number of retry attempts (default: 3)
 */
export async function retryFailedCrawls(maxRetries: number = 3): Promise<void> {
  try {
    console.log("🔄 Retrying failed crawls...")

    // Find URLs that are not crawled and have been in the system for more than 5 minutes
    const failedUrls = await prisma.assistantKnowledgebase.findMany({
      where: {
        type: "url",
        isCrawled: false,
        url: {
          not: null,
        },
        createdAt: {
          lt: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
        },
      },
      include: {
        assistant: {
          select: {
            id: true,
            vectorStoreId: true,
          },
        },
      },
      take: 5, // Retry 5 at a time
    })

    if (failedUrls.length === 0) {
      console.log("✅ No failed URLs to retry")
      return
    }

    console.log(`📋 Found ${failedUrls.length} failed URLs to retry`)

    for (const item of failedUrls) {
      try {
        if (!item.assistant.vectorStoreId || !item.url) {
          console.warn(`⚠️ Skipping item ${item.id}: missing vector store ID or URL`)
          continue
        }

        console.log(`🔄 Retrying URL: ${item.url}`)

        // Trigger web scraping
        const result = await triggerWebScraping({
          url: item.url,
          vectorStoreId: item.assistant.vectorStoreId,
          maxPages: 20,
        })

        if (result.success && result.vectorFileId) {
          // Mark as crawled
          await prisma.assistantKnowledgebase.update({
            where: { id: item.id },
            data: {
              isCrawled: true,
              vectorFileId: result.vectorFileId || "",
              updatedAt: new Date(),
            },
          })

          console.log(`✅ Successfully crawled on retry: ${item.url}`)
        } else {
          console.error(`❌ Failed to crawl ${item.url} on retry: ${result.error}`)
        }

        // Add delay between requests
        await new Promise((resolve) => setTimeout(resolve, 2000))
      } catch (error) {
        console.error(`❌ Error retrying URL ${item.url}:`, error)
      }
    }

    console.log("✅ Finished retrying failed crawls")
  } catch (error) {
    console.error("❌ Error in retryFailedCrawls:", error)
    throw error
  }
}

/**
 * Get crawling statistics
 * @param assistantId - Optional assistant ID to filter by
 * @returns Statistics about crawled and pending URLs
 */
export async function getCrawlingStats(assistantId?: string) {
  try {
    const whereClause = {
      type: "url" as const,
      ...(assistantId && { assistantId: BigInt(assistantId) }),
    }

    const [total, crawled, pending] = await Promise.all([
      prisma.assistantKnowledgebase.count({
        where: whereClause,
      }),
      prisma.assistantKnowledgebase.count({
        where: {
          ...whereClause,
          isCrawled: true,
        },
      }),
      prisma.assistantKnowledgebase.count({
        where: {
          ...whereClause,
          isCrawled: false,
        },
      }),
    ])

    return {
      total,
      crawled,
      pending,
      percentComplete: total > 0 ? Math.round((crawled / total) * 100) : 0,
    }
  } catch (error) {
    console.error("❌ Error getting crawling stats:", error)
    throw error
  }
}