"use client";

import { ComposerPrimitive, useComposerRuntime } from "@assistant-ui/react";
import type { FC } from "react";
import React, { useState, useEffect } from "react";
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { ComposerAttachments } from "@/components/assistant-ui/attachment";
import { ThreadScrollToBottom } from "./thread-scroll-to-bottom";
import { ComposerAction } from "./composer-action";
import { useRouter } from "next/navigation";

// Create an inner component that can use useComposerRuntime
const ComposerContent: FC = () => {
    const [showPreview, setShowPreview] = useState(false);
    const composerRuntime = useComposerRuntime();
    const router = useRouter();
    // Subscribe to composer runtime state changes
    const [inputValue, setInputValue] = useState('');
    
    useEffect(() => {
        // Subscribe to composer text changes
        const unsubscribe = composerRuntime.subscribe(() => {
            const text = composerRuntime.getState().text;
            setInputValue(text);
            setShowPreview(text.includes('```') || text.includes('**') || text.includes('#'));
        });
        
        // Initial sync
        setInputValue(composerRuntime.getState().text);
        
        return unsubscribe;
    }, [composerRuntime]);

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

            const currentText = composerRuntime.getState().text;
            const textarea = e.currentTarget;
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            const newValue =
                currentText.substring(0, start) +
                wrappedCode +
                currentText.substring(end);

            composerRuntime.setText(newValue);

            setTimeout(() => {
                textarea.setSelectionRange(start + wrappedCode.length, start + wrappedCode.length);
            }, 0);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        // Enter key without Shift = Send message
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            composerRuntime.send();
            router.push("/ask-b");
        }
        // Shift+Enter = New line (default behavior, no need to handle)
    };

    return (
        <>
            <ComposerAttachments />
            {/* Markdown Preview */}
            {showPreview && inputValue && (
                <div className="mx-3.5 mb-2 max-h-48 overflow-y-auto rounded-lg border border-primary/30 bg-background/50 p-3 text-sm">
                    <div className="mb-1 text-xs font-medium text-muted-foreground">Preview:</div>
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                        <ReactMarkdown
                            components={{
                                code(props) {
                                    const { children, className, ...rest } = props
                                    const match = /language-(\w+)/.exec(className || '')
                                    return match ? (
                                        <SyntaxHighlighter
                                            PreTag="div"
                                            language={match[1]}
                                            style={vscDarkPlus}
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
                onPaste={handlePaste}
                onKeyDown={handleKeyDown}
                placeholder="Send a message..."
                className="aui-composer-input mb-1 max-h-32 min-h-16 w-full resize-none bg-transparent px-3.5 pt-1.5 pb-3 text-base outline-none placeholder:text-muted-foreground focus:outline-primary"
                rows={1}
                autoFocus
                aria-label="Message input"
            />
            <ComposerAction />
        </>
    );
};

export const Composer: FC = () => {
    return (
        <div className="aui-composer-wrapper sticky bottom-0 mx-auto flex w-full max-w-[var(--thread-max-width)] flex-col gap-4 overflow-visible rounded-t-3xl bg-background pb-4 md:pb-6">
            <ThreadScrollToBottom />
            <ComposerPrimitive.Root className="aui-composer-root relative flex w-full flex-col rounded-xl border border-primary/50 bg-muted px-1 pt-2 shadow-[0_0_100px_0px_hsl(var(--primary)),0_0_60px_0px_hsl(var(--primary)),0_0_30px_0px_hsl(var(--primary)),0_0_15px_0px_hsl(var(--primary))] dark:border-primary/60 dark:shadow-[0_0_120px_0px_hsl(var(--primary)),0_0_80px_0px_hsl(var(--primary)),0_0_40px_0px_hsl(var(--primary)),0_0_20px_0px_hsl(var(--primary))]">
                <ComposerContent />
            </ComposerPrimitive.Root>
        </div>
    );
};