"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { createPortal } from "react-dom"
import { X, ChevronLeft, ChevronRight, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useOnboardingTour, TourStep } from "@/hooks/useOnboardingTour"
import { AnimatePresence, motion } from "motion/react"
import { useLocale } from "@/lib/i18n"

const PADDING = 10 // px around spotlight target
const TOOLTIP_WIDTH = 320
const TOOLTIP_OFFSET = 16 // gap between spotlight and tooltip

interface TargetRect {
  top: number
  left: number
  width: number
  height: number
  bottom: number
  right: number
}

function getTargetRect(selector: string | null): TargetRect | null {
  if (!selector) return null
  const el = document.querySelector(selector)
  if (!el) return null
  const r = el.getBoundingClientRect()
  return { top: r.top, left: r.left, width: r.width, height: r.height, bottom: r.bottom, right: r.right }
}

interface TooltipPosition {
  top: number
  left: number
  arrowSide: "top" | "bottom" | "left" | "right" | null
  arrowOffset: number
}

function computeTooltipPosition(
  rect: TargetRect,
  placement: TourStep["placement"],
  winW: number,
  winH: number,
  tooltipH: number
): TooltipPosition {
  const spotTop = rect.top - PADDING
  const spotLeft = rect.left - PADDING
  const spotW = rect.width + PADDING * 2
  const spotH = rect.height + PADDING * 2
  const spotBottom = spotTop + spotH
  const spotRight = spotLeft + spotW

  let top = 0
  let left = 0
  let arrowSide: TooltipPosition["arrowSide"] = null
  let arrowOffset = 0

  switch (placement) {
    case "right": {
      left = spotRight + TOOLTIP_OFFSET
      top = spotTop + spotH / 2 - tooltipH / 2
      arrowSide = "left"
      arrowOffset = tooltipH / 2
      // Overflow guard: if tooltip would go off right edge, flip to left
      if (left + TOOLTIP_WIDTH > winW - 8) {
        left = spotLeft - TOOLTIP_WIDTH - TOOLTIP_OFFSET
        arrowSide = "right"
      }
      break
    }
    case "left": {
      left = spotLeft - TOOLTIP_WIDTH - TOOLTIP_OFFSET
      top = spotTop + spotH / 2 - tooltipH / 2
      arrowSide = "right"
      arrowOffset = tooltipH / 2
      if (left < 8) {
        left = spotRight + TOOLTIP_OFFSET
        arrowSide = "left"
      }
      break
    }
    case "bottom": {
      top = spotBottom + TOOLTIP_OFFSET
      left = spotLeft + spotW / 2 - TOOLTIP_WIDTH / 2
      arrowSide = "top"
      arrowOffset = TOOLTIP_WIDTH / 2
      break
    }
    case "top": {
      top = spotTop - tooltipH - TOOLTIP_OFFSET
      left = spotLeft + spotW / 2 - TOOLTIP_WIDTH / 2
      arrowSide = "bottom"
      arrowOffset = TOOLTIP_WIDTH / 2
      break
    }
    case "center":
    default: {
      top = winH / 2 - tooltipH / 2
      left = winW / 2 - TOOLTIP_WIDTH / 2
      arrowSide = null
      break
    }
  }

  // Clamp to viewport
  top = Math.max(8, Math.min(top, winH - tooltipH - 8))
  left = Math.max(8, Math.min(left, winW - TOOLTIP_WIDTH - 8))

  return { top, left, arrowSide, arrowOffset }
}

