export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  conversationId: string
}

export interface UserConversation {
  userId: string
  messages: Message[]
}

// Mock conversation data linked to users
export const mockConversations: UserConversation[] = [
  {
    userId: "1", // John Doe
    messages: [
      {
        id: "m1",
        role: "user",
        content: "Draft a blog post about the benefits of AI in healthcare.",
        timestamp: "2026-01-22T10:30:00",
        conversationId: "c1"
      },
      {
        id: "m2",
        role: "assistant",
        content: "Here is a draft blog post about AI in healthcare: \n\n**The Revolution of AI in Healthcare**\n\nArtificial Intelligence is transforming the healthcare industry...",
        timestamp: "2026-01-22T10:30:05",
        conversationId: "c1"
      },
      {
        id: "m3",
        role: "user",
        content: "Can you make it shorter and focus more on diagnostics?",
        timestamp: "2026-01-22T10:32:00",
        conversationId: "c1"
      },
      {
        id: "m4",
        role: "assistant",
        content: "Certainly! Here is a revised version focusing on diagnostics:\n\n**AI-Powered Diagnostics: A New Era**\n\nAI algorithms are now capable of analyzing medical images with higher accuracy than ever before...",
        timestamp: "2026-01-22T10:32:10",
        conversationId: "c1"
      }
    ]
  },
  {
    userId: "2", // Sarah Smith
    messages: [
      {
        id: "m5",
        role: "user",
        content: "I need a Python script to scrape data from a website.",
        timestamp: "2026-01-21T14:15:00",
        conversationId: "c2"
      },
      {
        id: "m6",
        role: "assistant",
        content: "I can help with that. However, please ensure you have permission to scrape the website. Here is a basic example using BeautifulSoup...",
        timestamp: "2026-01-21T14:15:05",
        conversationId: "c2"
      },
      {
        id: "m7",
        role: "user",
        content: "The website has pagination. How do I handle that?",
        timestamp: "2026-01-21T14:20:00",
        conversationId: "c2"
      },
      {
        id: "m8",
        role: "assistant",
        content: "To handle pagination, you can find the 'Next' button link and loop through the pages. Here is an updated script...",
        timestamp: "2026-01-21T14:20:15",
        conversationId: "c2"
      }
    ]
  },
  {
    userId: "3", // Mike Johnson
    messages: [
      {
        id: "m9",
        role: "user",
        content: "What are the latest security best practices for React apps?",
        timestamp: "2026-01-22T09:00:00",
        conversationId: "c3"
      },
      {
        id: "m10",
        role: "assistant",
        content: "Here are some key security best practices for React applications:\n1. Sanitize user input to prevent XSS.\n2. Use HTTPS.\n3. Implement proper authentication...",
        timestamp: "2026-01-22T09:00:10",
        conversationId: "c3"
      }
    ]
  }
]
