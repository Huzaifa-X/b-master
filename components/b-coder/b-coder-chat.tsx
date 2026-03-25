"use client"

import { useState, useRef, useEffect, useCallback, memo } from "react"
import Link from "next/link"
import { Loader2, FileCode, Terminal, CheckCircle2, Sparkles, Paperclip, X, FileText, Image, Upload } from "lucide-react"
import {
    Message,
    MessageContent,
    MessageResponse
} from "@/components/ai-elements/message"
import {
    Attachment,
    AttachmentPreview,
    AttachmentRemove,
    Attachments,
} from "@/components/ai-elements/attachments"
import {
    PromptInput,
    PromptInputTextarea,
    PromptInputSubmit,
    usePromptInputAttachments,
} from "@/components/ai-elements/prompt-input"
import { DictateButton } from "@/components/assistants/dictate-button"
import { useResponsesChat } from "@/hooks/useResponsesChat"
import { useBCoderContext } from "./b-coder-context"
import { BoltMessageParser, BoltActionData } from "@/lib/runtime/message-parser"
import { toast } from "sonner"
import { fetchGithubRepo } from "@/app/actions/github.action"
import { useArtifactById } from "@/hooks/useArtifact"
import { useLocale } from "@/lib/i18n"


interface BCoderChatProps {
    assistantId: string
    templateId: string
    artifactId?: string | null
}

interface FileUpdate {
    path: string
    type: 'file' | 'shell'
    status: 'pending' | 'done'
}

interface AttachedFile {
    id: string
    name: string
    url: string
    mediaType: string
    status: 'uploading' | 'ready' | 'error'
    errorMsg?: string
}

// Filter out boltArtifact/boltAction XML and extract clean text
function filterDisplayContent(content: string): string {
    // Remove boltArtifact blocks entirely
    let filtered = content.replace(/<boltArtifact[^>]*>[\s\S]*?<\/boltArtifact>/g, '')
    // Also remove partial/unclosed artifacts during streaming
    filtered = filtered.replace(/<boltArtifact[^>]*>[\s\S]*/g, '')
    // Remove any remaining boltAction tags
    filtered = filtered.replace(/<boltAction[^>]*>[\s\S]*?<\/boltAction>/g, '')
    filtered = filtered.replace(/<boltAction[^>]*>[\s\S]*/g, '')
    // Clean up extra whitespace
    filtered = filtered.replace(/\n{3,}/g, '\n\n').trim()
    return filtered
}

// Extract file paths from content for display
function extractFilePaths(content: string): string[] {
    const paths: string[] = []
    const fileMatches = content.matchAll(/<boltAction[^>]*type="file"[^>]*filePath="([^"]+)"[^>]*>/g)
    for (const match of fileMatches) {
        if (match[1] && !paths.includes(match[1])) {
            paths.push(match[1])
        }
    }
    return paths
}

// Extract the artifact title the model gave to its work
function extractArtifactTitle(content: string): string | null {
    const match = content.match(/<boltArtifact[^>]*title="([^"]+)"[^>]*>/)
    return match ? match[1] : null
}

