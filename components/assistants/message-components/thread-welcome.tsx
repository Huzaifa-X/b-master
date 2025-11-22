"use client"

import type { FC } from "react"
import { WelcomeChatbotPage } from "@/components/assistants/welcome-chatbot-page"

export const ThreadWelcome: FC = () => {
    return (
        <div className="flex h-full flex-col justify-center py-8">
            <WelcomeChatbotPage chatType="ask-b" />
        </div>
    )
}

