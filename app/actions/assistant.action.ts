"use server"

import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { openai } from "@/lib/openai";
import { GenerateInstructionsParams, GenerateInstructionsResponse } from "@/types/ai-instruction"

const INSTRUCTION_GENERATION_PROMPT = `You are an expert AI assistant creator with extensive knowledge of prompt engineering and AI system design.

Your task is to generate comprehensive, clear, and actionable instructions for AI assistants based on user descriptions. Follow these guidelines:

1. **Structure**: Create well-organized instructions with clear sections and formatting
2. **Specificity**: Be specific about behaviors, tone, and capabilities
3. **Completeness**: Cover all aspects mentioned in the user's description
4. **Professional**: Use clear, professional language suitable for AI systems
5. **Actionable**: Provide concrete instructions that an AI can follow
6. **Extensible**: Make instructions that can handle variations and edge cases

Format your response as a complete instruction set that can be directly used as an AI assistant's system prompt.`

export async function generateAssistantInstructions({
    prompt,
}: GenerateInstructionsParams): Promise<GenerateInstructionsResponse> {
    try {
        // Get authenticated user
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return {
                success: false,
                error: 'Authentication required'
            }
        }

        const userId = BigInt(session.user.id)

        if (!prompt?.trim()) {
            return {
                success: false,
                error: 'Prompt cannot be empty'
            }
        }

        const model = 'gpt-5'
        const startTime = Date.now()

        const response = await openai.responses.create({
            model: model,
            reasoning: { effort: "low" },
            instructions: INSTRUCTION_GENERATION_PROMPT,
            input: prompt,
        });

        if (!response.output_text) {
            return {
                success: false,
                error: 'No instructions were generated',
            }
        }

        // Track usage metrics
        try {
            const inputToken = response.usage?.input_tokens || 0
            const outputToken = response.usage?.output_tokens || 0
            const totalToken = inputToken + outputToken

            // Calculate cost based on pricing per 1K tokens
            const cost_per_1k_input = 0.002
            const cost_per_1k_output = 0.008
            const input_cost = (inputToken / 1000) * cost_per_1k_input
            const output_cost = (outputToken / 1000) * cost_per_1k_output
            const totalCost = input_cost + output_cost

            await prisma.usageMetric.create({
                data: {
                    userId,
                    assistantId: null as any, // No specific assistant for instruction generation
                    inputToken,
                    outputToken,
                    totalToken,
                    totalCost,
                    toolUsing: null, // No tools used for instruction generation
                    costType: 'instruction_generation'
                }
            })
        } catch (metricError) {
            console.error('Error tracking usage metrics:', metricError)
            // Don't fail the main operation if metrics tracking fails
        }

        return {
            success: true,
            instructions: response.output_text
        }
    } catch (error) {
        console.error('Error generating instructions:', error)
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to generate instructions',
        }
    }
}
