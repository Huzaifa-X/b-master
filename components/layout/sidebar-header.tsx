"use client"

import { useState } from "react"
import Image from "next/image"
import { ArrowLeftFromLine, ArrowRightFromLine, PanelLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useSidebar } from "@/components/ui/sidebar"
import { useRouter } from "next/navigation"

export function Header() {
    const { state, toggleSidebar } = useSidebar()
    const [isHovered, setIsHovered] = useState(false)
    const isCollapsed = state === "collapsed"
    const router = useRouter()
    return (
        <div className="flex items-center justify-between gap-2 px-4 py-2 group-data-[collapsible=icon]:justify-center">
            <div className="flex items-center gap-2 group-data-[collapsible=icon]:hidden cursor-pointer" onClick={() => router.push("/")}>
                <Image
                    src="/bmaster-logo.svg"
                    alt="B-Master Logo"
                    width={128}
                    height={24}
                    style={{ width: 'auto', height: 'auto', maxHeight: '24px' }}
                    unoptimized
                    priority
                />
            </div>
            <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:shrink-0 hover:bg-transparent hover:text-black"
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                onClick={toggleSidebar}
            >
                {isHovered ? (
                    isCollapsed ? (
                        <ArrowRightFromLine className="h-4 w-4" />
                    ) : (
                        <ArrowLeftFromLine className="h-4 w-4" />
                    )
                ) : (
                    <PanelLeft className="h-4 w-4" />
                )}
            </Button>
        </div>
    )
}
