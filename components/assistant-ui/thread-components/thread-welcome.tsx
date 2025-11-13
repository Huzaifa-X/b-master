"use client";

import Image from "next/image";
import type { FC } from "react";
import { useState, useEffect } from "react";
import * as m from "motion/react-m";
import { TypewriterEffect } from "@/components/ui/typewriter-effect";
import { Composer } from "@/components/assistant-ui/thread-components/composer";
import { useSession } from "next-auth/react";

export const ThreadWelcome: FC = () => {
    const { data: session } = useSession();

    // Array of welcome messages (outside component to avoid re-creation)
    const WELCOME_MESSAGES = [
        `How is it going, ${session?.user?.name || "User"}?`,
        `Time to increase your knowledge, ${session?.user?.name || "User"}`,
        `Ready to explore something new, ${session?.user?.name || "User"}?`,
        `What brings you here today, ${session?.user?.name || "User"}?`,
        `Let's make today productive, ${session?.user?.name || "User"}!`,
        `Great to see you back, ${session?.user?.name || "User"}!`,
        `What can I help you with, ${session?.user?.name || "User"}?`,
        `Let's dive into something interesting, ${session?.user?.name || "User"}!`,
    ];

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

