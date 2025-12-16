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
}

const SESSION_STORAGE_KEY = "chat_search_mode"

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
}) => {
    const [isOpen, setIsOpen] = useState(false)
    const [selectedMode, setSelectedMode] = useState<"webSearch" | "research" | "chatWithAPI" | "dropbox" | null>(null)
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

    // Load from session storage on mount
    useEffect(() => {
        if (typeof window !== "undefined") {
            const savedMode = sessionStorage.getItem(SESSION_STORAGE_KEY)
            if (savedMode === "webSearch" || savedMode === "research" || savedMode === "chatWithAPI" || savedMode === "dropbox") {
                setSelectedMode(savedMode)
                // Notify parent of the saved mode
                if (savedMode === "webSearch") {
                    onWebSearch?.(true)
                } else if (savedMode === "research") {
                    onResearch?.(true)
                } else if (savedMode === "chatWithAPI") {
                    onChatWithAPI?.()
                } else if (savedMode === "dropbox") {
                    onDropbox?.(true)
                }
            }
        }
    }, [onWebSearch, onResearch, onChatWithAPI, onDropbox])

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
            // Save to session storage
            if (typeof window !== "undefined") {
                sessionStorage.setItem(SESSION_STORAGE_KEY, "dropbox")
            }
            onDropbox?.(true)
            toast.success('Dropbox enabled for this chat')
        } else {
            setSelectedMode(null)
            // Remove from session storage
            if (typeof window !== "undefined") {
                sessionStorage.removeItem(SESSION_STORAGE_KEY)
            }
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
        // Save to session storage
        if (typeof window !== "undefined") {
            sessionStorage.setItem(SESSION_STORAGE_KEY, "webSearch")
        }
        onWebSearch?.(true)
    }

    const handleResearch = () => {
        setSelectedMode("research")
        setIsOpen(false)
        // Save to session storage
        if (typeof window !== "undefined") {
            sessionStorage.setItem(SESSION_STORAGE_KEY, "research")
        }
        onResearch?.(true)
    }

    const handleRemoveMode = () => {
        const currentMode = selectedMode
        setSelectedMode(null)
        // Remove from session storage
        if (typeof window !== "undefined") {
            sessionStorage.removeItem(SESSION_STORAGE_KEY)
        }
        // Notify parent to disable the mode
        if (currentMode === "webSearch") {
            onWebSearch?.(false)
        } else if (currentMode === "research") {
            onResearch?.(false)
        } else if (currentMode === "dropbox") {
            onDropbox?.(false)
        }
        // Note: onChatWithAPI doesn't need to be called with false since it's a one-time action
    }


    const handleChatWithArtifact = () => {
        setIsOpen(false)
        onChatWithArtifact?.()
    }

    const handleChatWithAPI = () => {
        setSelectedMode("chatWithAPI")
        setIsOpen(false)
        // Save to session storage
        if (typeof window !== "undefined") {
            sessionStorage.setItem(SESSION_STORAGE_KEY, "chatWithAPI")
        }
        onChatWithAPI?.()
    }

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files
        if (files && files.length > 0) {
            const fileArray = Array.from(files)
            onFileSelect?.(fileArray)
        }
        // Reset input
        event.target.value = ""
    }

    return (
        <>
            <input
                ref={fileInputRef}
                type="file"
                accept="*/*"
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
                    <div className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm ${
                        selectedMode === "dropbox"
                            ? "border-blue-500 bg-blue-500/10"
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
                        ) : null}
                        <button
                            onClick={handleRemoveMode}
                            className={`ml-1 rounded-full disabled:opacity-50 disabled:cursor-not-allowed ${
                                selectedMode === "dropbox"
                                    ? "hover:bg-blue-500/20"
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

