"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { XCircle } from "lucide-react"
import Link from "next/link"

export default function SubscriptionCancelPage() {
  const router = useRouter()

  return (
    <div className="h-full overflow-y-auto">
      <div className="container mx-auto px-4 py-12 max-w-2xl">
        <Card>
          <CardHeader className="text-center">
            <XCircle className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <CardTitle className="text-2xl">Subscription Cancelled</CardTitle>
            <CardDescription>
              Your subscription was not completed. No charges were made.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-center text-muted-foreground">
              If you encountered any issues or have questions, please contact our support team.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild className="bg-[#BDA76D] hover:bg-[#BDA76D]/90">
                <Link href="/pricing">Try Again</Link>
              </Button>
              <Button variant="outline" onClick={() => router.back()}>
                Go Back
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

