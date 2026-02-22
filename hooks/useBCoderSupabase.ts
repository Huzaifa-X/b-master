'use client'

import { useState, useEffect, useCallback } from 'react'

interface SupabaseConnection {
    connected: boolean
    projectRef?: string
    projectUrl?: string
    anonKey?: string
    providerEmail?: string
}

export function useBCoderSupabase() {
    const [connection, setConnection] = useState<SupabaseConnection>({ connected: false })
    const [isLoading, setIsLoading] = useState(true)
    const [isConnecting, setIsConnecting] = useState(false)
    const [isDisconnecting, setIsDisconnecting] = useState(false)

    const fetchStatus = useCallback(async () => {
        try {
            const res = await fetch('/api/b-coder/supabase/connect')
            if (res.ok) {
                const data = await res.json()
                setConnection(data)
            }
        } catch {
            // silently fail
        } finally {
            setIsLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchStatus()
    }, [fetchStatus])

    const connect = useCallback(async (pat: string, projectRef: string) => {
        setIsConnecting(true)
        try {
            const res = await fetch('/api/b-coder/supabase/connect', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pat, projectRef }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Failed to connect')
            setConnection(data)
            return { success: true }
        } catch (err: any) {
            return { success: false, error: err.message as string }
        } finally {
            setIsConnecting(false)
        }
    }, [])

    const disconnect = useCallback(async () => {
        setIsDisconnecting(true)
        try {
            await fetch('/api/b-coder/supabase/connect', { method: 'DELETE' })
            setConnection({ connected: false })
        } finally {
            setIsDisconnecting(false)
        }
    }, [])

    return {
        connection,
        isLoading,
        isConnecting,
        isDisconnecting,
        connect,
        disconnect,
        refetch: fetchStatus,
    }
}
