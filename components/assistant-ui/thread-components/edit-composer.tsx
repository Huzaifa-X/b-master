"use client";

import { ComposerPrimitive } from "@assistant-ui/react";
import type { FC } from "react";
import { Button } from "@/components/ui/button";

export const EditComposer: FC = () => {
    return (
        <div className="aui-edit-composer-wrapper mx-auto w-full max-w-[var(--thread-max-width)] px-2 py-4">
            <div className="flex gap-4">
                {/* User Avatar */}
                <div className="flex-shrink-0 pt-1">
                    <div className="flex size-8 items-center justify-center rounded-full bg-muted">
                        <span className="text-sm font-medium">HT</span>
                    </div>
                </div>

                {/* Edit Composer */}
                <div className="flex-1 min-w-0">
                    <ComposerPrimitive.Root className="aui-edit-composer-root flex w-full flex-col rounded-xl border border-border bg-muted">
                        <ComposerPrimitive.Input
                            className="aui-edit-composer-input flex min-h-[60px] w-full resize-none bg-transparent p-4 text-foreground outline-none"
                            autoFocus
                        />

                        <div className="aui-edit-composer-footer mx-3 mb-3 flex items-center justify-end gap-2">
                            <ComposerPrimitive.Cancel asChild>
                                <Button variant="ghost" size="sm" aria-label="Cancel edit">
                                    Cancel
                                </Button>
                            </ComposerPrimitive.Cancel>
                            <ComposerPrimitive.Send asChild>
                                <Button size="sm" aria-label="Update message">
                                    Update
                                </Button>
                            </ComposerPrimitive.Send>
                        </div>
                    </ComposerPrimitive.Root>
                </div>
            </div>
        </div>
    );
};