export function BCoderChat({ assistantId: _assistantId, templateId, artifactId }: BCoderChatProps) {
    const viewportRef = useRef<HTMLDivElement>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([])
    const [fileUpdates, setFileUpdates] = useState<Map<string, FileUpdate[]>>(new Map())
    const [artifactTitles, setArtifactTitles] = useState<Map<string, string>>(new Map())

    const {
        writeFile,
        runCommand,
        buildFileTree,
        fileStructure,
        selectedFilePath,
        getCurrentFileContent,
        isServerReady,
        webcontainerInstance,
        createFile,
        setActiveArtifact,
        exportFilesAsJson,
        readFile,
        pushFileVersion
    } = useBCoderContext()

    const [input, setInput] = useState("")
    const [currentFileContent, setCurrentFileContent] = useState<string | null>(null)
    const [filesReady, setFilesReady] = useState(false)
    const [filesError, setFilesError] = useState<string | null>(null)
    const { t } = useLocale()


    const { artifact } = useArtifactById(artifactId || "", { enabled: !!artifactId })
    const [hasImported, setHasImported] = useState(false)

    useEffect(() => {
        if (!artifact || !isServerReady || hasImported) return;

        const importArtifact = async () => {
            setHasImported(true);
            try {
                let instructionsObj;
                try {
                    instructionsObj = JSON.parse(artifact.instructions);
                } catch (e) {
                    // Not JSON
                }

                if (instructionsObj && instructionsObj.owner && instructionsObj.repo) {
                    setActiveArtifact({
                        id: artifact.id,
                        name: artifact.name,
                        instructions: artifact.instructions,
                        category: artifact.category || "Deployed Project"
                    });

                    const toastId = toast.loading(t("bCoder.importingFromGithub", { repo: instructionsObj.repo }));
                    const result = await fetchGithubRepo(instructionsObj.owner, instructionsObj.repo);
                    if (result.success && result.data) {
                        toast.loading(t("bCoder.writingFilesToWorkspace", { count: Object.keys(result.data.files).length }), { id: toastId });
                        for (const [path, content] of Object.entries(result.data.files)) {
                            await writeFile(path, content);
                        }
                        await buildFileTree();
                        toast.success(t("bCoder.successfullyImported", { repo: instructionsObj.repo }), { id: toastId });
                        setInput(t("bCoder.importSuccessMsg", { repo: instructionsObj.repo }));
                    } else {
                        toast.error(t("bCoder.failedToImport", { error: result.error }), { id: toastId });
                    }
                }
            } catch (err: any) {
                toast.error(t("bCoder.errorImportingArtifact", { error: err.message }));
            }

        };

        importArtifact();
    }, [artifact, isServerReady, hasImported, setActiveArtifact, writeFile, buildFileTree]);

    const fileStructureRef = useRef(fileStructure)
    const currentFileContentRef = useRef(currentFileContent)
    const selectedFilePathRef = useRef(selectedFilePath)
    const currentFilesRef = useRef<Record<string, string> | null>(null)

    useEffect(() => {
        fileStructureRef.current = fileStructure
    }, [fileStructure])

    // Export files immediately when server is ready (for initial load)
    // This ensures currentFilesRef is populated before the user sends their first message
    const hasInitializedFilesRef = useRef(false)
    useEffect(() => {
        if (!isServerReady || hasInitializedFilesRef.current) return

        const initializeFiles = async (retryCount = 0): Promise<void> => {
            const MAX_RETRIES = 3
            const RETRY_DELAY = 1000 // 1 second

            try {
                setFilesError(null)
                const files = await exportFilesAsJson()

                // Validate that we got actual files
                if (!files || Object.keys(files).length === 0) {
                    throw new Error('No files exported from workspace')
                }

                currentFilesRef.current = files
                hasInitializedFilesRef.current = true
                setFilesReady(true)
                console.log('[BCoderChat] Initial files exported:', Object.keys(files).length, 'files')
            } catch (err) {
                console.warn(`[BCoderChat] Failed to export initial files (attempt ${retryCount + 1}/${MAX_RETRIES}):`, err)

                if (retryCount < MAX_RETRIES - 1) {
                    // Retry after delay
                    await new Promise(resolve => setTimeout(resolve, RETRY_DELAY))
                    return initializeFiles(retryCount + 1)
                } else {
                    // Max retries reached - set error but allow user to proceed
                    // The backend has fallback logic to use template files
                    setFilesError(t("bCoder.workspaceError"))
                    setFilesReady(true) // Allow sending, backend will use fallback
                    console.error('[BCoderChat] Max retries reached for file export')
                }

            }
        }

        initializeFiles()
    }, [isServerReady, exportFilesAsJson])

    // Update current files cache when file structure changes (debounced for subsequent updates)
    useEffect(() => {
        if (!isServerReady || fileStructure.length === 0) return
        // Skip if this is the initial load (already handled above)
        if (!hasInitializedFilesRef.current) return

        const updateCurrentFiles = async () => {
            try {
                const files = await exportFilesAsJson()
                if (files && Object.keys(files).length > 0) {
                    currentFilesRef.current = files
                    setFilesError(null) // Clear any previous error
                    console.log('[BCoderChat] Files updated:', Object.keys(files).length, 'files')
                }
            } catch (err) {
                console.warn('[BCoderChat] Failed to export files for context:', err)
                // Don't clear currentFilesRef - keep the last known good state
            }
        }

        // Debounce subsequent updates to avoid excessive calls (reduced from 500ms to 200ms)
        const timeoutId = setTimeout(updateCurrentFiles, 200)
        return () => clearTimeout(timeoutId)
    }, [isServerReady, fileStructure, exportFilesAsJson])

    useEffect(() => {
        if (isServerReady && fileStructure.length === 0) {
            buildFileTree()
        }
    }, [isServerReady, fileStructure.length, buildFileTree])

    useEffect(() => {
        currentFileContentRef.current = currentFileContent
    }, [currentFileContent])

    useEffect(() => {
        selectedFilePathRef.current = selectedFilePath
    }, [selectedFilePath])

    useEffect(() => {
        const loadFileContent = async () => {
            if (selectedFilePath && isServerReady) {
                const content = await getCurrentFileContent()
                setCurrentFileContent(content)
            } else {
                setCurrentFileContent(null)
            }
        }
        loadFileContent()
    }, [selectedFilePath, getCurrentFileContent, isServerReady])

    const {
        messages,
        sendMessage,
        status,
        error,
    } = useResponsesChat({
        api: '/api/b-coder/chat',
        getExtraBody: () => {
            const extraBody = {
                templateId,
                fileStructure: fileStructureRef.current,
                currentFile: selectedFilePathRef.current ? {
                    path: selectedFilePathRef.current,
                    content: currentFileContentRef.current,
                } : null,
                currentFiles: currentFilesRef.current,
            }
            // Debug log to verify files are being sent
            console.log('[BCoderChat] Sending message with context:', {
                templateId,
                hasFileStructure: !!fileStructureRef.current?.length,
                hasCurrentFile: !!extraBody.currentFile,
                hasCurrentFiles: !!extraBody.currentFiles,
                currentFilesCount: extraBody.currentFiles ? Object.keys(extraBody.currentFiles).length : 0
            })
            return extraBody
        },
    })

    const handleAction = useCallback(async (action: BoltActionData, messageId: string) => {
        try {
            if (action.type === 'file' && action.filePath) {
                // Mark as pending
                setFileUpdates(prev => {
                    const newMap = new Map(prev)
                    const updates = newMap.get(messageId) || []
                    const existingIndex = updates.findIndex(u => u.path === action.filePath && u.type === 'file')
                    if (existingIndex === -1) {
                        updates.push({ path: action.filePath!, type: 'file', status: 'pending' })
                    }
                    newMap.set(messageId, updates)
                    return newMap
                })

                // Smart Rollback: Save current version before overwriting
                try {
                    const currentContent = await readFile(action.filePath)
                    if (currentContent) {
                        pushFileVersion(action.filePath, currentContent)
                    }
                } catch {
                    // File doesn't exist yet, no version to save
                }

                await writeFile(action.filePath, action.content)
                await buildFileTree()

                // Mark as done
                setFileUpdates(prev => {
                    const newMap = new Map(prev)
                    const updates = newMap.get(messageId) || []
                    const update = updates.find(u => u.path === action.filePath && u.type === 'file')
                    if (update) update.status = 'done'
                    newMap.set(messageId, updates)
                    return newMap
                })
            } else if (action.type === 'shell') {
                setFileUpdates(prev => {
                    const newMap = new Map(prev)
                    const updates = newMap.get(messageId) || []
                    updates.push({ path: action.content.slice(0, 50), type: 'shell', status: 'pending' })
                    newMap.set(messageId, updates)
                    return newMap
                })

                await runCommand(action.content)

                setFileUpdates(prev => {
                    const newMap = new Map(prev)
                    const updates = newMap.get(messageId) || []
                    const update = updates.find(u => u.type === 'shell' && u.status === 'pending')
                    if (update) update.status = 'done'
                    newMap.set(messageId, updates)
                    return newMap
                })
            }
        } catch {
            // Silently handle errors
        }
    }, [writeFile, runCommand, buildFileTree, readFile, pushFileVersion])

    const handleActionRef = useRef(handleAction)
    useEffect(() => {
        handleActionRef.current = handleAction
    }, [handleAction])

    const parserRef = useRef<BoltMessageParser | null>(null)
    const processedRef = useRef<{ id: string, length: number } | null>(null)

    useEffect(() => {
        const lastMessage = messages[messages.length - 1]
        if (!lastMessage || lastMessage.role !== 'assistant') return

        if (processedRef.current?.id !== lastMessage.id) {
            const messageId = lastMessage.id
            parserRef.current = new BoltMessageParser(
                undefined,
                undefined,
                undefined,
                (action) => handleActionRef.current(action, messageId)
            )
            processedRef.current = { id: lastMessage.id, length: 0 }
        }

        // Assistant messages from useResponsesChat have a flat string `content`
        const content = typeof lastMessage.content === 'string' ? lastMessage.content : ''

        const newContent = content.slice(processedRef.current?.length || 0)

        if (newContent.length > 0) {
            parserRef.current?.parse(newContent)
            processedRef.current!.length = content.length
        }

        // Extract and store the artifact title for this message
        const title = extractArtifactTitle(content)
        if (title) {
            setArtifactTitles(prev => {
                if (prev.get(lastMessage.id) === title) return prev
                const next = new Map(prev)
                next.set(lastMessage.id, title)
                return next
            })
        }
    }, [messages])

    const isLoading = status === 'streaming' || status === 'submitted'

    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setInput(e.target.value)
    }

    const uploadFiles = useCallback(async (files: FileList) => {
        const newEntries: AttachedFile[] = Array.from(files).map(f => ({
            id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
            name: f.name,
            url: '',
            mediaType: f.type,
            status: 'uploading',
        }))
        setAttachedFiles(prev => [...prev, ...newEntries])

        await Promise.all(
            Array.from(files).map(async (file, i) => {
                const entry = newEntries[i]
                try {
                    const fd = new FormData()
                    fd.append('file', file)
                    const res = await fetch('/api/b-coder/upload', { method: 'POST', body: fd })
                    const data = await res.json()
                    if (!res.ok) throw new Error(data.error || 'Upload failed')
                    setAttachedFiles(prev => prev.map(f =>
                        f.id === entry.id ? { ...f, url: data.url, status: 'ready' } : f
                    ))
                } catch (err: any) {
                    setAttachedFiles(prev => prev.map(f =>
                        f.id === entry.id ? { ...f, status: 'error', errorMsg: err.message } : f
                    ))
                }
            })
        )
    }, [])

    const removeAttachment = useCallback((id: string) => {
        setAttachedFiles(prev => prev.filter(f => f.id !== id))
    }, [])

    const scrollToBottom = useCallback(() => {
        requestAnimationFrame(() => {
            viewportRef.current?.scrollTo({
                top: viewportRef.current.scrollHeight,
                behavior: 'smooth',
            })
        })
    }, [])

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        const readyFiles = attachedFiles.filter(f => f.status === 'ready')
        if (!input.trim() && readyFiles.length === 0) return
        if (isLoading) return
        if (!filesReady) return // Block sending until files are loaded

        if (readyFiles.length > 0) {
            // Build multi-part content: text + image/PDF parts
            const parts: any[] = []
            if (input.trim()) parts.push({ type: 'text', text: input.trim() })
            for (const f of readyFiles) {
                if (f.mediaType === 'application/pdf') {
                    parts.push({ type: 'file', url: f.url, mediaType: 'application/pdf', filename: f.name })
                } else {
                    parts.push({ type: 'image', image: f.url })
                }
            }
            sendMessage({ parts })
        } else {
            sendMessage({ text: input.trim() })
        }

        setInput('')
        setAttachedFiles([])
        scrollToBottom()
    }



    return (
        <div className="h-full flex flex-col mx-auto w-full max-w-[44rem]">
            <div ref={viewportRef} className="flex-1 overflow-y-auto px-4 py-6">
                {messages.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="text-center space-y-4 max-w-md">
                            <div className="relative mx-auto w-16 h-16">
                                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 blur-2xl rounded-full" />
                                <div className="relative bg-gradient-to-br from-emerald-500 to-cyan-500 p-4 rounded-2xl">
                                    <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                                    </svg>
                                </div>
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold mb-2">{t("bCoder.welcomeTitle")}</h3>
                                <p className="text-sm text-muted-foreground">
                                    {t("bCoder.welcomeDescription")}
                                </p>
                            </div>

                        </div>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {messages.map((msg: any) => {
                            // useResponsesChat: assistant messages have flat string content,
                            // user messages have flat content + optional parts array.
                            const rawContent = typeof msg.content === 'string' ? msg.content : ''

                            const isAssistant = msg.role === 'assistant'
                            const displayContent = isAssistant ? filterDisplayContent(rawContent) : rawContent
                            const filePaths = isAssistant ? extractFilePaths(rawContent) : []
                            const updates = fileUpdates.get(msg.id) || []
                            const artifactTitle = isAssistant ? artifactTitles.get(msg.id) : undefined
                            const isCurrentlyStreaming = isLoading && msg === messages[messages.length - 1]
                            const allDone = updates.length > 0 && updates.every(u => u.status === 'done')

                            // Extract attachment parts from user messages
                            const attachmentParts = (!isAssistant && msg.parts && Array.isArray(msg.parts))
                                ? msg.parts.filter((p: any) => p.type === 'image' || p.type === 'file')
                                : []

                            return (
                                <Message key={msg.id} from={msg.role}>
                                    {/* Attachments sit OUTSIDE the bubble, above the text */}
                                    {attachmentParts.length > 0 && (
                                        <div className="ml-auto flex flex-col gap-2 max-w-[85%]">
                                            {/* Images row */}
                                            {attachmentParts.filter((p: any) => p.type === 'image').length > 0 && (
                                                <div className="flex flex-wrap gap-2 justify-end">
                                                    {attachmentParts.filter((p: any) => p.type === 'image').map((part: any, idx: number) => {
                                                        const s3Url = typeof part.image === 'string' ? part.image : ''
                                                        // Proxy through our server to avoid S3 CORS / private-bucket issues
                                                        const proxySrc = s3Url
                                                            ? `/api/b-coder/image-proxy?url=${encodeURIComponent(s3Url)}`
                                                            : ''
                                                        return (
                                                            <Link
                                                                key={idx}
                                                                href={s3Url}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="block rounded-2xl overflow-hidden border border-border shadow-sm hover:shadow-md transition-shadow"
                                                            >
                                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                                <img
                                                                    src={proxySrc}
                                                                    alt="Attached image"
                                                                    className="max-h-52 max-w-[240px] w-auto h-auto object-cover"
                                                                />
                                                            </Link>
                                                        )
                                                    })}
                                                </div>
                                            )}
                                            {/* PDF chips row */}
                                            {attachmentParts.filter((p: any) => p.type === 'file').length > 0 && (
                                                <div className="flex flex-wrap gap-2 justify-end">
                                                    {attachmentParts.filter((p: any) => p.type === 'file').map((part: any, idx: number) => (
                                                        <Link
                                                            key={idx}
                                                            href={typeof part.data === 'string' ? part.data : '#'}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="flex items-center gap-2 px-3 py-2 rounded-xl border border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 text-xs font-medium hover:bg-amber-100 dark:hover:bg-amber-950/50 transition-colors"
                                                        >
                                                            <FileText className="h-3.5 w-3.5 shrink-0" />
                                                            <span className="truncate max-w-[160px]">
                                                                {part.filename || 'Document.pdf'}
                                                            </span>
                                                        </Link>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    <MessageContent>
                                        {/* Message text */}
                                        {displayContent ? (
                                            <MessageResponse>{displayContent}</MessageResponse>
                                        ) : isCurrentlyStreaming ? (
                                            <div className="flex items-center gap-2 text-muted-foreground">
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                <span className="text-sm">{t("bCoder.generating")}</span>
                                            </div>
                                        ) : null}


                                        {/* Agent activity summary card */}
                                        {(artifactTitle || filePaths.length > 0 || updates.length > 0) && (
                                            <div className="mt-3 rounded-xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/60 dark:bg-emerald-950/20 overflow-hidden">
                                                {/* Header: what the agent did */}
                                                <div className="flex items-center gap-2 px-3 py-2 border-b border-emerald-200/70 dark:border-emerald-800/40">
                                                    {allDone ? (
                                                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                                                    ) : (
                                                        <Sparkles className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                                                    )}
                                                    <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 truncate">
                                                        {artifactTitle ?? (allDone ? t("bCoder.changesApplied") : t("bCoder.applyingChanges"))}
                                                    </span>
                                                    {!allDone && updates.length > 0 && (

                                                        <Loader2 className="h-3 w-3 animate-spin text-emerald-500 ml-auto shrink-0" />
                                                    )}
                                                </div>

                                                {/* File / shell action rows */}
                                                <div className="px-2 py-1.5 space-y-1">
                                                    {updates.map((update, idx) => (
                                                        <div
                                                            key={`${update.path}-${idx}`}
                                                            className="flex items-center gap-2 text-xs px-2 py-1.5 rounded-md"
                                                        >
                                                            {update.type === 'file' ? (
                                                                <FileCode className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                                            ) : (
                                                                <Terminal className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                                            )}
                                                            <span className="font-mono text-[11px] text-emerald-700 dark:text-emerald-300 truncate">
                                                                {update.type === 'file' ? update.path : `$ ${update.path}`}
                                                            </span>
                                                            {update.status === 'pending' ? (
                                                                <Loader2 className="h-3 w-3 animate-spin text-emerald-400 ml-auto shrink-0" />
                                                            ) : (
                                                                <CheckCircle2 className="h-3 w-3 text-emerald-500 ml-auto shrink-0" />
                                                            )}
                                                        </div>
                                                    ))}
                                                    {/* Files detected in stream but not yet actioned */}
                                                    {filePaths.filter(fp => !updates.some(u => u.path === fp)).map((filePath) => (
                                                        <div
                                                            key={filePath}
                                                            className="flex items-center gap-2 text-xs px-2 py-1.5 rounded-md"
                                                        >
                                                            <FileCode className="h-3.5 w-3.5 text-emerald-400 dark:text-emerald-500 shrink-0" />
                                                            <span className="font-mono text-[11px] text-emerald-600 dark:text-emerald-400 truncate">
                                                                {filePath}
                                                            </span>
                                                            <Loader2 className="h-3 w-3 animate-spin text-emerald-400 ml-auto shrink-0" />
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </MessageContent>
                                </Message>
                            )
                        })}

                        {isLoading && messages[messages.length - 1]?.role === "user" && (
                            <Message from="assistant">
                                <MessageContent>
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        <span className="text-sm">{t("bCoder.thinking")}</span>
                                    </div>

                                </MessageContent>
                            </Message>
                        )}

                        {error && (
                            <Message from="assistant">
                                <MessageContent>
                                    <div className="text-red-500 text-sm p-2 bg-red-50 dark:bg-red-950 rounded">
                                        {t("bCoder.errorTitle")}: {error.message || t("bCoder.somethingWentWrong")}
                                    </div>

                                </MessageContent>
                            </Message>
                        )}
                    </div>
                )}
            </div>

            <div className="sticky bottom-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-4">
                <BCoderInput
                    input={input}
                    handleInputChange={handleInputChange}
                    handleSubmit={handleSubmit}
                    isLoading={isLoading}
                    attachedFiles={attachedFiles}
                    fileInputRef={fileInputRef}
                    onFilesSelected={uploadFiles}
                    onRemoveAttachment={removeAttachment}
                    assistantId={_assistantId}
                    filesReady={filesReady}
                    filesError={filesError}
                />
            </div>
        </div>
    )
}

function BCoderInput({
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    attachedFiles,
    fileInputRef,
    onFilesSelected,
    onRemoveAttachment,
    assistantId,
    filesReady,
    filesError
}: {
    input: string
    handleInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
    handleSubmit: (e: React.FormEvent) => void
    isLoading: boolean
    attachedFiles: AttachedFile[]
    fileInputRef: React.RefObject<HTMLInputElement | null>
    onFilesSelected: (files: FileList) => void
    onRemoveAttachment: (id: string) => void
    assistantId: string
    filesReady: boolean
    filesError: string | null
}) {
    const { t } = useLocale()
    const [isDragging, setIsDragging] = useState(false)

    const dragCounterRef = useRef(0)

    const handleDictate = useCallback((text: string) => {
        const syntheticEvent = {
            target: { value: text }
        } as React.ChangeEvent<HTMLTextAreaElement>
        handleInputChange(syntheticEvent)
    }, [handleInputChange])

    const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            onFilesSelected(e.target.files)
            // Reset input so the same file can be re-selected if removed
            e.target.value = ''
        }
    }, [onFilesSelected])

    const handleDragEnter = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        dragCounterRef.current++
        if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
            setIsDragging(true)
        }
    }, [])

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        dragCounterRef.current--
        if (dragCounterRef.current === 0) {
            setIsDragging(false)
        }
    }, [])

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
    }, [])

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setIsDragging(false)
        dragCounterRef.current = 0

        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            // Filter for accepted file types
            const acceptedTypes = ['image/', 'application/pdf']
            const validFiles = Array.from(e.dataTransfer.files).filter(file =>
                acceptedTypes.some(type => file.type.startsWith(type))
            )

            if (validFiles.length > 0) {
                // Create a FileList-like object
                const dt = new DataTransfer()
                validFiles.forEach(file => dt.items.add(file))
                onFilesSelected(dt.files)
            }
        }
    }, [onFilesSelected])

    return (
        <div
            className="relative w-full max-w-4xl mx-auto space-y-2"
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
        >
            {/* Drag overlay */}
            {isDragging && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-emerald-50/95 dark:bg-emerald-950/95 border-2 border-dashed border-emerald-500 rounded-3xl backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="flex flex-col items-center gap-3 text-emerald-600 dark:text-emerald-400">
                        <div className="p-2 bg-emerald-100 dark:bg-emerald-900/50 rounded-full">
                            <Upload className="h-4 w-4" />
                        </div>
                        <div className="text-center">
                            <p className="font-semibold text-sm sm:text-md">{t("bCoder.dropFilesHere")}</p>
                            <p className="text-xs sm:text-sm text-emerald-500 dark:text-emerald-500">{t("bCoder.supportedFormats")}</p>
                        </div>

                    </div>
                </div>
            )}
            {/* Hidden file input */}
            <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept="image/*,application/pdf"
                multiple
                onChange={handleFileInputChange}
            />

            {/* Attachment chips — rendered ABOVE the input box */}
            {attachedFiles.length > 0 && (
                <div className="flex flex-wrap gap-2 px-1 animate-in fade-in slide-in-from-bottom-1 duration-200">
                    {attachedFiles.map(f => (
                        <div
                            key={f.id}
                            className={`group relative flex items-center gap-2 rounded-xl px-3 py-2 border text-xs font-medium shadow-sm max-w-[220px] transition-all ${f.status === 'error'
                                ? 'bg-red-50 border-red-200 text-red-600 dark:bg-red-950/40 dark:border-red-800 dark:text-red-400'
                                : f.status === 'uploading'
                                    ? 'bg-muted border-border text-muted-foreground'
                                    : 'bg-white dark:bg-zinc-900 border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300 shadow-emerald-100/50 dark:shadow-emerald-950/20'
                                }`}
                        >
                            {/* Icon / spinner */}
                            {f.status === 'uploading' ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0 text-muted-foreground" />
                            ) : f.mediaType === 'application/pdf' ? (
                                <FileText className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                            ) : (
                                <Image className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                            )}

                            {/* Label */}
                            <span className="truncate max-w-[140px]">
                                {f.status === 'uploading'
                                    ? t("bCoder.uploading", { name: f.name })
                                    : f.status === 'error'
                                        ? t("bCoder.failedToUpload", { name: f.name })
                                        : f.name}
                            </span>


                            {/* Remove button */}
                            <button
                                type="button"
                                onClick={() => onRemoveAttachment(f.id)}
                                className="shrink-0 flex items-center justify-center h-4 w-4 rounded-full bg-black/10 dark:bg-white/10 hover:bg-black/20 dark:hover:bg-white/20 transition-colors"
                                title={t("bCoder.remove")}

                            >
                                <X className="h-2.5 w-2.5" />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Input box */}
            <div className="relative">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500/10 via-cyan-500/10 to-emerald-500/10 rounded-3xl blur-xl opacity-50" />

                <div className="relative">
                    <PromptInput
                        className="border-input bg-background rounded-3xl border shadow-sm transition-all hover:shadow-md focus-within:shadow-lg focus-within:ring-2 focus-within:ring-emerald-500/20 focus-within:border-emerald-500/50"
                        onSubmit={(message, e) => handleSubmit(e)}
                        multiple
                        maxFiles={10}
                        accept="image/*,video/*,.pdf,.doc,.docx,.txt"
                    >
                        <PromptInputTextarea
                            placeholder={t("bCoder.placeholder")}
                            className="min-h-[60px] pr-32 text-[15px] leading-relaxed"

                            onChange={handleInputChange}
                            value={input}
                            autoFocus
                        />

                        <div className="absolute right-2 bottom-2 flex items-center gap-2">
                            {/* Loading indicator when files aren't ready */}
                            {!filesReady && (
                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                </div>
                            )}
                            {/* Attachment button */}
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isLoading || !filesReady}
                                className="flex items-center justify-center h-[34px] w-[34px] rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-40"
                                title={t("bCoder.attachTooltip")}
                            >

                                <Paperclip className="h-4 w-4" />
                            </button>
                            <DictateButton
                                onTranscript={handleDictate}
                                disabled={isLoading || !filesReady}
                            />
                            <PromptInputSubmit
                                status={isLoading ? "streaming" : "ready"}
                                disabled={!filesReady || (!input && attachedFiles.filter(f => f.status === 'ready').length === 0 && !isLoading)}
                                className="size-[34px] rounded-full bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-700 hover:to-cyan-700 text-white transition-all duration-200"
                            />
                        </div>
                    </PromptInput>
                </div>
            </div>

            <div className="mt-2 px-1 text-center space-y-1">
                {filesError && (
                    <div className="text-xs text-amber-600 dark:text-amber-400">
                        ⚠️ {filesError}
                    </div>
                )}
                <span className="text-xs text-muted-foreground/50">
                    {t("bCoder.inputHintPrefix")}{" "}
                    <kbd className="px-1.5 py-0.5 text-[10px] font-semibold bg-muted border border-border rounded">{t("bCoder.inputHintEnter")}</kbd>{" "}
                    {t("bCoder.inputHintToSend")} •{" "}
                    <kbd className="px-1.5 py-0.5 text-[10px] font-semibold bg-muted border border-border rounded">{t("bCoder.inputHintShift")}</kbd> +{" "}
                    <kbd className="px-1.5 py-0.5 text-[10px] font-semibold bg-muted border border-border rounded">{t("bCoder.inputHintEnter")}</kbd>{" "}
                    {t("bCoder.inputHintNewLine")}
                </span>


            </div>

        </div>
    )
}
