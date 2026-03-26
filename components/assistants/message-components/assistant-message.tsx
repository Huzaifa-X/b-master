// components/assistants/message-components/assistant-message.tsx
"use client"

/**
 * IMPORTANT: This component is designed to work within the AI Elements <Conversation> wrapper
 * The Conversation wrapper provides proper context for AI Elements like <Reasoning>, <Sources>, etc.
 * 
 * Usage:
 * <Conversation>
 *   <ConversationContent>
 *     {messages.map(m => (
 *       <AssistantMessage key={m.id} ... />
 *     ))}
 *   </ConversationContent>
 * </Conversation>
 */

import type { FC } from "react"
import { useState, useMemo, useCallback, useRef, useEffect } from "react"
import Image from "next/image"
import { Copy, Share2, Download, Eye, X, MessageSquare, ChevronDown, ExternalLink, Globe, Bookmark, Loader2, Check, Palette, Code2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AddFeedDialog } from "@/components/feed/add-feed-dialog"
import { SelectContactDialog } from "@/components/assistants/select-contact-dialog"
import { ShareArtifactDialog } from "@/components/artifacts/share-artifact-dialog"
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { toast } from "sonner"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { oneLight } from "react-syntax-highlighter/dist/esm/styles/prism"
import { useCreatePost } from "@/hooks/use-newFeed"
import { useInitiateChat, useSendMessage } from "@/hooks/use-assistant-chat"
import { useParams, usePathname } from "next/navigation"
import { saveCodeAsArtifact } from "@/app/actions/artifact.action"
import { useArtifactStore } from "@/lib/stores/artifact-store"
import {
    Reasoning,
    ReasoningContent,
    ReasoningTrigger,
} from '@/components/ai-elements/reasoning';
import {
    Sources,
    SourcesTrigger,
    SourcesContent,
    Source,
} from '@/components/ai-elements/sources';

// Interface for parsed source
interface ParsedSource {
    title: string
    url: string
    description?: string
}

interface AssistantMessageProps {
    content: string
    reasoning?: string // AI's reasoning process from database
    parts?: any[] // Raw parts from AI SDK
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
    // Track save state per code block keyed by first 40 chars of code
    const [savingBlocks, setSavingBlocks] = useState<Record<string, 'idle' | 'saving' | 'saved'>>({})
    // Save-name dialog state
    const [saveDialog, setSaveDialog] = useState<{ open: boolean; code: string; language: string; name: string; shareAfter?: boolean }>({
        open: false, code: '', language: '', name: '', shareAfter: false
    })
    const nameInputRef = useRef<HTMLInputElement>(null)
    // Track if canvas HTML has been auto-opened in the preview panel
    const [canvasAutoOpened, setCanvasAutoOpened] = useState(false)
    const canvasOpenedRef = useRef(false) // Prevent multiple dispatches
    // Track if canvas Markdown block has been auto-opened
    const [markdownCanvasAutoOpened, setMarkdownCanvasAutoOpened] = useState(false)
    const markdownCanvasOpenedRef = useRef(false)
    // Track if SVG has been auto-opened
    const svgOpenedRef = useRef(false)
    // Track if React/JSX has been auto-opened
    const reactOpenedRef = useRef(false)
    // Track if CSS has been auto-opened
    const cssOpenedRef = useRef(false)
    // Share artifact state (for Canvas Output Card)
    const [shareArtifactDialogOpen, setShareArtifactDialogOpen] = useState(false)
    const [savedCanvasArtifactId, setSavedCanvasArtifactId] = useState<string | null>(null)
    const [savedCanvasArtifactName, setSavedCanvasArtifactName] = useState<string>("")

    const pathname = usePathname()
    const isAskBMode = pathname.startsWith("/ask-b")
    const params = useParams()
    const assistantId = params.id as string

