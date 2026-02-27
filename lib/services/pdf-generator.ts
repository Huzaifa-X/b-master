import 'server-only';
import { uploadToS3 } from '@/lib/aws-s3';
import { generateInvoiceHTML } from '@/lib/invoice-template';
import type { Browser } from 'puppeteer-core';

// Timeout for the external converter service (default 60s, configurable via env)
const CONVERTER_TIMEOUT_MS = parseInt(process.env.PDF_CONVERTER_TIMEOUT_MS || '60000', 10);

interface GeneratePDFOptions {
  html: string;
  filename: string;
  s3Folder?: string;
}

interface PDFResult {
  pdfUrl: string;
  pdfBuffer: Buffer;
}

interface ConvertOptions {
  html: string;
  filename: string;
  s3Folder?: string;
}

interface ConvertResult {
  url: string;
  buffer: Buffer;
}

// PDF Converter API configuration (for DOCX/PPTX)
const PDF_CONVERTER_URL = process.env.PDF_CONVERTER_URL || 'https://pdf-converter.dev.bmaster.ch';

/**
 * Get browser instance - uses @sparticuz/chromium in production (Vercel/Lambda)
 * and regular puppeteer in development
 */
async function getBrowser(): Promise<Browser> {
  if (process.env.NODE_ENV === 'production' || process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    // Production: Use @sparticuz/chromium for serverless
    console.log('[PDF] Production mode: Using @sparticuz/chromium');

    const chromium = (await import('@sparticuz/chromium')).default;
    const puppeteer = await import('puppeteer-core');

    const executablePath = await chromium.executablePath();
    console.log('[PDF] Chromium path:', executablePath);

    return puppeteer.default.launch({
      args: chromium.args,
      executablePath,
      headless: true,
      defaultViewport: {
        width: 850,
        height: 1200,
        deviceScaleFactor: 2,
      },
    });
  } else {
    // Development: Use regular puppeteer with bundled Chrome
    console.log('[PDF] Development mode: Using puppeteer');

    const puppeteer = await import('puppeteer');

    return puppeteer.default.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-software-rasterizer',
        '--disable-extensions',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
      ],
      timeout: 30000,
    });
  }
}

/**
 * Generate PDF from HTML string using Puppeteer
 */
export async function generatePDFFromHTML({
  html,
  filename,
  s3Folder = 'invoices'
}: GeneratePDFOptions): Promise<PDFResult> {
  let browser: Browser | null = null;

  try {
    console.log('[PDF] Launching headless browser...');

    browser = await getBrowser();
    const page = await browser.newPage();

    // 🔥 OPTIMIZED VIRTUAL DESKTOP: Render at 850px
    const VIRTUAL_WIDTH = 850;

    await page.setViewport({
      width: VIRTUAL_WIDTH,
      height: 1200,
      deviceScaleFactor: 2,
    });

    // Emulate 'screen' media to look exactly like the web view
    await page.emulateMediaType('screen');

    // Set timeout for page operations
    page.setDefaultTimeout(30000);

    console.log('[PDF] Loading HTML content...');

    // Set content and wait for network to settle
    await page.setContent(html, {
      waitUntil: 'networkidle0',
      timeout: 30000,
    });

    // Force exact colors and ensure content expands to the 850px viewport
    await page.addStyleTag({
      content: `
        * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        html, body {
          width: 100% !important;
          max-width: 100% !important;
          min-width: ${VIRTUAL_WIDTH}px !important;
          overflow-x: hidden !important;
          margin: 0 !important;
          padding: 0 !important;
        }
        .invoice-container, [class*="container"] {
          max-width: 100% !important;
          margin-left: 0 !important;
          margin-right: 0 !important;
        }
      `
    });

    console.log('[PDF] Generating A4 PDF...');

    // 🔥 HIGH-FILL SCALING: Fit 850px content into A4 width
    const scale = 0.93;

    const pdfUint8Array = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: false,
      scale: scale,
      margin: {
        top: '10mm',
        right: '10mm',
        bottom: '10mm',
        left: '10mm',
      },
      timeout: 30000,
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
 * Generic HTML converter using FastAPI PDF Converter (for DOCX/PPTX)
 */
async function convertHTML({
  html,
  filename,
  s3Folder = 'documents',
  format,
  mimeType,
}: ConvertOptions & { format: 'docx' | 'pptx'; mimeType: string }): Promise<ConvertResult> {
  try {
    console.log(`[Converter] Converting HTML to ${format.toUpperCase()}...`);
    console.log('[Converter] URL:', PDF_CONVERTER_URL);
    console.log('[Converter] HTML size:', html.length, 'chars');

    // Create a Blob/File from the HTML content
    const htmlBlob = new Blob([html], { type: 'text/html' });

    // Create FormData with both file and html parameters
    const formData = new FormData();
    formData.append('file', htmlBlob, 'document.html');
    formData.append('html', html);

    // Call Converter API with explicit timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CONVERTER_TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(`${PDF_CONVERTER_URL}/convert/${format}`, {
        method: 'POST',
        headers: {
          'accept': 'application/json',
        },
        body: formData,
        signal: controller.signal,
      });
    } catch (fetchError: any) {
      if (fetchError?.name === 'AbortError' || fetchError?.code === 'UND_ERR_HEADERS_TIMEOUT') {
        throw new Error(
          `Converter service timed out after ${CONVERTER_TIMEOUT_MS / 1000}s. ` +
          `The service at ${PDF_CONVERTER_URL} may be unavailable or overloaded.`
        );
      }
      throw fetchError;
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Converter] API error:`, response.status, errorText);
      throw new Error(`Converter API failed: ${response.status} - ${errorText}`);
    }

    // Get buffer from response
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    console.log(`[Converter] ${format.toUpperCase()} generated, size:`, buffer.length, 'bytes');

    // Validate size
    if (buffer.length === 0) {
      throw new Error(`Generated ${format.toUpperCase()} is empty`);
    }

    // Upload to S3
    console.log('[Converter] Uploading to S3...');
    const url = await uploadToS3(
      buffer,
      filename,
      mimeType,
      s3Folder
    );

    console.log(`[Converter] ✅ ${format.toUpperCase()} uploaded to:`, url);

    return { url, buffer };

  } catch (error) {
    console.error(`[Converter] ❌ Error generating ${format.toUpperCase()}:`, error);

    if (error instanceof Error) {
      throw new Error(`${format.toUpperCase()} generation failed: ${error.message}`);
    }
    throw new Error(`${format.toUpperCase()} generation failed: Unknown error`);
  }
}

/**
 * Generate DOCX from HTML string using FastAPI PDF Converter
 */
export async function generateDOCXFromHTML({
  html,
  filename,
  s3Folder = 'documents'
}: ConvertOptions): Promise<ConvertResult> {
  return convertHTML({
    html,
    filename,
    s3Folder,
    format: 'docx',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
}

/**
 * Generate PPTX from HTML string using FastAPI PDF Converter
 */
export async function generatePPTXFromHTML({
  html,
  filename,
  s3Folder = 'presentations'
}: ConvertOptions): Promise<ConvertResult> {
  return convertHTML({
    html,
    filename,
    s3Folder,
    format: 'pptx',
    mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  });
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
        const delay = Math.pow(2, attempt) * 1000;
        console.log(`[PDF] Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  // All retries failed
  console.error('[PDF] ❌ All retry attempts failed');
  throw lastError || new Error('Failed to generate invoice PDF after multiple attempts');
}