export function OnboardingTour() {
  const { isOpen, currentStep, totalSteps, step, next, prev, skip, mounted } = useOnboardingTour()
  const { t } = useLocale()
  const [targetRect, setTargetRect] = useState<TargetRect | null>(null)
  const [winSize, setWinSize] = useState({ w: 1200, h: 800 })
  const tooltipRef = useRef<HTMLDivElement>(null)
  const [tooltipH, setTooltipH] = useState(180)

  // Sync window size
  useEffect(() => {
    function update() {
      setWinSize({ w: window.innerWidth, h: window.innerHeight })
    }
    update()
    window.addEventListener("resize", update)
    return () => window.removeEventListener("resize", update)
  }, [])

  // Resolve target element rect when step changes
  const updateRect = useCallback(() => {
    if (!step) return
    const rect = getTargetRect(step.target)
    setTargetRect(rect)
  }, [step])

  useEffect(() => {
    if (!isOpen) return
    // Small delay to let the DOM settle (sidebar animations etc.)
    const t = setTimeout(updateRect, 100)
    return () => clearTimeout(t)
  }, [isOpen, step?.id, updateRect])

  // Measure tooltip height
  useEffect(() => {
    if (tooltipRef.current) {
      setTooltipH(tooltipRef.current.offsetHeight || 180)
    }
  })

  if (!mounted || !isOpen || !step) return null

  const spotlightRect = targetRect
    ? {
        x: targetRect.left - PADDING,
        y: targetRect.top - PADDING,
        w: targetRect.width + PADDING * 2,
        h: targetRect.height + PADDING * 2,
      }
    : null

  const tooltipPos = computeTooltipPosition(
    targetRect ?? { top: 0, left: 0, width: winSize.w, height: winSize.h, bottom: winSize.h, right: winSize.w },
    step.placement,
    winSize.w,
    winSize.h,
    tooltipH
  )

  const isFirst = currentStep === 0
  const isLast = currentStep === totalSteps - 1
  const progressPercent = ((currentStep + 1) / totalSteps) * 100

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] pointer-events-none">
          {/* Overlay with spotlight cut-out */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="absolute inset-0"
          >
            <svg
              width={winSize.w}
              height={winSize.h}
              className="absolute inset-0"
              style={{ display: "block" }}
            >
              <defs>
                <mask id="onboarding-spotlight-mask">
                  {/* White fills everything */}
                  <rect width="100%" height="100%" fill="white" />
                  {/* Black cuts the spotlight hole */}
                  {spotlightRect && (
                    <rect
                      x={spotlightRect.x}
                      y={spotlightRect.y}
                      width={spotlightRect.w}
                      height={spotlightRect.h}
                      rx="8"
                      fill="black"
                    />
                  )}
                </mask>
              </defs>
              <rect
                width="100%"
                height="100%"
                fill="rgba(0,0,0,0.6)"
                mask="url(#onboarding-spotlight-mask)"
              />
            </svg>

            {/* Spotlight border glow ring */}
            {spotlightRect && (
              <motion.div
                key={step.id + "-ring"}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="absolute rounded-lg ring-2 ring-[#BDA76D] ring-offset-0 shadow-[0_0_0_4px_rgba(189,167,109,0.2)]"
                style={{
                  top: spotlightRect.y,
                  left: spotlightRect.x,
                  width: spotlightRect.w,
                  height: spotlightRect.h,
                  pointerEvents: "none",
                }}
              />
            )}
          </motion.div>

          {/* Tooltip Card */}
          <motion.div
            ref={tooltipRef}
            key={step.id}
            initial={{ opacity: 0, scale: 0.95, y: 4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute pointer-events-auto bg-white dark:bg-neutral-900 border border-border rounded-xl shadow-2xl"
            style={{
              top: tooltipPos.top,
              left: tooltipPos.left,
              width: TOOLTIP_WIDTH,
            }}
          >
            {/* Arrow */}
            {tooltipPos.arrowSide === "left" && (
              <div
                className="absolute -left-[9px]"
                style={{ top: tooltipPos.arrowOffset - 8 }}
              >
                <div className="w-0 h-0 border-t-[8px] border-t-transparent border-b-[8px] border-b-transparent border-r-[9px] border-r-white dark:border-r-neutral-900" />
              </div>
            )}
            {tooltipPos.arrowSide === "right" && (
              <div
                className="absolute -right-[9px]"
                style={{ top: tooltipPos.arrowOffset - 8 }}
              >
                <div className="w-0 h-0 border-t-[8px] border-t-transparent border-b-[8px] border-b-transparent border-l-[9px] border-l-white dark:border-l-neutral-900" />
              </div>
            )}
            {tooltipPos.arrowSide === "top" && (
              <div
                className="absolute -top-[9px]"
                style={{ left: tooltipPos.arrowOffset - 8 }}
              >
                <div className="w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-b-[9px] border-b-white dark:border-b-neutral-900" />
              </div>
            )}
            {tooltipPos.arrowSide === "bottom" && (
              <div
                className="absolute -bottom-[9px]"
                style={{ left: tooltipPos.arrowOffset - 8 }}
              >
                <div className="w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[9px] border-t-white dark:border-t-neutral-900" />
              </div>
            )}

            {/* Header */}
            <div className="flex items-center justify-between px-4 pt-4 pb-2">
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#BDA76D]/10">
                  <Sparkles className="h-3.5 w-3.5 text-[#BDA76D]" />
                </div>
                <span className="text-xs font-medium text-muted-foreground">
                  {t("tour.currentStep")} {currentStep + 1} {t("tour.progress")} {totalSteps}
                </span>
              </div>
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6 rounded-full text-muted-foreground hover:text-foreground"
                onClick={skip}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>

            {/* Content */}
            <div className="px-4 pb-2">
              <h3 className="font-bold text-base text-foreground mb-1">{t(`tour.steps.${step.id}.title`)}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{t(`tour.steps.${step.id}.description`)}</p>
            </div>

            {/* Progress bar */}
            <div className="px-4 py-2">
              <div className="h-1 w-full rounded-full bg-muted overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-[#BDA76D]"
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPercent}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>

            {/* Progress dots */}
            <div className="flex items-center justify-center gap-1.5 py-1">
              {Array.from({ length: totalSteps }).map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    "rounded-full transition-all duration-200",
                    i === currentStep
                      ? "w-4 h-1.5 bg-[#BDA76D]"
                      : i < currentStep
                      ? "w-1.5 h-1.5 bg-[#BDA76D]/50"
                      : "w-1.5 h-1.5 bg-muted-foreground/30"
                  )}
                />
              ))}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between px-4 pb-4 pt-2 gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-foreground"
                onClick={skip}
              >
                {t("tour.skip")}
              </Button>
              <div className="flex gap-2">
                {!isFirst && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={prev}
                    className="h-8 w-8 p-0"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  size="sm"
                  className="bg-[#BDA76D] hover:bg-[#BDA76D]/90 text-white px-4"
                  onClick={next}
                >
                  {isLast ? t("tour.finish") : (
                    <>
                      {t("tour.next")}
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  )
}
