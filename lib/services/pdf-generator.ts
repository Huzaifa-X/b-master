import 'server-only';
import { uploadToS3 } from '@/lib/aws-s3';
import { generateInvoiceHTML } from '@/lib/invoice-template';

interface GeneratePDFOptions {
  html: string;
  filename: string;
  s3Folder?: string;
}

interface PDFResult {
  pdfUrl: string;
  pdfBuffer: Buffer;
}

// Stirling PDF API configuration
const STIRLING_PDF_URL = process.env.STIRLING_PDF_URL || 'https://b-pdf.dev.bmaster.ch';
const STIRLING_PDF_API_KEY = process.env.STIRLING_PDF_API_KEY || '';

/**
 * Generate PDF from HTML string using Stirling PDF API
 */
export async function generatePDFFromHTML({
  html,
  filename,
  s3Folder = 'invoices'
}: GeneratePDFOptions): Promise<PDFResult> {
  try {
    console.log('[PDF] Converting HTML to PDF using Stirling API...');
    console.log('[PDF] Stirling URL:', STIRLING_PDF_URL);
    console.log('[PDF] API Key configured:', STIRLING_PDF_API_KEY ? `Yes (${STIRLING_PDF_API_KEY.substring(0, 4)}...)` : 'No');

    // Create a Blob/File from the HTML content
    const htmlBlob = new Blob([html], { type: 'text/html' });

    // Create FormData with the HTML file
    const formData = new FormData();
    formData.append('fileInput', htmlBlob, 'document.html');

    // Build headers - Stirling PDF accepts both X-API-Key and Authorization headers
    const headers: Record<string, string> = {};
    if (STIRLING_PDF_API_KEY) {
      headers['X-API-Key'] = STIRLING_PDF_API_KEY;
      headers['Authorization'] = `Bearer ${STIRLING_PDF_API_KEY}`;
    }

    // Call Stirling PDF API
    const response = await fetch(`${STIRLING_PDF_URL}/api/v1/convert/html/pdf`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[PDF] Stirling API error:', response.status, errorText);
      throw new Error(`Stirling PDF API failed: ${response.status} - ${errorText}`);
    }

    // Get PDF buffer from response
    const pdfArrayBuffer = await response.arrayBuffer();
    const pdfBuffer = Buffer.from(pdfArrayBuffer);

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
