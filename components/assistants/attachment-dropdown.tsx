// components/assistants/attachment-dropdown.tsx
"use client"

import { FileIcon, PlusIcon, X, Globe, Search, Sparkles, Code } from "lucide-react"
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
    selectedArtifact?: { id: string; name: string; instructions: string; htmlContent: string } | null
    onRemoveArtifact?: () => void
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
    selectedArtifact,
    onRemoveArtifact,
    webSearchEnabled = false,
    researchEnabled = false,
    chatWithAPIEnabled = false,
    dropboxEnabled = false,
}) => {
    const [isOpen, setIsOpen] = useState(false)
    const [selectedMode, setSelectedMode] = useState<"webSearch" | "research" | "chatWithAPI" | "dropbox" | "artifact" | null>(null)
    const [isCheckingDropbox, setIsCheckingDropbox] = useState(true)
    const [hasDropboxConnected, setHasDropboxConnected] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const DropboxIcon = ({ className }: { className?: string }) => (
        <svg viewBox="0 0 24 24" className={className} fill="currentColor">
            <path d="M6 1.807L0 5.629l6 3.822 6.001-3.822L6 1.807zM18 1.807l-6 3.822 6 3.822 6-3.822-6-3.822zM0 13.274l6 3.822 6.001-3.822L6 9.452 0 13.274zM18 9.452l-6 3.822 6 3.822 6-3.822-6-3.822zM6 18.371l6.001 3.822 6-3.822-6-3.822L6 18.371z" />
        </svg>
    )

    useEffect(() => {
        checkDropboxConnection()
    }, [])

    // Update selected mode when artifact prop changes
    useEffect(() => {
        if (selectedArtifact) {
            setSelectedMode("artifact")
        } else if (selectedMode === "artifact") {
            setSelectedMode(null)
        }
    }, [selectedArtifact])

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
        if (selectedArtifact) {
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
    }, [webSearchEnabled, researchEnabled, chatWithAPIEnabled, dropboxEnabled, selectedArtifact])

    // Note: ChatInput component now handles sessionStorage with assistant-scoped keys
    // This component just reflects the current state via props

    const checkDropboxConnection = async () => {
        setIsCheckingDropbox(true)
        try {
            const res = await fetch('/api/dropbox')
            const data = await res.json()
            const hasConnection = !!data.connector && data.connector.status === 'ACTIVE'
            setHasDropboxConnected(hasConnection)
        } catch (error) {
            console.error('Failed to check Dropbox connection:', error)
            setHasDropboxConnected(false)
        } finally {
            setIsCheckingDropbox(false)
        }
    }

    // Handle Dropbox click
    const handleDropboxClick = async () => {
        setIsOpen(false)

        // If not connected, redirect to OAuth
        if (!hasDropboxConnected) {
            toast.info('Connecting to Dropbox...')
            const currentUrl = encodeURIComponent(window.location.href)
            window.location.href = `/api/dropbox/connect?returnUrl=${currentUrl}`
            return
        }

        // Toggle Dropbox
        const newState = selectedMode !== "dropbox"
        if (newState) {
            setSelectedMode("dropbox")
            // Note: ChatInput handles sessionStorage internally
            onDropbox?.(true)
            toast.success('Dropbox enabled for this chat')
        } else {
            setSelectedMode(null)
            // Note: ChatInput handles sessionStorage internally
            onDropbox?.(false)
            toast.info('Dropbox disabled')
        }
    }

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
                    `Unsupported file type: ${invalidFiles.join(', ')}. Supported: Images (JPG, PNG, GIF, WebP), Documents (PDF, TXT, CSV, MD), Code files.`
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
                            aria-label="Add attachment"
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
                            <span>Attach File</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            onClick={handleWebSearch}
                            className="cursor-pointer hover:bg-muted hover:text-black focus:bg-muted focus:text-black"
                        >
                            <Globe className="mr-2 size-4" />
                            <span>Web Search</span>
                        </DropdownMenuItem>
                        {mode === "assistant" && (
                            <>
                                <DropdownMenuItem
                                    onClick={handleResearch}
                                    className="cursor-pointer hover:bg-muted hover:text-black focus:bg-muted focus:text-black"
                                >
                                    <Search className="mr-2 size-4" />
                                    <span>Research</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={handleChatWithArtifact}
                                    className="cursor-pointer hover:bg-muted hover:text-black focus:bg-muted focus:text-black"
                                >
                                    <Sparkles className="mr-2 size-4" />
                                    <span>Chat with Artifact</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={handleChatWithAPI}
                                    className="cursor-pointer hover:bg-muted hover:text-black focus:bg-muted focus:text-black"
                                >
                                    <Code className="mr-2 size-4" />
                                    <span>Chat with API</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={handleDropboxClick}
                                    disabled={isCheckingDropbox}
                                    className="cursor-pointer hover:bg-muted hover:text-black focus:bg-muted focus:text-black"
                                >
                                    <DropboxIcon className="mr-2 size-4" />
                                    <span>
                                        {isCheckingDropbox
                                            ? "Checking..."
                                            : hasDropboxConnected
                                                ? (selectedMode === "dropbox" ? "Disable Dropbox" : "Enable Dropbox")
                                                : "Connect Dropbox"
                                        }
                                    </span>
                                </DropdownMenuItem>
                            </>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>

                {selectedMode && (
                    <div className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm ${selectedMode === "dropbox"
                            ? "border-blue-500 bg-blue-500/10"
                            : selectedMode === "artifact"
                                ? "border-purple-500 bg-purple-500/10"
                                : "border-primary bg-primary/10"
                        }`}>
                        {selectedMode === "webSearch" ? (
                            <>
                                <Globe className="size-3.5" />
                                <span className="font-medium">Web Search</span>
                            </>
                        ) : selectedMode === "research" ? (
                            <>
                                <Search className="size-3.5" />
                                <span className="font-medium">Research</span>
                            </>
                        ) : selectedMode === "chatWithAPI" ? (
                            <>
                                <Code className="size-3.5" />
                                <span className="font-medium">Chat with API</span>
                            </>
                        ) : selectedMode === "dropbox" ? (
                            <>
                                <DropboxIcon className="size-3.5 text-blue-600" />
                                <span className="font-medium text-blue-600">Dropbox</span>
                            </>
                        ) : selectedMode === "artifact" ? (
                            <>
                                <Sparkles className="size-3.5 text-purple-600" />
                                <span className="font-medium text-purple-600 truncate max-w-[150px]">
                                    {selectedArtifact?.name || "Artifact"}
                                </span>
                            </>
                        ) : null}
                        <button
                            onClick={handleRemoveMode}
                            className={`ml-1 rounded-full disabled:opacity-50 disabled:cursor-not-allowed ${selectedMode === "dropbox"
                                    ? "hover:bg-blue-500/20"
                                    : selectedMode === "artifact"
                                        ? "hover:bg-purple-500/20"
                                        : "hover:bg-primary/20"
                                }`}
                            aria-label="Remove mode"
                            disabled={disabled}
                        >
                            <X className="size-3.5" />
                        </button>
                    </div>
                )}
            </div>
        </>
    )
}