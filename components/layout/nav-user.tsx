"use client"

import {
  ChevronsUpDown,
  DollarSign,
  LogOut,
  Sparkles,
  User,
} from "lucide-react"

import {
  Avatar,
  AvatarFallback,
} from "@/components/ui/avatar"
import { PresignedAvatarImage } from "@/components/ui/presigned-avatar-image"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { signOut } from "next-auth/react"
import { NavUserType } from "@/types/user"
import { useSubscription } from "@/hooks/useSubscription"

export function NavUser({
  user,
}: {
  user: NavUserType
}) {
  const { subscription, loading } = useSubscription()
  const router = useRouter()

  if (!user) {
    return null
  }

  // Get plan name or default to "Free"
  const planName = subscription?.plan?.title || "Free"
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="h-8 w-8 rounded-lg">
                <PresignedAvatarImage src={user.image} />
                <AvatarFallback className="rounded-lg">{user.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{user.name}</span>
                <span className="truncate text-xs">{loading ? "Loading..." : planName}</span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg ml-2"
            side={"bottom"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <span className="text-xs text-muted-foreground px-2">{user.email}</span>
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                  <PresignedAvatarImage src={user.image} />
                  <AvatarFallback className="rounded-lg">{user.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{user.name}</span>
                  <span className="truncate text-xs">{loading ? "Loading..." : planName}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup >
              <DropdownMenuItem className="text-black focus:!text-black focus:!bg-muted cursor-pointer" onClick={() => {
                router.push("/profile")
              }}>
                <User className="text-black focus:!text-black focus:!bg-muted" />
                My Profile
              </DropdownMenuItem>
              <DropdownMenuItem className="text-black focus:!text-black focus:!bg-muted cursor-pointer" onClick={() => {
                router.push("/assistants")
              }}>
                <Sparkles className="text-black focus:!text-black focus:!bg-muted" />
                My Assistants
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup >
              <DropdownMenuItem className="text-black focus:!text-black focus:!bg-muted cursor-pointer" onClick={() => {
                router.push("/pricing")
              }}>
                <DollarSign className="text-black focus:!text-black focus:!bg-muted" />
                Upgrade Plan
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-black focus:!text-black focus:!bg-muted cursor-pointer"
              onClick={async () => {
                try {
                  await signOut({
                    redirect: false,
                    callbackUrl: "/login"
                  })

                  sessionStorage.clear()

                  // Redirect to login
                  router.push("/login")
                  router.refresh()
                } catch (error) {
                  toast.error("Failed to sign out", { id: "logout" })
                }
              }}
            >
              <LogOut className="text-black focus:!text-black focus:!bg-muted" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
