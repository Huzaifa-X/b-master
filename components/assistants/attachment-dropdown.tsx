// components/assistants/attachment-dropdown.tsx
"use client"

import { FileIcon, PlusIcon, X, Globe, Search, Sparkles } from "lucide-react"
import type { ArtifactData } from "@/components/assistants/select-artifact-dialog"
import type { FC } from "react"
import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { motion } from "motion/react"
import { toast } from "sonner"
import { useLocale } from "@/lib/i18n"

interface AttachmentDropdownProps {
    onFileSelect?: (files: File[]) => void
    onWebSearch?: (enabled: boolean) => void
    onResearch?: (enabled: boolean) => void
    onChatWithArtifact?: () => void
    onChatWithAPI?: () => void
    onDropbox?: (enabled: boolean) => void
    disabled?: boolean
    mode?: "ask-b" | "assistant"
    assistantId?: string
    selectedArtifacts?: ArtifactData[]
    /** Called with an artifact id to remove that one, or no args to clear all */
    onRemoveArtifact?: (id?: string) => void
    // Mode state props to sync with parent
    webSearchEnabled?: boolean
    researchEnabled?: boolean
    chatWithAPIEnabled?: boolean
    dropboxEnabled?: boolean
}

export const AttachmentDropdown: FC<AttachmentDropdownProps> = ({
    onFileSelect,
    onWebSearch,
    onResearch,
    onChatWithArtifact,
    onChatWithAPI,
    onDropbox,
    disabled = false,
    mode = "assistant",
    assistantId,
    selectedArtifacts = [],
    onRemoveArtifact,
    webSearchEnabled = false,
    researchEnabled = false,
    chatWithAPIEnabled = false,
    dropboxEnabled = false,
}) => {
    const { t } = useLocale()
    const [isOpen, setIsOpen] = useState(false)
    const [selectedMode, setSelectedMode] = useState<"webSearch" | "research" | "chatWithAPI" | "dropbox" | "artifact" | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    // Update selected mode when artifact props change
    useEffect(() => {
        if (selectedArtifacts && selectedArtifacts.length > 0) {
            setSelectedMode("artifact")
        } else if (selectedMode === "artifact") {
            setSelectedMode(null)
        }
    }, [selectedArtifacts])

    // Sync internal state with parent component mode props
    useEffect(() => {
        console.log("[AttachmentDropdown] Syncing mode state:", {
            webSearchEnabled,
            researchEnabled,
            chatWithAPIEnabled,
            dropboxEnabled,
            currentSelectedMode: selectedMode
        })

        // Priority order: artifact > specific modes
        if (selectedArtifacts && selectedArtifacts.length > 0) {
            // Artifact takes precedence
            if (selectedMode !== "artifact") {
                setSelectedMode("artifact")
            }
        } else if (webSearchEnabled) {
            if (selectedMode !== "webSearch") {
                console.log("[AttachmentDropdown] Setting mode to webSearch")
                setSelectedMode("webSearch")
            }
        } else if (researchEnabled) {
            if (selectedMode !== "research") {
                console.log("[AttachmentDropdown] Setting mode to research")
                setSelectedMode("research")
            }
        } else if (chatWithAPIEnabled) {
            if (selectedMode !== "chatWithAPI") {
                console.log("[AttachmentDropdown] Setting mode to chatWithAPI")
                setSelectedMode("chatWithAPI")
            }
        } else if (dropboxEnabled) {
            if (selectedMode !== "dropbox") {
                console.log("[AttachmentDropdown] Setting mode to dropbox")
                setSelectedMode("dropbox")
            }
        } else {
            // No mode enabled, clear selection
            if (selectedMode !== null) {
                console.log("[AttachmentDropdown] Clearing mode")
                setSelectedMode(null)
            }
        }
    }, [webSearchEnabled, researchEnabled, chatWithAPIEnabled, dropboxEnabled, selectedArtifacts])

    // Note: ChatInput component now handles sessionStorage with assistant-scoped keys
    // This component just reflects the current state via props

    const handleAttachFile = () => {
        fileInputRef.current?.click()
        setIsOpen(false)
    }

    const handleWebSearch = () => {
        setSelectedMode("webSearch")
        setIsOpen(false)
        // Note: ChatInput handles sessionStorage internally
        onWebSearch?.(true)
    }

    const handleResearch = () => {
        setSelectedMode("research")
        setIsOpen(false)
        // Note: ChatInput handles sessionStorage internally
        onResearch?.(true)
    }

    const handleRemoveMode = () => {
        const currentMode = selectedMode
        setSelectedMode(null)

        // Note: ChatInput handles sessionStorage cleanup internally

        // Notify parent to disable the mode
        if (currentMode === "webSearch") {
            onWebSearch?.(false)
        } else if (currentMode === "research") {
            onResearch?.(false)
        } else if (currentMode === "dropbox") {
            onDropbox?.(false)
        } else if (currentMode === "artifact") {
            // clear all artifacts
            onRemoveArtifact?.()
        }
    }


    const handleChatWithArtifact = () => {
        setIsOpen(false)
        onChatWithArtifact?.()
    }

    const handleChatWithAPI = () => {
        setSelectedMode("chatWithAPI")
        setIsOpen(false)
        // Note: ChatInput handles sessionStorage internally
        onChatWithAPI?.()
    }

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files
        if (files && files.length > 0) {
            const fileArray = Array.from(files)

            // Validate file types
            const allowedTypes = new Set([
                // Images (OpenAI supported formats only)
                'image/jpeg',
                'image/png',
                'image/gif',
                'image/webp',
                // Documents
                'application/pdf',
                'text/plain',
                'text/csv',
                'text/markdown',
                'text/html',
                'application/msword',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'application/vnd.ms-excel',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'application/vnd.ms-powerpoint',
                'application/vnd.openxmlformats-officedocument.presentationml.presentation',
                'application/rtf',
                'application/json',
                'text/javascript',
                'application/javascript',
            ])

            const allowedExtensions = new Set([
                // Images
                'jpg', 'jpeg', 'png', 'gif', 'webp',
                // Documents
                'pdf', 'txt', 'csv', 'md', 'html', 'doc', 'docx',
                'xls', 'xlsx', 'ppt', 'pptx', 'rtf',
                // Code
                'json', 'js', 'ts', 'jsx', 'tsx', 'py', 'java', 'c', 'cpp', 'cs', 'rb', 'go', 'rs'
            ])

            const invalidFiles: string[] = []
            const validFiles: File[] = []

            fileArray.forEach(file => {
                const extension = file.name.split('.').pop()?.toLowerCase()
                const isValidType = allowedTypes.has(file.type)
                const isValidExtension = extension && allowedExtensions.has(extension)

                // Explicitly reject SVG files
                if (file.type === 'image/svg+xml' || extension === 'svg') {
                    invalidFiles.push(`${file.name} (SVG not supported)`)
                } else if (isValidType || isValidExtension) {
                    validFiles.push(file)
                } else {
                    invalidFiles.push(file.name)
                }
            })

            // Show error for invalid files
            if (invalidFiles.length > 0) {
                toast.error(
                    t("chat.errors.unsupportedFileType", { files: invalidFiles.join(', ') })
                )
            }

            // Only pass valid files to parent
            if (validFiles.length > 0) {
                onFileSelect?.(validFiles)
            }
        }
        // Reset input
        event.target.value = ""
    }

    return (
        <>
            <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp,.jpg,.jpeg,.png,.gif,.webp,.pdf,.txt,.csv,.md,.html,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.rtf,.json,.js,.ts,.jsx,.tsx,.py,.java,.c,.cpp,.cs,.rb,.go,.rs"
                className="hidden"
                onChange={handleFileChange}
                multiple
            />
            <div className="flex items-center gap-2">
                <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="size-[34px] rounded-full hover:bg-white hover:text-black focus:bg-muted focus:text-black"
                            aria-label={t("chat.input.addAttachment")}
                            disabled={disabled}
                        >
                            <motion.div
                                key={isOpen ? "close" : "open"}
                                initial={{ rotate: -90, opacity: 0 }}
                                animate={{ rotate: 0, opacity: 1 }}
                                exit={{ rotate: 90, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                            >
                                {isOpen ? <X className="size-5" /> : <PlusIcon className="size-5" />}
                            </motion.div>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-56">
                        <DropdownMenuItem
                            onClick={handleAttachFile}
                            className="cursor-pointer hover:bg-muted hover:text-black focus:bg-muted focus:text-black"
                        >
                            <FileIcon className="mr-2 size-4" />
                            <span>{t("chat.input.attachFile")}</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            onClick={handleWebSearch}
                            className="cursor-pointer hover:bg-muted hover:text-black focus:bg-muted focus:text-black"
                        >
                            <Globe className="mr-2 size-4" />
                            <span>{t("chat.input.webSearch")}</span>
                        </DropdownMenuItem>
                        {mode === "assistant" && (
                            <>
                                <DropdownMenuItem
                                    onClick={handleResearch}
                                    className="cursor-pointer hover:bg-muted hover:text-black focus:bg-muted focus:text-black"
                                >
                                    <Search className="mr-2 size-4" />
                                    <span>{t("chat.input.research")}</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={handleChatWithArtifact}
                                    className="cursor-pointer hover:bg-muted hover:text-black focus:bg-muted focus:text-black"
                                >
                                    <Sparkles className="mr-2 size-4" />
                                    <span>{t("chat.input.chatWithArtifact")}</span>
                                </DropdownMenuItem>


                            </>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>

                {/* Non-artifact single-mode badge */}
                {selectedMode && selectedMode !== "artifact" && (
                    <div className="flex items-center gap-1.5 rounded-full border border-primary bg-primary/10 px-3 py-1.5 text-sm">
                        {selectedMode === "webSearch" ? (
                            <>
                                <Globe className="size-3.5" />
                                <span className="font-medium">{t("chat.input.webSearch")}</span>
                            </>
                        ) : selectedMode === "research" ? (
                            <>
                                <Search className="size-3.5" />
                                <span className="font-medium">{t("chat.input.research")}</span>
                            </>
                        ) : null}
                        <button
                            onClick={handleRemoveMode}
                            className="ml-1 rounded-full hover:bg-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
                            aria-label={t("chat.input.removeMode")}
                            disabled={disabled}
                        >
                            <X className="size-3.5" />
                        </button>
                    </div>
                )}

                {/* Per-artifact badges — each has its own remove button */}
                {selectedArtifacts && selectedArtifacts.length > 0 && selectedArtifacts.map((artifact) => (
                    <div
                        key={artifact.id}
                        className="flex items-center gap-1.5 rounded-full border border-purple-500 bg-purple-500/10 px-3 py-1.5 text-sm"
                    >
                        <Sparkles className="size-3.5 text-purple-600 flex-shrink-0" />
                        <span className="font-medium text-purple-600 truncate max-w-[130px]">
                            {artifact.name}
                        </span>
                        <button
                            onClick={() => onRemoveArtifact?.(artifact.id)}
                            className="ml-0.5 rounded-full hover:bg-purple-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                            aria-label={t("chat.input.removeArtifact", { name: artifact.name })}
                            disabled={disabled}
                        >
                            <X className="size-3.5 text-purple-600" />
                        </button>
                    </div>
                ))}
            </div>
        </>
    )
}