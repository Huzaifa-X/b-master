"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import {
    Code2,
    PenTool,
    LineChart,
    GraduationCap,
    Clock,
    Sparkles,
    Loader2,
    Target,
    Briefcase,
    Rocket,
    Brain,
    ArrowRight,
    ArrowLeft,
    Check,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { toast } from "sonner"
import { completeOnboarding, type AssistantOption } from "@/app/actions/onboarding.action"
import { cn } from "@/lib/utils"

// Step 1: Goals
const goals = [
    {
        id: "build_products",
        title: "Build Products",
        description: "Create apps, websites, and digital products",
        icon: Rocket,
        color: "text-blue-500 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800",
        relatedAssistants: ["SOFTWARE_DEVELOPMENT", "DATA_ANALYSIS"] as AssistantOption[],
    },
    {
        id: "grow_business",
        title: "Grow My Business",
        description: "Marketing, sales, and business strategy",
        icon: Briefcase,
        color: "text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800",
        relatedAssistants: ["MARKETING", "PRODUCTIVITY"] as AssistantOption[],
    },
    {
        id: "learn_skills",
        title: "Learn New Skills",
        description: "Education, training, and personal development",
        icon: GraduationCap,
        color: "text-purple-500 bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800",
        relatedAssistants: ["EDUCATION", "SOFTWARE_DEVELOPMENT"] as AssistantOption[],
    },
    {
        id: "boost_productivity",
        title: "Boost Productivity",
        description: "Organize tasks, automate workflows, save time",
        icon: Target,
        color: "text-orange-500 bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800",
        relatedAssistants: ["PRODUCTIVITY", "DATA_ANALYSIS"] as AssistantOption[],
    },
]

// Step 2: Assistants
const assistants: { id: AssistantOption; title: string; description: string; icon: any; color: string; features: string[] }[] = [
    {
        id: "SOFTWARE_DEVELOPMENT",
        title: "Code Companion",
        description: "Expert pair programmer for coding, debugging, and architecture",
        icon: Code2,
        color: "text-blue-500 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800",
        features: ["Write & debug code", "System architecture", "Code reviews", "Best practices"],
    },
    {
        id: "MARKETING",
        title: "Marketing Pro",
        description: "Digital marketer for content, SEO, and social media",
        icon: PenTool,
        color: "text-pink-500 bg-pink-50 dark:bg-pink-900/20 border-pink-200 dark:border-pink-800",
        features: ["Copywriting", "SEO content", "Social media posts", "Ad campaigns"],
    },
    {
        id: "DATA_ANALYSIS",
        title: "Data Analyst",
        description: "Analyze data, write SQL, and derive actionable insights",
        icon: LineChart,
        color: "text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800",
        features: ["Data visualization", "SQL queries", "Statistical analysis", "Reports"],
    },
    {
        id: "EDUCATION",
        title: "Learning Tutor",
        description: "Break down complex topics into simple explanations",
        icon: Brain,
        color: "text-purple-500 bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800",
        features: ["Topic explanations", "Study guides", "Practice problems", "Q&A sessions"],
    },
    {
        id: "PRODUCTIVITY",
        title: "Productivity Partner",
        description: "Draft emails, manage tasks, and optimize workflows",
        icon: Clock,
        color: "text-orange-500 bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800",
        features: ["Email drafting", "Task planning", "Meeting notes", "Document summaries"],
    },
]

