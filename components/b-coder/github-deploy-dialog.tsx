import { useState } from "react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, Globe, Github, AlertCircle, CheckCircle2 } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface ActionResponse<T> {
    success: boolean
    data?: T
    error?: { message: string }
}

interface GithubDeployDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onDeploy: (data: { repoName: string; description: string; isPrivate: boolean }) => Promise<ActionResponse<any>>
}

export function GithubDeployDialog({
    open,
    onOpenChange,
    onDeploy,
}: GithubDeployDialogProps) {
    const [repoName, setRepoName] = useState("")
    const [description, setDescription] = useState("")
    const [isDeploying, setIsDeploying] = useState(false)
    const [successData, setSuccessData] = useState<{ githubUrl?: string; vercelUrl?: string } | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [step, setStep] = useState<"idle" | "packaging" | "github" | "vercel">("idle")

    // Generate a random default name
    const placeholders = ["b-coder-awesome-app", "my-new-saas", "react-dashboard-v1"]
    const placeholder = placeholders[Math.floor(Math.random() * placeholders.length)]

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)
        setSuccessData(null)
        setIsDeploying(true)

        // The exact step string mapped here is completely visual, the actual
        // logic happens in `onDeploy` via Server Action/API. 
        setStep("packaging")

        try {
            const finalRepoName = repoName.trim() || placeholder

            const response = await onDeploy({
                repoName: finalRepoName,
                description: description.trim(),
                isPrivate: false, // Defaulting to public for now
            })

            if (!response.success || response.error) {
                setError(response.error?.message || "An unknown error occurred during deployment.")
                setStep("idle")
                return
            }

            setSuccessData(response.data)
        } catch (err: any) {
            setError(err.message || "Something went wrong.")
            setStep("idle")
        } finally {
            setIsDeploying(false)
        }
    }

    const handleClose = () => {
        if (isDeploying) return
        onOpenChange(false)
        // small timeout to let the dialog close animation finish
        setTimeout(() => {
            setRepoName("")
            setDescription("")
            setError(null)
            setSuccessData(null)
            setStep("idle")
        }, 300)
    }

    return (
        <Dialog open={open} onOpenChange={isDeploying ? undefined : handleClose}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Globe className="h-5 w-5 text-emerald-500" />
                        Deploy Project
                    </DialogTitle>
                    <DialogDescription>
                        Publish your B-Coder workspace code to GitHub and deploy it live on Vercel.
                    </DialogDescription>
                </DialogHeader>

                {successData ? (
                    <div className="py-6 flex flex-col items-center justify-center space-y-4 text-center">
                        <div className="h-12 w-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center">
                            <CheckCircle2 className="h-6 w-6" />
                        </div>
                        <div className="space-y-1">
                            <h3 className="font-semibold text-lg text-emerald-600">Deployment Successful!</h3>
                            <p className="text-sm text-muted-foreground">Your project is now live on the world wide web.</p>
                        </div>

                        <div className="w-full space-y-2 mt-4 text-left">
                            {successData.vercelUrl && (
                                <div className="bg-muted/50 p-3 rounded-lg text-sm flex flex-col gap-1">
                                    <span className="font-medium text-xs uppercase text-muted-foreground">Live Application</span>
                                    <a href={successData.vercelUrl.startsWith('http') ? successData.vercelUrl : `https://${successData.vercelUrl}`} target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:underline break-all flex items-center gap-1.5">
                                        <Globe className="h-4 w-4 shrink-0" />
                                        {successData.vercelUrl}
                                    </a>
                                </div>
                            )}
                            {successData.githubUrl && (
                                <div className="bg-muted/50 p-3 rounded-lg text-sm flex flex-col gap-1">
                                    <span className="font-medium text-xs uppercase text-muted-foreground">Repository</span>
                                    <a href={successData.githubUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline break-all flex items-center gap-1.5">
                                        <Github className="h-4 w-4 shrink-0" />
                                        {successData.githubUrl.replace('https://github.com/', '')}
                                    </a>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit}>
                        <div className="grid gap-4 py-4">
                            {error && (
                                <Alert variant="destructive">
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertDescription className="break-words">{error}</AlertDescription>
                                </Alert>
                            )}
                            <div className="grid gap-2">
                                <Label htmlFor="repoName">Repository Name</Label>
                                <Input
                                    id="repoName"
                                    value={repoName}
                                    onChange={(e) => setRepoName(e.target.value.replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase())}
                                    placeholder={placeholder}
                                    disabled={isDeploying}
                                />
                                <p className="text-[10px] text-muted-foreground">Only lowercase letters, numbers, and hyphens.</p>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="description">Description (Optional)</Label>
                                <Textarea
                                    id="description"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="A beautiful app generated by B-Coder..."
                                    className="resize-none h-20"
                                    disabled={isDeploying}
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={handleClose} disabled={isDeploying}>
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={isDeploying}
                                className="bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-700 hover:to-cyan-700 text-white min-w-[120px]"
                            >
                                {isDeploying ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Publishing...
                                    </>
                                ) : (
                                    "Publish Project"
                                )}
                            </Button>
                        </DialogFooter>
                    </form>
                )}
            </DialogContent>
        </Dialog>
    )
}
