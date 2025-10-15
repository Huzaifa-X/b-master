"use client";

import {
    ArrowDownIcon,
    ArrowUpIcon,
    CheckIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    CopyIcon,
    FileIcon,
    Mic,
    MicOff,
    PencilIcon,
    PlusIcon,
    RefreshCwIcon,
    Search,
    Sparkles,
    Square,
    X,
    Globe
} from "lucide-react";

import {
    ActionBarPrimitive,
    BranchPickerPrimitive,
    ComposerPrimitive,
    ErrorPrimitive,
    MessagePrimitive,
    ThreadPrimitive,
    useComposerRuntime,
} from "@assistant-ui/react";
import Image from "next/image";
import type { FC } from "react";
import React, { useState, useEffect, useRef } from "react";
import { LazyMotion, MotionConfig, domAnimation } from "motion/react";
import * as m from "motion/react-m";
import { TypewriterEffect } from "@/components/ui/typewriter-effect";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MarkdownText } from "@/components/assistant-ui/markdown-text";
import { ToolFallback } from "@/components/assistant-ui/tool-fallback";
import { TooltipIconButton } from "@/components/assistant-ui/tooltip-icon-button";
import {
    ComposerAddAttachment,
    ComposerAttachments,
    UserMessageAttachments,
} from "@/components/assistant-ui/attachment";
import ReactMarkdown from 'react-markdown'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';


import { cn } from "@/lib/utils";

export const Thread: FC = () => {
    return (
        <LazyMotion features={domAnimation}>
            <MotionConfig reducedMotion="user">
                <ThreadPrimitive.Root
                    className="aui-root aui-thread-root @container flex h-full flex-col bg-background"
                    style={{
                        ["--thread-max-width" as string]: "44rem",
                    }}
                >
                    <ThreadPrimitive.Viewport className="aui-thread-viewport relative flex flex-1 flex-col overflow-x-auto overflow-y-scroll px-4">
                        {/* Empty state - centered welcome and composer */}
                        <ThreadPrimitive.If empty>
                            <div className="flex h-full flex-col justify-center">
                                <ThreadWelcome />
                            </div>
                        </ThreadPrimitive.If>

                        {/* Non-empty state - messages with composer at bottom */}
                        <ThreadPrimitive.If empty={false}>
                            <ThreadPrimitive.Messages
                                components={{
                                    UserMessage,
                                    EditComposer,
                                    AssistantMessage,
                                }}
                            />
                            <div className="aui-thread-viewport-spacer min-h-8 grow" />
                            <Composer />
                        </ThreadPrimitive.If>
                    </ThreadPrimitive.Viewport>
                </ThreadPrimitive.Root>
            </MotionConfig>
        </LazyMotion>
    );
};

const ThreadScrollToBottom: FC = () => {
    return (
        <ThreadPrimitive.ScrollToBottom asChild>
            <TooltipIconButton
                tooltip="Scroll to bottom"
                variant="outline"
                className="aui-thread-scroll-to-bottom absolute -top-12 z-10 self-center rounded-full p-4 disabled:invisible dark:bg-background dark:hover:bg-accent"
            >
                <ArrowDownIcon />
            </TooltipIconButton>
        </ThreadPrimitive.ScrollToBottom>
    );
};

// Array of welcome messages (outside component to avoid re-creation)
const WELCOME_MESSAGES = [
    "How is it going, Huzaifa Tahir?",
    "Time to increase your knowledge, Huzaifa Tahir",
    "Ready to explore something new, Huzaifa Tahir?",
    "What brings you here today, Huzaifa Tahir?",
    "Let's make today productive, Huzaifa Tahir!",
    "Great to see you back, Huzaifa Tahir!",
    "What can I help you with, Huzaifa Tahir?",
    "Let's dive into something interesting, Huzaifa Tahir!",
];

