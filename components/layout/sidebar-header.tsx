"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { ArrowLeftFromLine, ArrowRightFromLine, PanelLeft, Gift } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useSidebar } from "@/components/ui/sidebar"
import { useRouter } from "next/navigation"
import { getActivePromotionForUser } from "@/app/actions/promotion.action"
import { Badge } from "@/components/ui/badge"

export function Header() {
    const { state, toggleSidebar } = useSidebar()
    const [isHovered, setIsHovered] = useState(false)
    const [promo, setPromo] = useState<any>(null)
    const isCollapsed = state === "collapsed"
    const router = useRouter()

    useEffect(() => {
        const fetchPromo = async () => {
            const activePromo = await getActivePromotionForUser()
            if (activePromo) {
                setPromo(activePromo)
            }
        }
        fetchPromo()
    }, [])

    return (
        <div className="flex flex-col gap-2 p-2">
            <div className="flex items-center justify-between gap-2 px-2 group-data-[collapsible=icon]:justify-center">
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
            {!isCollapsed && promo && (
                <div className="mt-2 px-2 pb-2">
                    <Badge variant="secondary" className="w-full flex justify-center py-1.5 cursor-pointer bg-amber-100 text-amber-800 hover:bg-amber-200 border-amber-200" onClick={() => router.push("/pricing")}>
                        <Gift className="w-3.5 h-3.5 mr-1" />
                        {promo.discountPercent ? `${promo.discountPercent}% OFF` : `$${promo.discountAmount} OFF`} GIFT
                    </Badge>
                </div>
            )}
        </div>
    )
}
