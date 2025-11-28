import fs from 'fs';
import path from 'path';

export function getSystemPrompt() {
    const promptPath = path.join(process.cwd(), 'prompts', 'gen-system-prompt.md');
    return fs.readFileSync(promptPath, 'utf-8');
}