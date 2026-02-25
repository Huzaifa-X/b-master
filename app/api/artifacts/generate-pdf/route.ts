import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { generatePDFFromHTML } from '@/lib/services/pdf-generator';

export const dynamic = 'force-dynamic';
// Allow up to 90s for serverless deployment (converter timeout is 60s + upload buffer)
export const maxDuration = 90;

/**
 * POST /api/artifacts/generate-pdf
 * Generates a PDF from HTML content for an artifact
 */
export async function POST(req: NextRequest) {
  try {
    console.log('[PDF API] Request received');

    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      console.error('[PDF API] Unauthorized - no session');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    console.log('[PDF API] User authenticated:', userId);

    const body = await req.json();
    const { html, filename } = body;

    if (!html) {
      return NextResponse.json({ error: 'HTML content is required' }, { status: 400 });
    }

    if (!filename) {
      return NextResponse.json({ error: 'Filename is required' }, { status: 400 });
    }

    console.log('[PDF API] Generating PDF for:', filename);

    // Generate PDF from HTML
    const { pdfUrl } = await generatePDFFromHTML({
      html,
      filename: `${filename.replace(/\s+/g, '-').toLowerCase()}.pdf`,
      s3Folder: 'artifacts',
    });

    console.log('[PDF API] ✅ PDF generated successfully:', pdfUrl);

    return NextResponse.json({
      success: true,
      pdfUrl,
    });

  } catch (error) {
    console.error('[PDF API] ❌ Error generating PDF:', error);

    // Re-throw with more context
    if (error instanceof Error) {
      return NextResponse.json(
        { error: `PDF generation failed: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'PDF generation failed: Unknown error' },
      { status: 500 }
    );
  }
}