    /** Derive a default artifact name from the first meaningful line of code */
    const deriveDefaultName = useCallback((code: string, language: string) => {
        const firstLine = code.split('\n').find(l => l.trim().length > 0) ?? ''
        const rawName = firstLine.replace(/[<>{}[\]/\\|"'`]/g, '').trim().slice(0, 48)
        return rawName ? `${rawName} (${language})` : `${language.charAt(0).toUpperCase() + language.slice(1)} Snippet`
    }, [])

    /** Open the name dialog pre-filled with the auto-derived name */
    const openSaveDialog = useCallback((code: string, language: string, shareAfter = false) => {
        setSaveDialog({ open: true, code, language, name: deriveDefaultName(code, language), shareAfter })
    }, [deriveDefaultName])

    /** Handle share button click - save first if not saved, then open share dialog */
    const handleShareCanvas = useCallback((code: string, language: string) => {
        if (savedCanvasArtifactId) {
            // Already saved, open share dialog directly
            setShareArtifactDialogOpen(true)
        } else {
            // Need to save first, then share
            openSaveDialog(code, language, true)
        }
    }, [savedCanvasArtifactId, openSaveDialog])

    const handleSaveAsArtifact = useCallback(async () => {
        const { code, language, name, shareAfter } = saveDialog
        if (!name.trim()) return
        const blockKey = code.slice(0, 40)
        setSaveDialog(prev => ({ ...prev, open: false }))
        setSavingBlocks(prev => ({ ...prev, [blockKey]: 'saving' }))
        try {
            const result = await saveCodeAsArtifact({
                assistantId,
                code,
                language,
                name: name.trim(),
                chatId: (params.chatId as string) ?? null,
            })
            if (result.success) {
                toast.success('Saved as artifact!')
                setSavingBlocks(prev => ({ ...prev, [blockKey]: 'saved' }))
                setTimeout(() => setSavingBlocks(prev => ({ ...prev, [blockKey]: 'idle' })), 3000)
                // Track saved canvas artifact for sharing (for HTML content)
                if (result.artifactId && (language === 'html' || language === 'htm')) {
                    setSavedCanvasArtifactId(result.artifactId)
                    setSavedCanvasArtifactName(name.trim())
                }
                // Open share dialog if this was a "Save & Share" action
                if (shareAfter && result.artifactId) {
                    setShareArtifactDialogOpen(true)
                }
            } else {
                toast.error(result.error || 'Failed to save artifact')
                setSavingBlocks(prev => ({ ...prev, [blockKey]: 'idle' }))
            }
        } catch {
            toast.error('Failed to save artifact')
            setSavingBlocks(prev => ({ ...prev, [blockKey]: 'idle' }))
        }
    }, [saveDialog, assistantId, params])
    const createPostMutation = useCreatePost()
    const initiateChatMutation = useInitiateChat()
    const sendMessageMutation = useSendMessage()

    // Randomize thinking message
    const thinkingMessage = useMemo(() => {
        const messages = [
            "Thinking...",
            "Analyzing your request...",
            "Processing...",
            "Consulting my knowledge base...",
            "Formulating a response...",
            "Just a second...",
            "Working on it..."
        ]
        return messages[Math.floor(Math.random() * messages.length)]
    }, [])


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

    // ⭐ Extract sources from parts (AI SDK) and parse from content
    const { sources, contentWithoutSources } = useMemo(() => {
        const parsedSources: ParsedSource[] = []
        let cleanContent = content || ""

        // 1. Extract sources from AI SDK parts (type='source')
        if (parts && Array.isArray(parts)) {
            for (const part of parts) {
                if (part.type === 'source' && part.source) {
                    const source = part.source
                    parsedSources.push({
                        title: source.title || source.name || 'Source',
                        url: source.url || source.link || '',
                        description: source.description || source.snippet || undefined
                    })
                }
            }
        }

        // 2. Parse markdown-style sources from content
        // Matches patterns like:
        // **Sources:**
        // - [Title](url)
        // - [Title](url)
        // OR
        // Sources:
        // - [Title](url)
        const sourcesRegex = /(?:\n\n|\n)?(?:\*\*)?Sources?:?\*?\*?:?\s*\n((?:[-*•]\s*\[.+?\]\(.+?\)(?:\s*[-–—]\s*.+?)?\s*\n?)+)/gi
        const match = sourcesRegex.exec(cleanContent)

        if (match) {
            // Remove the sources section from content
            cleanContent = cleanContent.replace(match[0], '').trim()

            // Parse individual source links
            const sourcesList = match[1]
            const linkRegex = /[-*•]\s*\[([^\]]+)\]\(([^)]+)\)(?:\s*[-–—]\s*(.+?))?(?:\n|$)/g
            let linkMatch

            while ((linkMatch = linkRegex.exec(sourcesList)) !== null) {
                const title = linkMatch[1].trim()
                const url = linkMatch[2].trim()
                const description = linkMatch[3]?.trim()

                // Avoid duplicates
                if (!parsedSources.some(s => s.url === url)) {
                    parsedSources.push({ title, url, description })
                }
            }
        }

        // Also try to match simpler formats like "Sources:\n[Title](url)\n[Title](url)"
        const simpleSourcesRegex = /(?:\n\n|\n)?(?:\*\*)?Sources?:?\*?\*?:?\s*\n((?:\[.+?\]\(.+?\)\s*\n?)+)/gi
        const simpleMatch = simpleSourcesRegex.exec(cleanContent)

        if (simpleMatch) {
            cleanContent = cleanContent.replace(simpleMatch[0], '').trim()

            const simpleLinkRegex = /\[([^\]]+)\]\(([^)]+)\)/g
            let simpleLinkMatch

            while ((simpleLinkMatch = simpleLinkRegex.exec(simpleMatch[1])) !== null) {
                const title = simpleLinkMatch[1].trim()
                const url = simpleLinkMatch[2].trim()

                if (!parsedSources.some(s => s.url === url)) {
                    parsedSources.push({ title, url })
                }
            }
        }

