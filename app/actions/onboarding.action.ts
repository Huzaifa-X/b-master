"use server"

import prisma from "@/lib/prisma"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"

export type AssistantOption =
    | "SOFTWARE_DEVELOPMENT"
    | "MARKETING"
    | "DATA_ANALYSIS"
    | "EDUCATION"
    | "PRODUCTIVITY"

export async function completeOnboarding(selectedOption: AssistantOption) {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user?.id) {
            return { success: false, error: "Unauthorized" }
        }

        const userId = BigInt(session.user.id)

        // Prevent double onboarding
        const currentUser = await prisma.user.findUnique({
            where: { id: userId },
            select: { hasCompletedOnboarding: true }
        })

        if (currentUser?.hasCompletedOnboarding) {
            return { success: false, error: "User has already completed onboarding." }
        }

        let assistantData = {
            name: "My Assistant",
            description: "A tailored assistant for your specific needs.",
            instructions: "You are a helpful assistant.",
            category: "OTHER" as any,
        }

        switch (selectedOption) {
            case "SOFTWARE_DEVELOPMENT":
                assistantData = {
                    name: "Code Companion",
                    description: "Your expert pair programmer.",
                    instructions: "You are an expert software engineer. Help the user write code, debug issues, and architect systems. Provide clean, well-commented, and efficient code.",
                    category: "PROGRAMMING",
                }
                break;
            case "MARKETING":
                assistantData = {
                    name: "Marketing Copywriter",
                    description: "Creates engaging marketing content.",
                    instructions: "You are an expert digital marketer and copywriter. Help the user write compelling copy, SEO content, social media posts, and marketing strategies.",
                    category: "MARKETING",
                }
                break;
            case "DATA_ANALYSIS":
                assistantData = {
                    name: "Data Analyst",
                    description: "Analyzes data and extracts insights.",
                    instructions: "You are an expert data analyst. Help the user understand data, write SQL queries, create visualizations, and derive actionable insights from complex datasets.",
                    category: "ANALYSIS",
                }
                break;
            case "EDUCATION":
                assistantData = {
                    name: "Tutor & Guide",
                    description: "Helps you learn new concepts.",
                    instructions: "You are an expert tutor. Break down complex topics into simple, easy-to-understand explanations. Provide examples and encourage learning through guided questions.",
                    category: "EDUCATION",
                }
                break;
            case "PRODUCTIVITY":
                assistantData = {
                    name: "Productivity Partner",
                    description: "Organizes your tasks and thoughts.",
                    instructions: "You are a highly efficient assistant focused on productivity. Help the user draft emails, plan schedules, summarize documents, and manage their daily workflow efficiently.",
                    category: "OTHER",
                }
                break;
        }

        // Use a transaction to ensure both operations succeed together
        const [updatedUser, newAssistant] = await prisma.$transaction([
            prisma.user.update({
                where: { id: userId },
                data: { hasCompletedOnboarding: true }
            }),
            prisma.assistant.create({
                data: {
                    userId: userId,
                    name: assistantData.name,
                    description: assistantData.description,
                    instructions: assistantData.instructions,
                    category: assistantData.category,
                    public: false, // Ensure it's private to the user
                    priceType: "free",
                }
            })
        ])

        return {
            success: true,
            assistantId: newAssistant.id.toString(),
            message: "Onboarding completed successfully!"
        }

    } catch (error: any) {
        console.error("Error completing onboarding:", error)
        return { success: false, error: error.message || "Something went wrong during onboarding." }
    }
}