const ThreadWelcome: FC = () => {
    // Use state to pick a random message on client side only
    const [randomMessage, setRandomMessage] = useState(WELCOME_MESSAGES[0]);

    useEffect(() => {
        // Pick random message after component mounts (client-side only)
        const message = WELCOME_MESSAGES[Math.floor(Math.random() * WELCOME_MESSAGES.length)];
        setRandomMessage(message);
    }, []);

    return (
        <div className="aui-thread-welcome-root mx-auto flex w-full max-w-[var(--thread-max-width)] flex-col items-center justify-center gap-4 px-2">
            {/* Logo */}
            <m.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.3 }}
                className="flex items-center justify-center"
            >
                <Image
                    src="/bmaster-logo.svg"
                    alt="B-Master Logo"
                    width={24}
                    height={24}
                    style={{ width: 'auto', height: '24px' }}
                    unoptimized
                    priority
                />
            </m.div>

            {/* Random Welcome Message */}
            <m.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ delay: 0.1 }}
                className="text-center w-full"
            >
                <TypewriterEffect
                    words={randomMessage.split(" ").map((word) => ({
                        text: word,
                        className: "text-2xl md:text-3xl font-light",
                    }))}
                    cursorClassName="hidden"
                />
            </m.div>

            {/* Composer */}
            <div className="w-full">
                <Composer />
            </div>

            {/* Suggestions - Commented for later */}
            {/* <ThreadSuggestions /> */}
        </div>
    );
};

const ThreadSuggestions: FC = () => {
    return (
        <div className="aui-thread-welcome-suggestions grid w-full gap-2 pb-4 @md:grid-cols-2">
            {[
                {
                    title: "What's the weather",
                    label: "in San Francisco?",
                    action: "What's the weather in San Francisco?",
                },
                {
                    title: "Explain React hooks",
                    label: "like useState and useEffect",
                    action: "Explain React hooks like useState and useEffect",
                },
                {
                    title: "Write a SQL query",
                    label: "to find top customers",
                    action: "Write a SQL query to find top customers",
                },
                {
                    title: "Create a meal plan",
                    label: "for healthy weight loss",
                    action: "Create a meal plan for healthy weight loss",
                },
            ].map((suggestedAction, index) => (
                <m.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    transition={{ delay: 0.05 * index }}
                    key={`suggested-action-${suggestedAction.title}-${index}`}
                    className="aui-thread-welcome-suggestion-display [&:nth-child(n+3)]:hidden @md:[&:nth-child(n+3)]:block"
                >
                    <ThreadPrimitive.Suggestion
                        prompt={suggestedAction.action}
                        send
                        asChild
                    >
                        <Button
                            variant="ghost"
                            className="aui-thread-welcome-suggestion h-auto w-full flex-1 flex-wrap items-start justify-start gap-1 rounded-3xl border px-5 py-4 text-left text-sm @md:flex-col dark:hover:bg-accent/60"
                            aria-label={suggestedAction.action}
                        >
                            <span className="aui-thread-welcome-suggestion-text-1 font-medium">
                                {suggestedAction.title}
                            </span>
                            <span className="aui-thread-welcome-suggestion-text-2 text-muted-foreground">
                                {suggestedAction.label}
                            </span>
                        </Button>
                    </ThreadPrimitive.Suggestion>
                </m.div>
            ))}
        </div>
    );
};

