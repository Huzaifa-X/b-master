"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { loginSuperAdmin } from "@/app/actions/super-admin.action"
import { Eye, EyeOff, Shield, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function SuperAdminLoginPage() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState("")
  const [showPw, setShowPw] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError("")
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      const result = await loginSuperAdmin(fd)
      if (result.success) {
        router.push("/super-admin/dashboard")
        router.refresh()
      } else {
        setError(result.error ?? "Login failed")
      }
    })
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/50">
      <div className="w-full max-w-md">
        <div className="bg-card border border-border rounded-2xl p-8 shadow-sm">
          {/* Header */}
          <div className="flex flex-col items-center gap-3 mb-8">
            <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center">
              <Shield className="w-7 h-7 text-primary" />
            </div>
            <div className="text-center">
              <h1 className="text-2xl font-bold text-foreground">Super Admin</h1>
              <p className="text-muted-foreground text-sm mt-1">B-Master Control Panel</p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="admin@example.com"
                required
                autoComplete="username"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPw ? "text" : "password"}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-destructive/10 border border-destructive/30 rounded-lg px-4 py-3 text-destructive text-sm">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full mt-2" disabled={isPending}>
              {isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Authenticating...</>
              ) : (
                "Sign In to Admin Panel"
              )}
            </Button>
          </form>

          <p className="text-center text-muted-foreground text-xs mt-6">
            Restricted access — authorised personnel only
          </p>
        </div>
      </div>
    </div>
  )
}
