"use client"

import { Check, ArrowLeft } from "lucide-react"
import { cn } from "@/lib/utils"
import { useWizardStore } from "@/lib/stores/wizard-store"
import { SidebarGroup, SidebarGroupLabel, SidebarMenuButton, useSidebar } from "@/components/ui/sidebar"
import { useRouter } from "next/navigation"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

const STEPS = [
  { id: 1, title: "Basic Info", description: "Name and details" },
  { id: 2, title: "Visual Identity", description: "Add an image" },
  { id: 3, title: "Knowledge Base", description: "Add resources" },
  { id: 4, title: "Instructions", description: "Add instructions" },
  { id: 5, title: "Advanced Config", description: "API settings" },
  { id: 6, title: "Sharing", description: "Permissions" },
]

import { useLocale } from "@/lib/i18n"

export function NavWizardProgress() {
  const router = useRouter()
  const { state } = useSidebar()
  const { t } = useLocale()
  const currentStep = useWizardStore((state) => state.currentStep)
  const completedSteps = useWizardStore((state) => state.completedSteps)
  const resetWizard = useWizardStore((state) => state.reset)

  const STEPS = [
    { id: 1, title: t("wizard.steps.step1.title"), description: t("wizard.steps.step1.desc") },
    { id: 2, title: t("wizard.steps.step2.title"), description: t("wizard.steps.step2.desc") },
    { id: 3, title: t("wizard.steps.step3.title"), description: t("wizard.steps.step3.desc") },
    { id: 4, title: t("wizard.steps.step4.title"), description: t("wizard.steps.step4.desc") },
    { id: 5, title: t("wizard.steps.step5.title"), description: t("wizard.steps.step5.desc") },
    { id: 6, title: t("wizard.steps.step6.title"), description: t("wizard.steps.step6.desc") },
  ]

  const handleBack = () => {
    // Reset wizard state and navigate back
    resetWizard()
    router.push("/home")
  }

  const isCollapsed = state === "collapsed"

  return (
    <SidebarGroup>
      {/* Back Button */}
      <SidebarMenuButton asChild tooltip={t("common.back")}>
        <div className="group/nav-item cursor-pointer" onClick={handleBack}>
          <ArrowLeft className="text-primary transition-all duration-300 ease-in-out group-hover/nav-item:scale-110 group-hover/nav-item:rotate-3" />
          <span className="transition-all duration-300 ease-in-out group-hover/nav-item:translate-x-1">{t("common.back")}</span>
        </div>
      </SidebarMenuButton>

      {/* Progress indicator - only show when expanded */}
      {!isCollapsed && (
        <div className="px-4 py-3 mt-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
            <span>{t("wizard.progress")}</span>
            <span className="font-medium">
              {Math.round((completedSteps.length / STEPS.length) * 100)}%
            </span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${(completedSteps.length / STEPS.length) * 100}%` }}
            />
          </div>
        </div>
      )}

      <div className={cn(
        "space-y-1 py-2",
        isCollapsed ? "px-1" : "px-2"
      )}>
        {STEPS.map((step, index) => {
          const isCompleted = completedSteps.includes(step.id)
          const isCurrent = currentStep === step.id
          const isPast = step.id < currentStep

          // Collapsed view - just show icons
          if (isCollapsed) {
            return (
              <TooltipProvider key={step.id} delayDuration={0}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="relative flex justify-center py-2">
                      <div
                        className={cn(
                          "flex items-center justify-center w-6 h-6 rounded-full border-2 transition-all",
                          isCurrent
                            ? "border-primary bg-primary text-primary-foreground"
                            : isCompleted
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-muted-foreground/30 bg-background text-muted-foreground"
                        )}
                      >
                        {isCompleted ? (
                          <Check className="h-3 w-4" />
                        ) : (
                          <span className="text-xs font-semibold">{step.id}</span>
                        )}
                      </div>
                      {/* Connecting line for collapsed */}
                      {index < STEPS.length - 1 && (
                        <div
                          className={cn(
                            "absolute left-1/2 -translate-x-1/2 top-[40px] w-0.5 h-4 transition-colors",
                            isCompleted || isPast ? "bg-primary" : "bg-muted"
                          )}
                        />
                      )}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <div>
                      <p className="font-medium">{step.title}</p>
                      <p className="text-xs text-muted-foreground">{step.description}</p>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )
          }

          // Expanded view - show full content
          return (
            <div key={step.id} className="relative">
              <div
                className={cn(
                  "flex items-center gap-3 p-3 rounded-md transition-all duration-200",
                  isCurrent && "bg-primary/10 border border-primary/20",
                  !isCurrent && "hover:bg-muted/50"
                )}
              >
                {/* Step indicator */}
                <div
                  className={cn(
                    "flex items-center justify-center w-6 h-6 rounded-full border-2 transition-all flex-shrink-0",
                    isCurrent
                      ? "border-primary bg-primary text-primary-foreground"
                      : isCompleted
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-muted-foreground/30 bg-background text-muted-foreground"
                  )}
                >
                  {isCompleted ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <span className="text-xs font-semibold">{step.id}</span>
                  )}
                </div>

                {/* Step content */}
                <div className="flex-1 min-w-0">
                  <p
                    className={cn(
                      "text-sm font-medium truncate",
                      isCurrent ? "text-primary" : "text-foreground"
                    )}
                  >
                    {step.title}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {step.description}
                  </p>
                </div>
              </div>

              {/* Connecting line */}
              {index < STEPS.length - 1 && (
                <div
                  className={cn(
                    "absolute left-[25px] top-[52px] w-0.5 h-4 transition-colors",
                    isCompleted || isPast ? "bg-primary" : "bg-muted"
                  )}
                />
              )}
            </div>
          )
        })}
      </div>
    </SidebarGroup>
  )
}

