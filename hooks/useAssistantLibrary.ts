"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  getAssistantLibrary,
  uploadLibraryFile,
  deleteLibraryFile,
  addLibraryUrl,
  addLibraryNote,
  getLibraryFilePresignedUrl,
  type LibraryFile,
} from "@/app/actions/library.action"
import { toast } from "sonner"

import { useLocale } from "@/lib/i18n"

// ---------------------------------------------------------------
// Fetch library files
// ---------------------------------------------------------------

export function useAssistantLibrary(assistantId: string | null | undefined) {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["assistant-library", assistantId],
    queryFn: async () => {
      if (!assistantId) throw new Error("No assistant ID")
      const result = await getAssistantLibrary(assistantId)
      if (!result.success) throw new Error(result.error ?? "Failed to load library")
      return { files: result.files ?? [], vectorStoreId: result.vectorStoreId }
    },
    enabled: !!assistantId,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  })

  return {
    files: data?.files ?? [],
    vectorStoreId: data?.vectorStoreId ?? null,
    isLoading,
    isError,
    error: error as Error | null,
    refetch,
  }
}

// ---------------------------------------------------------------
// Upload a file
// ---------------------------------------------------------------

export function useUploadLibraryFile(
  assistantId: string,
  options?: {
    onSuccess?: (file: LibraryFile) => void
    onError?: (error: string) => void
  }
) {
  const queryClient = useQueryClient()
  const { t } = useLocale()

  const mutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const result = await uploadLibraryFile(assistantId, formData)
      if (!result.success || !result.file) {
        throw new Error(result.error ?? t("library.uploadFailed"))
      }
      return result.file
    },
    onSuccess: (file) => {
      queryClient.invalidateQueries({ queryKey: ["assistant-library", assistantId] })
      toast.success(t("library.uploadSuccess", { name: file.name }))
      options?.onSuccess?.(file)
    },
    onError: (error: Error) => {
      toast.error(error.message)
      options?.onError?.(error.message)
    },
  })

  return {
    uploadFile: mutation.mutate,
    uploadFileAsync: mutation.mutateAsync,
    isUploading: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
  }
}

// ---------------------------------------------------------------
// Delete a file
// ---------------------------------------------------------------

export function useDeleteLibraryFile(
  assistantId: string,
  options?: {
    onSuccess?: () => void
  }
) {
  const queryClient = useQueryClient()
  const { t } = useLocale()

  const mutation = useMutation({
    mutationFn: async (kbEntryId: number) => {
      const result = await deleteLibraryFile(assistantId, kbEntryId)
      if (!result.success) throw new Error(result.error ?? t("library.deleteFailed"))
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assistant-library", assistantId] })
      toast.success(t("library.deleteSuccess"))
      options?.onSuccess?.()
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  return {
    deleteFile: mutation.mutate,
    deleteFileAsync: mutation.mutateAsync,
    isDeleting: mutation.isPending,
  }
}

// ---------------------------------------------------------------
// Add a URL
// ---------------------------------------------------------------

export function useAddLibraryUrl(
  assistantId: string,
  options?: {
    onSuccess?: (file: LibraryFile) => void
  }
) {
  const queryClient = useQueryClient()
  const { t } = useLocale()

  const mutation = useMutation({
    mutationFn: async (url: string) => {
      const result = await addLibraryUrl(assistantId, url)
      if (!result.success || !result.file) {
        throw new Error(result.error ?? t("library.addUrlFailed"))
      }
      return result.file
    },
    onSuccess: (file) => {
      queryClient.invalidateQueries({ queryKey: ["assistant-library", assistantId] })
      toast.success(t("library.addUrlSuccess"))
      options?.onSuccess?.(file)
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  return {
    addUrl: mutation.mutate,
    addUrlAsync: mutation.mutateAsync,
    isAdding: mutation.isPending,
  }
}

// ---------------------------------------------------------------
// Add a Note
// ---------------------------------------------------------------

export function useAddLibraryNote(
  assistantId: string,
  options?: {
    onSuccess?: (file: LibraryFile) => void
  }
) {
  const queryClient = useQueryClient()
  const { t } = useLocale()

  const mutation = useMutation({
    mutationFn: async ({ title, content }: { title: string; content: string }) => {
      const result = await addLibraryNote(assistantId, title, content)
      if (!result.success || !result.file) {
        throw new Error(result.error ?? t("library.addNoteFailed"))
      }
      return result.file
    },
    onSuccess: (file) => {
      queryClient.invalidateQueries({ queryKey: ["assistant-library", assistantId] })
      toast.success(t("library.addNoteSuccess"))
      options?.onSuccess?.(file)
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  return {
    addNote: mutation.mutate,
    addNoteAsync: mutation.mutateAsync,
    isAdding: mutation.isPending,
  }
}

// ---------------------------------------------------------------
// Get presigned URL for preview / download
// ---------------------------------------------------------------

export function useLibraryFilePresignedUrl() {
  const { t } = useLocale()
  const mutation = useMutation({
    mutationFn: async ({
      assistantId,
      kbEntryId,
    }: {
      assistantId: string
      kbEntryId: number
    }) => {
      const result = await getLibraryFilePresignedUrl(assistantId, kbEntryId)
      if (!result.success || !result.url) {
        throw new Error(result.error ?? t("library.getUrlFailed"))
      }
      return result.url
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  return {
    getPresignedUrl: mutation.mutateAsync,
    isLoading: mutation.isPending,
  }
}
