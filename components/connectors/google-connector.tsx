"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, XCircle, Loader2, Calendar, Mail } from "lucide-react"
import { toast } from "sonner"

interface GoogleConnectorProps {
  returnUrl?: string
  onConnectionChange?: (connected: boolean) => void
}

interface Connector {
  id: string
  provider: string
  providerEmail: string | null
  status: string
  scopes: string[]
  metadata: {
    name?: string
    picture?: string
  }
}

export function GoogleConnector({ returnUrl, onConnectionChange }: GoogleConnectorProps) {
  const [connector, setConnector] = useState<Connector | null>(null)
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)

  const fetchConnectorStatus = async () => {
    try {
      const response = await fetch('/api/google')
      const data = await response.json()

      if (data.connector) {
        setConnector(data.connector)
        onConnectionChange?.(true)
      } else {
        setConnector(null)
        onConnectionChange?.(false)
      }
    } catch (error) {
      console.error('Failed to fetch Google connector status:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchConnectorStatus()
  }, [])

  // Check for connection status in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const googleStatus = params.get('google')
    const error = params.get('error')

    if (googleStatus === 'connected') {
      toast.success('Google account connected successfully!')
      // Refresh connector status
      fetchConnectorStatus()
      // Clean up URL
      const url = new URL(window.location.href)
      url.searchParams.delete('google')
      window.history.replaceState({}, '', url.toString())
    } else if (googleStatus === 'error') {
      toast.error(`Failed to connect Google account: ${error || 'Unknown error'}`)
      // Clean up URL
      const url = new URL(window.location.href)
      url.searchParams.delete('google')
      url.searchParams.delete('error')
      window.history.replaceState({}, '', url.toString())
    }
  }, [])

  const handleConnect = () => {
    setConnecting(true)
    const currentUrl = returnUrl || window.location.href
    window.location.href = `/api/google/connect?returnUrl=${encodeURIComponent(currentUrl)}`
  }

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect your Google account?')) {
      return
    }

    setDisconnecting(true)
    try {
      const response = await fetch('/api/google/disconnect', {
        method: 'POST'
      })

      if (response.ok) {
        toast.success('Google account disconnected')
        setConnector(null)
        onConnectionChange?.(false)
      } else {
        throw new Error('Failed to disconnect')
      }
    } catch (error) {
      console.error('Failed to disconnect Google:', error)
      toast.error('Failed to disconnect Google account')
    } finally {
      setDisconnecting(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Google Calendar & Gmail
          </CardTitle>
          <CardDescription>
            Connect your Google account to enable booking features
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Google Calendar & Gmail
        </CardTitle>
        <CardDescription>
          Connect your Google account to create calendar events and send confirmation emails
        </CardDescription>
      </CardHeader>
      <CardContent>
        {connector ? (
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                {connector.metadata?.picture && (
                  <img
                    src={connector.metadata.picture}
                    alt={connector.metadata.name || 'Google Account'}
                    className="h-12 w-12 rounded-full"
                  />
                )}
                <div>
                  <p className="font-medium">{connector.metadata?.name || 'Google Account'}</p>
                  <p className="text-sm text-muted-foreground">{connector.providerEmail}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <Badge
                      variant={connector.status === 'ACTIVE' ? 'default' : 'destructive'}
                      className="text-xs"
                    >
                      {connector.status === 'ACTIVE' ? (
                        <>
                          <CheckCircle2 className="mr-1 h-3 w-3" />
                          Connected
                        </>
                      ) : (
                        <>
                          <XCircle className="mr-1 h-3 w-3" />
                          {connector.status}
                        </>
                      )}
                    </Badge>
                  </div>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDisconnect}
                disabled={disconnecting}
              >
                {disconnecting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Disconnecting...
                  </>
                ) : (
                  'Disconnect'
                )}
              </Button>
            </div>

            <div className="rounded-lg border bg-muted/50 p-3">
              <p className="text-sm font-medium mb-2">Connected Services:</p>
              <div className="flex flex-wrap gap-2">
                {connector.scopes.includes('https://www.googleapis.com/auth/calendar.events') && (
                  <Badge variant="secondary" className="text-xs">
                    <Calendar className="mr-1 h-3 w-3" />
                    Calendar Events
                  </Badge>
                )}
                {connector.scopes.includes('https://www.googleapis.com/auth/gmail.send') && (
                  <Badge variant="secondary" className="text-xs">
                    <Mail className="mr-1 h-3 w-3" />
                    Gmail Send
                  </Badge>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-lg border border-dashed p-6 text-center">
              <Calendar className="mx-auto h-12 w-12 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground mb-4">
                Connect your Google account to enable automated booking with calendar events and email
                confirmations
              </p>
              <Button onClick={handleConnect} disabled={connecting} className="w-full sm:w-auto">
                {connecting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Calendar className="mr-2 h-4 w-4" />
                    Connect Google Account
                  </>
                )}
              </Button>
            </div>

            <div className="text-xs text-muted-foreground space-y-1">
              <p className="font-medium">This will allow the app to:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Create calendar events on your behalf</li>
                <li>Add Google Meet links to bookings</li>
                <li>Send confirmation emails via Gmail</li>
                <li>Read your profile information</li>
              </ul>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
