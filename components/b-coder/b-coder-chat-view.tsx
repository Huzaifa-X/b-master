"use client"

import { useState } from "react"
import { BCoderChat } from "@/components/b-coder/b-coder-chat"
import { MonacoEditorPanel } from "@/components/b-coder/monaco-editor-panel"
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable"
import { BCoderProvider } from "@/components/b-coder/b-coder-context"
import { MessageSquare, Code2 } from "lucide-react"

interface BCoderChatViewProps {
    assistantId: string
    templateId: string
    artifactId?: string | null
}

export function BCoderChatView({ assistantId, templateId, artifactId }: BCoderChatViewProps) {
    const [activeTab, setActiveTab] = useState<'chat' | 'code'>('chat')

    return (
        <div className="h-full flex flex-col bg-gradient-to-br from-emerald-50/30 via-background to-cyan-50/30 dark:from-emerald-950/10 dark:via-background dark:to-cyan-950/10">
            <BCoderProvider assistantId={assistantId} templateId={templateId}>

                {/* Mobile Tab Navigation */}
                <div className="md:hidden flex p-2 border-b border-border/50 bg-background/50 backdrop-blur z-10 shrink-0">
                    <div className="flex w-full bg-muted/50 p-1 rounded-xl">
                        <button
                            onClick={() => setActiveTab('chat')}
                            className={`flex flex-1 items-center justify-center gap-2 py-2 px-3 text-sm font-medium rounded-lg transition-all ${activeTab === 'chat'
                                ? 'bg-white dark:bg-zinc-800 shadow-sm text-foreground'
                                : 'text-muted-foreground hover:text-foreground'
                                }`}
                        >
                            <MessageSquare className="w-4 h-4" />
                            Chat
                        </button>
                        <button
                            onClick={() => setActiveTab('code')}
                            className={`flex flex-1 items-center justify-center gap-2 py-2 px-3 text-sm font-medium rounded-lg transition-all ${activeTab === 'code'
                                ? 'bg-white dark:bg-zinc-800 shadow-sm text-foreground'
                                : 'text-muted-foreground hover:text-foreground'
                                }`}
                        >
                            <Code2 className="w-4 h-4" />
                            Code
                        </button>
                    </div>
                </div>

                <div className="flex-1 min-h-0">
                    <ResizablePanelGroup direction="horizontal">
                        {/* Left Panel - Chat */}
                        <ResizablePanel
                            defaultSize={60}
                            minSize={30}
                            className={`transition-all duration-300 ${activeTab !== 'chat' ? 'hidden md:block' : ''}`}
                        >
                            <div className="h-full overflow-hidden">
                                <BCoderChat assistantId={assistantId} templateId={templateId} artifactId={artifactId} />
                            </div>
                        </ResizablePanel>

                        {/* Resize Handle - Hidden on Mobile */}
                        <ResizableHandle
                            withHandle
                            className="hidden md:flex bg-border/50 hover:bg-emerald-500/20 transition-colors"
                        />

                        {/* Right Panel - Monaco Editor */}
                        <ResizablePanel
                            defaultSize={40}
                            minSize={25}
                            className={`transition-all duration-300 ${activeTab !== 'code' ? 'hidden md:block' : ''}`}
                        >
                            <MonacoEditorPanel templateId={templateId} assistantId={assistantId} />
                        </ResizablePanel>
                    </ResizablePanelGroup>
                </div>
            </BCoderProvider>
        </div>
    )
}
