"use client"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { useState } from "react"
import { Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { useForgotPasswordMutation } from "@/hooks/useAuth"

export function ForgotPasswordForm({
  className,
  ...props
}: React.ComponentProps<"form">) {
  const router = useRouter()
  const forgotPasswordMutation = useForgotPasswordMutation()
  
  const [email, setEmail] = useState("")
  const [error, setError] = useState("")

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError("")

    if (!email) {
      setError("Email is required")
      return
    }

    const result = await forgotPasswordMutation.mutateAsync(email)

    if (result.success) {
      // Store email and redirect to OTP verification
      sessionStorage.setItem("reset_email", email)
      
      router.push(`/verify-email?email=${encodeURIComponent(email)}&type=reset`)
    }
  }

  const isLoading = forgotPasswordMutation.isPending

  return (
    <form className={cn("flex flex-col gap-6", className)} {...props} onSubmit={handleSubmit}>
      <FieldGroup>
        <div className="flex flex-col items-center gap-1 text-center">
          <h1 className="text-2xl font-bold">Reset your password</h1>
          <p className="text-muted-foreground text-sm text-balance">
            Enter your email below to reset your password
          </p>
        </div>
        
        <Field>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input
            id="email"
            type="email"
            placeholder="Enter your email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={cn(
              "transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-input",
              error && "border-red-500 focus:ring-red-500"
            )}
            disabled={isLoading}
            required
          />
          {error && (
            <p className="text-sm text-red-600 mt-1 animate-fade-in">{error}</p>
          )}
        </Field>
        
        <Field>
          <Button 
            type="submit" 
            className="w-full transition-all duration-200 hover:shadow-md"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              "Send Verification Code"
            )}
          </Button>
        </Field>
        
        <Field>
          <FieldDescription className="text-center">
            Remember your password?{" "}
            <a 
              href="/login" 
              className="underline underline-offset-4 hover:text-blue-600 transition-colors duration-200"
            >
              Back to login
            </a>
          </FieldDescription>
        </Field>
      </FieldGroup>
    </form>
  )
}