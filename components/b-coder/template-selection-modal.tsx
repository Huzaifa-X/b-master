"use client"

import { useState } from "react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogClose,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
    CheckCircle2,
    Calendar,
    Calculator,
    BarChart3,
    Code2,
    Lock,
    Layers,
    Globe,
    ShoppingBag,
    Search,
    PenTool,
    Image,
    TrendingUp,
    Tag,
    UserCircle2,
    Building2,
    Clipboard,
} from "lucide-react"
import { useLocale } from "@/lib/i18n"
import { cn } from "@/lib/utils"

interface TemplateOption {
    id: string
    name: string
    description: string
    icon: React.ReactNode
    isEnabled: boolean
    category: string
}

interface TemplateSelectionModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSelectTemplate: (templateId: string) => void
}

export function TemplateSelectionModal({
    open,
    onOpenChange,
    onSelectTemplate,
}: TemplateSelectionModalProps) {
    const { t } = useLocale()
    const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)

    const templates: TemplateOption[] = [
        // Starter Templates
        {
            id: "from-scratch",
            name: t("bCoder.templates.fromScratchName"),
            description: t("bCoder.templates.fromScratchDesc"),
            icon: <Layers className="h-8 w-8" />,
            isEnabled: true,
            category: t("bCoder.templates.categories.starter"),
        },
        {
            id: "default-todo",
            name: t("bCoder.templates.todoName"),
            description: t("bCoder.templates.todoDesc"),
            icon: <CheckCircle2 className="h-8 w-8" />,
            isEnabled: true,
            category: t("bCoder.templates.categories.starter"),
        },
        // Website & Landing
        {
            id: "website",
            name: t("bCoder.templates.websiteName"),
            description: t("bCoder.templates.websiteDesc"),
            icon: <Globe className="h-8 w-8" />,
            isEnabled: true,
            category: t("bCoder.templates.categories.marketing"),
        },
        // E-Commerce
        {
            id: "e-commerce",
            name: t("bCoder.templates.ecommerceName"),
            description: t("bCoder.templates.ecommerceDesc"),
            icon: <ShoppingBag className="h-8 w-8" />,
            isEnabled: true,
            category: t("bCoder.templates.categories.commerce"),
        },
        // Booking
        {
            id: "booking-system",
            name: t("bCoder.templates.bookingName"),
            description: t("bCoder.templates.bookingDesc"),
            icon: <Calendar className="h-8 w-8" />,
            isEnabled: true,
            category: t("bCoder.templates.categories.business"),
        },
        {
            id: "calendar-booking",
            name: t("bCoder.templates.calendarName"),
            description: t("bCoder.templates.calendarDesc"),
            icon: <Calendar className="h-8 w-8" />,
            isEnabled: true,
            category: t("bCoder.templates.categories.business"),
        },
        {
            id: "event-registration",
            name: t("bCoder.templates.eventName"),
            description: t("bCoder.templates.eventDesc"),
            icon: <Tag className="h-8 w-8" />,
            isEnabled: true,
            category: t("bCoder.templates.categories.business"),
        },
        {
            id: "meeting-scheduler",
            name: t("bCoder.templates.meetingName"),
            description: t("bCoder.templates.meetingDesc"),
            icon: <UserCircle2 className="h-8 w-8" />,
            isEnabled: true,
            category: t("bCoder.templates.categories.business"),
        },
        {
            id: "office-booking",
            name: t("bCoder.templates.officeName"),
            description: t("bCoder.templates.officeDesc"),
            icon: <Building2 className="h-8 w-8" />,
            isEnabled: true,
            category: t("bCoder.templates.categories.business"),
        },
        {
            id: "reservation-system",
            name: t("bCoder.templates.reservationName"),
            description: t("bCoder.templates.reservationDesc"),
            icon: <Clipboard className="h-8 w-8" />,
            isEnabled: true,
            category: t("bCoder.templates.categories.business"),
        },
        // Finance & Analytics
        {
            id: "accounting-dashboard",
            name: t("bCoder.templates.accountingName"),
            description: t("bCoder.templates.accountingDesc"),
            icon: <Calculator className="h-8 w-8" />,
            isEnabled: true,
            category: t("bCoder.templates.categories.finance"),
        },
        {
            id: "analytics-dashboard",
            name: t("bCoder.templates.analyticsName"),
            description: t("bCoder.templates.analyticsDesc"),
            icon: <BarChart3 className="h-8 w-8" />,
            isEnabled: true,
            category: t("bCoder.templates.categories.finance"),
        },
        {
            id: "trading",
            name: t("bCoder.templates.tradingName"),
            description: t("bCoder.templates.tradingDesc"),
            icon: <TrendingUp className="h-8 w-8" />,
            isEnabled: true,
            category: t("bCoder.templates.categories.finance"),
        },
        // Marketing & Content
        {
            id: "seo-content",
            name: t("bCoder.templates.seoName"),
            description: t("bCoder.templates.seoDesc"),
            icon: <Search className="h-8 w-8" />,
            isEnabled: true,
            category: t("bCoder.templates.categories.marketing"),
        },
        {
            id: "copywriting",
            name: t("bCoder.templates.copywritingName"),
            description: t("bCoder.templates.copywritingDesc"),
            icon: <PenTool className="h-8 w-8" />,
            isEnabled: true,
            category: t("bCoder.templates.categories.marketing"),
        },
        {
            id: "visual-ads",
            name: t("bCoder.templates.visualAdsName"),
            description: t("bCoder.templates.visualAdsDesc"),
            icon: <Image className="h-8 w-8" />,
            isEnabled: true,
            category: t("bCoder.templates.categories.marketing"),
        },
    ]

    const handleSelect = (template: TemplateOption) => {
        if (!template.isEnabled) return
        setSelectedTemplate(template.id)
    }

    const handleContinue = () => {
        if (selectedTemplate) {
            onSelectTemplate(selectedTemplate)
            onOpenChange(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl w-[95vw] sm:w-full h-[85vh] flex flex-col p-0 gap-0 overflow-hidden">
                {/* Fixed Header */}
                <div className="flex-none bg-background border-b px-4 sm:px-6 py-4 sm:py-5">
                    <DialogHeader className="space-y-2">
                        <DialogTitle className="flex items-center gap-2 sm:gap-3 text-lg sm:text-2xl">
                            <div className="relative shrink-0">
                                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 blur-xl rounded-full" />
                                <div className="relative bg-gradient-to-br from-emerald-500 to-cyan-500 p-1.5 sm:p-2 rounded-lg sm:rounded-xl">
                                    <Code2 className="h-4 w-4 sm:h-6 sm:w-6 text-white" />
                                </div>
                            </div>
                            {t("bCoder.templates.selectTitle")}
                        </DialogTitle>
                        <DialogDescription className="text-xs sm:text-sm">
                            {t("bCoder.templates.selectDescription")}
                        </DialogDescription>
                    </DialogHeader>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                        {templates.map((template) => (
                            <button
                                key={template.id}
                                onClick={() => handleSelect(template)}
                                disabled={!template.isEnabled}
                                className={cn(
                                    "relative group p-4 sm:p-5 rounded-lg sm:rounded-xl border-2 transition-all duration-200 text-left",
                                    "hover:shadow-lg",
                                    template.isEnabled
                                        ? "cursor-pointer hover:border-emerald-500/50 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20"
                                        : "cursor-not-allowed opacity-60 bg-muted/30",
                                    selectedTemplate === template.id &&
                                    "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 shadow-md"
                                )}
                            >
                                {/* Disabled overlay */}
                                {!template.isEnabled && (
                                    <div className="absolute top-2 right-2 sm:top-3 sm:right-3">
                                        <Badge variant="secondary" className="gap-1 text-xs">
                                            <Lock className="h-3 w-3" />
                                            <span className="hidden xs:inline">{t("bCoder.templates.comingSoon")}</span>
                                            <span className="xs:hidden">Soon</span>
                                        </Badge>
                                    </div>
                                )}

                                {/* Selected indicator */}
                                {selectedTemplate === template.id && (
                                    <div className="absolute top-2 right-2 sm:top-3 sm:right-3">
                                        <div className="bg-emerald-500 text-white rounded-full p-0.5 sm:p-1">
                                            <CheckCircle2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                        </div>
                                    </div>
                                )}

                                {/* Icon */}
                                <div
                                    className={cn(
                                        "mb-2 sm:mb-3 inline-flex p-2 sm:p-2.5 rounded-md sm:rounded-lg transition-colors",
                                        template.isEnabled
                                            ? "bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 text-emerald-600 dark:text-emerald-400"
                                            : "bg-muted text-muted-foreground"
                                    )}
                                >
                                    <div className="h-5 w-5 sm:h-6 sm:w-6 [&>svg]:h-full [&>svg]:w-full">
                                        {template.icon}
                                    </div>
                                </div>

                                {/* Content */}
                                <h3 className="font-semibold text-sm sm:text-base mb-1 pr-8 sm:pr-0">{template.name}</h3>
                                <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                                    {template.description}
                                </p>
                                <Badge variant="outline" className="text-[10px] font-normal">
                                    {template.category}
                                </Badge>

                                {/* Hover effect */}
                                {template.isEnabled && (
                                    <div className="absolute inset-0 rounded-lg sm:rounded-xl bg-gradient-to-br from-emerald-500/0 to-cyan-500/0 group-hover:from-emerald-500/5 group-hover:to-cyan-500/5 transition-all duration-200 pointer-events-none" />
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Fixed Footer */}
                <DialogFooter className="flex-none bg-background border-t px-4 sm:px-6 py-4">
                    <div className="flex flex-col-reverse sm:flex-row justify-end items-center gap-2 sm:gap-3 w-full">
                        <DialogClose asChild>
                            <Button variant="outline" className="w-full sm:w-auto">
                                {t("common.cancel")}
                            </Button>
                        </DialogClose>
                        <Button
                            onClick={handleContinue}
                            disabled={!selectedTemplate}
                            className="w-full sm:w-auto bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-700 hover:to-cyan-700 text-white shadow-md shadow-emerald-500/20"
                        >
                            {t("bCoder.templates.continue")}
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

