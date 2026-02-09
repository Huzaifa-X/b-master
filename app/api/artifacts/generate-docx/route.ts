import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { generateDOCXFromHTML } from '@/lib/services/pdf-generator';

export const dynamic = 'force-dynamic';

/**
 * POST /api/artifacts/generate-docx
 * Generates a DOCX from HTML content for an artifact
 */
export async function POST(req: NextRequest) {
  try {
    console.log('[DOCX API] Request received');

    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      console.error('[DOCX API] Unauthorized - no session');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    console.log('[DOCX API] User authenticated:', userId);

    const body = await req.json();
    const { html, filename } = body;

    if (!html) {
      return NextResponse.json({ error: 'HTML content is required' }, { status: 400 });
    }

    if (!filename) {
      return NextResponse.json({ error: 'Filename is required' }, { status: 400 });
    }

    console.log('[DOCX API] Generating DOCX for:', filename);

    // Generate DOCX from HTML
    const { url } = await generateDOCXFromHTML({
      html,
      filename: `${filename.replace(/\s+/g, '-').toLowerCase()}.docx`,
      s3Folder: 'artifacts',
    });

    console.log('[DOCX API] ✅ DOCX generated successfully:', url);

    return NextResponse.json({
      success: true,
      docxUrl: url,
    });

  } catch (error) {
    console.error('[DOCX API] ❌ Error generating DOCX:', error);

    if (error instanceof Error) {
      return NextResponse.json(
        { error: `DOCX generation failed: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'DOCX generation failed: Unknown error' },
      { status: 500 }
    );
  }
}
