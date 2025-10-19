"use client"

import { useState } from "react"
import { Tabs } from "@/components/ui/vercel-tabs"
import { AssistantCard } from "@/components/assistants/assistant-card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, Plus, Bot } from "lucide-react"
import { useRouter } from "next/navigation"
import Image from "next/image"

interface Assistant {
    id: string
    name: string
    price: number
    description: string
    image: string
    category?: string
    createdAt?: string
}

// Mock data for My Assistants
const myAssistants: Assistant[] = [
    {
        id: "1",
        name: "Marketing Assistant",
        price: 29.99,
        description: "Helps create marketing content, social media posts, and campaign strategies",
        image: "/bmaster-icon.png",
        category: "Marketing",
        createdAt: "2024-01-15",
    },
    {
        id: "2",
        name: "Code Review Helper",
        price: 49.99,
        description: "Reviews code, suggests improvements, and helps with debugging complex issues",
        image: "/bmaster-icon.png",
        category: "Development",
        createdAt: "2024-02-20",
    },
    {
        id: "3",
        name: "Content Writer",
        price: 19.99,
        description: "Creates blog posts, articles, and SEO-optimized content for your business",
        image: "/bmaster-icon.png",
        category: "Writing",
        createdAt: "2024-03-10",
    },
    {
        id: "4",
        name: "Data Analyst",
        price: 39.99,
        description: "Analyzes data, creates reports, and provides insights for business decisions",
        image: "/bmaster-icon.png",
        category: "Analytics",
        createdAt: "2024-03-25",
    },
    {
        id: "5",
        name: "Customer Support",
        price: 24.99,
        description: "Handles customer inquiries, provides support, and resolves issues efficiently",
        image: "/bmaster-icon.png",
        category: "Support",
        createdAt: "2024-04-05",
    },
    {
        id: "6",
        name: "Sales Assistant",
        price: 34.99,
        description: "Helps with sales pitches, lead generation, and customer relationship management",
        image: "/bmaster-icon.png",
        category: "Sales",
        createdAt: "2024-04-20",
    },
]

// Mock data for Purchased Assistants
const purchasedAssistants: Assistant[] = [
    {
        id: "p1",
        name: "Email Marketing Pro",
        price: 45.00,
        description: "Advanced email campaign management with A/B testing and analytics",
        image: "/bmaster-icon.png",
        category: "Marketing",
    },
    {
        id: "p2",
        name: "SEO Optimizer",
        price: 55.00,
        description: "Optimize your content for search engines and improve rankings",
        image: "/bmaster-icon.png",
        category: "SEO",
    },
    {
        id: "p3",
        name: "Legal Document Assistant",
        price: 89.99,
        description: "Helps draft legal documents, contracts, and agreements",
        image: "/bmaster-icon.png",
        category: "Legal",
    },
    {
        id: "p4",
        name: "Financial Advisor",
        price: 79.99,
        description: "Provides financial advice, budgeting tips, and investment strategies",
        image: "/bmaster-icon.png",
        category: "Finance",
    },
    {
        id: "p5",
        name: "Fitness Coach",
        price: 29.99,
        description: "Creates workout plans, nutrition guides, and fitness tracking",
        image: "/bmaster-icon.png",
        category: "Health",
    },
    {
        id: "p6",
        name: "Language Tutor",
        price: 39.99,
        description: "Helps learn new languages with interactive lessons and practice",
        image: "/bmaster-icon.png",
        category: "Education",
    },
]

// Mock data for Shared Assistants
const sharedAssistants: Assistant[] = [
    {
        id: "s1",
        name: "Team Productivity",
        price: 0,
        description: "Shared by team lead for project management and task tracking",
        image: "/bmaster-icon.png",
        category: "Productivity",
    },
    {
        id: "s2",
        name: "Design Review Assistant",
        price: 0,
        description: "Shared by design team for reviewing UI/UX and providing feedback",
        image: "/bmaster-icon.png",
        category: "Design",
    },
    {
        id: "s3",
        name: "HR Onboarding",
        price: 0,
        description: "Shared by HR for new employee onboarding and training",
        image: "/bmaster-icon.png",
        category: "HR",
    },
    {
        id: "s4",
        name: "Research Assistant",
        price: 0,
        description: "Shared by research team for academic research and literature review",
        image: "/bmaster-icon.png",
        category: "Research",
    },
    {
        id: "s5",
        name: "Meeting Notes",
        price: 0,
        description: "Shared by team for taking and organizing meeting notes",
        image: "/bmaster-icon.png",
        category: "Productivity",
    },
    {
        id: "s6",
        name: "Documentation Writer",
        price: 0,
        description: "Shared by tech team for creating technical documentation",
        image: "/bmaster-icon.png",
        category: "Documentation",
    },
]

const TABS = [
    { id: "marketplace", label: "Marketplace Assistants" },
    { id: "my", label: "My Assistants" },
]

export default function StorePage() {
    const router = useRouter()
    const [activeTab, setActiveTab] = useState("marketplace")
    const [searchQuery, setSearchQuery] = useState("")

    const getCurrentAssistants = () => {
        switch (activeTab) {
            case "marketplace":
                return purchasedAssistants
            case "my":
                return myAssistants
            default:
                return []
        }
    }

    const filteredAssistants = getCurrentAssistants().filter((assistant) =>
        assistant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        assistant.description.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const handleCreateNew = () => {
        router.push("/assistants/add")
    }

    return (
        <div className="h-full overflow-y-auto">
            <div className="container mx-auto py-4 px-4 max-w-4xl pb-16">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div>
                                <Image
                                    src="/storeLogo.svg"
                                    alt="B-Master Store"
                                    width={220}
                                    height={220}
                                />
                                <p className="text-muted-foreground mt-2">
                                    Discover and explore powerful assistants and resources to enhance your productivity and creativity.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Search Bar */}
                    <div className="mb-6">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search assistants..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                    </div>

                    {/* Tabs */}
                    <Tabs tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />
                </div>

                {/* Assistants Grid */}
                {filteredAssistants.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6">
                        {filteredAssistants.map((assistant) => (
                            <AssistantCard
                                key={assistant.id}
                                assistant={assistant}
                                tabType={activeTab as "marketplace" | "my"}
                            />
                        ))}
                    </div>
                ) : searchQuery ? (
                    <div className="text-center py-16">
                        <Search className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                        <h3 className="text-lg font-semibold mb-2">No results found</h3>
                        <p className="text-sm text-muted-foreground">
                            Try searching with different keywords
                        </p>
                    </div>
                ) : (
                    <div className="text-center py-16">
                        <Bot className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                        <h3 className="text-lg font-semibold mb-2">
                            {activeTab === "my" && "No assistants created yet"}
                            {activeTab === "marketplace" && "No marketplace assistants"}
                        </h3>
                        <p className="text-sm text-muted-foreground mb-4">
                            {activeTab === "my" && "Create your first assistant to get started"}
                            {activeTab === "marketplace" && "Browse the marketplace to discover assistants"}
                        </p>
                    </div>
                )}
            </div>
        </div>
    )
}

