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

export function ForgotPasswordForm({
  className,
  ...props
}: React.ComponentProps<"form">) {

  return (
    <form className={cn("flex flex-col gap-6", className)} {...props}>
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
            className="transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-input"
            required
          />
        </Field>
        <Field>
          <Button type="submit" className="w-full transition-all duration-200 hover:shadow-md">
            Send Reset Link
          </Button>
        </Field>
        <Field>
          <FieldDescription className="text-center">
            Remember your password?{" "}
            <a href="/login" className="underline hover:underline-offset-4 hover:text-blue-600 transition-colors duration-200">
              Back to login
            </a>
          </FieldDescription>
        </Field>
      </FieldGroup>
    </form>
  )
}
