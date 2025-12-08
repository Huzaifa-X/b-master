export interface UploadOptions {
    folder?: string
    makePublic?: boolean
    cacheControl?: string
    metadata?: Record<string, string>
}

export interface S3File {
    buffer: Buffer
    fileName: string
    contentType: string
}

export interface S3UploadResult {
    url: string
    key: string
    bucket: string
}