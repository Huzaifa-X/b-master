"use client"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@/components/ui/input-otp"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useState, useEffect } from "react"
import { Loader2 } from "lucide-react"
import { useVerifyOTPMutation, useResendOTPMutation, useVerifyResetPasswordOTPMutation } from "@/hooks/useAuth"
import { toast } from "sonner"

export function OTPForm({ className, ...props }: React.ComponentProps<"div">) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const emailFromUrl = searchParams.get("email")
  const typeFromUrl = searchParams.get("type")

  const [otp, setOtp] = useState("")
  const [email] = useState(sessionStorage.getItem('verification_email') || emailFromUrl || sessionStorage.getItem('reset_email') || "")
  const [countdown, setCountdown] = useState(0)

  const verifyMutation = useVerifyOTPMutation()
  const resendMutation = useResendOTPMutation()
  const verifyResetPasswordMutation = useVerifyResetPasswordOTPMutation()

  useEffect(() => {
    // Countdown timer for resend
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [countdown])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    if (otp.length !== 6) {
      toast.error("Invalid code", {
        description: "Please enter the complete 6-digit code",
      })
      return
    }

    if (typeFromUrl === "reset") {
      const result = await verifyResetPasswordMutation.mutateAsync({ email, otp })
      if (result.success) {
        // Store verified email for reset password page
        sessionStorage.setItem('reset_email', email)
        // Redirect to reset password page
        setTimeout(() => {
          router.push('/reset-password')
        }, 1500)
      } else {
        toast.error(result.error)
      }
    } else {
      const result = await verifyMutation.mutateAsync({ email, otp })

      if (result.success) {
        sessionStorage.removeItem('verification_email')
        // Redirect to login
        setTimeout(() => {
          router.push('/login?verified=true')
        }, 1500)
      } else {
        toast.error(result.error)
      }
    }
  }

  async function handleResend() {
    if (countdown > 0) return

    // Regular email verification resend
    await resendMutation.mutateAsync(email)
    setCountdown(60)
    setOtp("")
  }

  const isLoading = verifyMutation.isPending || resendMutation.isPending || verifyResetPasswordMutation.isPending

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <form onSubmit={handleSubmit}>
        <FieldGroup>
          <div className="flex flex-col items-center gap-1 text-center">
            <h1 className="text-2xl font-bold">
              {typeFromUrl === "reset" ? "Enter verification code" : "Verify your email"}
            </h1>
            <p className="text-muted-foreground text-sm text-balance">
              We sent a 6-digit code to{" "}
              <span className="font-semibold text-foreground">{email}</span>
            </p>
          </div>

          <Field>
            <FieldLabel htmlFor="otp" className="sr-only">
              Verification code
            </FieldLabel>
            <InputOTP
              maxLength={6}
              id="otp"
              value={otp}
              onChange={(value) => setOtp(value)}
              disabled={isLoading}
              required
            >
              <InputOTPGroup className="gap-2 *:data-[slot=input-otp-slot]:rounded-md *:data-[slot=input-otp-slot]:border *:data-[slot=input-otp-slot]:shadow-input">
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
              </InputOTPGroup>
              <InputOTPSeparator />
              <InputOTPGroup className="gap-2 *:data-[slot=input-otp-slot]:rounded-md *:data-[slot=input-otp-slot]:border *:data-[slot=input-otp-slot]:shadow-input">
                <InputOTPSlot index={2} />
                <InputOTPSlot index={3} />
              </InputOTPGroup>
              <InputOTPSeparator />
              <InputOTPGroup className="gap-2 *:data-[slot=input-otp-slot]:rounded-md *:data-[slot=input-otp-slot]:border *:data-[slot=input-otp-slot]:shadow-input">
                <InputOTPSlot index={4} />
                <InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>
            <FieldDescription className="text-center">
              Enter the 6-digit code sent to your email.
            </FieldDescription>
          </Field>

          <Button
            type="submit"
            disabled={isLoading || otp.length !== 6}
            className="w-full"
          >
            {verifyMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Verifying...
              </>
            ) : (
              typeFromUrl === "reset" ? "Verify & Continue" : "Verify Email"
            )}
          </Button>

          <FieldDescription className="text-center">
            Didn&apos;t receive the code?{" "}
            {countdown > 0 ? (
              <span className="text-muted-foreground">
                Resend in {countdown}s
              </span>
            ) : (
              <button
                type="button"
                onClick={handleResend}
                disabled={isLoading}
                className="text-blue-600 hover:text-blue-500 underline underline-offset-4 disabled:opacity-50"
              >
                {isLoading ? "Sending..." : "Resend"}
              </button>
            )}
          </FieldDescription>

          <FieldDescription className="text-center text-xs">
            <Link
              href={typeFromUrl === "reset" ? "/forgot-password" : "/signup"}
              className="text-blue-600 hover:text-blue-500 underline underline-offset-4"
            >
              Use a different email
            </Link>
          </FieldDescription>
        </FieldGroup>
      </form>
    </div>
  )
}