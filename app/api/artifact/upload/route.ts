// app/api/artifact/upload/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { uploadToS3, validateFileSize } from "@/lib/aws-s3";
import upstageService from "@/lib/services/upstageService";

export const runtime = "nodejs";
export const maxDuration = 60; // Extended timeout for file processing

export async function POST(request: NextRequest) {
  try {
    // Authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const fileType = formData.get("type") as "image" | "document";

    if (!file) {
      return NextResponse.json(
        { success: false, error: "No file provided" },
        { status: 400 }
      );
    }

    // Validate file size (50MB limit)
    const MAX_FILE_SIZE = 50 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: "File size exceeds 50MB limit" },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Validate file size using S3 helper
    try {
      validateFileSize(buffer, 50); // 50MB max
    } catch (sizeError) {
      return NextResponse.json(
        { success: false, error: sizeError instanceof Error ? sizeError.message : "File too large" },
        { status: 400 }
      );
    }

    // Determine folder based on file type
    const folder = fileType === "image" ? "artifacts/images" : "artifacts/documents";

    // Upload file to S3
    const fileUrl = await uploadToS3(
      buffer,
      file.name,
      file.type,
      folder
    );

    const result: any = {
      url: fileUrl,
      name: file.name,
      type: file.type,
      size: file.size,
      uploadedAt: new Date().toISOString(),
    };

    // Process document with Upstage
    if (fileType === "document" && upstageService.isSupportedFileType(file.type)) {
      try {
        console.log(`Processing document with Upstage: ${file.name}`);
        
        const extractedContent = await upstageService.extractFromUrl(fileUrl);

        result.extractedContent = {
          text: extractedContent.text,
          html: extractedContent.html,
          tables: extractedContent.tables,
          metadata: extractedContent.metadata,
        };

        // Add images found in document
        if (extractedContent.images && extractedContent.images.length > 0) {
          result.extractedImages = extractedContent.images;
        }

        console.log(`Successfully processed document: ${file.name}`);
        console.log(`- Extracted text length: ${extractedContent.text.length}`);
        console.log(`- Found ${extractedContent.images?.length || 0} images`);
        console.log(`- Found ${extractedContent.tables?.length || 0} tables`);
      } catch (extractError) {
        console.error("Upstage extraction failed:", extractError);
        // Still return the file URL even if extraction fails
        result.extractionError = "Failed to extract document content";
      }
    }

    return NextResponse.json({
      success: true,
      file: result,
    });
  } catch (error) {
    console.error("File upload error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Upload failed",
      },
      { status: 500 }
    );
  }
}