        return { sources: parsedSources, contentWithoutSources: cleanContent }
    }, [content, parts])

    // 🎨 Detect Canvas HTML output (code blocks OR raw HTML)
    const canvasHtmlData = useMemo(() => {
        if (!contentWithoutSources) return null

        // Strategy 1: Match ```html ... ``` code blocks (LOWERED threshold for better UX)
        const htmlCodeBlockRegex = /```html\s*\n([\s\S]*?)```/gi
        const codeBlockMatches = [...contentWithoutSources.matchAll(htmlCodeBlockRegex)]

        for (const match of codeBlockMatches) {
            const htmlContent = match[1]?.trim() || ''
            // Lower threshold from 2000 to 500 chars for better auto-open
            if (htmlContent.length > 500) {
                const isCanvasOutput = (
                    htmlContent.includes('<!DOCTYPE') ||
                    htmlContent.includes('<!doctype') ||
                    htmlContent.includes('<html') ||
                    htmlContent.includes('<head') ||
                    htmlContent.includes('<body') ||
                    htmlContent.includes('<style') ||
                    htmlContent.includes('<div') ||
                    htmlContent.includes('<section')
                )
                if (isCanvasOutput) {
                    return {
                        fullMatch: match[0],
                        htmlContent,
                        isCanvasOutput: true,
                        type: 'codeblock',
                        language: 'html'
                    }
                }
            }
        }

        // Strategy 2: Detect raw HTML output (not in code block)
        // Look for HTML that starts with <!DOCTYPE or <html
        const rawHtmlRegex = /(<!doctype\s+html[\s\S]*?<\/html>)/gi
        const rawMatches = [...contentWithoutSources.matchAll(rawHtmlRegex)]

        for (const match of rawMatches) {
            const htmlContent = match[1]?.trim() || ''
            // Lower threshold from 1500 to 500 chars
            if (htmlContent.length > 500) {
                return {
                    fullMatch: match[0],
                    htmlContent,
                    isCanvasOutput: true,
                    type: 'raw',
                    language: 'html'
                }
            }
        }

        // Strategy 3: Look for HTML starting with <html (without doctype)
        const htmlTagRegex = /(<html[\s\S]*?<\/html>)/gi
        const htmlTagMatches = [...contentWithoutSources.matchAll(htmlTagRegex)]

        for (const match of htmlTagMatches) {
            const htmlContent = match[1]?.trim() || ''
            // Lower threshold from 1500 to 500 chars
            if (htmlContent.length > 500) {
                return {
                    fullMatch: match[0],
                    htmlContent,
                    isCanvasOutput: true,
                    type: 'raw',
                    language: 'html'
                }
            }
        }

        return null
    }, [contentWithoutSources])

    // 🖊️ Detect Canvas Markdown output (```canvas ... ``` blocks)
    const canvasMarkdownData = useMemo(() => {
        if (!contentWithoutSources) return null
        const canvasBlockRegex = /```canvas\s*\n([\s\S]*?)```/gi
        const matches = [...contentWithoutSources.matchAll(canvasBlockRegex)]
        for (const match of matches) {
            const mdContent = match[1]?.trim() || ''
            if (mdContent.length > 0) {
                return { fullMatch: match[0], mdContent, isCanvasOutput: true, language: 'markdown' }
            }
        }
        return null
    }, [contentWithoutSources])

    // 🎨 Detect SVG output (```svg or inline svg)
    const canvasSvgData = useMemo(() => {
        if (!contentWithoutSources) return null

        // Match ```svg code blocks
        const svgCodeBlockRegex = /```svg\s*\n([\s\S]*?)```/gi
        const svgCodeMatches = [...contentWithoutSources.matchAll(svgCodeBlockRegex)]

        for (const match of svgCodeMatches) {
            const svgContent = match[1]?.trim() || ''
            if (svgContent.length > 100 && svgContent.includes('<svg')) {
                return {
                    fullMatch: match[0],
                    svgContent,
                    isCanvasOutput: true,
                    type: 'codeblock',
                    language: 'svg'
                }
            }
        }

        // Match inline SVG tags
        const inlineSvgRegex = /(<svg[\s\S]*?<\/svg>)/gi
        const inlineSvgMatches = [...contentWithoutSources.matchAll(inlineSvgRegex)]

        for (const match of inlineSvgMatches) {
            const svgContent = match[1]?.trim() || ''
            if (svgContent.length > 200) {
                return {
                    fullMatch: match[0],
                    svgContent,
                    isCanvasOutput: true,
                    type: 'raw',
                    language: 'svg'
                }
            }
        }

        return null
    }, [contentWithoutSources])

    // ⚛️ Detect React/JSX output
    const canvasReactData = useMemo(() => {
        if (!contentWithoutSources) return null

        // Match ```jsx, ```tsx, ```react code blocks
        const reactCodeBlockRegex = /```(?:jsx|tsx|react)\s*\n([\s\S]*?)```/gi
        const reactCodeMatches = [...contentWithoutSources.matchAll(reactCodeBlockRegex)]

        for (const match of reactCodeMatches) {
            const reactContent = match[1]?.trim() || ''
            if (reactContent.length > 300) {
                return {
                    fullMatch: match[0],
                    reactContent,
                    isCanvasOutput: true,
                    type: 'codeblock',
                    language: 'jsx'
                }
            }
        }

        return null
    }, [contentWithoutSources])

    // 🎨 Detect CSS output
    const canvasCssData = useMemo(() => {
        if (!contentWithoutSources) return null

        // Match ```css code blocks with substantial content
        const cssCodeBlockRegex = /```css\s*\n([\s\S]*?)```/gi
        const cssCodeMatches = [...contentWithoutSources.matchAll(cssCodeBlockRegex)]

        for (const match of cssCodeMatches) {
            const cssContent = match[1]?.trim() || ''
            // Only auto-open if it's a complete stylesheet (has multiple rules)
            if (cssContent.length > 400 && (cssContent.match(/\{[\s\S]*?\}/g) || []).length > 3) {
                return {
                    fullMatch: match[0],
                    cssContent,
                    isCanvasOutput: true,
                    type: 'codeblock',
                    language: 'css'
                }
            }
        }

        return null
    }, [contentWithoutSources])

    // Get detected intent for auto-open decision
    const detectedIntent = useArtifactStore((state) => state.detectedIntent)

    // Auto-open canvas panel when HTML is detected (ALWAYS auto-open for substantial HTML)
    useEffect(() => {
        if (
            canvasHtmlData?.isCanvasOutput &&
            !canvasOpenedRef.current &&
            !isLoading
        ) {
            canvasOpenedRef.current = true
            setCanvasAutoOpened(true)

            // ENHANCEMENT: Auto-open for ANY substantial HTML, regardless of intent
            // This ensures code examples in responses also open in canvas
            const shouldAutoCollapse = detectedIntent === 'CREATE_CANVAS'

            // Auto-dispatch the open-code-preview event
            window.dispatchEvent(
                new CustomEvent("open-code-preview", {
                    detail: {
                        content: canvasHtmlData.htmlContent,
                        language: "html",
                        type: "code",
                        autoCollapse: shouldAutoCollapse,
                        title: "HTML Preview"
                    },
                })
            )
        }
    }, [canvasHtmlData, isLoading, detectedIntent])

    // Auto-open canvas panel when markdown canvas block is detected
    useEffect(() => {
        if (
            canvasMarkdownData?.isCanvasOutput &&
            !markdownCanvasOpenedRef.current &&
            !isLoading
        ) {
            markdownCanvasOpenedRef.current = true
            setMarkdownCanvasAutoOpened(true)
            window.dispatchEvent(
                new CustomEvent("open-code-preview", {
                    detail: {
                        content: canvasMarkdownData.mdContent,
                        language: "markdown",
                        type: "markdown",
                        title: "Canvas Output",
                    },
                })
            )
        }
    }, [canvasMarkdownData, isLoading])

    // Auto-open canvas panel when SVG is detected
    useEffect(() => {
        if (
            canvasSvgData?.isCanvasOutput &&
            !svgOpenedRef.current &&
            !isLoading
        ) {
            svgOpenedRef.current = true
            window.dispatchEvent(
                new CustomEvent("open-code-preview", {
                    detail: {
                        content: canvasSvgData.svgContent,
                        language: "svg",
                        type: "code",
                        title: "SVG Preview",
                    },
                })
            )
        }
    }, [canvasSvgData, isLoading])

    // Auto-open canvas panel when React/JSX is detected
    useEffect(() => {
        if (
            canvasReactData?.isCanvasOutput &&
            !reactOpenedRef.current &&
            !isLoading
        ) {
            reactOpenedRef.current = true
            window.dispatchEvent(
                new CustomEvent("open-code-preview", {
                    detail: {
                        content: canvasReactData.reactContent,
                        language: "jsx",
                        type: "code",
                        title: "React Component",
                    },
                })
            )
        }
    }, [canvasReactData, isLoading])

    // Auto-open canvas panel when CSS is detected
    useEffect(() => {
        if (
            canvasCssData?.isCanvasOutput &&
            !cssOpenedRef.current &&
            !isLoading
        ) {
            cssOpenedRef.current = true
            window.dispatchEvent(
                new CustomEvent("open-code-preview", {
                    detail: {
                        content: canvasCssData.cssContent,
                        language: "css",
                        type: "code",
                        title: "CSS Stylesheet",
                    },
                })
            )
        }
    }, [canvasCssData, isLoading])

    // Content without canvas blocks (to show cards instead)
    const contentForDisplay = useMemo(() => {
        let display = contentWithoutSources || ''
        if (canvasHtmlData?.isCanvasOutput) {
            display = display.replace(canvasHtmlData.fullMatch, '').trim()
        }
        if (canvasMarkdownData?.isCanvasOutput) {
            display = display.replace(canvasMarkdownData.fullMatch, '').trim()
        }
        if (canvasSvgData?.isCanvasOutput) {
            display = display.replace(canvasSvgData.fullMatch, '').trim()
        }
        if (canvasReactData?.isCanvasOutput) {
            display = display.replace(canvasReactData.fullMatch, '').trim()
        }
        if (canvasCssData?.isCanvasOutput) {
            display = display.replace(canvasCssData.fullMatch, '').trim()
        }
        return display
    }, [contentWithoutSources, canvasHtmlData, canvasMarkdownData, canvasSvgData, canvasReactData, canvasCssData])

    // Helper to get favicon URL
    const getFaviconUrl = (url: string) => {
        try {
            const hostname = new URL(url).hostname
            return `https://www.google.com/s2/favicons?domain=${hostname}&sz=32`
        } catch {
            return null
        }
    }

    return (
        <>
            <div className="w-full animate-in py-4 duration-150 ease-out fade-in slide-in-from-bottom-1" data-role="assistant">
                {/*
                    ⭐ REASONING SECTION using AI Elements
                    This should be wrapped in <Conversation> for proper context
                    Reasoning parts are detected from parts array (type='reasoning') or from database
                */}
                {
                    ((reasoning && reasoning.trim()) || (isLoading && !content?.trim())) && (
                        <div className="mb-3 px-2 ml-12">
                            <Reasoning
                                className="w-full"
                                isStreaming={isLoading}
                            >
                                <ReasoningTrigger />
                                {/* <ReasoningContent>{reasoning || thinkingMessage}</ReasoningContent> */}
                            </Reasoning>
                        </div>
                    )}

                {/* 🎨 Canvas Output Card - Show when canvas HTML is detected */}
                {canvasHtmlData?.isCanvasOutput && canvasAutoOpened && (
                    <div className="flex gap-4 px-2 mb-4">
                        <div className="flex-shrink-0 pt-1">
                            <div className="flex size-8 items-center justify-center rounded-full">
                                <Image src="/bmaster-icon.png" alt="Assistant" width={24} height={24} style={{ width: "auto", height: "24px" }} unoptimized />
                            </div>
                        </div>
                        <div className="flex-1">
                            <div className="rounded-xl border border-violet-200 dark:border-violet-800 bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-950/30 dark:to-purple-950/30 p-4 shadow-sm">
                                <div className="flex items-start gap-3">
                                    <div className="flex-shrink-0 p-2 rounded-lg bg-violet-100 dark:bg-violet-900/50">
                                        <Palette className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-semibold text-sm text-violet-900 dark:text-violet-100 mb-1">
                                            Canvas Output Generated
                                        </h4>
                                        <p className="text-xs text-violet-600 dark:text-violet-300 mb-3">
                                            Your HTML page is ready. View it in the preview panel on the right.
                                        </p>
                                        <div className="flex flex-wrap gap-2">
                                            <Button
                                                size="sm"
                                                variant="default"
                                                className="h-8 gap-1.5 bg-violet-600 hover:bg-violet-700 text-white"
                                                onClick={() => {
                                                    window.dispatchEvent(
                                                        new CustomEvent("open-code-preview", {
                                                            detail: {
                                                                content: canvasHtmlData.htmlContent,
                                                                language: "html",
                                                                type: "code"
                                                            },
                                                        })
                                                    )
                                                }}
                                            >
                                                <Eye className="h-3.5 w-3.5" />
                                                View Preview
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="h-8 gap-1.5 border-violet-300 dark:border-violet-700 text-violet-700 dark:text-violet-300 hover:bg-violet-100 dark:hover:bg-violet-900/50 hover:text-black"
                                                onClick={() => {
                                                    navigator.clipboard.writeText(canvasHtmlData.htmlContent)
                                                    toast.success("HTML code copied to clipboard")
                                                }}
                                            >
                                                <Copy className="h-3.5 w-3.5" />
                                                Copy Code
                                            </Button>
                                            {isAskBMode ? (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="h-8 gap-1.5 border-violet-300 dark:border-violet-700 text-violet-700 dark:text-violet-300 hover:bg-violet-100 dark:hover:bg-violet-900/50 hover:text-black"
                                                    onClick={() => openSaveDialog(canvasHtmlData.htmlContent, 'html')}
                                                >
                                                    <Bookmark className="h-3.5 w-3.5" />
                                                    Save as Artifact
                                                </Button>
                                            ) : (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="h-8 gap-1.5 border-violet-300 dark:border-violet-700 text-violet-700 dark:text-violet-300 hover:bg-violet-100 dark:hover:bg-violet-900/50 hover:text-black"
                                                    onClick={() => handleShareCanvas(canvasHtmlData.htmlContent, 'html')}
                                                    title={savedCanvasArtifactId ? "Share with contacts" : "Save and share with contacts"}
                                                >
                                                    <Share2 className="h-3.5 w-3.5" />
                                                    {savedCanvasArtifactId ? "Share" : "Save & Share"}
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* 🖊️ Markdown Canvas Output Card */}
                {canvasMarkdownData?.isCanvasOutput && markdownCanvasAutoOpened && (
                    <div className="flex gap-4 px-2 mb-4">
                        <div className="flex-shrink-0 pt-1">
                            <div className="flex size-8 items-center justify-center rounded-full">
                                <Image src="/bmaster-icon.png" alt="Assistant" width={24} height={24} style={{ width: "auto", height: "24px" }} unoptimized />
                            </div>
                        </div>
                        <div className="flex-1">
                            <div className="rounded-xl border border-blue-200 dark:border-blue-800 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 p-4 shadow-sm">
                                <div className="flex items-start gap-3">
                                    <div className="flex-shrink-0 p-2 rounded-lg bg-blue-100 dark:bg-blue-900/50">
                                        <Code2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-semibold text-sm text-blue-900 dark:text-blue-100 mb-1">Canvas Output</h4>
                                        <p className="text-xs text-blue-600 dark:text-blue-300 mb-3">Your response is displayed in the canvas panel on the right.</p>
                                        <div className="flex flex-wrap gap-2">
                                            <Button
                                                size="sm"
                                                variant="default"
                                                className="h-8 gap-1.5 bg-blue-600 hover:bg-blue-700 text-white"
                                                onClick={() => window.dispatchEvent(new CustomEvent("open-code-preview", {
                                                    detail: { content: canvasMarkdownData.mdContent, language: "markdown", type: "markdown", title: "Canvas Output" }
                                                }))}
                                            >
                                                <Eye className="h-3.5 w-3.5" />
                                                View in Canvas
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="h-8 gap-1.5"
                                                onClick={() => { navigator.clipboard.writeText(canvasMarkdownData.mdContent); toast.success("Copied to clipboard") }}
                                            >
                                                <Copy className="h-3.5 w-3.5" />
                                                Copy
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {((contentForDisplay && contentForDisplay.trim().length > 0) || (canvasHtmlData?.isCanvasOutput && !canvasAutoOpened) || (canvasMarkdownData?.isCanvasOutput && !markdownCanvasAutoOpened)) && (
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
                                                    // Skip SyntaxHighlighter for large code blocks to prevent performance issues
                                                    const isLargeBlock = rawCode.length > 5000

                                                    return (
                                                        <div className="not-prose my-3 w-full">
                                                            <div className="relative group/codeblock">
                                                                <button
                                                                    onClick={() =>
                                                                        window.dispatchEvent(
                                                                            new CustomEvent("open-code-preview", {
                                                                                detail: { content: rawCode, language },
                                                                            })
                                                                        )
                                                                    }
                                                                    className="absolute top-2 right-2 z-10 px-2.5 py-1 text-xs font-medium rounded bg-white text-gray-800 border border-gray-200 shadow-sm opacity-0 group-hover/codeblock:opacity-100 transition-opacity duration-150"
                                                                >
                                                                    Preview
                                                                </button>
                                                                {/* Save as Artifact button */}
                                                                {(() => {
                                                                    const blockKey = rawCode.slice(0, 40)
                                                                    const saveState = savingBlocks[blockKey] ?? 'idle'
                                                                    return (
                                                                        <button
                                                                            disabled={saveState === 'saving'}
                                                                            onClick={() => openSaveDialog(rawCode, language)}
                                                                            className="absolute top-2 right-[5.5rem] z-10 flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded bg-white text-gray-800 border border-gray-200 shadow-sm opacity-0 group-hover/codeblock:opacity-100 transition-opacity duration-150 disabled:opacity-60"
                                                                        >
                                                                            {saveState === 'saving' ? (
                                                                                <><Loader2 className="h-3 w-3 animate-spin" />Saving…</>
                                                                            ) : saveState === 'saved' ? (
                                                                                <><Check className="h-3 w-3 text-green-600" />Saved</>
                                                                            ) : (
                                                                                <><Bookmark className="h-3 w-3" />Save</>
                                                                            )}
                                                                        </button>
                                                                    )
                                                                })()}
                                                                <div className="w-full overflow-x-auto rounded-lg border border-border bg-white">
                                                                    {/* Use plain pre/code for large blocks to prevent browser freezing */}
                                                                    {isLargeBlock ? (
                                                                        <pre
                                                                            style={{
                                                                                margin: 0,
                                                                                padding: "1rem",
                                                                                fontSize: "0.875rem",
                                                                                background: "#ffffff",
                                                                                overflow: "auto",
                                                                                maxHeight: "400px",
                                                                            }}
                                                                        >
                                                                            <code className="text-sm font-mono text-gray-800 whitespace-pre">
                                                                                {rawCode}
                                                                            </code>
                                                                        </pre>
                                                                    ) : (
                                                                        <SyntaxHighlighter
                                                                            language={language}
                                                                            style={oneLight}
                                                                            PreTag="pre"
                                                                            customStyle={{
                                                                                margin: 0,
                                                                                padding: "1rem",
                                                                                fontSize: "0.875rem",
                                                                                background: "#ffffff",
                                                                                width: "fit-content",
                                                                                minWidth: "max-content",
                                                                            }}
                                                                        >
                                                                            {rawCode}
                                                                        </SyntaxHighlighter>
                                                                    )}
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
                                        {contentForDisplay || (isLoading ? " " : "")}
                                    </ReactMarkdown>

                                </div>
                            </div>

                            {/* ⭐ SOURCES SECTION - Beautiful collapsible display */}
                            {sources.length > 0 && (
                                <div className="mt-4">
                                    <Sources>
                                        <SourcesTrigger count={sources.length} className="text-muted-foreground hover:text-primary transition-colors">
                                            <Globe className="h-4 w-4" />
                                            <span className="font-medium">
                                                {sources.length} {sources.length === 1 ? 'source' : 'sources'}
                                            </span>
                                            <ChevronDown className="h-4 w-4 transition-transform [[data-state=open]_&]:rotate-180" />
                                        </SourcesTrigger>
                                        <SourcesContent className="mt-2 flex flex-col gap-1.5">
                                            {sources.map((source, idx) => (
                                                <Source
                                                    key={`${source.url}-${idx}`}
                                                    href={source.url}
                                                    title={source.title}
                                                    className="group flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                                                >
                                                    <div className="flex-shrink-0 w-5 h-5 rounded overflow-hidden bg-background flex items-center justify-center">
                                                        <img
                                                            src={getFaviconUrl(source.url) || ''}
                                                            alt=""
                                                            className="w-4 h-4"
                                                            onError={(e) => {
                                                                (e.target as HTMLImageElement).style.display = 'none';
                                                                (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                                                            }}
                                                        />
                                                        <Globe className="w-3 h-3 text-muted-foreground hidden" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <span className="block text-sm font-medium truncate group-hover:text-primary transition-colors">
                                                            {source.title}
                                                        </span>
                                                        {source.description && (
                                                            <span className="block text-xs text-muted-foreground truncate">
                                                                {source.description}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <ExternalLink className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                                                </Source>
                                            ))}
                                        </SourcesContent>
                                    </Sources>
                                </div>
                            )}

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
                )}
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

            {/* Save Code as Artifact — Name Dialog */}
            <Dialog
                open={saveDialog.open}
                onOpenChange={(open) => !open && setSaveDialog(prev => ({ ...prev, open: false }))}
            >
                <DialogContent className="sm:max-w-md" onOpenAutoFocus={(e) => { e.preventDefault(); nameInputRef.current?.focus() }}>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            {saveDialog.shareAfter ? (
                                <>
                                    <Share2 className="h-4 w-4 text-primary" />
                                    Save & Share Artifact
                                </>
                            ) : (
                                <>
                                    <Bookmark className="h-4 w-4 text-primary" />
                                    Save as Artifact
                                </>
                            )}
                        </DialogTitle>
                        <DialogDescription>
                            {saveDialog.shareAfter
                                ? "Name your artifact. After saving, you can share it with your contacts."
                                : "Give your artifact a name. You can rename it later from the artifacts page."
                            }
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-2">
                        <div className="mb-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                            Artifact name
                        </div>
                        <Input
                            ref={nameInputRef}
                            value={saveDialog.name}
                            onChange={(e) => setSaveDialog(prev => ({ ...prev, name: e.target.value }))}
                            onKeyDown={(e) => { if (e.key === 'Enter' && saveDialog.name.trim()) handleSaveAsArtifact() }}
                            placeholder="e.g. Login form component"
                            className="text-sm"
                            maxLength={80}
                        />
                        <div className="mt-1.5 flex items-center justify-between text-xs text-muted-foreground">
                            <span className="font-mono bg-muted px-1.5 py-0.5 rounded">
                                {saveDialog.language}
                            </span>
                            <span>{saveDialog.name.length}/80</span>
                        </div>
                    </div>

                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button
                            variant="outline"
                            onClick={() => setSaveDialog(prev => ({ ...prev, open: false }))}
                        >
                            Cancel
                        </Button>
                        <Button
                            disabled={!saveDialog.name.trim()}
                            onClick={handleSaveAsArtifact}
                            className="gap-1.5"
                        >
                            {saveDialog.shareAfter ? (
                                <>
                                    <Share2 className="h-3.5 w-3.5" />
                                    Save & Share
                                </>
                            ) : (
                                <>
                                    <Bookmark className="h-3.5 w-3.5" />
                                    Save Artifact
                                </>
                            )}
                        </Button>
                    </DialogFooter>
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

            {/* Share Artifact Dialog (for Canvas Output) */}
            {savedCanvasArtifactId && assistantId && (
                <ShareArtifactDialog
                    open={shareArtifactDialogOpen}
                    onOpenChange={setShareArtifactDialogOpen}
                    artifactId={savedCanvasArtifactId}
                    artifactName={savedCanvasArtifactName}
                    assistantId={assistantId}
                />
            )}
        </>
    )
}