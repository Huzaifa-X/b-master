"use client"

import { useState } from "react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
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
} from "lucide-react"
import { cn } from "@/lib/utils"

interface TemplateOption {
    id: string
    name: string
    description: string
    icon: React.ReactNode
    isEnabled: boolean
    category: "default" | "booking" | "accounting" | "analytics"
}

const templates: TemplateOption[] = [
    {
        id: "default-todo",
        name: "Default",
        description: "A beautiful todo application to get started",
        icon: <CheckCircle2 className="h-8 w-8" />,
        isEnabled: true,
        category: "default",
    },
    {
        id: "booking-system",
        name: "Booking",
        description: "Complete booking management system",
        icon: <Calendar className="h-8 w-8" />,
        isEnabled: true,
        category: "booking",
    },
    {
        id: "accounting-dashboard",
        name: "Accounting",
        description: "Financial tracking and reporting dashboard",
        icon: <Calculator className="h-8 w-8" />,
        isEnabled: true,
        category: "accounting",
    },
    {
        id: "analytics-dashboard",
        name: "Analytical Dashboard",
        description: "Data visualization and analytics platform",
        icon: <BarChart3 className="h-8 w-8" />,
        isEnabled: true,
        category: "analytics",
    },
]

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
    const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)

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
            <DialogContent className="max-w-4xl w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto p-4 sm:p-6">
                <DialogHeader className="space-y-2 sm:space-y-3">
                    <DialogTitle className="flex items-center gap-2 sm:gap-3 text-lg sm:text-2xl">
                        <div className="relative shrink-0">
                            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 blur-xl rounded-full" />
                            <div className="relative bg-gradient-to-br from-emerald-500 to-cyan-500 p-1.5 sm:p-2 rounded-lg sm:rounded-xl">
                                <Code2 className="h-4 w-4 sm:h-6 sm:w-6 text-white" />
                            </div>
                        </div>
                        Choose Your Template
                    </DialogTitle>
                    <DialogDescription className="text-xs sm:text-sm">
                        Select a template to start building your application. More templates coming soon!
                    </DialogDescription>
                </DialogHeader>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 py-3 sm:py-4">
                    {templates.map((template) => (
                        <button
                            key={template.id}
                            onClick={() => handleSelect(template)}
                            disabled={!template.isEnabled}
                            className={cn(
                                "relative group p-4 sm:p-6 rounded-lg sm:rounded-xl border-2 transition-all duration-200 text-left",
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
                                        <span className="hidden xs:inline">Coming Soon</span>
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
                                    "mb-2 sm:mb-4 inline-flex p-2 sm:p-3 rounded-md sm:rounded-lg transition-colors",
                                    template.isEnabled
                                        ? "bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 text-emerald-600 dark:text-emerald-400"
                                        : "bg-muted text-muted-foreground"
                                )}
                            >
                                <div className="h-6 w-6 sm:h-8 sm:w-8 [&>svg]:h-full [&>svg]:w-full">
                                    {template.icon}
                                </div>
                            </div>

                            {/* Content */}
                            <h3 className="font-semibold text-base sm:text-lg mb-1 sm:mb-2 pr-8 sm:pr-0">{template.name}</h3>
                            <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">
                                {template.description}
                            </p>

                            {/* Hover effect */}
                            {template.isEnabled && (
                                <div className="absolute inset-0 rounded-lg sm:rounded-xl bg-gradient-to-br from-emerald-500/0 to-cyan-500/0 group-hover:from-emerald-500/5 group-hover:to-cyan-500/5 transition-all duration-200 pointer-events-none" />
                            )}
                        </button>
                    ))}
                </div>

                <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 pt-3 sm:pt-4 border-t">
                    <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
                        Cancel
                    </Button>
                    <Button
                        onClick={handleContinue}
                        disabled={!selectedTemplate}
                        className="w-full sm:w-auto bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-700 hover:to-cyan-700 text-white"
                    >
                        Continue
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
