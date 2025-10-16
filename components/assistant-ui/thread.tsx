"use client";

import { ThreadPrimitive } from "@assistant-ui/react";
import type { FC } from "react";
import { LazyMotion, MotionConfig, domAnimation } from "motion/react";
import { ThreadWelcome } from "./thread-components/thread-welcome";
import { Composer } from "./thread-components/composer";
import { UserMessage } from "./thread-components/user-message";
import { AssistantMessage } from "./thread-components/assistant-message";
import { EditComposer } from "./thread-components/edit-composer";

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
