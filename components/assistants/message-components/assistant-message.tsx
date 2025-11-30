"use client"

import type { FC } from "react"
import { useState } from "react"
import Image from "next/image"
import { Copy, Share2, Download, Eye, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
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
    const [previewImage, setPreviewImage] = useState<string | null>(null)
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

    const handleDownloadImage = async (src: string, alt: string) => {
        try {
            // Check if it's a base64 data URL
            if (src.startsWith('data:image/')) {
                // Handle base64 data URL - convert to blob and download
                const base64Data = src.split(',')[1]
                const mimeMatch = src.match(/data:image\/(\w+);base64/)
                const mimeType = mimeMatch?.[1] || 'png'
                
                // Convert base64 to blob
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
            
            // For regular URLs (S3 or other), try to fetch
            // If CORS fails, fall back to opening in new tab
            try {
                const response = await fetch(src, {
                    mode: 'cors',
                    credentials: 'omit',
                    cache: 'no-cache'
                })
                
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`)
                }
                
                const blob = await response.blob()
                const url = window.URL.createObjectURL(blob)
                const link = document.createElement('a')
                link.href = url
                
                // Extract file extension from URL or use default
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
                // If fetch fails (likely CORS issue), open in new tab as fallback
                console.warn("Fetch failed, opening in new tab:", fetchError)
                window.open(src, '_blank', 'noopener,noreferrer')
                toast.info("Opening image in new tab. Right-click to save.")
            }
        } catch (error) {
            console.error("Error downloading image:", error)
            // Final fallback: try to open in new tab
            try {
                window.open(src, '_blank', 'noopener,noreferrer')
                toast.info("Opening image in new tab. Right-click to save.")
            } catch {
                toast.error("Failed to download image. Please right-click the image and select 'Save image as'.")
            }
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
                        <div className="prose prose-sm dark:prose-invert max-w-none prose-headings:font-bold prose-p:mb-2 prose-p:last:mb-0 prose-ul:my-2 prose-ol:my-2 prose-li:my-1 prose-blockquote:border-l-4 prose-blockquote:border-muted-foreground prose-blockquote:pl-4 prose-blockquote:italic prose-a:text-primary prose-a:underline prose-strong:font-semibold prose-em:italic">
                            <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                components={{
                                    // ============================================
                                    // PARAGRAPH - Handle images specially
                                    // ============================================
                                    p: ({ children, node }) => {
                                        // Check if paragraph only contains an image
                                        const hasOnlyImage = node?.children?.length === 1 && 
                                            node.children[0]?.type === 'element' && 
                                            node.children[0]?.tagName === 'img'
                                        
                                        if (hasOnlyImage) {
                                            // Return fragment to avoid wrapping image in p tag
                                            return <>{children}</>
                                        }
                                        return <p className="mb-2 last:mb-0">{children}</p>
                                    },
                                    
                                    // ============================================
                                    // IMAGE RENDERING (CRITICAL FOR IMAGE DISPLAY)
                                    // ============================================
                                    img: ({ src, alt }) => {
                                        if (!src || typeof src !== 'string') return null
                                        
                                        return (
                                            <span className="block my-4 relative group">
                                                <span className="block relative rounded-lg overflow-hidden border border-border">
                                                    <Image
                                                        src={src}
                                                        alt={alt || 'Generated image'}
                                                        width={1024}
                                                        height={1024}
                                                        className="w-full h-auto"
                                                        unoptimized // Important for S3 URLs and base64
                                                        priority={false}
                                                    />
                                                    
                                                    {/* Action buttons overlay */}
                                                    <span className="absolute top-2 right-2 flex gap-2">
                                                        <Button
                                                            size="icon"
                                                            variant="default"
                                                            className="h-8 w-8 bg-primary text-primary-foreground hover:bg-primary/90"
                                                            onClick={() => setPreviewImage(src)}
                                                            title="Preview image"
                                                        >
                                                            <Eye className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            size="icon"
                                                            variant="default"
                                                            className="h-8 w-8 bg-primary text-primary-foreground hover:bg-primary/90"
                                                            onClick={() => handleDownloadImage(src, alt || 'image')}
                                                            title="Download image"
                                                        >
                                                            <Download className="h-4 w-4" />
                                                        </Button>
                                                    </span>
                                                </span>
                                                {alt && (
                                                    <span className="block text-sm text-muted-foreground mt-2 text-center italic">
                                                        {alt}
                                                    </span>
                                                )}
                                            </span>
                                        )
                                    },
                                    
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
                                        <h1 className="text-lg font-bold mt-4 mb-2 first:mt-0">{children}</h1>
                                    ),
                                    h2: ({ children }) => (
                                        <h2 className="text-base font-bold mt-3 mb-2 first:mt-0">{children}</h2>
                                    ),
                                    h3: ({ children }) => (
                                        <h3 className="text-sm font-bold mt-2 mb-1 first:mt-0">{children}</h3>
                                    ),
                                    h4: ({ children }) => (
                                        <h4 className="text-sm font-semibold mt-2 mb-1 first:mt-0">{children}</h4>
                                    ),
                                    ul: ({ children, className }) => {
                                        const isTaskList = className?.includes('contains-task-list')
                                        return (
                                            <ul className={`my-2 ml-4 ${isTaskList ? 'list-none space-y-1' : 'list-disc space-y-1'}`}>
                                                {children}
                                            </ul>
                                        )
                                    },
                                    ol: ({ children }) => (
                                        <ol className="my-2 ml-4 list-decimal space-y-1">{children}</ol>
                                    ),
                                    li: ({ children, className }) => {
                                        const isTaskItem = className?.includes('task-list-item')
                                        return (
                                            <li className={`my-1 ${isTaskItem ? 'list-none' : ''}`}>
                                                {children}
                                            </li>
                                        )
                                    },
                                    blockquote: ({ children }) => (
                                        <blockquote className="border-l-4 border-muted-foreground pl-4 my-2 italic text-muted-foreground">
                                            {children}
                                        </blockquote>
                                    ),
                                    a: ({ href, children }) => (
                                        <a
                                            href={href}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-primary underline hover:text-primary/80"
                                        >
                                            {children}
                                        </a>
                                    ),
                                    strong: ({ children }) => (
                                        <strong className="font-semibold">{children}</strong>
                                    ),
                                    em: ({ children }) => (
                                        <em className="italic">{children}</em>
                                    ),
                                    del: ({ children }) => (
                                        <del className="line-through">{children}</del>
                                    ),
                                    hr: () => (
                                        <hr className="my-4 border-t border-border" />
                                    ),
                                    table: ({ children }) => (
                                        <div className="my-4 overflow-x-auto">
                                            <table className="min-w-full border-collapse border border-border">
                                                {children}
                                            </table>
                                        </div>
                                    ),
                                    thead: ({ children }) => (
                                        <thead className="bg-muted">{children}</thead>
                                    ),
                                    tbody: ({ children }) => (
                                        <tbody>{children}</tbody>
                                    ),
                                    tr: ({ children }) => (
                                        <tr className="border-b border-border">{children}</tr>
                                    ),
                                    th: ({ children }) => (
                                        <th className="border border-border px-3 py-2 text-left font-semibold">
                                            {children}
                                        </th>
                                    ),
                                    td: ({ children }) => (
                                        <td className="border border-border px-3 py-2">{children}</td>
                                    ),
                                    pre: ({ children }) => (
                                        <pre className="my-2 overflow-x-auto rounded bg-muted p-3">
                                            {children}
                                        </pre>
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

            {/* Image Preview Modal */}
            <Dialog open={!!previewImage} onOpenChange={(open) => !open && setPreviewImage(null)}>
                <DialogContent className="max-w-4xl w-full p-0 bg-background" showCloseButton={false}>
                    <DialogHeader className="px-6 pt-6 pb-4">
                        <DialogTitle className="flex items-center justify-between">
                            <span>Image Preview</span>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => setPreviewImage(null)}
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </DialogTitle>
                    </DialogHeader>
                    {previewImage && (
                            <div className="relative w-full overflow-hidden border border-border bg-muted flex items-center justify-center">
                                <Image
                                    src={previewImage}
                                    alt="Preview"
                                    width={1200}
                                    height={1200}
                                    className="w-full h-auto max-h-[80vh] object-contain"
                                    unoptimized
                                    style={{ maxWidth: '120%' }}
                                />
                            </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    )
}

