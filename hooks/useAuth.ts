"use client"

import { useMutation } from "@tanstack/react-query"
import {
    registerUser,
    verifyOTP,
    resendOTP,
    forgotPassword,
    resetPassword,
    verifyResetPasswordOTP,
    changePassword
} from "@/app/actions/auth.actions"
import { RegisterInput } from "@/lib/validations/auth"
import { toast } from "sonner"
import { RegisterResult, VerifyOTPResult, ForgotPasswordResult, ResetPasswordResult } from "@/types/auth"

// ============================================
// REGISTER MUTATION
// ============================================
export function useRegisterMutation() {
    return useMutation({
        mutationFn: (data: RegisterInput) => registerUser(data),
        onSuccess: (result: RegisterResult) => {
            if (result.success) {
                toast.success("Account created successfully!", {
                    description: "Please check your email for verification code",
                })
            } else {
                toast.error(result.error)
            }
        },
        onError: (error: Error) => {
            toast.error("Something went wrong", {
                description: error.message,
            })
        },
    })
}

// ============================================
// VERIFY OTP MUTATION
// ============================================
export function useVerifyOTPMutation() {
    return useMutation({
        mutationFn: ({ email, otp }: { email: string; otp: string }) => verifyOTP(email, otp),
        onSuccess: (result: VerifyOTPResult) => {
            if (result.success) {
                toast.success("Email verified!", {
                    description: "You can now sign in to your account",
                })
            } else {
                toast.error(result.error)
            }
        },
        onError: (error: Error) => {
            toast.error("Verification failed", {
                description: error.message,
            })
        },
    })
}

// ============================================
// VERIFY RESET PASSWORD OTP MUTATION
// ============================================
export function useVerifyResetPasswordOTPMutation() {
    return useMutation({
        mutationFn: ({ email, otp }: { email: string; otp: string }) => verifyResetPasswordOTP(email, otp),
        onSuccess: (result: VerifyOTPResult) => {
            if (result.success) {
                toast.success("Code verified!", {
                    description: "You can now reset your password",
                })
            } else {
                toast.error(result.error)
            }
        },
        onError: (error: Error) => {
            toast.error("Failed to verify code", {
                description: error.message,
            })
        },
    })
}

// ============================================
// RESEND OTP MUTATION
// ============================================
export function useResendOTPMutation() {
    return useMutation({
        mutationFn: (email: string) => resendOTP(email),
        onSuccess: (result: VerifyOTPResult) => {
            if (result.success) {
                toast.success("Code sent!", {
                    description: "A new verification code has been sent to your email",
                })
            } else {
                toast.error(result.error)
            }
        },
        onError: (error: Error) => {
            toast.error("Failed to resend code", {
                description: error.message,
            })
        },
    })
}

// ============================================
// FORGOT PASSWORD MUTATION
// ============================================
export function useForgotPasswordMutation() {
    return useMutation({
        mutationFn: (email: string) => forgotPassword(email),
        onSuccess: (result: ForgotPasswordResult) => {
            if (result.success) {
                toast.success("Code sent!", {
                    description: "Please check your email for the verification code",
                })
            } else {
                toast.error(result.error)
            }
        },
        onError: (error: Error) => {
            toast.error("Something went wrong", {
                description: error.message,
            })
        },
    })
}

// ============================================
// RESET PASSWORD MUTATION
// ============================================
export function useResetPasswordMutation() {
    return useMutation({
        mutationFn: ({ email, password }: { email: string; password: string }) =>
            resetPassword(email, password),
        onSuccess: (result: ResetPasswordResult) => {
            if (result.success) {
                toast.success("Password reset successful!", {
                    description: "You can now sign in with your new password",
                })
            } else {
                toast.error(result.error)
            }
        },
        onError: (error: Error) => {
            toast.error("Failed to reset password", {
                description: error.message,
            })
        },
    })
}

// ============================================
// CHANGE PASSWORD MUTATION
// ============================================
export function useChangePasswordMutation() {
    return useMutation({
        mutationFn: ({ userId, currentPassword, newPassword }: {
            userId: string
            currentPassword: string
            newPassword: string
        }) => changePassword(userId, currentPassword, newPassword),
        onSuccess: (result) => {
            if (result.success) {
                toast.success("Password changed successfully!", {
                    description: result.message || "Your password has been updated",
                })
            } else {
                toast.error(result.error || "Failed to change password")
            }
        },
        onError: (error: Error) => {
            toast.error("Failed to change password", {
                description: error.message,
            })
        },
    })
}