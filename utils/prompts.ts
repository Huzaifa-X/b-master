import fs from 'fs';
import path from 'path';

export function getSystemPrompt() {
    const promptPath = path.join(process.cwd(), 'prompts', 'gen-system-prompt.md');
    return fs.readFileSync(promptPath, 'utf-8');
}

export function getArtifactInstructionsGeneratorPrompt() {
    const promptPath = path.join(process.cwd(), 'prompts', 'artifact-prompt-generator.md');
    return fs.readFileSync(promptPath, 'utf-8');
}

export function getArtifactCodingPrompt() {
    const promptPath = path.join(process.cwd(), 'prompts', 'artifact-coding-prompt.md');
    return fs.readFileSync(promptPath, 'utf-8');
}