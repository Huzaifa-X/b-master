// components/assistants/message-components/assistant-message.tsx
"use client"

import type { FC } from "react"
import { useState } from "react"
import Image from "next/image"
import { Copy, Share2, Download, Eye, X, MessageSquare, Brain, ChevronDown, ChevronUp, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AddFeedDialog } from "@/components/feed/add-feed-dialog"
import { SelectContactDialog } from "@/components/assistants/select-contact-dialog"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { toast } from "sonner"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism"
import { useCreatePost } from "@/hooks/use-newFeed"
import { useInitiateChat, useSendMessage } from "@/hooks/use-assistant-chat"
import { useParams, usePathname } from "next/navigation"
import {
    Reasoning,
    ReasoningContent,
    ReasoningTrigger,
} from '@/components/ai-elements/reasoning';

interface AssistantMessageProps {
    content: string
    reasoning?: string // AI's reasoning process from AI SDK
    parts?: any[] // Raw parts from SDK
    timestamp?: Date
    isLoading?: boolean
    shared?: boolean
}

export const AssistantMessage: FC<AssistantMessageProps> = ({
    content,
    reasoning,
    parts,
    timestamp,
    isLoading = false,
    shared = false,
}) => {
    const [previewImage, setPreviewImage] = useState<string | null>(null)
    const [shareDialogOpen, setShareDialogOpen] = useState(false)
    const [contactDialogOpen, setContactDialogOpen] = useState(false)
    const [showReasoning, setShowReasoning] = useState(false)
    const pathname = usePathname()

    const isAskBMode = pathname.startsWith("/ask-b")
    const params = useParams()
    const assistantId = params.id as string

    const createPostMutation = useCreatePost()
    const initiateChatMutation = useInitiateChat()
    const sendMessageMutation = useSendMessage()

    const handleCopy = () => {
        navigator.clipboard.writeText(content)
        toast.success("Message copied to clipboard")
    }

    const handleShareToFeed = (feed: {
        title: string
        content: string
        image?: string
        privacy: "public" | "private"
        allowedUserIds?: string[]
    }) => {
        createPostMutation.mutate({
            assistantId,
            title: feed.title,
            content: feed.content,
            image: feed.image,
            isPublic: feed.privacy === "public",
            allowedUserIds: feed.allowedUserIds,
        })
        setShareDialogOpen(false)
    }

    const handleShareToContact = async (contactId: string, contactName: string) => {
        try {
            const chatResult = await initiateChatMutation.mutateAsync({
                assistantId,
                participantId: contactId,
            })

            if (chatResult.success && chatResult.chat) {
                await sendMessageMutation.mutateAsync({
                    assistantId,
                    chatId: chatResult.chat.id,
                    message: content,
                    messageType: 'text',
                })

                toast.success(`Shared with ${contactName}`)
            } else {
                toast.error(chatResult.error || 'Failed to create chat')
            }
        } catch (error) {
            console.error('Error sharing to contact:', error)
            toast.error('Failed to share message')
        }
        setContactDialogOpen(false)
    }

    const handleDownloadImage = async (src: string, alt: string) => {
        try {
            if (src.startsWith('data:image/')) {
                const base64Data = src.split(',')[1]
                const mimeMatch = src.match(/data:image\/(\w+);base64/)
                const mimeType = mimeMatch?.[1] || 'png'

                const byteCharacters = atob(base64Data)
                const byteNumbers = new Array(byteCharacters.length)
                for (let i = 0; i < byteCharacters.length; i++) {
                    byteNumbers[i] = byteCharacters.charCodeAt(i)
                }
                const byteArray = new Uint8Array(byteNumbers)
                const blob = new Blob([byteArray], { type: `image/${mimeType}` })

                const url = window.URL.createObjectURL(blob)
                const link = document.createElement('a')
                link.href = url
                link.download = alt || `generated-image.${mimeType}`
                document.body.appendChild(link)
                link.click()
                document.body.removeChild(link)
                window.URL.revokeObjectURL(url)
                toast.success("Image downloaded")
                return
            }

            try {
                const response = await fetch(src, {
                    mode: 'cors',
                    credentials: 'omit',
                    cache: 'no-cache'
                })

                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)

                const blob = await response.blob()
                const url = window.URL.createObjectURL(blob)
                const link = document.createElement('a')
                link.href = url

                try {
                    const urlObj = new URL(src)
                    const extension = urlObj.pathname.match(/\.(\w+)$/)?.[1] || 'png'
                    link.download = alt || `generated-image.${extension}`
                } catch {
                    link.download = alt || 'generated-image.png'
                }

                document.body.appendChild(link)
                link.click()
                document.body.removeChild(link)
                window.URL.revokeObjectURL(url)
                toast.success("Image downloaded")
            } catch (fetchError) {
                window.open(src, '_blank', 'noopener,noreferrer')
                toast.info("Opening image in new tab. Right-click to save.")
            }
        } catch (error) {
            console.error("Error downloading image:", error)
            try {
                window.open(src, '_blank', 'noopener,noreferrer')
                toast.info("Opening image in new tab. Right-click to save.")
            } catch {
                toast.error("Failed to download image. Please right-click the image and select 'Save image as'.")
            }
        }
    }

    // We no longer return early here. Instead, we'll show the reasoning and then the content or a loader.

    return (
        <>
            <div className="w-full animate-in py-4 duration-150 ease-out fade-in slide-in-from-bottom-1" data-role="assistant">
                {/* Reasoning Section using ai-elements */}
                {parts && parts.some((p: any) => p.type === 'reasoning') ? (
                    <div className="mb-3 px-2 ml-12">
                        {parts.filter((p: any) => p.type === 'reasoning').map((part: any, i: number) => (
                            <Reasoning
                                key={i}
                                className="w-full"
                                isStreaming={isLoading && parts.indexOf(part) === parts.length - 1}
                            >
                                <ReasoningTrigger />
                                <ReasoningContent>{part.reasoning || part.text || ""}</ReasoningContent>
                            </Reasoning>
                        ))}
                    </div>
                ) : reasoning && reasoning.trim() && (
                    <div className="mb-3 px-2 ml-12">
                        <Reasoning
                            className="w-full"
                            isStreaming={isLoading}
                        >
                            <ReasoningTrigger />
                            <ReasoningContent>{reasoning}</ReasoningContent>
                        </Reasoning>
                    </div>
                )}

                <div className="flex gap-4 px-2">
                    {/* Avatar */}
                    <div className="flex-shrink-0 pt-1">
                        <div className="flex size-8 items-center justify-center rounded-full">
                            <Image src="/bmaster-icon.png" alt="Assistant" width={24} height={24} style={{ width: "auto", height: "24px" }} unoptimized />
                        </div>
                    </div>

                    {/* Content - Allow horizontal scrolling for code blocks */}
                    <div className="flex-1 min-w-0 overflow-x-auto overflow-y-hidden">
                        <div className="w-full">
                            <div className="prose prose-sm dark:prose-invert max-w-none">
                                <ReactMarkdown
                                    remarkPlugins={[remarkGfm]}
                                    components={{
                                        p: ({ children, node }) => {
                                            const hasOnlyImage = node?.children?.length === 1 &&
                                                node.children[0]?.type === 'element' &&
                                                node.children[0]?.tagName === 'img'
                                            const isInBlockquote = (node as any)?.parent?.type === 'blockquote'
                                            if (hasOnlyImage) return <>{children}</>
                                            if (isInBlockquote) return <p className="mb-1 last:mb-0">{children}</p>
                                            return <p className="mb-2 last:mb-0">{children}</p>
                                        },

                                        img: ({ src, alt }) => {
                                            if (!src || typeof src !== 'string') return null
                                            return (
                                                <span className="block my-4 relative">
                                                    <span className="block relative rounded-lg overflow-hidden border border-border">
                                                        <Image src={src} alt={alt || 'Generated image'} width={1024} height={1024} className="w-full h-auto" unoptimized priority={false} />
                                                        <span className="absolute top-2 right-2 flex gap-2">
                                                            <Button size="icon" variant="default" className="h-8 w-8 bg-primary text-primary-foreground hover:bg-primary/90" onClick={() => setPreviewImage(src)} title="Preview image">
                                                                <Eye className="h-4 w-4" />
                                                            </Button>
                                                            <Button size="icon" variant="default" className="h-8 w-8 bg-primary text-primary-foreground hover:bg-primary/90" onClick={() => handleDownloadImage(src, alt || 'image')} title="Download image">
                                                                <Download className="h-4 w-4" />
                                                            </Button>
                                                        </span>
                                                    </span>
                                                    {alt && <span className="block text-sm text-muted-foreground mt-2 text-center italic">{alt}</span>}
                                                </span>
                                            )
                                        },

                                        code(props) {
                                            const { children, className } = props
                                            const match = /language-(\w+)/.exec(className || "")
                                            const rawCode = String(children).replace(/\n$/, "")

                                            if (match) {
                                                const language = match[1]
                                                return (
                                                    <div className="not-prose my-3 w-full">
                                                        <div className="relative">
                                                            <button
                                                                onClick={() =>
                                                                    window.dispatchEvent(
                                                                        new CustomEvent("open-code-preview", {
                                                                            detail: { content: rawCode, language },
                                                                        })
                                                                    )
                                                                }
                                                                className="absolute top-2 right-2 z-10 px-2 py-1 text-xs rounded bg-primary text-primary-foreground"
                                                            >
                                                                Preview
                                                            </button>
                                                            <div className="w-full overflow-x-auto rounded-lg border border-border bg-[rgb(30,30,30)]">
                                                                <SyntaxHighlighter
                                                                    language={language}
                                                                    style={vscDarkPlus}
                                                                    PreTag="pre"
                                                                    customStyle={{
                                                                        margin: 0,
                                                                        padding: "1rem",
                                                                        fontSize: "0.875rem",
                                                                        background: "rgb(30,30,30)",
                                                                        width: "fit-content",
                                                                        minWidth: "max-content",
                                                                    }}
                                                                >
                                                                    {rawCode}
                                                                </SyntaxHighlighter>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )
                                            }
                                            return (
                                                <code className="rounded bg-muted px-1.5 py-0.5 text-sm font-mono">
                                                    {children}
                                                </code>
                                            )
                                        },

                                        h1: ({ children }) => <h1 className="text-xl font-bold mt-6 mb-3 first:mt-0">{children}</h1>,
                                        h2: ({ children }) => <h2 className="text-lg font-bold mt-5 mb-2 first:mt-0">{children}</h2>,
                                        h3: ({ children }) => <h3 className="text-base font-bold mt-4 mb-2 first:mt-0">{children}</h3>,
                                        ul: ({ children }) => <ul className="my-3 ml-6 list-disc space-y-1">{children}</ul>,
                                        ol: ({ children }) => <ol className="my-3 ml-6 list-decimal space-y-1">{children}</ol>,
                                        li: ({ children }) => <li className="my-1">{children}</li>,
                                        blockquote: ({ children, node }) => {
                                            const isNested = (node as any)?.parent?.type === 'blockquote'
                                            const borderColor = isNested ? 'border-l-[#FEE75C]' : 'border-l-[#5865F2]'
                                            return (
                                                <blockquote className={`${borderColor} border-l-4 pl-4 my-2 bg-muted/30 dark:bg-muted/20 py-2 rounded-r`}>
                                                    <div className="text-foreground whitespace-pre-wrap leading-relaxed">{children}</div>
                                                </blockquote>
                                            )
                                        },
                                        a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary underline hover:text-primary/80">{children}</a>,
                                        strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                                        em: ({ children }) => <em className="italic">{children}</em>,
                                        table: ({ children }) => <div className="my-4 w-full overflow-x-auto"><table className="min-w-full border-collapse border border-border">{children}</table></div>,
                                        pre({ children }) {
                                            return <div className="overflow-x-auto p-3 rounded bg-muted text-sm">{children}</div>
                                        },
                                    }}
                                >
                                    {content || (isLoading ? " " : "")}
                                </ReactMarkdown>
                                {isLoading && !content.trim() && (
                                    <div className="mt-2 flex items-center gap-2">
                                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                        <span className="text-sm text-muted-foreground italic">Generating response...</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="mt-2 flex items-center gap-2 text-muted-foreground">
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleCopy} title="Copy">
                                <Copy className="h-3.5 w-3.5" />
                            </Button>
                            {!shared && !isAskBMode && (
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-6 w-6" title="Share">
                                            <Share2 className="h-3.5 w-3.5" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="start" className="w-48">
                                        <DropdownMenuItem onClick={() => setContactDialogOpen(true)}>
                                            <MessageSquare className="h-4 w-4 mr-2" />
                                            Share to Contact
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => setShareDialogOpen(true)}>
                                            <Eye className="h-4 w-4 mr-2" />
                                            Post to News Feed
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Image Preview Dialog */}
            <Dialog open={!!previewImage} onOpenChange={(open) => !open && setPreviewImage(null)}>
                <DialogContent className="max-w-4xl w-full p-0" showCloseButton={false}>
                    <DialogHeader className="px-6 pt-6 pb-4">
                        <DialogTitle className="flex items-center justify-between">
                            <span>Image Preview</span>
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setPreviewImage(null)}>
                                <X className="h-4 w-4" />
                            </Button>
                        </DialogTitle>
                    </DialogHeader>
                    {previewImage && (
                        <div className="relative w-full overflow-hidden border-t border-border bg-muted flex items-center justify-center">
                            <Image src={previewImage as string} alt="Preview" width={1200} height={1200} className="w-full h-auto max-h-[80vh] object-contain" unoptimized />
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Share to News Feed Dialog */}
            <AddFeedDialog
                open={shareDialogOpen}
                onOpenChange={setShareDialogOpen}
                assistantId={assistantId}
                onSubmit={handleShareToFeed}
                isLoading={createPostMutation.isPending}
                initialTitle="AI Assistant Response"
                initialContent={content}
            />

            {/* Share to Contact Dialog */}
            <SelectContactDialog
                open={contactDialogOpen}
                onOpenChange={setContactDialogOpen}
                onSelectContact={handleShareToContact}
                assistantId={assistantId}
            />
        </>
    )
}