import 'server-only';
import { uploadToS3 } from '@/lib/aws-s3';
import { generateInvoiceHTML } from '@/lib/invoice-template';
import type { Browser } from 'puppeteer-core';

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
        width: 794,   // A4 width at 96 DPI
        height: 1123, // A4 height at 96 DPI
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

    // A4 at 96 DPI = 794 × 1123px (CSS pixels)
    const A4_WIDTH_PX = 794;
    const A4_HEIGHT_PX = 1123;

    await page.setViewport({
      width: A4_WIDTH_PX,
      height: A4_HEIGHT_PX,
      deviceScaleFactor: 2,
    });

    // Use 'print' media so CSS @media print rules and page breaks apply correctly
    await page.emulateMediaType('print');

    // Set timeout for page operations
    page.setDefaultTimeout(30000);

    console.log('[PDF] Loading HTML content...');

    // Set content and wait for network to settle
    await page.setContent(html, {
      waitUntil: 'networkidle0',
      timeout: 30000,
    });

    // Ensure full-width rendering and exact colour reproduction
    await page.addStyleTag({
      content: `
        * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; box-sizing: border-box; }
        @page { size: A4; margin: 10mm; }
        html, body {
          width: 100% !important;
          max-width: 100% !important;
          overflow-x: hidden !important;
          margin: 0 !important;
          padding: 0 !important;
        }
        body > *,
        .invoice-container,
        .container, .wrapper,
        [class*="container"], [class*="wrapper"] {
          max-width: 100% !important;
          width: 100% !important;
          margin-left: 0 !important;
          margin-right: 0 !important;
        }
        /* Avoid cutting elements across pages */
        tr, img, figure, .page-break-inside-avoid {
          page-break-inside: avoid;
        }
      `
    });

    console.log('[PDF] Generating A4 PDF...');

    const pdfUint8Array = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: false,
      scale: 1.0,
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
    let pdfUrl: string | null = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        pdfUrl = await uploadToS3(pdfBuffer, filename, 'application/pdf', s3Folder);
        break;
      } catch (uploadErr: any) {
        const msg: string = uploadErr?.message ?? '';
        const retryable = uploadErr?.code === 'ECONNRESET' || uploadErr?.code === 'ECONNREFUSED' || uploadErr?.code === 'ETIMEDOUT'
          || msg.includes('ECONNRESET') || msg.includes('Connection reset') || msg.includes('interrupted') || msg.includes('ETIMEDOUT');
        if (retryable && attempt < 3) {
          const delay = attempt * 1500;
          console.warn(`[PDF] S3 upload attempt ${attempt} failed, retrying in ${delay}ms... (${msg.slice(0, 80)})`);
          await new Promise(r => setTimeout(r, delay));
        } else {
          throw uploadErr;
        }
      }
    }

    console.log('[PDF] ✅ PDF uploaded to:', pdfUrl);

    return { pdfUrl: pdfUrl!, pdfBuffer };

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
 * Inline <style> block rules into element style attributes using juice.
 * Falls back to original HTML if juice fails so DOCX generation still works.
 */
function inlineStyles(html: string): string {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const juice = require('juice') as typeof import('juice');
    return juice(html, {
      removeStyleTags: true,
      applyStyleTags: true,
      applyAttributesTableElements: true,
      inlinePseudoElements: false,
      preserveMediaQueries: false,
      preserveFontFaces: false,
    });
  } catch (e) {
    console.warn('[DOCX] juice inlining failed, using original HTML:', e);
    return html;
  }
}

/**
 * Generate DOCX from HTML string using html-to-docx (local, no external service)
 */
