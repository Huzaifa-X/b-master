"use client"

import { use } from "react"
import { useSearchParams } from "next/navigation"
import { BCoderChatView } from "@/components/b-coder/b-coder-chat-view"
import { useSetAssistantMode } from "@/hooks/useAssistant"

export default function BCoderPage({ params }: { params: Promise<{ id: string }> }) {
    // Unwrap params promise for Next.js 15
    const { id: assistantId } = use(params)
    const searchParams = useSearchParams()
    const templateId = searchParams.get("template") || "default-todo"

    // Set assistant mode in header
    useSetAssistantMode(assistantId)

    return <BCoderChatView assistantId={assistantId} templateId={templateId} />
}
