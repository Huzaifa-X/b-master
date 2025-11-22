"use client"

import type { FC } from "react"
import Image from "next/image"
import { useSession } from "next-auth/react"
import { Copy, Share2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import ReactMarkdown from "react-markdown"

interface Attachment {
    name: string
    url: string
    type: string
    size: number
}

interface UserMessageProps {
    content: string
    attachments?: Attachment[]
    timestamp?: Date
}

export const UserMessage: FC<UserMessageProps> = ({ content, attachments, timestamp }) => {
    const { data: session } = useSession()

    const getUserInitials = () => {
        if (!session?.user?.name) return "U"
        const names = session.user.name.split(" ")
        if (names.length >= 2) {
            return `${names[0][0]}${names[1][0]}`.toUpperCase()
        }
        return session.user.name.substring(0, 2).toUpperCase()
    }

    const handleCopy = () => {
        navigator.clipboard.writeText(content)
        toast.success("Message copied to clipboard")
    }

    const handleShare = async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: "Chat Message",
                    text: content,
                })
                toast.success("Message shared")
            } catch (error) {
                // User cancelled or error occurred
                console.error("Error sharing:", error)
            }
        } else {
            // Fallback: copy to clipboard
            handleCopy()
            toast.info("Share not supported, copied to clipboard instead")
        }
    }

    return (
        <div
            className="mx-auto w-full max-w-[44rem] animate-in py-4 duration-150 ease-out fade-in slide-in-from-bottom-1"
            data-role="user"
        >
            <div className="flex gap-4 px-2">
                {/* User Avatar */}
                <div className="flex-shrink-0 pt-1">
                    <div className="flex size-8 items-center justify-center rounded-full bg-muted">
                        <span className="text-sm font-medium">{getUserInitials()}</span>
                    </div>
                </div>

                {/* Message Content */}
                <div className="flex-1 min-w-0">
                    {/* Attachments */}
                    {attachments && attachments.length > 0 && (
                        <div className="mb-2 flex flex-wrap gap-2">
                            {attachments.map((attachment, index) => (
                                <div
                                    key={index}
                                    className="flex items-center gap-2 rounded-lg border border-primary/30 bg-background/50 px-3 py-2 text-sm"
                                >
                                    <span className="truncate max-w-[200px]">{attachment.name}</span>
                                    {attachment.url && (
                                        <a
                                            href={attachment.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-primary hover:underline text-xs"
                                        >
                                            View
                                        </a>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="inline-block rounded-2xl bg-muted px-4 py-2.5 leading-7 break-words text-foreground">
                        <div className="prose prose-sm dark:prose-invert max-w-none">
                            <ReactMarkdown
                                components={{
                                    p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                                    code: ({ children }) => (
                                        <code className="rounded bg-background px-1 py-0.5 text-[0.9em] font-mono">
                                            {children}
                                        </code>
                                    ),
                                }}
                            >
                                {content}
                            </ReactMarkdown>
                        </div>
                    </div>

                    {/* Action Bar */}
                    {/* <div className="mt-2 flex items-center gap-2 text-muted-foreground">
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
                    </div> */}
                </div>
            </div>
        </div>
    )
}

