import prisma from '@/lib/prisma';

/**
 * Get a prompt from the database by name
 * @param name - The name of the prompt
 * @returns The prompt text
 */
async function getPromptFromDB(name: string): Promise<string> {
  try {
    const prompt = await prisma.prompt.findUnique({
      where: { name },
      select: { prompt: true }
    });

    if (!prompt) {
      throw new Error(`Prompt "${name}" not found in database`);
    }

    return prompt.prompt;
  } catch (error) {
    console.error(`Error fetching prompt "${name}":`, error);
    throw error;
  }
}

export async function getSystemPrompt() {
  return await getPromptFromDB('gen-system-prompt');
}

export async function getArtifactInstructionsGeneratorPrompt() {
  return await getPromptFromDB('artifact-prompt-generator');
}

export async function getArtifactCodingPrompt() {
  return await getPromptFromDB('artifact-coding-prompt');
}

export async function getAssistantGptPromptGeneratorPrompt() {
  return await getPromptFromDB('Assistant-gpt-prompt-generator');
}