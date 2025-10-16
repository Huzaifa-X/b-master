"use client";

import { MessagePrimitive } from "@assistant-ui/react";
import type { FC } from "react";
import { UserMessageAttachments } from "@/components/assistant-ui/attachment";
import { MarkdownText } from "@/components/assistant-ui/markdown-text";
import { BranchPicker } from "./branch-picker";
import { UserActionBar } from "./user-action-bar";

export const UserMessage: FC = () => {
    return (
        <MessagePrimitive.Root asChild>
            <div
                className="aui-user-message-root mx-auto w-full max-w-[var(--thread-max-width)] animate-in py-4 duration-150 ease-out fade-in slide-in-from-bottom-1"
                data-role="user"
            >
                <div className="flex gap-4 px-2">
                    {/* User Avatar */}
                    <div className="flex-shrink-0 pt-1">
                        <div className="flex size-8 items-center justify-center rounded-full bg-muted">
                            <span className="text-sm font-medium">HT</span>
                        </div>
                    </div>

                    {/* Message Content */}
                    <div className="flex-1 min-w-0">
                        <UserMessageAttachments />
                        
                        <div className="aui-user-message-content inline-block rounded-2xl bg-muted px-4 py-2.5 leading-7 break-words text-foreground">
                            <MessagePrimitive.Parts 
                                components={{
                                    Text: MarkdownText
                                }}
                            />
                        </div>

                        <div className="aui-user-message-footer mt-2 flex items-center gap-2">
                            <BranchPicker />
                            <UserActionBar />
                        </div>
                    </div>
                </div>
            </div>
        </MessagePrimitive.Root>
    );
};

