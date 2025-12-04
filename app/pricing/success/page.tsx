"use client"

import { useEffect, useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle2, Loader2 } from "lucide-react"
import Link from "next/link"

function SubscriptionSuccessContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const sessionId = searchParams.get("session_id")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Give webhook time to process
    const timer = setTimeout(() => {
      setLoading(false)
    }, 2000)

    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="h-full overflow-y-auto">
      <div className="container mx-auto px-4 py-12 max-w-2xl">
        <Card>
          <CardHeader className="text-center">
            {loading ? (
              <>
                <Loader2 className="h-16 w-16 mx-auto mb-4 animate-spin text-[#BDA76D]" />
                <CardTitle className="text-2xl">Processing your subscription...</CardTitle>
                <CardDescription>
                  Please wait while we confirm your payment
                </CardDescription>
              </>
            ) : (
              <>
                <CheckCircle2 className="h-16 w-16 mx-auto mb-4 text-green-500" />
                <CardTitle className="text-2xl">Subscription Successful!</CardTitle>
                <CardDescription>
                  Thank you for subscribing. Your plan is now active.
                </CardDescription>
              </>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild className="bg-[#BDA76D] hover:bg-[#BDA76D]/90">
                <Link href="/home">Go to Home</Link>
              </Button>
              <Button variant="outline" onClick={() => router.back()} className="hover:bg-muted hover:text-muted-foreground">
                Back to Pricing
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function SubscriptionSuccessPage() { 
  return (
    <Suspense
      fallback={
        <div className="h-full overflow-y-auto">
          <div className="container mx-auto px-4 py-12 max-w-2xl">
            <Card>
              <CardHeader className="text-center">
                <Loader2 className="h-16 w-16 mx-auto mb-4 animate-spin text-[#BDA76D]" />
                <CardTitle className="text-2xl">Loading...</CardTitle>
              </CardHeader>
            </Card>
          </div>
        </div>
      }
    >
      <SubscriptionSuccessContent />
    </Suspense>
  )
}

