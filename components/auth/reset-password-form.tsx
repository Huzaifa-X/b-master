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
import { useState, useEffect } from "react"
import { Eye, EyeOff, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { useResetPasswordMutation } from "@/hooks/useAuth"
import { resetPasswordSchema } from "@/lib/validations/auth"

export function ResetPasswordForm({
  className,
  ...props
}: React.ComponentProps<"form">) {
  const router = useRouter()
  const resetPasswordMutation = useResetPasswordMutation()

  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [email, setEmail] = useState("")

  const [formData, setFormData] = useState({
    password: "",
    confirmPassword: "",
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    const resetEmail = sessionStorage.getItem('reset_email')

    if (!resetEmail) {
      toast.error("Unauthorized access", {
        description: "Please request a new code",
      })
      router.push('/forgot-password')
      return
    }

    setEmail(resetEmail)
  }, [router])

  const togglePasswordVisibility = () => setShowPassword(!showPassword)
  const toggleConfirmPasswordVisibility = () => setShowConfirmPassword(!showConfirmPassword)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target
    setFormData(prev => ({ ...prev, [id]: value }))

    if (errors[id]) {
      setErrors(prev => ({ ...prev, [id]: "" }))
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setErrors({})

    try {
      const validated = resetPasswordSchema.parse(formData)

      const result = await resetPasswordMutation.mutateAsync({
        email,
        password: validated.password,
      })

      if (result.success) {
        sessionStorage.removeItem('reset_email')

        setTimeout(() => {
          router.push('/login')
        }, 1500)
      }
    } catch (error: any) {
      // Handle client-side Zod validation errors
      if (error?.name === "ZodError") {
        const flattened = error.flatten()
        const fieldErrors: Record<string, string> = {}

        // Convert array of error messages to single string per field
        Object.entries(flattened.fieldErrors).forEach(([field, messages]) => {
          if (Array.isArray(messages) && messages.length > 0) {
            fieldErrors[field] = messages[0]
          }
        })

        setErrors(fieldErrors)
      } else {
        // Handle other errors
        console.error("Reset password error:", error)
        setErrors({ email: "An unexpected error occurred. Please try again." })
      }
    }
  }

  const isLoading = resetPasswordMutation.isPending

  return (
    <form className={cn("flex flex-col gap-6", className)} {...props} onSubmit={handleSubmit}>
      <FieldGroup>
        <div className="flex flex-col items-center gap-1 text-center">
          <h1 className="text-2xl font-bold">Set new password</h1>
          <p className="text-muted-foreground text-sm text-balance">
            Enter your new password below
          </p>
        </div>

        <Field>
          <FieldLabel htmlFor="password">New Password</FieldLabel>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="Enter your new password"
              value={formData.password}
              onChange={handleChange}
              className={cn(
                "transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-12 shadow-input",
                errors.password && "border-red-500 focus:ring-red-500"
              )}
              disabled={isLoading}
              required
            />
            <button
              type="button"
              onClick={togglePasswordVisibility}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors duration-200 p-1 rounded-md hover:bg-gray-50"
              disabled={isLoading}
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          {errors.password ? (
            <p className="text-sm text-red-600 mt-1 animate-fade-in">{errors.password}</p>
          ) : (
            <FieldDescription>
              Must be at least 8 characters with uppercase, lowercase, and number.
            </FieldDescription>
          )}
        </Field>

        <Field>
          <FieldLabel htmlFor="confirmPassword">Confirm New Password</FieldLabel>
          <div className="relative">
            <Input
              id="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              placeholder="Confirm your new password"
              value={formData.confirmPassword}
              onChange={handleChange}
              className={cn(
                "transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-12 shadow-input",
                errors.confirmPassword && "border-red-500 focus:ring-red-500"
              )}
              disabled={isLoading}
              required
            />
            <button
              type="button"
              onClick={toggleConfirmPasswordVisibility}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors duration-200 p-1 rounded-md hover:bg-gray-50"
              disabled={isLoading}
            >
              {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          {errors.confirmPassword ? (
            <p className="text-sm text-red-600 mt-1 animate-fade-in">{errors.confirmPassword}</p>
          ) : (
            <FieldDescription>
              Please confirm your new password.
            </FieldDescription>
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
                Updating Password...
              </>
            ) : (
              "Update Password"
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