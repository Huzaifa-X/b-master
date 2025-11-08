"use client"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { useState, useEffect } from "react"
import { Eye, EyeOff, Loader2 } from "lucide-react"
import Link from "next/link"
// import Image from "next/image" // COMMENTED OUT - Google provider disabled
import { useRouter, useSearchParams } from "next/navigation"
import { signIn } from "next-auth/react"
import { loginSchema, LoginInput } from "@/lib/validations/auth"
import { resendVerificationEmail } from "@/app/actions/auth.actions"
import { toast } from "sonner"

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"form">) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get("callbackUrl") || "/home"

  const [formData, setFormData] = useState<LoginInput>({
    email: "",
    password: "",
  })

  const [errors, setErrors] = useState<Partial<Record<keyof LoginInput, string>>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const togglePasswordVisibility = () => setShowPassword(!showPassword)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target

    setFormData((prev) => ({
      ...prev,
      [id]: value,
    }))

    // Clear field error when user types
    if (errors[id as keyof LoginInput]) {
      setErrors((prev) => ({
        ...prev,
        [id]: undefined,
      }))
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setErrors({})
    setIsLoading(true)

    try {
      // Client-side validation
      const validatedData = loginSchema.parse(formData)

      // Sign in with NextAuth
      const result = await signIn("credentials", {
        email: validatedData.email,
        password: validatedData.password,
        redirect: false,
      })

      if (result?.error) {
        // Check for specific error messages
        if (result.error.includes("Email not verified")) {
          toast.error("Email not verified", {
            description: "Please check your email and verify your account first",
            action: {
              label: "Resend",
              onClick: () => handleResendVerification(validatedData.email)
            },
          })
        } else if (result.error.includes("No user found")) {
          toast.error("Account not found", {
            description: "No account exists with this email",
          })
        } else if (result.error.includes("Invalid password")) {
          toast.error("Invalid password", {
            description: "The password you entered is incorrect",
          })
          setErrors({ password: "Incorrect password" })
        } else {
          toast.error("Login failed", {
            description: result.error,
          })
        }
        setIsLoading(false)
        return
      }

      // Successful login
      toast.success("Welcome back!")
      router.push(callbackUrl)
      router.refresh()
    } catch (error: any) {
      // Handle client-side Zod validation errors
      if (error?.name === "ZodError") {
        const flattened = error.flatten()
        const fieldErrors: Partial<Record<keyof LoginInput, string>> = {}

        // Convert array of error messages to single string per field
        Object.entries(flattened.fieldErrors).forEach(([field, messages]) => {
          if (Array.isArray(messages) && messages.length > 0) {
            fieldErrors[field as keyof LoginInput] = messages[0]
          }
        })

        setErrors(fieldErrors)
      } else {
        // Handle other errors
        console.error("Login error:", error)
        toast.error("Something went wrong", {
          description: "Please try again later",
        })
      }
      setIsLoading(false)
    }
  }

  async function handleResendVerification(email: string) {
    try {
      const result = await resendVerificationEmail(email)

      if (result.success) {
        toast.success("Verification email sent!", {
          description: "Please check your inbox",
        })
        // Store email and redirect to verification page
        sessionStorage.setItem("verification_email", email)
        router.push(`/verify-email?email=${encodeURIComponent(email)}`)
      } else {
        toast.error(result.error || "Failed to resend verification email")
      }
    } catch (error) {
      console.error("Resend verification error:", error)
      toast.error("Failed to resend verification email")
    }
  }

  // async function handleGoogleSignIn() {
  //   try {
  //     await signIn("google", { callbackUrl })
  //   } catch (error) {
  //     toast.error("Failed to sign in with Google")
  //   }
  // } // COMMENTED OUT - Google provider disabled

  return (
    <form className={cn("flex flex-col gap-6", className)} {...props} onSubmit={handleSubmit}>
      <FieldGroup>
        <div className="flex flex-col items-center gap-1 text-center">
          <h1 className="text-2xl font-bold">Login to your account</h1>
          <p className="text-muted-foreground text-sm text-balance">
            Enter your email below to login to your account
          </p>
        </div>

        {/* Email Field */}
        <Field>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input
            id="email"
            type="email"
            placeholder="Enter your email address"
            value={formData.email}
            onChange={handleChange}
            className={cn(
              "transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-input",
              errors.email && "border-red-500 focus:ring-red-500 focus:border-red-500"
            )}
            disabled={isLoading}
            autoComplete="email"
            required
          />
          {errors.email && (
            <p className="text-sm text-red-600 mt-1 animate-fade-in">{errors.email}</p>
          )}
        </Field>

        {/* Password Field */}
        <Field>
          <div className="flex items-center">
            <FieldLabel htmlFor="password">Password</FieldLabel>
            <Link
              href="/forgot-password"
              className="ml-auto text-sm underline-offset-4 hover:underline"
            >
              Forgot your password?
            </Link>
          </div>
          <div className="relative">
            <Input
              id="password"
              placeholder="Enter your password"
              type={showPassword ? "text" : "password"}
              value={formData.password}
              onChange={handleChange}
              className={cn(
                "transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-12 shadow-input",
                errors.password && "border-red-500 focus:ring-red-500 focus:border-red-500"
              )}
              disabled={isLoading}
              autoComplete="current-password"
              required
            />
            <button
              type="button"
              onClick={togglePasswordVisibility}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors duration-200 p-1 rounded-md hover:bg-gray-50"
              aria-label={showPassword ? "Hide password" : "Show password"}
              disabled={isLoading}
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          {errors.password && (
            <p className="text-sm text-red-600 mt-1 animate-fade-in">{errors.password}</p>
          )}
        </Field>

        {/* Submit Button */}
        <Field>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Signing in...
              </>
            ) : (
              "Login"
            )}
          </Button>
        </Field>

        {/* FieldSeparator>Or continue with</FieldSeparator> COMMENTED OUT - Google provider disabled */}

        {/* Google Sign In - COMMENTED OUT */}
        {/* <Field>
          <Button
            variant="outline"
            type="button"
            className="w-full hover:bg-muted hover:text-muted-foreground"
            onClick={handleGoogleSignIn}
            disabled={isLoading}
          >
            <Image
              src="/googleIcon.svg"
              alt="Google"
              width={20}
              height={20}
              className="mr-2"
            />
            Login with Google
          </Button> */}
        <FieldDescription className="text-center">
          Don&apos;t have an account?{" "}
          <Link
            href="/signup"
            className="underline underline-offset-4 hover:text-blue-600 transition-colors duration-200"
          >
            Sign up
          </Link>
        </FieldDescription>
        {/* </Field> COMMENTED OUT - Google provider disabled */}
      </FieldGroup>
    </form>
  )
}