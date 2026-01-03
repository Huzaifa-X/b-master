"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Lock, X } from "lucide-react"

interface OAuthConnectPromptProps {
  message: string
  authUrl: string
  onConnect: () => void
  onDismiss: () => void
}

export function OAuthConnectPrompt({
  message,
  authUrl,
  onConnect,
  onDismiss
}: OAuthConnectPromptProps) {
  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
              <Lock className="h-4 w-4 text-primary" />
            </div>
            <CardTitle className="text-base">Authorization Required</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={onDismiss}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <CardDescription className="pt-2">
          {message}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <Button
          onClick={onConnect}
          className="w-full"
        >
          <Lock className="mr-2 h-4 w-4" />
          Connect Account
        </Button>
        <p className="mt-2 text-xs text-muted-foreground text-center">
          You'll be redirected to authorize access in a popup window
        </p>
      </CardContent>
    </Card>
  )
}
