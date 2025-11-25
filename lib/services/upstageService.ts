// lib/services/upstageService.ts
import FormData from "form-data";
import fetch from "node-fetch";

export interface UpstageExtractedContent {
  text: string;
  html: string;
  images?: Array<{
    id: string;
    coordinates?: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
    page: number;
  }>;
  tables?: Array<{
    base64: string;
    page: number;
    coordinates?: any;
  }>;
  metadata?: {
    pages: number;
  };
}

export interface UpstageResponse {
  content: {
    text?: string;
    html?: string;
    markdown?: string;
  };
  elements?: Array<{
    id: string;
    type: string;
    category?: string;
    page: number;
    coordinates?: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
    html?: string;
    text?: string;
    base64_encoding?: string;
  }>;
  api?: {
    pages: number;
    model?: string;
  };
}

class UpstageService {
  private apiKey: string;
  private baseUrl: string = "https://api.upstage.ai/v1/document-ai/document-parse";

  constructor() {
    this.apiKey = process.env.UPSTAGE_API_KEY || "";

    if (!this.apiKey) {
      throw new Error("UPSTAGE_API_KEY is not configured in environment variables");
    }
  }

  /**
   * Extract content from a document URL
   */
  async extractFromUrl(documentUrl: string): Promise<UpstageExtractedContent> {
    try {
      // Validate URL
      if (!documentUrl || typeof documentUrl !== 'string') {
        throw new Error('Invalid document URL provided');
      }

      // Check if it's a blob URL (which won't work on server-side)
      if (documentUrl.startsWith('blob:')) {
        throw new Error(
          'Blob URLs are not supported. Files must be uploaded to S3 first. ' +
          'This is a client-side URL that cannot be accessed from the server.'
        );
      }

      console.log(`[Upstage] Downloading document from: ${documentUrl}`);
      
      // Download the file first using node-fetch
      const fileResponse = await fetch(documentUrl);
      if (!fileResponse.ok) {
        throw new Error(`Failed to download file: ${fileResponse.statusText}`);
      }

      const arrayBuffer = await fileResponse.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const blob = new Blob([arrayBuffer]);

      console.log(`[Upstage] File downloaded, size: ${buffer.byteLength} bytes`);

      return await this.extractFromBlob(blob, this.getFileNameFromUrl(documentUrl));
    } catch (error) {
      console.error("Upstage URL extraction error:", error);
      throw error;
    }
  }

  /**
   * Extract content from a Blob/File
   */
  async extractFromBlob(
    blob: Blob,
    fileName: string = "document.pdf"
  ): Promise<UpstageExtractedContent> {
    try {
      console.log(`[Upstage] Starting extraction for: ${fileName}`);
      
      const formData = new FormData();

      // Convert Blob to Buffer for form-data
      const buffer = Buffer.from(await blob.arrayBuffer());
      formData.append("document", buffer, {
        filename: fileName,
        contentType: blob.type || "application/pdf",
      });

      // Configure output formats
      formData.append("output_formats", JSON.stringify(["html", "text"]));

      // Request base64 encoding for tables and charts
      formData.append("base64_encoding", JSON.stringify(["table", "chart"]));

      // Enable OCR
      formData.append("ocr", "auto");

      // Get coordinates for element positioning
      formData.append("coordinates", "true");

      console.log("[Upstage] Sending request to API...");

      // Use node-fetch with FormData (NOT native fetch)
      const response = await fetch(this.baseUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          ...formData.getHeaders(),
        },
        body: formData as any, // FormData from 'form-data' package
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[Upstage] API Error Response:`, errorText);
        throw new Error(`Upstage API error: ${response.status} - ${errorText}`);
      }

      const data = (await response.json()) as UpstageResponse;
      console.log(`[Upstage] Successfully extracted content from: ${fileName}`);

      return this.processUpstageResponse(data);
    } catch (error) {
      console.error("[Upstage] Extraction error:", error);
      throw error;
    }
  }

  /**
   * Process Upstage API response into structured format
   */
  private processUpstageResponse(data: UpstageResponse): UpstageExtractedContent {
    console.log(`[Upstage] Processing API response...`);
    
    const result: UpstageExtractedContent = {
      text: data.content?.text || "",
      html: data.content?.html || "",
      images: [],
      tables: [],
      metadata: {
        pages: data.api?.pages || 0, // Fix 1: Provide default value
      },
    };

    console.log(`[Upstage] Extracted ${result.text.length} characters of text`);
    console.log(`[Upstage] Total pages: ${result.metadata?.pages || 0}`); // Fix 1: Use optional chaining

    // Process elements to extract images and tables
    if (data.elements && Array.isArray(data.elements)) {
      console.log(`[Upstage] Processing ${data.elements.length} elements...`);
      
      data.elements.forEach((element) => {
        // Extract images
        if (element.category === "figure" || element.type === "image") {
          result.images?.push({
            id: element.id,
            coordinates: element.coordinates,
            page: element.page,
          });
        }

        // Extract tables with base64 encoding
        if ((element.category === "table" || element.type === "table") && element.base64_encoding) {
          result.tables?.push({
            base64: element.base64_encoding,
            page: element.page,
            coordinates: element.coordinates,
          });
        }
      });

      console.log(`[Upstage] Found ${result.images?.length || 0} images`);
      console.log(`[Upstage] Found ${result.tables?.length || 0} tables`);
    }

    return result;
  }

  /**
   * Extract file name from URL
   */
  private getFileNameFromUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      const fileName = pathname.split("/").pop() || "document.pdf";
      return decodeURIComponent(fileName);
    } catch {
      return "document.pdf";
    }
  }

  /**
   * Check if file type is supported by Upstage
   */
  isSupportedFileType(mimeType: string): boolean {
    const supportedTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/msword",
      "image/png",
      "image/jpeg",
      "image/jpg",
      "image/webp",
      "image/bmp",
      "image/tiff",
      "text/plain",
    ];

    return supportedTypes.includes(mimeType.toLowerCase());
  }

  /**
   * Get file extension from mime type
   */
  getFileExtension(mimeType: string): string {
    const extensionMap: Record<string, string> = {
      "application/pdf": ".pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
      "application/msword": ".doc",
      "image/png": ".png",
      "image/jpeg": ".jpg",
      "image/jpg": ".jpg",
      "image/webp": ".webp",
      "text/plain": ".txt",
    };

    return extensionMap[mimeType.toLowerCase()] || "";
  }
}

// Export singleton instance
const upstageService = new UpstageService();
export default upstageService;