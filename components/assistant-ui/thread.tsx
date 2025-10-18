"use client";

import { ThreadPrimitive, useAssistantRuntime } from "@assistant-ui/react";
import type { FC } from "react";
import { LazyMotion, MotionConfig, domAnimation } from "motion/react";
import { ArrowLeft } from "lucide-react";
import { ThreadWelcome } from "./thread-components/thread-welcome";
import { Composer } from "./thread-components/composer";
import { UserMessage } from "./thread-components/user-message";
import { AssistantMessage } from "./thread-components/assistant-message";
import { EditComposer } from "./thread-components/edit-composer";
import { Button } from "@/components/ui/button";
import { TooltipIconButton } from "./tooltip-icon-button";
import { ThreadHeaderUpdater } from "./thread-header-updater";

const ThreadBackButton: FC = () => {
    const runtime = useAssistantRuntime();
    
    const handleBack = () => {
        // Switch to a new thread, which will show the welcome state
        runtime.switchToNewThread();
    };

    return (
        <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 py-3">
            <TooltipIconButton
                tooltip="Back to welcome"
                variant="ghost"
                size="sm"
                onClick={handleBack}
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
                <ArrowLeft className="h-5 w-5" />
                <span className="text-sm font-medium">Back</span>
            </TooltipIconButton>
        </div>
    );
};

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
                    <ThreadHeaderUpdater />
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