export async function generateDOCXFromHTML({
  html,
  filename,
  s3Folder = 'documents'
}: ConvertOptions): Promise<ConvertResult> {
  try {
    console.log('[DOCX] Converting HTML to DOCX locally...');
    console.log('[DOCX] HTML size:', html.length, 'chars');

    // Ensure full HTML document wrapper
    const fullHtml = html.trim().startsWith('<!DOCTYPE') || html.trim().startsWith('<html')
      ? html
      : `<!DOCTYPE html><html><head><meta charset="utf-8"/></head><body>${html}</body></html>`;

    // Inline <style> block rules so html-to-docx preserves design
    console.log('[DOCX] Inlining CSS styles...');
    const inlinedHtml = inlineStyles(fullHtml);
    console.log('[DOCX] Inlined HTML size:', inlinedHtml.length, 'chars');

    // Use eval('require') to load html-to-docx outside Next.js's bundler —
    // the bundler wraps CJS modules in a way that loses the callable export.
    // eslint-disable-next-line no-eval, @typescript-eslint/no-explicit-any
    const htmlToDocxMod: any = eval('require')('html-to-docx');
    const HTMLtoDOCX: (
      html: string,
      headerHtml: null | string,
      options?: Record<string, unknown>,
      footerHtml?: null | string
    ) => Promise<Buffer | Uint8Array | Blob> =
      typeof htmlToDocxMod === 'function'
        ? htmlToDocxMod
        : typeof htmlToDocxMod?.default === 'function'
          ? htmlToDocxMod.default
          : htmlToDocxMod?.HTMLtoDOCX ?? htmlToDocxMod?.default?.HTMLtoDOCX;

    if (typeof HTMLtoDOCX !== 'function') {
      console.error('[DOCX] html-to-docx export keys:', Object.keys(htmlToDocxMod ?? {}));
      throw new Error('html-to-docx did not export a callable function');
    }

    const raw = await HTMLtoDOCX(inlinedHtml, null, {
      title: filename.replace(/[-_]/g, ' ').replace(/\.docx$/, ''),
      margins: { top: 1080, right: 1080, bottom: 1080, left: 1080 },
      font: 'Arial',
      fontSize: 24,
      table: { row: { cantSplit: true } },
      pageNumber: false,  // disable — can cause issues on some consumers
    });

    // Convert any return type to a real Node Buffer
    let buffer: Buffer;
    if (Buffer.isBuffer(raw)) {
      buffer = raw;
    } else if (raw instanceof Uint8Array) {
      buffer = Buffer.from(raw);
    } else if (raw instanceof Blob) {
      buffer = Buffer.from(await raw.arrayBuffer());
    } else {
      buffer = Buffer.from(raw as unknown as ArrayBuffer);
    }

    if (!buffer || buffer.length === 0) {
      throw new Error('Generated DOCX is empty');
    }

    // Validate DOCX magic bytes (ZIP = PK\x03\x04)
    if (buffer[0] !== 0x50 || buffer[1] !== 0x4b) {
      console.error('[DOCX] Invalid magic bytes:', buffer.slice(0, 4).toString('hex'));
      throw new Error('Generated file is not a valid DOCX (bad magic bytes)');
    }

    console.log('[DOCX] DOCX generated, size:', buffer.length, 'bytes');

    console.log('[DOCX] Uploading to S3...');
    let url: string | null = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        url = await uploadToS3(
          buffer,
          filename,
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          s3Folder
        );
        break;
      } catch (uploadErr: any) {
        const msg: string = uploadErr?.message ?? '';
        const retryable = uploadErr?.code === 'ECONNRESET' || uploadErr?.code === 'ECONNREFUSED' || uploadErr?.code === 'ETIMEDOUT'
          || msg.includes('ECONNRESET') || msg.includes('Connection reset') || msg.includes('interrupted') || msg.includes('ETIMEDOUT');
        if (retryable && attempt < 3) {
          const delay = attempt * 1500;
          console.warn(`[DOCX] S3 upload attempt ${attempt} failed, retrying in ${delay}ms... (${msg.slice(0, 80)})`);
          await new Promise(r => setTimeout(r, delay));
        } else {
          throw uploadErr;
        }
      }
    }

    console.log('[DOCX] ✅ DOCX uploaded to:', url);
    return { url: url!, buffer };

  } catch (error) {
    console.error('[DOCX] ❌ Error generating DOCX:', error);
    if (error instanceof Error) throw new Error(`DOCX generation failed: ${error.message}`);
    throw new Error('DOCX generation failed: Unknown error');
  }
}

/**
 * Parse an HTML string into slide-friendly sections using plain regex.
 * Works in Node.js (no DOMParser needed).
 */
