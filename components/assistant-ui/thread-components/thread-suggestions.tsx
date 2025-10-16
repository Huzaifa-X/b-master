"use client";

import type { FC } from "react";
import { ThreadPrimitive } from "@assistant-ui/react";
import * as m from "motion/react-m";
import { Button } from "@/components/ui/button";

export const ThreadSuggestions: FC = () => {
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

