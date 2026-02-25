'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, ExternalLink, Loader2, PlugZap, Unplug } from 'lucide-react'
import { useBCoderSupabase } from '@/hooks/useBCoderSupabase'

interface SupabaseConnectDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function SupabaseConnectDialog({ open, onOpenChange }: SupabaseConnectDialogProps) {
    const { connection, isConnecting, isDisconnecting, connect, disconnect } = useBCoderSupabase()

    const [pat, setPat] = useState('')
    const [projectRef, setProjectRef] = useState('')

    const handleConnect = async () => {
        if (!pat.trim() || !projectRef.trim()) {
            toast.error('Please enter both your PAT and project ref')
            return
        }
        const result = await connect(pat.trim(), projectRef.trim())
        if (result.success) {
            toast.success('Supabase connected! The AI can now create tables and manage your database.')
            setPat('')
            setProjectRef('')
            onOpenChange(false)
        } else {
            toast.error(result.error || 'Failed to connect to Supabase')
        }
    }

    const handleDisconnect = async () => {
        await disconnect()
        toast.success('Supabase disconnected')
        onOpenChange(false)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <SupabaseLogo className="h-5 w-5" />
                        Connect Supabase
                    </DialogTitle>
                    <DialogDescription>
                        Give the B-Coder AI access to your Supabase project to create tables, enable RLS, and manage your database automatically.
                    </DialogDescription>
                </DialogHeader>

                {connection.connected ? (
                    <div className="space-y-4 py-2">
                        <div className="flex items-center gap-3 rounded-lg border p-3 bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800">
                            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                            <div className="min-w-0">
                                <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">Connected</p>
                                {connection.providerEmail && (
                                    <p className="text-xs text-emerald-600 dark:text-emerald-400 truncate">{connection.providerEmail}</p>
                                )}
                            </div>
                            <Badge variant="secondary" className="ml-auto shrink-0 font-mono text-xs">
                                {connection.projectRef}
                            </Badge>
                        </div>

                        <div className="rounded-lg border p-3 bg-muted/40 space-y-2">
                            <p className="text-xs font-medium text-muted-foreground uppercase">Project URL</p>
                            <p className="text-sm font-mono break-all">{connection.projectUrl}</p>
                        </div>

                        <Button
                            variant="destructive"
                            className="w-full"
                            onClick={handleDisconnect}
                            disabled={isDisconnecting}
                        >
                            {isDisconnecting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Unplug className="mr-2 h-4 w-4" />}
                            Disconnect Supabase
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-4 py-2">
                        <div className="space-y-2">
                            <Label htmlFor="pat">
                                Personal Access Token (PAT)
                            </Label>
                            <Input
                                id="pat"
                                type="password"
                                placeholder="sbp_xxxxxxxxxxxxxxxxxxxx"
                                value={pat}
                                onChange={e => setPat(e.target.value)}
                            />
                            <p className="text-xs text-muted-foreground">
                                Generate one at{' '}
                                <a
                                    href="https://supabase.com/dashboard/account/tokens"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-primary underline inline-flex items-center gap-0.5"
                                >
                                    supabase.com/dashboard/account/tokens <ExternalLink className="h-3 w-3" />
                                </a>
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="projectRef">Project Reference</Label>
                            <Input
                                id="projectRef"
                                placeholder="abcdefghijklmnop"
                                value={projectRef}
                                onChange={e => setProjectRef(e.target.value)}
                            />
                            <p className="text-xs text-muted-foreground">
                                Found in your project URL: supabase.com/dashboard/project/<strong className="text-foreground">{"<project-ref>"}</strong>
                            </p>
                        </div>

                        <Button
                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                            onClick={handleConnect}
                            disabled={isConnecting || !pat.trim() || !projectRef.trim()}
                        >
                            {isConnecting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlugZap className="mr-2 h-4 w-4" />}
                            Connect Supabase
                        </Button>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}

function SupabaseLogo({ className }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
            <path d="M13.277 21.998c-.403.02-.806-.102-1.124-.34a1.74 1.74 0 0 1-.627-1.084L10.47 10.47H3.03c-.522 0-1.01-.267-1.29-.707a1.49 1.49 0 0 1-.154-1.386l.002-.004C2.31 6.658 5.257 1.027 5.257 1.027c.23-.407.636-.7 1.103-.793a1.74 1.74 0 0 1 1.29.34c.38.295.627.73.627 1.084l1.056 10.105h7.44c.522 0 1.01.267 1.29.707.28.44.312.99.154 1.386l-.002.004c-.722 1.715-3.669 7.346-3.669 7.346-.23.407-.636.7-1.103.793-.09.018-.18.027-.27.027l.104-.028Z" />
        </svg>
    )
}