function parseHtmlSectionsNode(html: string): { title: string; body: string }[] {
  // Strip all tags except headings and block-level text
  const stripTags = (s: string) => s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

  // Extract headings with their following content
  const headingRe = /<(h[1-3])[^>]*>([\s\S]*?)<\/\1>([\s\S]*?)(?=<h[1-3]|$)/gi;
  const sections: { title: string; body: string }[] = [];
  let match: RegExpExecArray | null;

  while ((match = headingRe.exec(html)) !== null) {
    const title = stripTags(match[2]).slice(0, 120);
    const body = stripTags(match[3]).slice(0, 900);
    if (title) sections.push({ title, body });
  }

  if (sections.length === 0) {
    // No headings — put everything on one slide
    const text = stripTags(html).slice(0, 900);
    sections.push({ title: 'Content', body: text });
  }

  return sections;
}

/**
 * Generate PPTX from HTML string using pptxgenjs (local, no external service)
 */
export async function generatePPTXFromHTML({
  html,
  filename,
  s3Folder = 'presentations'
}: ConvertOptions): Promise<ConvertResult> {
  try {
    console.log('[PPTX] Converting HTML to PPTX locally...');

    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any
    const pptxgenMod: any = eval('require')('pptxgenjs');
    const PptxGenJS = typeof pptxgenMod === 'function'
      ? pptxgenMod
      : pptxgenMod?.default ?? pptxgenMod;

    const pres = new PptxGenJS();
    pres.layout = 'LAYOUT_WIDE';

    const sections = parseHtmlSectionsNode(html);
    console.log(`[PPTX] Building ${sections.length} slide(s)...`);

    sections.forEach(({ title, body }, i) => {
      const slide = pres.addSlide();

      // Slide background
      slide.background = { color: 'FFFFFF' };

      // Title
      slide.addText(title, {
        x: 0.4, y: 0.3, w: '92%', h: 1.1,
        fontSize: 28, bold: true, color: '1a1a2e',
        wrap: true, breakLine: false,
      });

      // Divider line
      slide.addShape('rect' as any, {
        x: 0.4, y: 1.5, w: '92%', h: 0.04,
        fill: { color: '4f46e5' },
        line: { color: '4f46e5', width: 0 },
      });

      // Body text (only if present)
      if (body) {
        slide.addText(body, {
          x: 0.4, y: 1.7, w: '92%', h: 4.2,
          fontSize: 16, color: '374151',
          wrap: true, valign: 'top', breakLine: true,
        });
      }

      // Slide number (bottom right)
      slide.addText(`${i + 1} / ${sections.length}`, {
        x: '80%', y: '90%', w: '18%', h: 0.3,
        fontSize: 10, color: '9ca3af', align: 'right',
      });
    });

    // Write to Node buffer
    const raw = await pres.write({ outputType: 'nodebuffer' }) as unknown;
    let buffer: Buffer;
    if (Buffer.isBuffer(raw)) {
      buffer = raw;
    } else if (raw instanceof Uint8Array) {
      buffer = Buffer.from(raw);
    } else {
      buffer = Buffer.from(raw as ArrayBuffer);
    }

    if (!buffer || buffer.length === 0) throw new Error('Generated PPTX is empty');

    console.log('[PPTX] PPTX generated, size:', buffer.length, 'bytes');

    // Upload to S3 with retry
    console.log('[PPTX] Uploading to S3...');
    let url: string | null = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        url = await uploadToS3(
          buffer,
          filename,
          'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          s3Folder
        );
        break;
      } catch (uploadErr: any) {
        const msg: string = uploadErr?.message ?? '';
        const retryable = msg.includes('ECONNRESET') || msg.includes('Connection reset') || msg.includes('ETIMEDOUT');
        if (retryable && attempt < 3) {
          console.warn(`[PPTX] S3 upload attempt ${attempt} failed, retrying in ${attempt * 1500}ms...`);
          await new Promise(r => setTimeout(r, attempt * 1500));
        } else throw uploadErr;
      }
    }

    console.log('[PPTX] ✅ PPTX uploaded to:', url);
    return { url: url!, buffer };

  } catch (error) {
    console.error('[PPTX] ❌ Error generating PPTX:', error);
    if (error instanceof Error) throw new Error(`PPTX generation failed: ${error.message}`);
    throw new Error('PPTX generation failed: Unknown error');
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
