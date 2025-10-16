"use client";

import { FileIcon, PlusIcon, Search, Sparkles, X, Globe } from "lucide-react";
import { useComposerRuntime } from "@assistant-ui/react";
import type { FC } from "react";
import { useState, useRef } from "react";
import * as m from "motion/react-m";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const AttachmentDropdown: FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedMode, setSelectedMode] = useState<"webSearch" | "research" | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const composerRuntime = useComposerRuntime();

    const handleAttachFile = () => {
        fileInputRef.current?.click();
    };

    const handleWebSearch = () => {
        setSelectedMode("webSearch");
        setIsOpen(false);
    };

    const handleResearch = () => {
        setSelectedMode("research");
        setIsOpen(false);
    };

    const handleRemoveMode = () => {
        setSelectedMode(null);
    };

    const handleChatWithArtifact = () => {
        // TODO: Implement chat with artifact functionality
        console.log("Chat with Artifact clicked");
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (files && files.length > 0) {
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                try {
                    await composerRuntime.addAttachment(file);
                } catch (error) {
                    console.error("Error adding file:", error);
                }
            }
        }
        // Reset input
        event.target.value = "";
    };

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
                            <m.div
                                key={isOpen ? "close" : "open"}
                                initial={{ rotate: -90, opacity: 0 }}
                                animate={{ rotate: 0, opacity: 1 }}
                                exit={{ rotate: 90, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                            >
                                {isOpen ? <X className="size-5" /> : <PlusIcon className="size-5" />}
                            </m.div>
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
    );
};

