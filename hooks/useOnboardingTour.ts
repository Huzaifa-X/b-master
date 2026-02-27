"use client"

import { useState, useEffect, useCallback } from "react"

const STORAGE_KEY = "bmaster_onboarding_completed"
const STORAGE_VERSION = "v1"

export interface TourStep {
  id: string
  /** CSS selector or data-tour attribute target. null = centered modal (no spotlight) */
  target: string | null
  title: string
  description: string
  placement: "top" | "bottom" | "left" | "right" | "center"
}

export const TOUR_STEPS: TourStep[] = [
  {
    id: "welcome",
    target: null,
    title: "Welcome to B-Master! 👋",
    description:
      "B-Master lets you build, share, and chat with AI assistants. This quick tour will show you around. You can skip any time.",
    placement: "center",
  },
  {
    id: "ask-b",
    target: "[data-tour='ask-b']",
    title: "Ask B — Your AI Assistant",
    description:
      "Start here! Ask B is your personal AI assistant powered by GPT. Ask anything, get instant answers, and explore AI features.",
    placement: "right",
  },
  {
    id: "add-assistant",
    target: "[data-tour='add-assistant']",
    title: "Create AI Assistants",
    description:
      "Build custom AI assistants for specific tasks — customer support, research, sales, and more. Upload documents, add instructions, and share with your team.",
    placement: "right",
  },
  {
    id: "store",
    target: "[data-tour='store']",
    title: "Browse the Store",
    description:
      "Discover and purchase AI assistants built by other creators, or publish your own assistants to the marketplace.",
    placement: "right",
  },
  {
    id: "contacts",
    target: "[data-tour='contacts']",
    title: "Manage Contacts",
    description:
      "Invite team members or clients to your assistants. Control exactly what each person can access: chat, news feed, artifacts, and more.",
    placement: "right",
  },
  {
    id: "assistants-list",
    target: "[data-tour='assistants-list']",
    title: "Your Assistants",
    description:
      "All your created and shared assistants appear here. Click any assistant to open its chat, news feed, contacts and more.",
    placement: "right",
  },
  {
    id: "done",
    target: null,
    title: "You're all set! 🎉",
    description:
      "That's the quick tour. Dive in and start building — your first assistant is just a click away. You can always replay this tour from your profile menu.",
    placement: "center",
  },
]

export function useOnboardingTour() {
  const [isOpen, setIsOpen] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored || stored !== STORAGE_VERSION) {
      // First time user — show tour after a short delay
      const timer = setTimeout(() => setIsOpen(true), 800)
      return () => clearTimeout(timer)
    }
  }, [])

  // Listen for manual restart request (dispatched from nav-user)
  useEffect(() => {
    const handler = () => {
      setCurrentStep(0)
      setIsOpen(true)
    }
    window.addEventListener("bmaster:restart-tour", handler)
    return () => window.removeEventListener("bmaster:restart-tour", handler)
  }, [])

  const completeAndClose = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, STORAGE_VERSION)
    setIsOpen(false)
    setCurrentStep(0)
  }, [])

  const next = useCallback(() => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep((s) => s + 1)
    } else {
      completeAndClose()
    }
  }, [currentStep, completeAndClose])

  const prev = useCallback(() => {
    if (currentStep > 0) setCurrentStep((s) => s - 1)
  }, [currentStep])

  const skip = useCallback(() => {
    completeAndClose()
  }, [completeAndClose])

  /** Manually start the tour again (e.g., from profile menu) */
  const restart = useCallback(() => {
    setCurrentStep(0)
    setIsOpen(true)
  }, [])

  return {
    isOpen,
    currentStep,
    totalSteps: TOUR_STEPS.length,
    step: TOUR_STEPS[currentStep],
    next,
    prev,
    skip,
    restart,
    mounted,
  }
}
