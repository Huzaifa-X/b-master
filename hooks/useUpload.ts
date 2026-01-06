"use client"

import { useMutation } from "@tanstack/react-query"
import { uploadFileToS3 } from "@/app/actions/upload.action"
import { toast } from "sonner"

interface UploadResult {
    success: boolean
    url: string
    fileName: string
    fileSize: number
    error?: string
}

interface UseUploadFileToS3Options {
    onSuccess?: (result: UploadResult) => void
    onError?: (error: string) => void
}

/**
 * Hook to upload files to S3 using React Query mutation
 * @param options - Optional callbacks for success and error handling
 */
export function useUploadFileToS3(options?: UseUploadFileToS3Options) {
    const mutation = useMutation({
        mutationFn: async (formData: FormData) => {
            const result = await uploadFileToS3(formData)

            if (!result.success) {
                throw new Error(result.error || "Failed to upload file")
            }

            return result as UploadResult
        },
        onSuccess: (result) => {
            // Call custom success callback
            options?.onSuccess?.(result)
        },
        onError: (error: Error) => {
            // Show error toast
            toast.error(error.message || "Failed to upload file")

            // Call custom error callback
            options?.onError?.(error.message)
        },
    })

    return {
        uploadFile: mutation.mutate,
        uploadFileAsync: mutation.mutateAsync,
        isUploading: mutation.isPending,
        isError: mutation.isError,
        error: mutation.error,
        isSuccess: mutation.isSuccess,
    }
}
