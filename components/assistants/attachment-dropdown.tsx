"use client"

import { FileIcon, PlusIcon, X, Globe, Search, Sparkles } from "lucide-react"
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

interface AttachmentDropdownProps {
    onFileSelect?: (files: File[]) => void
    onWebSearch?: (enabled: boolean) => void
    onResearch?: (enabled: boolean) => void
    onChatWithArtifact?: () => void
}

const SESSION_STORAGE_KEY = "chat_search_mode"

export const AttachmentDropdown: FC<AttachmentDropdownProps> = ({
    onFileSelect,
    onWebSearch,
    onResearch,
    onChatWithArtifact,
}) => {
    const [isOpen, setIsOpen] = useState(false)
    const [selectedMode, setSelectedMode] = useState<"webSearch" | "research" | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    // Load from session storage on mount
    useEffect(() => {
        if (typeof window !== "undefined") {
            const savedMode = sessionStorage.getItem(SESSION_STORAGE_KEY)
            if (savedMode === "webSearch" || savedMode === "research") {
                setSelectedMode(savedMode)
                // Notify parent of the saved mode
                if (savedMode === "webSearch") {
                    onWebSearch?.(true)
                } else if (savedMode === "research") {
                    onResearch?.(true)
                }
            }
        }
    }, [onWebSearch, onResearch])

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
        setSelectedMode(null)
        // Remove from session storage
        if (typeof window !== "undefined") {
            sessionStorage.removeItem(SESSION_STORAGE_KEY)
        }
        onWebSearch?.(false)
        onResearch?.(false)
    }

    const handleChatWithArtifact = () => {
        setIsOpen(false)
        onChatWithArtifact?.()
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
                    </DropdownMenuContent>
                </DropdownMenu>

                {selectedMode && (
                    <div className="flex items-center gap-1.5 rounded-full border border-primary bg-primary/10 px-3 py-1.5 text-sm">
                        {selectedMode === "webSearch" ? (
                            <>
                                <Globe className="size-3.5" />
                                <span className="font-medium">Web Search</span>
                            </>
                        ) : (
                            <>
                                <Search className="size-3.5" />
                                <span className="font-medium">Research</span>
                            </>
                        )}
                        <button
                            onClick={handleRemoveMode}
                            className="ml-1 rounded-full hover:bg-primary/20"
                            aria-label="Remove mode"
                        >
                            <X className="size-3.5" />
                        </button>
                    </div>
                )}
            </div>
        </>
    )
}

