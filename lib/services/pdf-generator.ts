import 'server-only';
import { uploadToS3 } from '@/lib/aws-s3';
import { generateInvoiceHTML } from '@/lib/invoice-template';
import type { Browser, Page } from 'puppeteer';

interface GeneratePDFOptions {
  html: string;
  filename: string;
  s3Folder?: string;
}

interface PDFResult {
  pdfUrl: string;
  pdfBuffer: Buffer;
}

/**
 * Get Chromium executable path for production environments
 * For local development, Puppeteer uses bundled Chromium
 * For production (Vercel/Docker), you may need chrome-aws-lambda or @sparticuz/chromium
 */
function getChromiumPath(): string | undefined {
  // Check if running in production
  if (process.env.NODE_ENV === 'production') {
    // Option 1: Use environment variable for custom Chrome path
    if (process.env.CHROME_EXECUTABLE_PATH) {
      return process.env.CHROME_EXECUTABLE_PATH;
    }

    // Option 2: For AWS Lambda/Vercel, use chrome-aws-lambda
    // Uncomment if you install @sparticuz/chromium:
    // try {
    //   const chromium = require('@sparticuz/chromium');
    //   return chromium.executablePath;
    // } catch (error) {
    //   console.warn('[PDF] @sparticuz/chromium not found, using default');
    // }
  }

  // Return undefined to use Puppeteer's bundled Chromium
  return undefined;
}

/**
 * Generate PDF from HTML string
 */
export async function generatePDFFromHTML({
  html,
  filename,
  s3Folder = 'invoices'
}: GeneratePDFOptions): Promise<PDFResult> {
  let browser: Browser | null = null;
  let page: Page | null = null;

  try {
    console.log('[PDF] Launching headless browser...');

    const executablePath = getChromiumPath();
    if (executablePath) {
      console.log('[PDF] Using Chrome at:', executablePath);
    }

    // Dynamically import Puppeteer to prevent it from being bundled in the build
    const puppeteer = await import('puppeteer');

    // Launch Puppeteer with enhanced configuration
    browser = await puppeteer.default.launch({
      headless: true,
      executablePath, // Use custom Chrome in production
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage', // Overcome limited resource problems
        '--disable-gpu',
        '--disable-software-rasterizer',
        '--disable-extensions',
        '--disable-web-security', // Allow loading of external resources
        '--disable-features=VizDisplayCompositor', // Reduce memory usage
      ],
      timeout: 30000, // 30 second timeout for browser launch
    });

    page = await browser.newPage();

    // Set viewport for consistent rendering
    await page.setViewport({
      width: 1200,
      height: 1600,
      deviceScaleFactor: 2, // Higher quality rendering
    });

    // Set timeout for page operations
    page.setDefaultTimeout(30000); // 30 seconds

    console.log('[PDF] Loading HTML content...');

    // Set content with timeout
    await page.setContent(html, {
      waitUntil: 'networkidle0', // Wait for all network requests to finish
      timeout: 30000,
    });

    // Optional: Wait for any dynamic content to render
    // await page.waitForTimeout(1000);

    console.log('[PDF] Generating PDF...');

    // Generate PDF
    const pdfUint8Array = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: false, // Use A4 format
      margin: {
        top: '20px',
        right: '20px',
        bottom: '20px',
        left: '20px',
      },
      timeout: 30000, // 30 second timeout for PDF generation
    });

    // Close browser before uploading (free up resources)
    await browser.close();
    browser = null;

    // Convert Uint8Array to Buffer
    const pdfBuffer = Buffer.from(pdfUint8Array);
    console.log('[PDF] PDF generated, size:', pdfBuffer.length, 'bytes');

    // Validate PDF size
    if (pdfBuffer.length === 0) {
      throw new Error('Generated PDF is empty');
    }

    if (pdfBuffer.length > 10 * 1024 * 1024) {
      console.warn('[PDF] ⚠️ Large PDF generated:', pdfBuffer.length, 'bytes');
    }

    // Upload to S3
    console.log('[PDF] Uploading to S3...');
    const pdfUrl = await uploadToS3(
      pdfBuffer,
      filename,
      'application/pdf',
      s3Folder
    );

    console.log('[PDF] ✅ PDF uploaded to:', pdfUrl);

    return { pdfUrl, pdfBuffer };

  } catch (error) {
    console.error('[PDF] ❌ Error generating PDF:', error);

    // Ensure browser is closed even on error
    if (browser) {
      try {
        await browser.close();
      } catch (closeError) {
        console.error('[PDF] Error closing browser:', closeError);
      }
    }

    // Re-throw with more context
    if (error instanceof Error) {
      throw new Error(`PDF generation failed: ${error.message}`);
    }
    throw new Error('PDF generation failed: Unknown error');
  }
}

/**
 * Generate invoice PDF with retry logic
 */
export async function generateInvoicePDF(
  invoiceData: any,
  maxRetries: number = 2
): Promise<string> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[PDF] Attempt ${attempt}/${maxRetries} to generate invoice PDF`);

      const html = generateInvoiceHTML(invoiceData);
      const filename = `invoice-${Date.now()}.pdf`;

      const { pdfUrl } = await generatePDFFromHTML({
        html,
        filename,
        s3Folder: 'invoices',
      });

      console.log(`[PDF] ✅ Invoice PDF generated successfully on attempt ${attempt}`);
      return pdfUrl;

    } catch (error) {
      lastError = error as Error;
      console.error(`[PDF] Attempt ${attempt}/${maxRetries} failed:`, error);

      // Don't retry on the last attempt
      if (attempt < maxRetries) {
        // Wait before retrying (exponential backoff)
        const delay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s...
        console.log(`[PDF] Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  // All retries failed
  console.error('[PDF] ❌ All retry attempts failed');
  throw lastError || new Error('Failed to generate invoice PDF after multiple attempts');
}
