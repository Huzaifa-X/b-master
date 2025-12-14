"use client"

import { useState, useEffect } from "react"
import { Tabs } from "@/components/ui/vercel-tabs"
import { AssistantCard } from "@/components/assistants/assistant-card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, Plus, Bot, Loader2, CheckCircle2, XCircle } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import Image from "next/image"
import { useAssistants } from "@/hooks/useAssistants"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { getAssistants } from "@/app/actions/assistant.action"
import { useDebounce } from "@/hooks/useDebounce"
import { Skeleton } from "@/components/ui/skeleton"
import { PurchaseAssistantDialog } from "@/components/assistants/purchase-assistant-dialog"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"

const TABS = [
    { id: "marketplace", label: "Marketplace Assistants" },
    { id: "my", label: "My Assistants" },
]

interface Assistant {
    id: string
    userId?: string
    name: string
    price: number
    description: string
    image: string
    category?: string
    createdAt?: string
}

export default function StorePage() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const queryClient = useQueryClient()
    const [activeTab, setActiveTab] = useState<"marketplace" | "my">("marketplace")
    const [searchQuery, setSearchQuery] = useState("")
    const debouncedSearch = useDebounce(searchQuery, 500)
    const [selectedAssistant, setSelectedAssistant] = useState<Assistant | null>(null)
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    
    // Success/Cancel dialog states
    const [showSuccessDialog, setShowSuccessDialog] = useState(false)
    const [showCancelDialog, setShowCancelDialog] = useState(false)
    const [processingPayment, setProcessingPayment] = useState(false)

    // For "My Assistants" tab - use the same hook as assistants page
    const {
        assistants: myAssistants,
        isLoading: isLoadingMy,
        isError: isErrorMy,
        error: errorMy,
    } = useAssistants({
        type: "my",
        search: debouncedSearch,
        limit: 100, // Get more for store page
    })

    // For "Marketplace Assistants" tab - get public assistants
    const {
        data: marketplaceData,
        isLoading: isLoadingMarketplace,
        isError: isErrorMarketplace,
        error: errorMarketplace,
    } = useQuery({
        queryKey: ["assistants", "public", debouncedSearch],
        queryFn: async () => {
            const result = await getAssistants({
                type: "public",
                search: debouncedSearch,
                limit: 100,
            })
            if (!result.success) {
                throw new Error(result.error || "Failed to fetch assistants")
            }
            return result
        },
        staleTime: 2 * 60 * 1000, // 2 minutes
    })

    const marketplaceAssistants = marketplaceData?.assistants || []

    const getCurrentAssistants = () => {
        switch (activeTab) {
            case "marketplace":
                return marketplaceAssistants
            case "my":
                return myAssistants || []
            default:
                return []
        }
    }

    const isLoading = activeTab === "marketplace" ? isLoadingMarketplace : isLoadingMy
    const isError = activeTab === "marketplace" ? isErrorMarketplace : isErrorMy
    const error = activeTab === "marketplace" ? errorMarketplace : errorMy
    const filteredAssistants = getCurrentAssistants()

    // Handle purchase success/cancel from Stripe redirect
    useEffect(() => {
        const purchase = searchParams.get("purchase")
        const sessionId = searchParams.get("session_id")

        if (purchase === "success" && sessionId) {
            setProcessingPayment(true)
            // Give webhook time to process (2 seconds)
            const timer = setTimeout(() => {
                setProcessingPayment(false)
                setShowSuccessDialog(true)
                // Invalidate queries to refresh the lists
                queryClient.invalidateQueries({ queryKey: ["assistants"] })
                // Clean URL
                router.replace("/store", { scroll: false })
            }, 2000)
            return () => clearTimeout(timer)
        } else if (purchase === "cancelled") {
            setShowCancelDialog(true)
            // Clean URL
            router.replace("/store", { scroll: false })
        }
    }, [searchParams, queryClient, router])

    // Reset search when tab changes
    useEffect(() => {
        setSearchQuery("")
    }, [activeTab])

    const handleCreateNew = () => {
        router.push("/assistants/add")
    }

    const handleMarketplaceClick = (assistant: Assistant) => {
        setSelectedAssistant(assistant)
        setIsDialogOpen(true)
    }

    return (
        <div className="h-full overflow-y-auto">
            <div className="container mx-auto py-4 px-4 max-w-4xl pb-16">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div>
                                <Image
                                    src="/storeLogo.svg"
                                    alt="B-Master Store"
                                    width={220}
                                    height={220}
                                />
                                <p className="text-muted-foreground mt-2">
                                    Discover and explore powerful assistants and resources to enhance your productivity and creativity.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Search Bar */}
                    <div className="mb-6">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search assistants..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                    </div>

                    {/* Tabs */}
                    <Tabs tabs={TABS} activeTab={activeTab} onTabChange={(tab) => setActiveTab(tab as typeof activeTab)} />
                </div>

                {/* Loading State */}
                {isLoading && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className="space-y-3">
                                <Skeleton className="h-48 w-full rounded-lg" />
                                <Skeleton className="h-4 w-3/4" />
                                <Skeleton className="h-4 w-1/2" />
                            </div>
                        ))}
                    </div>
                )}

                {/* Error State */}
                {isError && (
                    <div className="text-center py-16">
                        <Bot className="h-16 w-16 mx-auto mb-4 text-destructive" />
                        <h3 className="text-lg font-semibold mb-2">Error loading assistants</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                            {typeof error === "string" ? error : error?.message || "Something went wrong"}
                        </p>
                    </div>
                )}

                {/* Assistants Grid */}
                {!isLoading && !isError && (
                    <>
                        {filteredAssistants.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6">
                                {filteredAssistants.map((assistant) => (
                                    <AssistantCard
                                        key={assistant.id}
                                        assistant={{
                                            id: assistant.id,
                                            userId: assistant.userId.toString(),
                                            name: assistant.name,
                                            price: assistant.price,
                                            description: assistant.description || "",
                                            image: assistant.image || "/bmaster-icon.png",
                                            category: assistant.category,
                                            createdAt: assistant.createdAt?.toString()
                                        }}
                                        tabType={activeTab}
                                        onMarketplaceClick={handleMarketplaceClick}
                                    />
                                ))}
                            </div>
                        ) : searchQuery ? (
                            <div className="text-center py-16">
                                <Search className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                                <h3 className="text-lg font-semibold mb-2">No results found</h3>
                                <p className="text-sm text-muted-foreground">
                                    Try searching with different keywords
                                </p>
                            </div>
                        ) : (
                            <div className="text-center py-16">
                                <Bot className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                                <h3 className="text-lg font-semibold mb-2">
                                    {activeTab === "my" && "No assistants created yet"}
                                    {activeTab === "marketplace" && "No marketplace assistants"}
                                </h3>
                                <p className="text-sm text-muted-foreground mb-4">
                                    {activeTab === "my" && "Create your first assistant to get started"}
                                    {activeTab === "marketplace" && "Browse the marketplace to discover assistants"}
                                </p>
                                {activeTab === "my" && (
                                    <Button onClick={handleCreateNew} className="mt-4">
                                        <Plus className="mr-2 h-4 w-4" />
                                        Create Assistant
                                    </Button>
                                )}
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Purchase Dialog */}
            <PurchaseAssistantDialog
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                assistant={selectedAssistant}
            />

            {/* Processing Payment Dialog */}
            <Dialog open={processingPayment} onOpenChange={() => {}}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader className="text-center">
                        <Loader2 className="h-16 w-16 mx-auto mb-4 animate-spin text-[#BDA76D]" />
                        <DialogTitle className="text-2xl">Processing Payment...</DialogTitle>
                        <DialogDescription>
                            Please wait while we confirm your purchase
                        </DialogDescription>
                    </DialogHeader>
                </DialogContent>
            </Dialog>

            {/* Success Dialog */}
            <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader className="text-center">
                        <CheckCircle2 className="h-16 w-16 mx-auto mb-4 text-green-500" />
                        <DialogTitle className="text-2xl">Purchase Successful!</DialogTitle>
                        <DialogDescription className="text-base pt-2">
                            Congratulations! Your assistant purchase is complete. 
                            The assistant has been added to your collection.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="sm:justify-center">
                        <Button
                            onClick={() => {
                                setShowSuccessDialog(false)
                                setActiveTab("my")
                                router.push("/assistants")
                            }}
                            className="bg-[#BDA76D] hover:bg-[#BDA76D]/90"
                        >
                            View My Assistants
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Cancel Dialog */}
            <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader className="text-center">
                        <XCircle className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                        <DialogTitle className="text-2xl">Purchase Cancelled</DialogTitle>
                        <DialogDescription className="text-base pt-2">
                            Your purchase was cancelled. No charges were made.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="sm:justify-center">
                        <Button
                            onClick={() => setShowCancelDialog(false)}
                            variant="outline"
                        >
                            Continue Shopping
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}

