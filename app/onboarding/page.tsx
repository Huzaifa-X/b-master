"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import {
    Code2,
    PenTool,
    LineChart,
    GraduationCap,
    Clock,
    Sparkles,
    Loader2
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { toast } from "sonner"
import { completeOnboarding, AssistantOption } from "@/app/actions/onboarding.action"

const options: { id: AssistantOption; title: string; description: string; icon: any; color: string }[] = [
    {
        id: "SOFTWARE_DEVELOPMENT",
        title: "Software Development",
        description: "An expert pair programmer to write code, debug issues, and architect systems.",
        icon: Code2,
        color: "text-blue-500 bg-blue-50 dark:bg-blue-900/20"
    },
    {
        id: "MARKETING",
        title: "Marketing & Content",
        description: "A digital marketer to help you write copy, SEO content, and social media posts.",
        icon: PenTool,
        color: "text-pink-500 bg-pink-50 dark:bg-pink-900/20"
    },
    {
        id: "DATA_ANALYSIS",
        title: "Data Analysis",
        description: "An analyst to help you understand data, write SQL, and derive insights.",
        icon: LineChart,
        color: "text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20"
    },
    {
        id: "EDUCATION",
        title: "Education & Learning",
        description: "A tutor to break down complex topics into simple explanations with examples.",
        icon: GraduationCap,
        color: "text-purple-500 bg-purple-50 dark:bg-purple-900/20"
    },
    {
        id: "PRODUCTIVITY",
        title: "General Productivity",
        description: "A versatile helper to draft emails, summarize documents, and manage workflows.",
        icon: Clock,
        color: "text-orange-500 bg-orange-50 dark:bg-orange-900/20"
    },
]

export default function OnboardingPage() {
    const router = useRouter()
    const { update } = useSession()
    const [selectedOption, setSelectedOption] = useState<AssistantOption | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)

    const handleComplete = async () => {
        if (!selectedOption) return

        setIsSubmitting(true)
        try {
            const result = await completeOnboarding(selectedOption)

            if (result.success && result.assistantId) {
                toast.success("Your free assistant is ready!")

                // Update the NextAuth session client-side so ProtectedRoute sees the change
                await update({
                    user: {
                        hasCompletedOnboarding: true
                    }
                })

                // Redirect straight into the new assistant's chat
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

    return (
        <div className="min-h-screen bg-muted/30 flex flex-col items-center justify-center p-4">
            <div className="max-w-4xl w-full space-y-8">

                {/* Header */}
                <div className="text-center space-y-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.5 }}
                        className="mx-auto flex items-center justify-center mb-6"
                    >
                        <img src="/bmaster-logo.svg" alt="B-Master Logo" className="h-16 w-auto object-contain" />
                    </motion.div>
                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.1 }}
                        className="text-4xl sm:text-5xl font-bold tracking-tight"
                    >
                        Welcome to B-Master!
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                        className="text-xl text-muted-foreground max-w-2xl mx-auto"
                    >
                        Let's get started by setting up a completely free, customized AI assistant tailored precisely to your goals.
                    </motion.p>
                </div>

                {/* Grid */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-8"
                >
                    {options.map((option, index) => {
                        const Icon = option.icon
                        const isSelected = selectedOption === option.id

                        return (
                            <motion.div
                                key={option.id}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                            >
                                <Card
                                    className={`h-full cursor-pointer transition-all duration-200 border-2 ${isSelected
                                        ? "border-primary shadow-md bg-primary/5"
                                        : "border-transparent hover:border-primary/20 hover:shadow-sm"
                                        }`}
                                    onClick={() => setSelectedOption(option.id as AssistantOption)}
                                >
                                    <CardHeader>
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${option.color}`}>
                                            <Icon className="w-6 h-6" />
                                        </div>
                                        <CardTitle className="text-xl">{option.title}</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-sm text-muted-foreground leading-relaxed">
                                            {option.description}
                                        </p>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        )
                    })}
                </motion.div>

                {/* Footer Actions */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.5 }}
                    className="flex justify-center pt-8"
                >
                    <Button
                        size="lg"
                        className="w-full sm:w-auto min-w-[200px] text-lg h-14"
                        disabled={!selectedOption || isSubmitting}
                        onClick={handleComplete}
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                Crafting your assistant...
                            </>
                        ) : (
                            <>
                                Continue
                                <Sparkles className="w-5 h-5 ml-2" />
                            </>
                        )}
                    </Button>
                </motion.div>

            </div>
        </div>
    )
}