const Composer: FC = () => {
    const [showPreview, setShowPreview] = useState(false);
    const [inputValue, setInputValue] = useState('');

    const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
        const pastedText = e.clipboardData.getData('text/plain');

        const looksLikeCode =
            pastedText.includes('function') ||
            pastedText.includes('const ') ||
            pastedText.includes('import ') ||
            (pastedText.includes('{') && pastedText.includes('}')) ||
            pastedText.match(/^\s{2,}/gm);

        if (looksLikeCode && !pastedText.trim().startsWith('```')) {
            e.preventDefault();

            let language = '';
            if (pastedText.includes('function') || pastedText.includes('const')) {
                language = 'javascript';
            } else if (pastedText.includes('def ')) {
                language = 'python';
            }

            const wrappedCode = `\`\`\`${language}\n${pastedText}\n\`\`\``;

            const textarea = e.currentTarget;
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            const newValue =
                textarea.value.substring(0, start) +
                wrappedCode +
                textarea.value.substring(end);

            textarea.value = newValue;
            setInputValue(newValue);
            setShowPreview(true);

            const inputEvent = new Event('input', { bubbles: true });
            textarea.dispatchEvent(inputEvent);

            setTimeout(() => {
                textarea.setSelectionRange(start + wrappedCode.length, start + wrappedCode.length);
            }, 0);
        }
    };

    const handleInput = (e: React.FormEvent<HTMLTextAreaElement>) => {
        const value = e.currentTarget.value;
        setInputValue(value);
        setShowPreview(value.includes('```') || value.includes('**') || value.includes('#'));
    };

    return (
        <div className="aui-composer-wrapper sticky bottom-0 mx-auto flex w-full max-w-[var(--thread-max-width)] flex-col gap-4 overflow-visible rounded-t-3xl bg-background pb-4 md:pb-6">
            <ThreadScrollToBottom />
            <ComposerPrimitive.Root className="aui-composer-root relative flex w-full flex-col rounded-xl border border-primary/50 bg-muted px-1 pt-2 shadow-[0_0_100px_0px_hsl(var(--primary)),0_0_60px_0px_hsl(var(--primary)),0_0_30px_0px_hsl(var(--primary)),0_0_15px_0px_hsl(var(--primary))] dark:border-primary/60 dark:shadow-[0_0_120px_0px_hsl(var(--primary)),0_0_80px_0px_hsl(var(--primary)),0_0_40px_0px_hsl(var(--primary)),0_0_20px_0px_hsl(var(--primary))]">
                <ComposerAttachments />
                {/* Markdown Preview */}
                {showPreview && inputValue && (
                    <div className="mx-3.5 mb-2 max-h-48 overflow-y-auto rounded-lg border border-primary/30 bg-background/50 p-3 text-sm">
                        <div className="mb-1 text-xs font-medium text-muted-foreground">Preview:</div>
                        <div className="prose prose-sm dark:prose-invert max-w-none">
                            <ReactMarkdown
                                components={{
                                    code(props) {
                                        const { children, className, node, ...rest } = props
                                        const match = /language-(\w+)/.exec(className || '')
                                        return match ? (
                                            <SyntaxHighlighter
                                                PreTag="div"
                                                language={match[1]}
                                                style={vscDarkPlus as any}
                                            >
                                                {String(children).replace(/\n$/, '')}
                                            </SyntaxHighlighter>
                                        ) : (
                                            <code {...rest} className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono">
                                                {children}
                                            </code>
                                        )
                                    },
                                    h1: ({ children }) => <h1 className="text-lg font-bold mt-2 mb-1">{children}</h1>,
                                    h2: ({ children }) => <h2 className="text-base font-bold mt-2 mb-1">{children}</h2>,
                                    h3: ({ children }) => <h3 className="text-sm font-bold mt-1 mb-1">{children}</h3>,
                                }}
                            >
                                {inputValue}
                            </ReactMarkdown>
                        </div>
                    </div>
                )}

                <ComposerPrimitive.Input
                    value={inputValue}
                    onInput={handleInput}
                    onPaste={handlePaste}
                    placeholder="Send a message..."
                    className="aui-composer-input mb-1 max-h-32 min-h-16 w-full resize-none bg-transparent px-3.5 pt-1.5 pb-3 text-base outline-none placeholder:text-muted-foreground focus:outline-primary"
                    rows={1}
                    autoFocus
                    aria-label="Message input"
                />
                <ComposerAction />
            </ComposerPrimitive.Root>
        </div>
    );
};

const DictateButton: FC = () => {
    const [isListening, setIsListening] = useState(false);
    const [isMounted, setIsMounted] = useState(false);
    const [isSupported, setIsSupported] = useState(false);
    const recognitionRef = useRef<any>(null);
    const isListeningRef = useRef(false);
    const composerRuntime = useComposerRuntime();

    useEffect(() => {
        setIsMounted(true);

        if (typeof window !== "undefined") {
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

            if (SpeechRecognition) {
                setIsSupported(true);
                const recognition = new SpeechRecognition();
                recognition.continuous = true;
                recognition.interimResults = true;
                recognition.lang = "en-US";

                recognition.onresult = (event: any) => {
                    let finalTranscript = "";

                    for (let i = event.resultIndex; i < event.results.length; i++) {
                        const transcript = event.results[i][0].transcript;
                        if (event.results[i].isFinal) {
                            finalTranscript += transcript + " ";
                        }
                    }

                    if (finalTranscript) {
                        const currentText = composerRuntime.getState().text;
                        composerRuntime.setText(currentText + finalTranscript);
                    }
                };

                recognition.onerror = (event: any) => {
                    console.error("Speech recognition error:", event.error);
                    if (event.error !== 'no-speech' && event.error !== 'aborted') {
                        setIsListening(false);
                        isListeningRef.current = false;
                    }
                };

                recognition.onend = () => {
                    // Restart if user still wants to listen
                    if (isListeningRef.current) {
                        try {
                            recognition.start();
                        } catch (error) {
                            console.error("Error restarting recognition:", error);
                            setIsListening(false);
                            isListeningRef.current = false;
                        }
                    } else {
                        setIsListening(false);
                    }
                };

                recognitionRef.current = recognition;
            }
        }

        return () => {
            isListeningRef.current = false;
            if (recognitionRef.current) {
                try {
                    recognitionRef.current.stop();
                } catch (error) {
                    // Ignore errors on cleanup
                }
                recognitionRef.current = null;
            }
        };
    }, [])

    const toggleDictation = () => {
        if (!recognitionRef.current) return;

        if (isListening) {
            try {
                isListeningRef.current = false;
                recognitionRef.current.stop();
            } catch (error) {
                console.error("Error stopping recognition:", error);
            }
            setIsListening(false);
        } else {
            try {
                isListeningRef.current = true;
                recognitionRef.current.start();
                setIsListening(true);
            } catch (error) {
                console.error("Error starting recognition:", error);
                isListeningRef.current = false;
                setIsListening(false);
            }
        }
    };

    if (!isMounted || !isSupported) {
        return null;
    }

    return (
        <TooltipIconButton
            tooltip={isListening ? "Stop dictating" : "Start dictating"}
            side="bottom"
            type="button"
            variant={isListening ? "default" : "ghost"}
            size="icon"
            className={`aui-composer-dictate size-[34px] rounded-full p-1 ${isListening ? "bg-red-500 hover:bg-red-600" : ""}`}
            aria-label={isListening ? "Stop dictating" : "Start dictating"}
            onClick={toggleDictation}
        >
            {isListening ? <MicOff className="size-5" /> : <Mic className="size-5" />}
        </TooltipIconButton>
    );
};

