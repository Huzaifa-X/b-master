"use client"

import {
  ChevronsUpDown,
  DollarSign,
  Languages,
  LogOut,
  Sparkles,
  User,
  HelpCircle,
} from "lucide-react"

import {
  Avatar,
  AvatarFallback,
} from "@/components/ui/avatar"
import { PresignedAvatarImage } from "@/components/ui/presigned-avatar-image"
import { Skeleton } from "@/components/ui/skeleton"
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
import { useLocale } from "@/lib/i18n"

export function NavUser({
  user,
}: {
  user: NavUserType
}) {
  const { subscription, loading } = useSubscription()
  const { t, locale, setLocale } = useLocale()
  const router = useRouter()

  if (!user) {
    return null
  }

  // Get plan name or default to "Free"
  const planName = subscription?.plan?.title || t("common.free")
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
                {loading ? (
                  <Skeleton className="h-3 w-16" />
                ) : (
                  <span className="truncate text-xs">{planName}</span>
                )}
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
                  {loading ? (
                    <Skeleton className="h-3 w-16" />
                  ) : (
                    <span className="truncate text-xs">{planName}</span>
                  )}
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup >
              <DropdownMenuItem className="text-black focus:!text-black focus:!bg-muted cursor-pointer" onClick={() => {
                router.push("/profile")
              }}>
                <User className="text-black focus:!text-black focus:!bg-muted" />
                {t("nav.profile")}
              </DropdownMenuItem>
              <DropdownMenuItem className="text-black focus:!text-black focus:!bg-muted cursor-pointer" onClick={() => {
                router.push("/assistants")
              }}>
                <Sparkles className="text-black focus:!text-black focus:!bg-muted" />
                {t("nav.myAssistants")}
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup >
              <DropdownMenuItem className="text-black focus:!text-black focus:!bg-muted cursor-pointer" onClick={() => {
                router.push("/pricing")
              }}>
                <DollarSign className="text-black focus:!text-black focus:!bg-muted" />
                {t("nav.upgradePlan")}
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-black focus:!text-black focus:!bg-muted cursor-pointer"
                onClick={() => window.dispatchEvent(new CustomEvent("bmaster:restart-tour"))}
              >
                <HelpCircle className="text-black focus:!text-black focus:!bg-muted" />
                {t("nav.replayTour")}
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-black focus:!text-black focus:!bg-muted cursor-pointer"
                onClick={() => setLocale(locale === "en" ? "fr" : "en")}
              >
                <Languages className="text-black focus:!text-black focus:!bg-muted" />
                {t("nav.language")}: {locale === "en" ? t("nav.french") : t("nav.english")}
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
                  toast.error(t("auth.signOutError"), { id: "logout" })
                }
              }}
            >
              <LogOut className="text-black focus:!text-black focus:!bg-muted" />
              {t("auth.signOut")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
