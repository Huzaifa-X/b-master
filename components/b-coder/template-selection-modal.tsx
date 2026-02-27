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
            <DialogContent className="max-w-4xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-3 text-2xl">
                        <div className="relative">
                            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 blur-xl rounded-full" />
                            <div className="relative bg-gradient-to-br from-emerald-500 to-cyan-500 p-2 rounded-xl">
                                <Code2 className="h-6 w-6 text-white" />
                            </div>
                        </div>
                        Choose Your Template
                    </DialogTitle>
                    <DialogDescription>
                        Select a template to start building your application. More templates coming soon!
                    </DialogDescription>
                </DialogHeader>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
                    {templates.map((template) => (
                        <button
                            key={template.id}
                            onClick={() => handleSelect(template)}
                            disabled={!template.isEnabled}
                            className={cn(
                                "relative group p-6 rounded-xl border-2 transition-all duration-200 text-left",
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
                                <div className="absolute top-3 right-3">
                                    <Badge variant="secondary" className="gap-1">
                                        <Lock className="h-3 w-3" />
                                        Coming Soon
                                    </Badge>
                                </div>
                            )}

                            {/* Selected indicator */}
                            {selectedTemplate === template.id && (
                                <div className="absolute top-3 right-3">
                                    <div className="bg-emerald-500 text-white rounded-full p-1">
                                        <CheckCircle2 className="h-4 w-4" />
                                    </div>
                                </div>
                            )}

                            {/* Icon */}
                            <div
                                className={cn(
                                    "mb-4 inline-flex p-3 rounded-lg transition-colors",
                                    template.isEnabled
                                        ? "bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 text-emerald-600 dark:text-emerald-400"
                                        : "bg-muted text-muted-foreground"
                                )}
                            >
                                {template.icon}
                            </div>

                            {/* Content */}
                            <h3 className="font-semibold text-lg mb-2">{template.name}</h3>
                            <p className="text-sm text-muted-foreground">
                                {template.description}
                            </p>

                            {/* Hover effect */}
                            {template.isEnabled && (
                                <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-emerald-500/0 to-cyan-500/0 group-hover:from-emerald-500/5 group-hover:to-cyan-500/5 transition-all duration-200 pointer-events-none" />
                            )}
                        </button>
                    ))}
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleContinue}
                        disabled={!selectedTemplate}
                        className="bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-700 hover:to-cyan-700 text-white"
                    >
                        Continue
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
