import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight, BarChart, Shield, Zap } from "lucide-react"

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-background to-muted/20">
      <div className="container px-4 text-center">
        <h1 className="mb-6 text-5xl font-bold tracking-tight">
          Super Admin Dashboard
        </h1>
        <p className="mx-auto mb-8 max-w-2xl text-xl text-muted-foreground">
          Comprehensive control panel for managing your AI-powered SaaS platform.
          Monitor users, analyze data, and optimize performance all in one place.
        </p>
        <div className="flex justify-center gap-4">
          <Link href="/dashboard">
            <Button size="lg">
              Go to Dashboard
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>

        {/* Features */}
        <div className="mx-auto mt-20 grid max-w-5xl gap-8 md:grid-cols-3">
          <div className="rounded-lg border bg-card p-6 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary">
              <BarChart className="h-6 w-6 text-primary-foreground" />
            </div>
            <h3 className="mb-2 text-lg font-semibold">Analytics & Insights</h3>
            <p className="text-sm text-muted-foreground">
              Real-time analytics and comprehensive reporting for data-driven decisions
            </p>
          </div>
          <div className="rounded-lg border bg-card p-6 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary">
              <Shield className="h-6 w-6 text-primary-foreground" />
            </div>
            <h3 className="mb-2 text-lg font-semibold">Security & Control</h3>
            <p className="text-sm text-muted-foreground">
              Role-based access control and secure user management
            </p>
          </div>
          <div className="rounded-lg border bg-card p-6 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary">
              <Zap className="h-6 w-6 text-primary-foreground" />
            </div>
            <h3 className="mb-2 text-lg font-semibold">Fast & Scalable</h3>
            <p className="text-sm text-muted-foreground">
              Built with Next.js 14 for maximum performance and scalability
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
