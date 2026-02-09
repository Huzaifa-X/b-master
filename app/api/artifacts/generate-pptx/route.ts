import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { generatePPTXFromHTML } from '@/lib/services/pdf-generator';

export const dynamic = 'force-dynamic';

/**
 * POST /api/artifacts/generate-pptx
 * Generates a PPTX from HTML content for an artifact
 */
export async function POST(req: NextRequest) {
  try {
    console.log('[PPTX API] Request received');

    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      console.error('[PPTX API] Unauthorized - no session');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    console.log('[PPTX API] User authenticated:', userId);

    const body = await req.json();
    const { html, filename } = body;

    if (!html) {
      return NextResponse.json({ error: 'HTML content is required' }, { status: 400 });
    }

    if (!filename) {
      return NextResponse.json({ error: 'Filename is required' }, { status: 400 });
    }

    console.log('[PPTX API] Generating PPTX for:', filename);

    // Generate PPTX from HTML
    const { url } = await generatePPTXFromHTML({
      html,
      filename: `${filename.replace(/\s+/g, '-').toLowerCase()}.pptx`,
      s3Folder: 'artifacts',
    });

    console.log('[PPTX API] ✅ PPTX generated successfully:', url);

    return NextResponse.json({
      success: true,
      pptxUrl: url,
    });

  } catch (error) {
    console.error('[PPTX API] ❌ Error generating PPTX:', error);

    if (error instanceof Error) {
      return NextResponse.json(
        { error: `PPTX generation failed: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'PPTX generation failed: Unknown error' },
      { status: 500 }
    );
  }
}