const AttachmentDropdown: FC = () => {
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

const ComposerAction: FC = () => {
    return (
        <div className="aui-composer-action-wrapper relative mx-1 mt-2 mb-2 flex items-center justify-between">
            <AttachmentDropdown />

            <div className="flex items-center gap-2">
                <DictateButton />

                <ThreadPrimitive.If running={false}>
                    <ComposerPrimitive.Send asChild>
                        <TooltipIconButton
                            tooltip="Send message"
                            side="bottom"
                            type="submit"
                            variant="default"
                            size="icon"
                            className="aui-composer-send size-[34px] rounded-full p-1"
                            aria-label="Send message"
                        >
                            <ArrowUpIcon className="aui-composer-send-icon size-5" />
                        </TooltipIconButton>
                    </ComposerPrimitive.Send>
                </ThreadPrimitive.If>

                <ThreadPrimitive.If running>
                    <ComposerPrimitive.Cancel asChild>
                        <Button
                            type="button"
                            variant="default"
                            size="icon"
                            className="aui-composer-cancel size-[34px] rounded-full border border-muted-foreground/60 hover:bg-primary/75 dark:border-muted-foreground/90"
                            aria-label="Stop generating"
                        >
                            <Square className="aui-composer-cancel-icon size-3.5 fill-white dark:fill-black" />
                        </Button>
                    </ComposerPrimitive.Cancel>
                </ThreadPrimitive.If>
            </div>
        </div>
    );
};

const MessageError: FC = () => {
    return (
        <MessagePrimitive.Error>
            <ErrorPrimitive.Root className="aui-message-error-root mt-2 rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive dark:bg-destructive/5 dark:text-red-200">
                <ErrorPrimitive.Message className="aui-message-error-message line-clamp-2" />
            </ErrorPrimitive.Root>
        </MessagePrimitive.Error>
    );
};

const AssistantMessage: FC = () => {
    return (
        <MessagePrimitive.Root asChild>
            <div
                className="aui-assistant-message-root relative mx-auto w-full max-w-[var(--thread-max-width)] animate-in py-4 duration-150 ease-out fade-in slide-in-from-bottom-1 last:mb-24"
                data-role="assistant"
            >
                <div className="aui-assistant-message-content mx-2 leading-7 break-words text-foreground">
                    <MessagePrimitive.Parts
                        components={{
                            Text: MarkdownText,
                            tools: { Fallback: ToolFallback },
                        }}
                    />
                    <MessageError />
                </div>

                <div className="aui-assistant-message-footer mt-2 ml-2 flex">
                    <BranchPicker />
                    <AssistantActionBar />
                </div>
            </div>
        </MessagePrimitive.Root>
    );
};

const AssistantActionBar: FC = () => {
    return (
        <ActionBarPrimitive.Root
            hideWhenRunning
            autohide="not-last"
            autohideFloat="single-branch"
            className="aui-assistant-action-bar-root col-start-3 row-start-2 -ml-1 flex gap-1 text-muted-foreground data-floating:absolute data-floating:rounded-md data-floating:border data-floating:bg-background data-floating:p-1 data-floating:shadow-sm"
        >
            <ActionBarPrimitive.Copy asChild>
                <TooltipIconButton tooltip="Copy">
                    <MessagePrimitive.If copied>
                        <CheckIcon />
                    </MessagePrimitive.If>
                    <MessagePrimitive.If copied={false}>
                        <CopyIcon />
                    </MessagePrimitive.If>
                </TooltipIconButton>
            </ActionBarPrimitive.Copy>
            <ActionBarPrimitive.Reload asChild>
                <TooltipIconButton tooltip="Refresh">
                    <RefreshCwIcon />
                </TooltipIconButton>
            </ActionBarPrimitive.Reload>
        </ActionBarPrimitive.Root>
    );
};

const UserMessage: FC = () => {
    return (
        <MessagePrimitive.Root asChild>
            <div
                className="aui-user-message-root mx-auto grid w-full max-w-[var(--thread-max-width)] animate-in auto-rows-auto grid-cols-[minmax(72px,1fr)_auto] gap-y-2 px-2 py-4 duration-150 ease-out fade-in slide-in-from-bottom-1 first:mt-3 last:mb-5 [&:where(>*)]:col-start-2"
                data-role="user"
            >
                <UserMessageAttachments />

                <div className="aui-user-message-content-wrapper relative col-start-2 min-w-0">
                    <div className="aui-user-message-content rounded-3xl bg-muted px-5 py-2.5 break-words text-foreground">
                        <MessagePrimitive.Parts />
                    </div>
                    <div className="aui-user-action-bar-wrapper absolute top-1/2 left-0 -translate-x-full -translate-y-1/2 pr-2">
                        <UserActionBar />
                    </div>
                </div>

                <BranchPicker className="aui-user-branch-picker col-span-full col-start-1 row-start-3 -mr-1 justify-end" />
            </div>
        </MessagePrimitive.Root>
    );
};

const UserActionBar: FC = () => {
    return (
        <ActionBarPrimitive.Root
            hideWhenRunning
            autohide="not-last"
            className="aui-user-action-bar-root flex flex-col items-end"
        >
            <ActionBarPrimitive.Edit asChild>
                <TooltipIconButton tooltip="Edit" className="aui-user-action-edit p-4">
                    <PencilIcon />
                </TooltipIconButton>
            </ActionBarPrimitive.Edit>
        </ActionBarPrimitive.Root>
    );
};

const EditComposer: FC = () => {
    return (
        <div className="aui-edit-composer-wrapper mx-auto flex w-full max-w-[var(--thread-max-width)] flex-col gap-4 px-2 first:mt-4">
            <ComposerPrimitive.Root className="aui-edit-composer-root ml-auto flex w-full max-w-7/8 flex-col rounded-xl bg-muted">
                <ComposerPrimitive.Input
                    className="aui-edit-composer-input flex min-h-[60px] w-full resize-none bg-transparent p-4 text-foreground outline-none"
                    autoFocus
                />

                <div className="aui-edit-composer-footer mx-3 mb-3 flex items-center justify-center gap-2 self-end">
                    <ComposerPrimitive.Cancel asChild>
                        <Button variant="ghost" size="sm" aria-label="Cancel edit">
                            Cancel
                        </Button>
                    </ComposerPrimitive.Cancel>
                    <ComposerPrimitive.Send asChild>
                        <Button size="sm" aria-label="Update message">
                            Update
                        </Button>
                    </ComposerPrimitive.Send>
                </div>
            </ComposerPrimitive.Root>
        </div>
    );
};

const BranchPicker: FC<BranchPickerPrimitive.Root.Props> = ({
    className,
    ...rest
}) => {
    return (
        <BranchPickerPrimitive.Root
            hideWhenSingleBranch
            className={cn(
                "aui-branch-picker-root mr-2 -ml-2 inline-flex items-center text-xs text-muted-foreground",
                className,
            )}
            {...rest}
        >
            <BranchPickerPrimitive.Previous asChild>
                <TooltipIconButton tooltip="Previous">
                    <ChevronLeftIcon />
                </TooltipIconButton>
            </BranchPickerPrimitive.Previous>
            <span className="aui-branch-picker-state font-medium">
                <BranchPickerPrimitive.Number /> / <BranchPickerPrimitive.Count />
            </span>
            <BranchPickerPrimitive.Next asChild>
                <TooltipIconButton tooltip="Next">
                    <ChevronRightIcon />
                </TooltipIconButton>
            </BranchPickerPrimitive.Next>
        </BranchPickerPrimitive.Root>
    );
};
