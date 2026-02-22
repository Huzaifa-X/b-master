"use client"

import { BCoderChat } from "@/components/b-coder/b-coder-chat"
import { MonacoEditorPanel } from "@/components/b-coder/monaco-editor-panel"
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable"
import { BCoderProvider } from "@/components/b-coder/b-coder-context"

interface BCoderChatViewProps {
    assistantId: string
    templateId: string
}

export function BCoderChatView({ assistantId, templateId }: BCoderChatViewProps) {
    return (
        <div className="h-full bg-gradient-to-br from-emerald-50/30 via-background to-cyan-50/30 dark:from-emerald-950/10 dark:via-background dark:to-cyan-950/10">
            <BCoderProvider templateId={templateId}>
                <ResizablePanelGroup direction="horizontal">
                    {/* Left Panel - Chat */}
                    <ResizablePanel defaultSize={60} minSize={30}>
                        <div className="h-full overflow-hidden">
                            <BCoderChat assistantId={assistantId} templateId={templateId} />
                        </div>
                    </ResizablePanel>

                    {/* Resize Handle */}
                    <ResizableHandle withHandle className="bg-border/50 hover:bg-emerald-500/20 transition-colors" />

                    {/* Right Panel - Monaco Editor */}
                    <ResizablePanel defaultSize={40} minSize={25}>
                        <MonacoEditorPanel templateId={templateId} />
                    </ResizablePanel>
                </ResizablePanelGroup>
            </BCoderProvider>
        </div>
    )
}
