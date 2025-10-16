"use client";

import { MessagePrimitive } from "@assistant-ui/react";
import Image from "next/image";
import type { FC } from "react";
import { MarkdownText } from "@/components/assistant-ui/markdown-text";
import { ToolFallback } from "@/components/assistant-ui/tool-fallback";
import { MessageError } from "@/components/assistant-ui/thread-components/message-error";
import { BranchPicker } from "@/components/assistant-ui/thread-components/branch-picker";
import { AssistantActionBar } from "@/components/assistant-ui/thread-components/assistant-action-bar";

export const AssistantMessage: FC = () => {

    return (
        <MessagePrimitive.Root asChild>
            <div
                className="aui-assistant-message-root mx-auto w-full max-w-[var(--thread-max-width)] animate-in py-4 duration-150 ease-out fade-in slide-in-from-bottom-1"
                data-role="assistant"
            >
                <div className="flex gap-4 px-2">
                    {/* Assistant Avatar */}
                    <div className="flex-shrink-0 pt-1">
                        <div className="flex size-8 items-center justify-center rounded-full">
                            <Image
                                src="/bmaster-icon.png"
                                alt="Assistant"
                                width={24}
                                height={24}
                                style={{ width: 'auto', height: '24px' }}
                                unoptimized
                            />
                        </div>
                    </div>

                    {/* Message Content */}
                    <div className="flex-1 min-w-0">
                        <div className="aui-assistant-message-content leading-7 break-words text-foreground">
                            <MessagePrimitive.Parts
                                components={{
                                    Text: MarkdownText,
                                    tools: { Fallback: ToolFallback },
                                }}
                            />
                            <MessageError />
                        </div>

                        <div className="aui-assistant-message-footer mt-2 flex items-center gap-2">
                            <BranchPicker />
                            <AssistantActionBar />
                        </div>
                    </div>
                </div>
            </div>
        </MessagePrimitive.Root>
    );
};
