import type { FC } from "react";
import { useEffect } from "react";
import {
  ThreadListItemPrimitive,
  ThreadListPrimitive,
  useAssistantRuntime,
  useAssistantState,
} from "@assistant-ui/react";
import { ArchiveIcon, MoreHorizontal, Pencil, PlusIcon, Share, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

import { TooltipIconButton } from "@/components/assistant-ui/tooltip-icon-button";
import { Skeleton } from "@/components/ui/skeleton";
import { SidebarMenu, SidebarMenuAction, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useIsMobile } from "@/hooks/use-mobile";

export const ThreadList: FC = () => {
  return (
    <ThreadListPrimitive.Root className="aui-root aui-thread-list-root">
      <SidebarMenu>
        <ThreadListItems />
      </SidebarMenu>
    </ThreadListPrimitive.Root>
  );
};

export const ThreadListNew: FC = () => {
  const router = useRouter();
  const runtime = useAssistantRuntime();
  
  const handleNewChat = async () => {
    // Use the runtime's method to create a new thread
    runtime.switchToNewThread();
    
    // Then navigate if needed
    router.push("/ask-b");
  };

  return (
    <SidebarMenuItem key={"New Chat"}>
      <SidebarMenuButton tooltip={"New Chat"} onClick={handleNewChat}>
        <PlusIcon className="text-primary transition-all duration-300 ease-in-out group-hover/nav-item:scale-110 group-hover/nav-item:rotate-3" />
        <span className="transition-all duration-300 ease-in-out group-hover/nav-item:translate-x-1">
          New Chat
        </span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
};

const ThreadListItems: FC = () => {
  const isLoading = useAssistantState(({ threads }) => threads.isLoading);

  if (isLoading) {
    return <ThreadListSkeleton />;
  }

  return <ThreadListPrimitive.Items components={{ ThreadListItem }} />;
};

export const ThreadListSkeleton: FC = () => {
  return (
    <>
      {Array.from({ length: 5 }, (_, i) => (
        <div
          key={i}
          role="status"
          aria-label="Loading threads"
          aria-live="polite"
          className="aui-thread-list-skeleton-wrapper flex items-center gap-2 rounded-md px-3 py-2"
        >
          <Skeleton className="aui-thread-list-skeleton h-[22px] flex-grow" />
        </div>
      ))}
    </>
  );
};

const ThreadListItem: FC = () => {
  const isMobile = useIsMobile();
  return (
    <ThreadListItemPrimitive.Root asChild>
      <SidebarMenuItem className="aui-thread-list-item">
        <ThreadListItemPrimitive.Trigger asChild>
          <SidebarMenuButton className="aui-thread-list-item-trigger">
            <ThreadListItemTitle />
          </SidebarMenuButton>
        </ThreadListItemPrimitive.Trigger>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuAction showOnHover>
              <MoreHorizontal />
            </SidebarMenuAction>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-48 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align={isMobile ? "end" : "start"}
          >
            <DropdownMenuItem className="text-muted-foreground focus:!text-muted-foreground focus:!bg-muted">
              <Pencil className="text-muted-foreground focus:!text-muted-foreground focus:!bg-muted" />
              <span>Rename</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-muted-foreground focus:!text-muted-foreground focus:!bg-muted">
              <ArchiveIcon className="text-muted-foreground focus:!text-muted-foreground focus:!bg-muted" />
              <span>Archive</span>
            </DropdownMenuItem>
            <DropdownMenuItem className="text-destructive focus:!text-destructive focus:!bg-destructive/10">
              <Trash2 className="text-destructive focus:!text-destructive focus:!bg-destructive/10" />
              <span>Delete</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </ThreadListItemPrimitive.Root>
  );
};

const ThreadListItemTitle: FC = () => {
  return (
    <span className="aui-thread-list-item-title text-sm">
      <ThreadListItemPrimitive.Title fallback="New Chat" />
    </span>
  );
};

const ThreadListItemArchive: FC = () => {
  return (
    <ThreadListItemPrimitive.Archive asChild>
      <TooltipIconButton
        className="aui-thread-list-item-archive mr-3 ml-auto size-4 p-0 text-foreground hover:text-primary"
        variant="ghost"
        tooltip="Archive thread"
      >
        <ArchiveIcon />
      </TooltipIconButton>
    </ThreadListItemPrimitive.Archive>
  );
};
