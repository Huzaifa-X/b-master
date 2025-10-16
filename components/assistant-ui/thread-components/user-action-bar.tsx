"use client";

import { PencilIcon } from "lucide-react";
import { ActionBarPrimitive } from "@assistant-ui/react";
import type { FC } from "react";
import { TooltipIconButton } from "@/components/assistant-ui/tooltip-icon-button";

export const UserActionBar: FC = () => {
    return (
        <ActionBarPrimitive.Root
            hideWhenRunning
            autohide="not-last"
            className="aui-user-action-bar-root flex gap-1 text-muted-foreground"
        >
            <ActionBarPrimitive.Edit asChild>
                <TooltipIconButton tooltip="Edit" className="aui-user-action-edit">
                    <PencilIcon />
                </TooltipIconButton>
            </ActionBarPrimitive.Edit>
        </ActionBarPrimitive.Root>
    );
};

