"use client";

import { ArrowUpIcon, Square, PanelRightOpen } from "lucide-react";
import { ComposerPrimitive, ThreadPrimitive } from "@assistant-ui/react";
import type { FC } from "react";
import { Button } from "@/components/ui/button";
import { TooltipIconButton } from "@/components/assistant-ui/tooltip-icon-button";
import { AttachmentDropdown } from "./attachment-dropdown";
import { DictateButton } from "./dictate-button";
import { useArtifactStore } from "@/lib/stores/artifact-store";
import { useRouter } from "next/navigation";

export const ComposerAction: FC = () => {
    const router = useRouter();
    const { togglePanel } = useArtifactStore();
    
    return (
        <div className="aui-composer-action-wrapper relative mx-1 mt-2 mb-2 flex items-center justify-between">
            <AttachmentDropdown />

            <div className="flex items-center gap-2">
                <TooltipIconButton
                    tooltip="Toggle artifact panel"
                    side="bottom"
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-[34px] rounded-full p-1"
                    aria-label="Toggle artifact panel"
                    onClick={togglePanel}
                >
                    <PanelRightOpen className="size-5" />
                </TooltipIconButton>

                <DictateButton />

                <ThreadPrimitive.If running={false}>
                    <ComposerPrimitive.Send asChild>
                        <TooltipIconButton
                            tooltip="Send message"
                            side="bottom"
                            type="submit"
                            variant="default"
                            size="icon"
                            className="aui-composer-send size-[34px] rounded-full p-1"
                            aria-label="Send message"
                            onClick={() => {
                                router.push("/ask-b");
                            }}
                        >
                            <ArrowUpIcon className="aui-composer-send-icon size-5" />
                        </TooltipIconButton>
                    </ComposerPrimitive.Send>
                </ThreadPrimitive.If>

                <ThreadPrimitive.If running>
                    <ComposerPrimitive.Cancel asChild>
                        <Button
                            type="button"
                            variant="default"
                            size="icon"
                            className="aui-composer-cancel size-[34px] rounded-full border border-muted-foreground/60 hover:bg-primary/75 dark:border-muted-foreground/90"
                            aria-label="Stop generating"
                        >
                            <Square className="aui-composer-cancel-icon size-3.5 fill-white dark:fill-black" />
                        </Button>
                    </ComposerPrimitive.Cancel>
                </ThreadPrimitive.If>
            </div>
        </div>
    );
};

