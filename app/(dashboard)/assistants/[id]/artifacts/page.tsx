"use client"

import { use, useState } from "react"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, Plus, FolderOpen, Loader2 } from "lucide-react"
import { CreateArtifactDialog } from "@/components/artifacts/create-artifact-dialog"
import { ArtifactCard, type Artifact } from "@/components/artifacts/artifact-card"
import { useArtifacts, useInvalidateArtifacts } from "@/hooks/useArtifact"
import { useSetAssistantMode } from "@/hooks/useAssistant"

// Dummy HTML generator for different artifacts
const getDummyHTML = (name: string, category: string) => {
  const colors: Record<string, { primary: string; secondary: string }> = {
    accounting: { primary: "#3b82f6", secondary: "#60a5fa" },
    invoice: { primary: "#10b981", secondary: "#34d399" },
    payment: { primary: "#8b5cf6", secondary: "#a78bfa" },
    documentation: { primary: "#f59e0b", secondary: "#fbbf24" },
    analytics: { primary: "#ec4899", secondary: "#f472b6" },
    presentation: { primary: "#6366f1", secondary: "#818cf8" },
    booking: { primary: "#f97316", secondary: "#fb923c" },
    others: { primary: "#6b7280", secondary: "#9ca3af" },
  }

  const color = colors[category.toLowerCase()] || colors.others

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, ${color.primary} 0%, ${color.secondary} 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        .card {
            background: white;
            border-radius: 16px;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
            padding: 30px;
            max-width: 400px;
            width: 100%;
            text-align: center;
        }
        .icon { font-size: 48px; margin-bottom: 20px; }
        h1 { color: ${color.primary}; font-size: 24px; margin-bottom: 8px; }
        .category {
            color: #666;
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 20px;
        }
        p { color: #555; line-height: 1.6; font-size: 14px; }
    </style>
</head>
<body>
    <div class="card">
        <div class="icon">✨</div>
        <h1>${name}</h1>
        <p class="category">${category}</p>
        <p>AI-powered artifact ready to use</p>
    </div>
</body>
</html>`
}

// Mock artifacts
const MOCK_ARTIFACTS: Artifact[] = [
  {
    id: "1",
    name: "Expense Tracker - Copy",
    category: "accounting",
    htmlContent: getDummyHTML("Expense Tracker", "accounting"),
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
  },
  {
    id: "2",
    name: "Professional Invoice - Copy",
    category: "invoice",
    htmlContent: getDummyHTML("Professional Invoice", "invoice"),
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
  },
  {
    id: "3",
    name: "Sales Dashboard - Copy",
    category: "analytics",
    htmlContent: getDummyHTML("Sales Dashboard", "analytics"),
    createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
  },
  {
    id: "4",
    name: "Business Pitch Deck - Copy",
    category: "presentation",
    htmlContent: getDummyHTML("Business Pitch Deck", "presentation"),
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
  },
  {
    id: "5",
    name: "Payment Tracker - Copy",
    category: "payment",
    htmlContent: getDummyHTML("Payment Tracker", "payment"),
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
  },
  {
    id: "6",
    name: "Online Meeting Scheduler - Copy",
    category: "booking",
    htmlContent: getDummyHTML("Online Meeting Scheduler", "booking"),
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
  },
]

export default function ArtifactsPage({ params }: { params: Promise<{ id: string }> }) {
    // Unwrap params promise for Next.js 15
    const { id: assistantId } = use(params)
    const router = useRouter()
    
    // Set assistant mode in header (automatically handles fetching and cleanup)
    useSetAssistantMode(assistantId)
    
    const [searchQuery, setSearchQuery] = useState("")
    const [createDialogOpen, setCreateDialogOpen] = useState(false)
    
    // Use React Query hook to fetch artifacts
    const { artifacts, isLoading, isError } = useArtifacts(assistantId)
    const { invalidateArtifacts } = useInvalidateArtifacts()

    const handleCreateArtifact = () => {
        setCreateDialogOpen(true)
    }

    const handleArtifactCreated = () => {
        // Invalidate and refetch artifacts after creation
        invalidateArtifacts(assistantId)
    }

    const handleCardClick = (artifactId: string) => {
        router.push(`/assistants/${assistantId}/artifacts/${artifactId}`)
    }

    // Filter artifacts based on search
    const filteredArtifacts = artifacts.filter(
        (artifact) =>
            artifact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            artifact.category.toLowerCase().includes(searchQuery.toLowerCase())
    )

    return (
        <div className="h-full overflow-y-auto">
            <div className="container mx-auto py-6 px-4 max-w-4xl">
                {/* Header */}
                <div className="mb-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight">Artifacts</h1>
                            <p className="text-sm text-muted-foreground mt-1">
                                Create and manage your AI-powered artifacts
                            </p>
                        </div>
                        <Button
                            onClick={handleCreateArtifact}
                            className="w-full sm:w-auto"
                        >
                            <Plus className="h-4 w-4 mr-2" />
                            Create Artifact
                        </Button>
                    </div>
                </div>

                {/* Search Bar */}
                <div className="mb-8">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search artifacts..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                </div>

                {/* Artifacts Grid or Empty State */}
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-16">
                        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                        <p className="text-sm text-muted-foreground">Loading artifacts...</p>
                    </div>
                ) : isError ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                        <FolderOpen className="h-16 w-16 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-semibold mb-2">Failed to load artifacts</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                            There was an error loading your artifacts. Please try again.
                        </p>
                    </div>
                ) : filteredArtifacts.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredArtifacts.map((artifact) => (
                            <ArtifactCard
                                key={artifact.id}
                                artifact={artifact}
                                onClick={() => handleCardClick(artifact.id)}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                        <FolderOpen className="h-16 w-16 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-semibold mb-2">
                            {searchQuery ? "No artifacts found" : "No artifacts yet"}
                        </h3>
                        <p className="text-sm text-muted-foreground mb-4">
                            {searchQuery
                                ? "Try a different search term"
                                : "Create your first artifact to get started"}
                        </p>
                        {!searchQuery && (
                            <Button onClick={handleCreateArtifact}>
                                <Plus className="h-4 w-4 mr-2" />
                                Create Artifact
                            </Button>
                        )}
                    </div>
                )}
            </div>

            {/* Create Artifact Dialog */}
            <CreateArtifactDialog 
                open={createDialogOpen} 
                onOpenChange={(open) => {
                    setCreateDialogOpen(open)
                    if (!open) {
                        // Refresh artifacts when dialog closes
                        handleArtifactCreated()
                    }
                }}
                assistantId={assistantId}
            />
        </div>
    )
}