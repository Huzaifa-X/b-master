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
import { Eye, EyeOff, Loader2 } from "lucide-react"
import { registerSchema, RegisterInput } from "@/lib/validations/auth"
import { useRegisterMutation } from "@/hooks/useAuth"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useLocale } from "@/lib/i18n"

export function SignupForm({
  className,
  ...props
}: React.ComponentProps<"form">) {
  const router = useRouter()
  const registerMutation = useRegisterMutation()
  const { t } = useLocale()
  
  const [formData, setFormData] = useState<RegisterInput>({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  })
  
  const [errors, setErrors] = useState<Partial<Record<keyof RegisterInput, string>>>({})
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const togglePasswordVisibility = () => setShowPassword(!showPassword)
  const toggleConfirmPasswordVisibility = () => setShowConfirmPassword(!showConfirmPassword)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target
    const fieldName = id === "confirm-password" ? "confirmPassword" : id as keyof RegisterInput
    
    setFormData((prev: RegisterInput) => ({
      ...prev,
      [fieldName]: value,
    }))
    
    // Clear field error when user types
    if (errors[fieldName]) {
      setErrors((prev: Partial<Record<keyof RegisterInput, string>>) => ({
        ...prev,
        [fieldName]: undefined,
      }))
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setErrors({})

    try {
      // Client-side validation
      const validatedData = registerSchema.parse(formData)
      
      // Call mutation
      const result = await registerMutation.mutateAsync(validatedData)
      
      // Handle field errors from server
      if (!result.success && result.fieldErrors) {
        setErrors(result.fieldErrors as Partial<Record<keyof RegisterInput, string>>)
        return
      }

      // Success - redirect to verify email page with email in URL
      if (result.success) {
        // Store email in sessionStorage for verification page
        sessionStorage.setItem('verification_email', formData.email)
        router.push(`/verify-email?email=${encodeURIComponent(formData.email)}`)
      }
    } catch (error: any) {
      // Handle client-side Zod validation errors
      if (error?.name === "ZodError") {
        const flattened = error.flatten()
        const fieldErrors: Partial<Record<keyof RegisterInput, string>> = {}

        // Convert array of error messages to single string per field
        Object.entries(flattened.fieldErrors).forEach(([field, messages]) => {
          if (Array.isArray(messages) && messages.length > 0) {
            fieldErrors[field as keyof RegisterInput] = messages[0]
          }
        })

        setErrors(fieldErrors)
      } else {
        // Handle other errors
        console.error("Registration error:", error)
        setErrors({ email: t("auth.errors.somethingWentWrong") })
      }
    }
  }

  const isLoading = registerMutation.isPending

  return (
    <form className={cn("flex flex-col gap-6", className)} {...props} onSubmit={handleSubmit}>
      <FieldGroup>
        <div className="flex flex-col items-center gap-1 text-center">
          <h1 className="text-2xl font-bold">{t("auth.createAccount")}</h1>
          <p className="text-muted-foreground text-sm text-balance">
            {t("auth.signUpSubtitle")}
          </p>
        </div>

        {/* Full Name Field */}
        <Field>
          <FieldLabel htmlFor="name">{t("auth.name")}</FieldLabel>
          <Input
            id="name"
            type="text"
            placeholder={t("auth.namePlaceholder")}
            value={formData.name}
            onChange={handleChange}
            className={cn(
              "transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-input",
              errors.name && "border-red-500 focus:ring-red-500 focus:border-red-500"
            )}
            disabled={isLoading}
            required
          />
          {errors.name && (
            <p className="text-sm text-red-600 mt-1 animate-fade-in">{errors.name}</p>
          )}
        </Field>

        {/* Email Field */}
        <Field>
          <FieldLabel htmlFor="email">{t("auth.email")}</FieldLabel>
          <Input
            id="email"
            type="email"
            placeholder={t("auth.emailAddressPlaceholder")}
            value={formData.email}
            onChange={handleChange}
            className={cn(
              "transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-input",
              errors.email && "border-red-500 focus:ring-red-500 focus:border-red-500"
            )}
            disabled={isLoading}
            required
          />
          {errors.email && (
            <p className="text-sm text-red-600 mt-1 animate-fade-in">{errors.email}</p>
          )}
        </Field>

        {/* Password Field */}
        <Field>
          <FieldLabel htmlFor="password">{t("auth.password")}</FieldLabel>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder={t("auth.createPasswordPlaceholder")}
              value={formData.password}
              onChange={handleChange}
              className={cn(
                "transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-12 shadow-input",
                errors.password && "border-red-500 focus:ring-red-500 focus:border-red-500"
              )}
              disabled={isLoading}
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
          {errors.password ? (
            <p className="text-sm text-red-600 mt-1 animate-fade-in">{errors.password}</p>
          ) : (
            <FieldDescription>
              {t("auth.passwordHint")}
            </FieldDescription>
          )}
        </Field>

        {/* Confirm Password Field */}
        <Field>
          <FieldLabel htmlFor="confirm-password">{t("auth.confirmPassword")}</FieldLabel>
          <div className="relative">
            <Input
              id="confirm-password"
              type={showConfirmPassword ? "text" : "password"}
              placeholder={t("auth.reenterPasswordPlaceholder")}
              value={formData.confirmPassword}
              onChange={handleChange}
              className={cn(
                "transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-12 shadow-input",
                errors.confirmPassword && "border-red-500 focus:ring-red-500 focus:border-red-500"
              )}
              disabled={isLoading}
              required
            />
            <button
              type="button"
              onClick={toggleConfirmPasswordVisibility}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors duration-200 p-1 rounded-md hover:bg-gray-50"
              aria-label={showConfirmPassword ? "Hide password" : "Show password"}
              disabled={isLoading}
            >
              {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          {errors.confirmPassword ? (
            <p className="text-sm text-red-600 mt-1 animate-fade-in">{errors.confirmPassword}</p>
          ) : (
            <FieldDescription>{t("auth.confirmPasswordHint")}</FieldDescription>
          )}
        </Field>

        {/* Submit Button */}
        <Field>
          <Button 
            type="submit" 
            className="w-full transition-all duration-200 hover:shadow-md"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t("auth.creatingAccount")}
              </>
            ) : (
              t("auth.createAccount")
            )}
          </Button>
        </Field>

        {/* Sign In Link */}
        <Field>
          <FieldDescription className="px-6 text-center">
            {t("auth.alreadyHaveAccount")}{" "}
            <Link
              href="/login" 
              className="underline underline-offset-4 hover:text-blue-600 transition-colors duration-200"
            >
              {t("auth.signIn")}
            </Link>
          </FieldDescription>
        </Field>
      </FieldGroup>
    </form>
  )
}