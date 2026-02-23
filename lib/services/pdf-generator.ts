import 'server-only';
import { uploadToS3 } from '@/lib/aws-s3';
import { generateInvoiceHTML } from '@/lib/invoice-template';

// Timeout for the external converter service (default 60s, configurable via env)
const CONVERTER_TIMEOUT_MS = parseInt(process.env.PDF_CONVERTER_TIMEOUT_MS || '60000', 10);

interface ConvertOptions {
  html: string;
  filename: string;
  s3Folder?: string;
}

interface ConvertResult {
  url: string;
  buffer: Buffer;
}

// For backwards compatibility
interface PDFResult {
  pdfUrl: string;
  pdfBuffer: Buffer;
}

// PDF Converter API configuration
const PDF_CONVERTER_URL = process.env.PDF_CONVERTER_URL || 'https://pdf-converter.dev.bmaster.ch';

/**
 * Generic HTML converter using FastAPI PDF Converter
 */
async function convertHTML({
  html,
  filename,
  s3Folder = 'documents',
  format,
  mimeType,
}: ConvertOptions & { format: 'pdf' | 'docx' | 'pptx'; mimeType: string }): Promise<ConvertResult> {
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

    // Call Converter API with explicit timeout to avoid hanging for minutes
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
 * Generate PDF from HTML string using FastAPI PDF Converter
 */
export async function generatePDFFromHTML({
  html,
  filename,
  s3Folder = 'invoices'
}: ConvertOptions): Promise<PDFResult> {
  const result = await convertHTML({
    html,
    filename,
    s3Folder,
    format: 'pdf',
    mimeType: 'application/pdf',
  });

  return { pdfUrl: result.url, pdfBuffer: result.buffer };
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
