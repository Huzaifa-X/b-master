import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface UploadedFile {
  name: string;
  url: string;
  type: string;
  size: number;
  preview?: string;
  extractedContent?: {
    text: string;
    html: string;
    tables?: Array<{ base64: string; page: number }>;
    metadata?: { pages: number; model: string };
  };
}

/**
 * POST /api/artifacts/store-files
 * Stores uploaded files with extracted content in artifact's files field
 * This makes files available for all future artifact updates
 */
export async function POST(req: NextRequest) {
  try {
    console.log('[Store Files API] Request received');

    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      console.error('[Store Files API] Unauthorized - no session');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = BigInt(session.user.id);
    console.log('[Store Files API] User authenticated:', userId.toString());

    // Parse request body
    const body = await req.json();
    const { artifactId, files } = body;

    if (!artifactId) {
      return NextResponse.json({ error: 'artifactId is required' }, { status: 400 });
    }

    if (!files || !Array.isArray(files) || files.length === 0) {
      return NextResponse.json({ error: 'files array is required' }, { status: 400 });
    }

    const artifactIdInt = parseInt(artifactId);

    if (isNaN(artifactIdInt)) {
      return NextResponse.json({ error: 'Invalid artifact ID' }, { status: 400 });
    }

    console.log('[Store Files API] Storing', files.length, 'files for artifact:', artifactIdInt);

    // Get artifact and verify permissions
    const artifact = await prisma.assistantArtifact.findFirst({
      where: {
        id: artifactIdInt,
        OR: [
          { userId: userId }, // User is the owner
          {
            permissions: {
              some: {
                userId: userId,
                access: {
                  in: ['EDITOR', 'ADMIN'], // Only editors and admins can add files
                },
              },
            },
          },
        ],
      },
    });

    if (!artifact) {
      console.error('[Store Files API] Artifact not found or no permissions:', artifactIdInt);
      return NextResponse.json(
        { error: 'Artifact not found or you do not have permissions to add files' },
        { status: 404 }
      );
    }

    // Get existing files from artifact
    const existingFiles = (artifact.files as unknown as UploadedFile[]) || [];

    // Merge new files with existing ones (avoid duplicates by URL)
    const existingUrls = new Set(existingFiles.map((f) => f.url));
    const newFiles = (files as UploadedFile[]).filter((f) => !existingUrls.has(f.url));
    const updatedFiles = [...existingFiles, ...newFiles];

    console.log('[Store Files API] Files count - Existing:', existingFiles.length, 'New:', newFiles.length, 'Total:', updatedFiles.length);

    // Update artifact with new files
    await prisma.assistantArtifact.update({
      where: { id: artifactIdInt },
      data: {
        files: updatedFiles as any, // Store files with extracted content
        updatedAt: new Date(),
      },
    });

    console.log('[Store Files API] Files stored successfully');

    return NextResponse.json({
      success: true,
      message: `${newFiles.length} new file(s) added to artifact`,
      totalFiles: updatedFiles.length,
      newFilesCount: newFiles.length,
    });
  } catch (error: any) {
    console.error('[Store Files API] Error:', error);
    return NextResponse.json(
      {
        error: error.message || 'Failed to store files',
      },
      { status: 500 }
    );
  }
}
