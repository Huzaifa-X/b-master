// app/api/artifact/upload/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { uploadToS3, validateFileSize } from "@/lib/aws-s3";
import upstageService from "@/lib/services/upstageService";

export const runtime = "nodejs";
export const maxDuration = 300; // 5 minutes timeout for large document processing (100+ pages)

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

    const contentType = request.headers.get("content-type");
    let file: File | null = null;
    let fileName: string = "";
    let fileType: "image" | "document" = "document";
    let buffer: Buffer;

    // Handle both FormData and JSON (base64) formats
    let detectedMimeType: string = "";

    if (contentType?.includes("application/json")) {
      // JSON format with base64 data
      const body = await request.json();
      const { fileName: name, fileData, contentType: mimeType } = body;

      if (!name || !fileData) {
        return NextResponse.json(
          { success: false, error: "fileName and fileData are required" },
          { status: 400 }
        );
      }

      fileName = name;
      detectedMimeType = mimeType || "application/octet-stream";

      // Determine file type
      if (detectedMimeType.startsWith("image/")) {
        fileType = "image";
      } else {
        fileType = "document";
      }

      // Extract base64 data (handle both data:type;base64,data and plain base64)
      const base64Data = fileData.includes(",")
        ? fileData.split(",")[1]
        : fileData;

      buffer = Buffer.from(base64Data, "base64");
    } else {
      // FormData format
      const formData = await request.formData();
      file = formData.get("file") as File;
      const type = formData.get("type") as "image" | "document";

      if (!file) {
        return NextResponse.json(
          { success: false, error: "No file provided" },
          { status: 400 }
        );
      }

      fileName = file.name;
      detectedMimeType = file.type;
      fileType = type || (file.type.startsWith("image/") ? "image" : "document");

      // Convert file to buffer
      const arrayBuffer = await file.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
    }

    // Validate file size (50MB limit)
    const MAX_FILE_SIZE = 50 * 1024 * 1024;
    if (buffer.length > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: "File size exceeds 50MB limit" },
        { status: 400 }
      );
    }

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

    // Use the detected MIME type (fallback to default if not set)
    const finalMimeType = detectedMimeType || (fileType === "image" ? "image/png" : "application/octet-stream");

    console.log(`[Upload] File: ${fileName}, Type: ${fileType}, MIME: ${finalMimeType}`);

    // Upload file to S3
    const fileUrl = await uploadToS3(
      buffer,
      fileName,
      finalMimeType,
      folder
    );

    const result: any = {
      url: fileUrl,
      name: fileName,
      type: finalMimeType,
      size: buffer.length,
      uploadedAt: new Date().toISOString(),
    };

    // Process document with Upstage
    console.log(`[Upload] Checking Upstage eligibility - fileType: ${fileType}, supported: ${upstageService.isSupportedFileType(finalMimeType)}`);

    if (fileType === "document" && upstageService.isSupportedFileType(finalMimeType)) {
      try {
        console.log(`[Upload] ✓ Processing document with Upstage: ${fileName} (${finalMimeType})`);
        console.log(`[Upload] File URL: ${fileUrl}`);

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

        console.log(`Successfully processed document: ${fileName}`);
        console.log(`- Extracted text length: ${extractedContent.text.length}`);
        console.log(`- Found ${extractedContent.images?.length || 0} images`);
        console.log(`- Found ${extractedContent.tables?.length || 0} tables`);
      } catch (extractError) {
        console.error("[Upload] Upstage extraction failed:", extractError);
        // Still return the file URL even if extraction fails
        result.extractionError = "Failed to extract document content";
      }
    } else {
      console.log(`[Upload] ⊗ Skipping Upstage - fileType: ${fileType}, MIME: ${finalMimeType}, isSupported: ${upstageService.isSupportedFileType(finalMimeType)}`);
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