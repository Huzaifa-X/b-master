import { createOpenAI } from '@ai-sdk/openai';

export const ai_sdk_openai = createOpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: "https://api.openai.com/v1",
});