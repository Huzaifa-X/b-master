"use client"

import type { FC } from "react"
import Image from "next/image"
import { Copy, Share2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import ReactMarkdown from "react-markdown"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism"

interface AssistantMessageProps {
    content: string
    timestamp?: Date
    isLoading?: boolean
}

export const AssistantMessage: FC<AssistantMessageProps> = ({
    content,
    timestamp,
    isLoading = false,
}) => {
    const handleCopy = () => {
        navigator.clipboard.writeText(content)
        toast.success("Message copied to clipboard")
    }

    const handleShare = async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: "Assistant Message",
                    text: content,
                })
                toast.success("Message shared")
            } catch (error) {
                console.error("Error sharing:", error)
            }
        } else {
            handleCopy()
            toast.info("Share not supported, copied to clipboard instead")
        }
    }

    if (isLoading) {
        return (
            <div
                className="mx-auto w-full max-w-[44rem] animate-in py-4 duration-150 ease-out fade-in slide-in-from-bottom-1"
                data-role="assistant"
            >
                <div className="flex gap-4 px-2">
                    <div className="flex-shrink-0 pt-1">
                        <div className="flex size-8 items-center justify-center rounded-full">
                            <Image
                                src="/bmaster-icon.png"
                                alt="Assistant"
                                width={24}
                                height={24}
                                style={{ width: "auto", height: "24px" }}
                                unoptimized
                            />
                        </div>
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="inline-block rounded-2xl px-4 py-2.5 bg-muted">
                            <div className="flex items-center gap-2">
                                <div className="h-2 w-2 rounded-full bg-muted-foreground animate-pulse" />
                                <div className="h-2 w-2 rounded-full bg-muted-foreground animate-pulse delay-75" />
                                <div className="h-2 w-2 rounded-full bg-muted-foreground animate-pulse delay-150" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div
            className="mx-auto w-full max-w-[44rem] animate-in py-4 duration-150 ease-out fade-in slide-in-from-bottom-1"
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
                            style={{ width: "auto", height: "24px" }}
                            unoptimized
                        />
                    </div>
                </div>

                {/* Message Content */}
                <div className="flex-1 min-w-0">
                    <div className="leading-7 break-words text-foreground">
                        <div className="prose prose-sm dark:prose-invert max-w-none">
                            <ReactMarkdown
                                components={{
                                    p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                                    code(props) {
                                        const { children, className, ...rest } = props
                                        const match = /language-(\w+)/.exec(className || "")
                                        return match ? (
                                            <SyntaxHighlighter
                                                PreTag="div"
                                                language={match[1]}
                                                style={vscDarkPlus}
                                            >
                                                {String(children).replace(/\n$/, "")}
                                            </SyntaxHighlighter>
                                        ) : (
                                            <code
                                                {...rest}
                                                className="rounded bg-muted px-1 py-0.5 text-[0.9em] font-mono"
                                            >
                                                {children}
                                            </code>
                                        )
                                    },
                                    h1: ({ children }) => (
                                        <h1 className="text-lg font-bold mt-2 mb-1">{children}</h1>
                                    ),
                                    h2: ({ children }) => (
                                        <h2 className="text-base font-bold mt-2 mb-1">{children}</h2>
                                    ),
                                    h3: ({ children }) => (
                                        <h3 className="text-sm font-bold mt-1 mb-1">{children}</h3>
                                    ),
                                }}
                            >
                                {content}
                            </ReactMarkdown>
                        </div>
                    </div>

                    {/* Action Bar */}
                    <div className="mt-2 flex items-center gap-2 text-muted-foreground">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={handleCopy}
                            title="Copy message"
                        >
                            <Copy className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={handleShare}
                            title="Share message"
                        >
                            <Share2 className="h-3.5 w-3.5" />
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    )
}