export default function OnboardingPage() {
    const router = useRouter()
    const { data: session, status, update } = useSession()
    const [step, setStep] = useState(1)
    const [selectedGoals, setSelectedGoals] = useState<string[]>([])
    const [selectedAssistant, setSelectedAssistant] = useState<AssistantOption | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)

    // Redirect if user has already completed onboarding
    useEffect(() => {
        if (status === "authenticated" && session?.user?.hasCompletedOnboarding) {
            router.replace("/home")
        }
    }, [status, session, router])

    // Get recommended assistants based on selected goals
    const recommendedAssistants = assistants.filter(assistant => {
        const relatedGoals = goals.filter(g => g.relatedAssistants.includes(assistant.id))
        return relatedGoals.some(g => selectedGoals.includes(g.id))
    })

    // If no goals selected, show all assistants
    const displayedAssistants = recommendedAssistants.length > 0 ? recommendedAssistants : assistants

    const toggleGoal = (goalId: string) => {
        setSelectedGoals(prev =>
            prev.includes(goalId)
                ? prev.filter(id => id !== goalId)
                : [...prev, goalId]
        )
    }

    const handleNext = () => {
        if (step === 1 && selectedGoals.length > 0) {
            setStep(2)
        }
    }

    const handleBack = () => {
        if (step === 2) {
            setStep(1)
            setSelectedAssistant(null)
        }
    }

    const handleComplete = async () => {
        if (!selectedAssistant) return

        setIsSubmitting(true)
        try {
            const result = await completeOnboarding(selectedAssistant)

            if (result.success && result.assistantId) {
                toast.success("Your assistant is ready! Let's get started.")

                await update({
                    user: {
                        hasCompletedOnboarding: true
                    }
                })

                router.push(`/home`)
            } else {
                toast.error(result.error || "Failed to complete setup")
                setIsSubmitting(false)
            }
        } catch (error) {
            toast.error("An unexpected error occurred.")
            setIsSubmitting(false)
        }
    }

    // Show loading while checking session
    if (status === "loading") {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        )
    }

    // Don't render onboarding if user has already completed it (prevents flash)
    if (session?.user?.hasCompletedOnboarding) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex flex-col items-center justify-center p-4">
            <div className="max-w-4xl w-full space-y-8">

                {/* Header */}
                <div className="text-center space-y-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.5 }}
                        className="mx-auto flex items-center justify-center mb-6"
                    >
                        <img src="/bmaster-logo.svg" alt="B-Master Logo" className="h-12 w-auto object-contain" />
                    </motion.div>

                    {/* Step Indicator */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex items-center justify-center gap-3 mb-4"
                    >
                        <div className={cn(
                            "flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-colors",
                            step >= 1 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                        )}>
                            {step > 1 ? <Check className="w-4 h-4" /> : "1"}
                        </div>
                        <div className={cn(
                            "w-16 h-1 rounded-full transition-colors",
                            step >= 2 ? "bg-primary" : "bg-muted"
                        )} />
                        <div className={cn(
                            "flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-colors",
                            step >= 2 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                        )}>
                            2
                        </div>
                    </motion.div>

                    <AnimatePresence mode="wait">
                        <motion.div
                            key={step}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.3 }}
                        >
                            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
                                {step === 1 ? "What are your goals?" : "Choose your AI assistant"}
                            </h1>
                            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mt-2">
                                {step === 1
                                    ? "Select one or more goals to help us recommend the perfect assistant for you."
                                    : recommendedAssistants.length > 0
                                        ? "Based on your goals, we recommend these assistants. Pick one to get started!"
                                        : "Choose an assistant that best fits your needs."}
                            </p>
                        </motion.div>
                    </AnimatePresence>
                </div>

                {/* Content */}
                <AnimatePresence mode="wait">
                    {step === 1 ? (
                        <motion.div
                            key="goals"
                            initial={{ opacity: 0, x: -50 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 50 }}
                            transition={{ duration: 0.3 }}
                            className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4"
                        >
                            {goals.map((goal) => {
                                const Icon = goal.icon
                                const isSelected = selectedGoals.includes(goal.id)

                                return (
                                    <motion.div
                                        key={goal.id}
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                    >
                                        <Card
                                            className={cn(
                                                "h-full cursor-pointer transition-all duration-200 border-2",
                                                isSelected
                                                    ? "border-primary shadow-md bg-primary/5"
                                                    : "border-border hover:border-primary/40 hover:shadow-sm"
                                            )}
                                            onClick={() => toggleGoal(goal.id)}
                                        >
                                            <CardHeader className="pb-2">
                                                <div className="flex items-start justify-between">
                                                    <div className={cn(
                                                        "w-12 h-12 rounded-xl flex items-center justify-center",
                                                        goal.color
                                                    )}>
                                                        <Icon className="w-6 h-6" />
                                                    </div>
                                                    <div className={cn(
                                                        "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
                                                        isSelected
                                                            ? "border-primary bg-primary text-primary-foreground"
                                                            : "border-muted-foreground/30"
                                                    )}>
                                                        {isSelected && <Check className="w-4 h-4" />}
                                                    </div>
                                                </div>
                                                <CardTitle className="text-lg mt-3">{goal.title}</CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                <p className="text-sm text-muted-foreground">
                                                    {goal.description}
                                                </p>
                                            </CardContent>
                                        </Card>
                                    </motion.div>
                                )
                            })}
                        </motion.div>
                    ) : (
                        <motion.div
                            key="assistants"
                            initial={{ opacity: 0, x: 50 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -50 }}
                            transition={{ duration: 0.3 }}
                            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-4"
                        >
                            {displayedAssistants.map((assistant) => {
                                const Icon = assistant.icon
                                const isSelected = selectedAssistant === assistant.id

                                return (
                                    <motion.div
                                        key={assistant.id}
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                    >
                                        <Card
                                            className={cn(
                                                "h-full cursor-pointer transition-all duration-200 border-2",
                                                isSelected
                                                    ? "border-primary shadow-lg bg-primary/5"
                                                    : "border-border hover:border-primary/40 hover:shadow-sm"
                                            )}
                                            onClick={() => setSelectedAssistant(assistant.id)}
                                        >
                                            <CardHeader className="pb-2">
                                                <div className="flex items-start justify-between">
                                                    <div className={cn(
                                                        "w-12 h-12 rounded-xl flex items-center justify-center",
                                                        assistant.color
                                                    )}>
                                                        <Icon className="w-6 h-6" />
                                                    </div>
                                                    <div className={cn(
                                                        "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
                                                        isSelected
                                                            ? "border-primary bg-primary text-primary-foreground"
                                                            : "border-muted-foreground/30"
                                                    )}>
                                                        {isSelected && <Check className="w-4 h-4" />}
                                                    </div>
                                                </div>
                                                <CardTitle className="text-lg mt-3">{assistant.title}</CardTitle>
                                            </CardHeader>
                                            <CardContent className="space-y-3">
                                                <p className="text-sm text-muted-foreground">
                                                    {assistant.description}
                                                </p>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {assistant.features.map((feature, idx) => (
                                                        <span
                                                            key={idx}
                                                            className="text-xs px-2 py-0.5 bg-muted rounded-full text-muted-foreground"
                                                        >
                                                            {feature}
                                                        </span>
                                                    ))}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </motion.div>
                                )
                            })}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Footer Actions */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                    className="flex justify-between items-center pt-8"
                >
                    {step === 2 ? (
                        <Button
                            variant="ghost"
                            size="lg"
                            onClick={handleBack}
                            className="gap-2"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Back
                        </Button>
                    ) : (
                        <div /> // Spacer
                    )}

                    {step === 1 ? (
                        <Button
                            size="lg"
                            className="min-w-[180px] text-base h-12 gap-2"
                            disabled={selectedGoals.length === 0}
                            onClick={handleNext}
                        >
                            Continue
                            <ArrowRight className="w-4 h-4" />
                        </Button>
                    ) : (
                        <Button
                            size="lg"
                            className="min-w-[200px] text-base h-12 gap-2"
                            disabled={!selectedAssistant || isSubmitting}
                            onClick={handleComplete}
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Creating assistant...
                                </>
                            ) : (
                                <>
                                    <Sparkles className="w-4 h-4" />
                                    Get Started
                                </>
                            )}
                        </Button>
                    )}
                </motion.div>

            </div>
        </div>
    )
}
