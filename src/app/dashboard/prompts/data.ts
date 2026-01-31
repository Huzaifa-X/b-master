export interface AIPrompt {
  id: string
  name: string
  description: string
  systemPrompt: string
  model: string
  temperature: number
  maxTokens: number
  isActive: boolean
  category: string
  createdAt: string
  updatedAt: string
}

export const mockPrompts: AIPrompt[] = [
  {
    id: "1",
    name: "Content Writer",
    description: "Generates engaging blog posts and articles",
    systemPrompt: "You are an expert content writer with SEO knowledge...",
    model: "gpt-4",
    temperature: 0.7,
    maxTokens: 2000,
    isActive: true,
    category: "Content Generation",
    createdAt: "2026-01-15",
    updatedAt: "2026-01-20",
  },
  {
    id: "2",
    name: "Code Assistant",
    description: "Helps with programming tasks and debugging",
    systemPrompt: "You are a senior software engineer helping with code...",
    model: "gpt-4",
    temperature: 0.3,
    maxTokens: 4000,
    isActive: true,
    category: "Development",
    createdAt: "2026-01-10",
    updatedAt: "2026-01-18",
  },
  {
    id: "3",
    name: "Customer Support",
    description: "Friendly customer service assistant",
    systemPrompt: "You are a helpful customer support representative...",
    model: "gpt-3.5-turbo",
    temperature: 0.5,
    maxTokens: 1000,
    isActive: true,
    category: "Support",
    createdAt: "2026-01-12",
    updatedAt: "2026-01-19",
  },
  {
    id: "4",
    name: "Data Analyzer",
    description: "Analyzes and interprets data patterns",
    systemPrompt: "You are a data scientist helping analyze data...",
    model: "gpt-4",
    temperature: 0.2,
    maxTokens: 3000,
    isActive: false,
    category: "Analytics",
    createdAt: "2026-01-08",
    updatedAt: "2026-01-16",
  },
]
