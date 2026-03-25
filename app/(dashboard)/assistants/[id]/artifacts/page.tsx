"use client"

import { use, useState, lazy, Suspense } from "react"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, Plus, FolderOpen, Loader2, Code2 } from "lucide-react"
import { ArtifactCard, type Artifact } from "@/components/artifacts/artifact-card"
import { useArtifacts, useInvalidateArtifacts, useArtifactById } from "@/hooks/useArtifact"
import { useSetAssistantMode } from "@/hooks/useAssistant"
import { useAssistantPermissions } from "@/hooks/usePermissions"
import { TemplateSelectionModal } from "@/components/b-coder/template-selection-modal"

import { useLocale } from "@/lib/i18n"

// Lazy load the CreateArtifactDialog to reduce initial bundle size
const CreateArtifactDialog = lazy(() =>
    import("@/components/artifacts/create-artifact-dialog").then(module => ({
        default: module.CreateArtifactDialog
    }))
)

// Lazy load the ViewArtifactDialog for video artifacts
const ViewArtifactDialog = lazy(() =>
    import("@/components/artifacts/view-artifact-dialog").then(module => ({
        default: module.ViewArtifactDialog
    }))
)

export default function ArtifactsPage({ params }: { params: Promise<{ id: string }> }) {
    // Unwrap params promise for Next.js 15
    const { id: assistantId } = use(params)
    const router = useRouter()
    const { t } = useLocale()

    // Set assistant mode in header (automatically handles fetching and cleanup)
    useSetAssistantMode(assistantId)

    // Fetch permissions
    const { permissions } = useAssistantPermissions(assistantId)

    const [searchQuery, setSearchQuery] = useState("")
    const [createDialogOpen, setCreateDialogOpen] = useState(false)
    const [viewArtifactId, setViewArtifactId] = useState<string | null>(null)
    const [showTemplateModal, setShowTemplateModal] = useState(false)

    // Use React Query hook to fetch artifacts
    const { artifacts, isLoading, isError } = useArtifacts(assistantId)
    const { invalidateArtifacts } = useInvalidateArtifacts()

    // Fetch full artifact data for viewing in modal (only when viewArtifactId is set)
    const { artifact: viewArtifact } = useArtifactById(viewArtifactId || "", {
        enabled: !!viewArtifactId
    })

    // Check if user can create artifacts (only owners can create)
    const canCreateArtifacts = permissions?.isOwner || permissions?.permissions?.includes('artifacts') || false

    const handleCreateArtifact = () => {
        setCreateDialogOpen(true)
    }

    const handleArtifactCreated = () => {
        // Invalidate and refetch artifacts after creation
        invalidateArtifacts(assistantId)
    }

    const handleCardClick = (artifact: Artifact) => {
        // For video_generation artifacts or VIEWER access, show in modal (read-only)
        // For EDITOR/ADMIN access, navigate to full page with chatbot
        const isViewerAccess = artifact.access === 'VIEWER'
        const isVideoArtifact = artifact.category === "video_generation"
        const isDeployedProject = artifact.category === "Deployed Project"

        if (isVideoArtifact || isViewerAccess) {
            // Read-only view in modal (can view and download only)
            setViewArtifactId(artifact.id)
        } else if (isDeployedProject) {
            // Open B-Coder and load the project using the artifact ID
            router.push(`/assistants/${assistantId}/b-coder?artifact=${artifact.id}`)
        } else {
            // Full access - navigate to detail page with chatbot (can edit)
            router.push(`/assistants/${assistantId}/artifacts/${artifact.id}`)
        }
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
                            <h1 className="text-3xl font-bold tracking-tight">{t("artifacts.title")}</h1>
                            <p className="text-sm text-muted-foreground mt-1">
                                {t("artifacts.description")}
                            </p>
                        </div>
                        {canCreateArtifacts && (
                            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                                <Button
                                    onClick={() => setShowTemplateModal(true)}
                                    variant="outline"
                                    className="w-full sm:w-auto bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-950/50"
                                >
                                    <Code2 className="h-4 w-4 mr-2" />
                                    B-Coder
                                </Button>
                                <Button
                                    onClick={handleCreateArtifact}
                                    className="w-full sm:w-auto"
                                >
                                    <Plus className="h-4 w-4 mr-2" />
                                    {t("artifacts.createArtifact")}
                                </Button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Search Bar */}
                <div className="mb-8">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder={t("artifacts.searchPlaceholder")}
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
                        <p className="text-sm text-muted-foreground">{t("artifacts.loadingArtifacts")}</p>
                    </div>
                ) : isError ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                        <FolderOpen className="h-16 w-16 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-semibold mb-2">{t("artifacts.loadFailed")}</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                            {t("artifacts.loadError")}
                        </p>
                    </div>
                ) : filteredArtifacts.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredArtifacts.map((artifact) => (
                            artifact.htmlContent.trim() !== '' && (
                                <ArtifactCard
                                    key={artifact.id}
                                    artifact={artifact}
                                    onClick={() => handleCardClick(artifact)}
                                />
                            )
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                        <FolderOpen className="h-16 w-16 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-semibold mb-2">
                            {searchQuery ? t("artifacts.noResults") : t("artifacts.noArtifacts")}
                        </h3>
                        <p className="text-sm text-muted-foreground mb-4">
                            {searchQuery
                                ? t("artifacts.tryDifferentSearch")
                                : t("artifacts.createFirstArtifact")}
                        </p>
                        {!searchQuery && canCreateArtifacts && (
                            <Button onClick={handleCreateArtifact}>
                                <Plus className="h-4 w-4 mr-2" />
                                {t("artifacts.createArtifact")}
                            </Button>
                        )}
                    </div>
                )}
            </div>

            {/* Create Artifact Dialog - Lazy loaded */}
            {createDialogOpen && (
                <Suspense fallback={null}>
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
                </Suspense>
            )}

            {/* View Artifact Dialog - For VIEWER access or Video Generation (Read-only) - Lazy loaded */}
            {viewArtifactId && (
                <Suspense fallback={null}>
                    <ViewArtifactDialog
                        artifact={viewArtifact ? {
                            id: viewArtifact.id,
                            name: viewArtifact.name,
                            category: viewArtifact.category || "others",
                            htmlContent: viewArtifact.htmlContent,
                            createdAt: new Date(viewArtifact.createdAt),
                        } : null}
                        open={!!viewArtifactId}
                        onOpenChange={(open) => {
                            if (!open) {
                                setViewArtifactId(null)
                            }
                        }}
                    />
                </Suspense>
            )}

            {/* Template Selection Modal for B-Coder */}
            <TemplateSelectionModal
                open={showTemplateModal}
                onOpenChange={setShowTemplateModal}
                onSelectTemplate={(templateId) => {
                    router.push(`/assistants/${assistantId}/b-coder?template=${templateId}`)
                }}
            />
        </div>
    )
}