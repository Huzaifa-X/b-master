import puppeteer from 'puppeteer';
import { uploadToS3 } from '@/lib/aws-s3';
import { generateInvoiceHTML } from '@/lib/invoice-template';

interface GeneratePDFOptions {
  html: string;
  filename: string;
  s3Folder?: string;
}

export async function generatePDFFromHTML({
  html,
  filename,
  s3Folder = 'invoices'
}: GeneratePDFOptions): Promise<{ pdfUrl: string; pdfBuffer: Buffer }> {
  let browser;

  try {
    console.log('[PDF] Launching headless browser...');

    // Launch Puppeteer
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu'
      ]
    });

    const page = await browser.newPage();

    // Set content
    await page.setContent(html, {
      waitUntil: 'networkidle0'
    });

    console.log('[PDF] Generating PDF...');

    // Generate PDF
    const pdfUint8Array = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20px',
        right: '20px',
        bottom: '20px',
        left: '20px'
      }
    });

    await browser.close();

    // Convert Uint8Array to Buffer
    const pdfBuffer = Buffer.from(pdfUint8Array);
    console.log('[PDF] PDF generated, size:', pdfBuffer.length, 'bytes');

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
    if (browser) {
      await browser.close();
    }
    console.error('[PDF] ❌ Error generating PDF:', error);
    throw error;
  }
}

export async function generateInvoicePDF(invoiceData: any): Promise<string> {
  const html = generateInvoiceHTML(invoiceData);
  const filename = `invoice-${invoiceData.invoiceNumber}-${Date.now()}.pdf`;

  const { pdfUrl } = await generatePDFFromHTML({
    html,
    filename,
    s3Folder: 'invoices'
  });

  return pdfUrl;
}
