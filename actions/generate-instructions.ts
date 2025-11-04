"use server"

import { openai } from "@ai-sdk/openai"
import { streamText } from "ai"
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

export async function generateInstructions({
  prompt,
}: GenerateInstructionsParams): Promise<GenerateInstructionsResponse> {
  try {
    if (!prompt?.trim()) {
      return {
        success: false,
        error: 'Prompt cannot be empty'
      }
    }

    const model = 'gpt-4o-mini'

    const result = await streamText({
      model: openai(model),
      system: INSTRUCTION_GENERATION_PROMPT,
      prompt: `Create detailed instructions for an AI assistant based on this description: "${prompt}"

Please provide comprehensive, clear, and actionable instructions that the assistant can follow. Structure the instructions professionally and make them suitable for direct use as a system prompt.`,
    })

    const instructions = await result.text

    if (!instructions) {
      return {
        success: false,
        error: 'No instructions were generated'
      }
    }

    return {
      success: true,
      instructions
    }

  } catch (error) {
    console.error('Error generating instructions:', error)

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate instructions'
    }
  }
}

