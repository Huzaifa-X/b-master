"use server"

import { hash } from "bcryptjs"
import prisma from "@/lib/prisma"
import { registerSchema } from "@/lib/validations/auth"
import { z } from "zod"
import { generateOTP, sendOTPEmail } from "@/lib/email"
import { RegisterResult, VerifyOTPResult, ForgotPasswordResult, ResetPasswordResult, ResendVerificationResult } from "@/types/auth"

// ============================================
// REGISTER USER
// ============================================
export async function registerUser(data: z.infer<typeof registerSchema>): Promise<RegisterResult> {
  try {
    const validatedData = registerSchema.parse(data)

    const existingUser = await prisma.user.findUnique({
            where: { email: validatedData.email },
    })

    if (existingUser) {
      return {
        success: false,
        error: "A user with this email already exists",
      }
    }

    const hashedPassword = await hash(validatedData.password, 12)
        const otp = generateOTP()
        const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000)

        const user = await prisma.user.create({
      data: {
        name: validatedData.name,
        email: validatedData.email,
        password: hashedPassword,
        loginType: "email",
        status: "active",
                isEmailVerified: false,
                otp: otp,
                otpExpiresAt: otpExpiresAt,
            },
        })

        const emailResult = await sendOTPEmail({
            email: user.email,
            name: user.name || "User",
            otp: otp,
        })

        if (!emailResult.success) {
            await prisma.user.delete({ where: { id: user.id } })
            return {
                success: false,
                error: "Failed to send verification email. Please try again.",
            }
        }

    return {
      success: true,
            message: "Account created successfully. Please check your email for verification code.",
            userId: user.id.toString(),
    }
  } catch (error) {
    console.error("Registration error:", error)

        // Use Zod's built-in error formatting (Zod v4)
    if (error instanceof z.ZodError) {
            const flattened = error.flatten()  // ✅ Called on the error instance

      return {
        success: false,
        error: "Validation failed",
                fieldErrors: flattened.fieldErrors,  // ✅ Array of strings per field
      }
    }

    return {
      success: false,
      error: "Something went wrong. Please try again.",
    }
  }
}

// ============================================
// VERIFY OTP
// ============================================
export async function verifyOTP(email: string, otp: string): Promise<VerifyOTPResult> {
    try {
        const user = await prisma.user.findUnique({
            where: { email },
        })

        if (!user) {
            return {
                success: false,
                error: "User not found",
            }
        }

        if (user.isEmailVerified) {
            return {
                success: false,
                error: "Email already verified",
            }
        }

        if (!user.otp || !user.otpExpiresAt) {
            return {
                success: false,
                error: "No verification code found. Please request a new one.",
            }
        }

        if (new Date() > user.otpExpiresAt) {
            return {
                success: false,
                error: "Verification code expired. Please request a new one.",
            }
        }

        if (user.otp !== otp) {
            return {
                success: false,
                error: "Invalid verification code",
            }
        }

        await prisma.user.update({
            where: { id: user.id },
            data: {
                isEmailVerified: true,
                otp: null,
                otpExpiresAt: null,
            },
        })

        return {
            success: true,
            message: "Email verified successfully!",
        }
    } catch (error) {
        console.error("OTP verification error:", error)
        return {
            success: false,
            error: "Something went wrong. Please try again.",
        }
    }
}


export async function verifyResetPasswordOTP(email: string, otp: string): Promise<VerifyOTPResult> {
    try {
        const user = await prisma.user.findUnique({
            where: { email },
        })

        if (!user) {
            return {
                success: false,
                error: "User not found",
            }
        }

        if (!user.otp || !user.otpExpiresAt) {
            return {
                success: false,
                error: "No code found. Please request a new one.",
            }
        }

        if (new Date() > user.otpExpiresAt) {
            return {
                success: false,
                error: "Code expired. Please request a new one.",
            }
        }

        if (user.otp !== otp) {
            return {
                success: false,
                error: "Invalid code",
            }
        }

        await prisma.user.update({
            where: { id: user.id },
            data: {
                otp: null,
                otpExpiresAt: null,
            },
        })

        return {
            success: true,
            message: "Code verified successfully!",
        }
    } catch (error) {
        console.error("Code verification error:", error)
        return {
            success: false,
            error: "Something went wrong. Please try again.",
        }
    }
}


// ============================================
// RESEND OTP
// ============================================
export async function resendOTP(email: string): Promise<VerifyOTPResult> {
    try {
        const user = await prisma.user.findUnique({
            where: { email },
        })

        if (!user) {
            return {
                success: false,
                error: "User not found",
            }
        }

        if (user.isEmailVerified) {
            return {
                success: false,
                error: "Email already verified",
            }
        }

        const otp = generateOTP()
        const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000)

        await prisma.user.update({
            where: { id: user.id },
            data: {
                otp: otp,
                otpExpiresAt: otpExpiresAt,
            },
        })

        const emailResult = await sendOTPEmail({
            email: user.email,
            name: user.name || "User",
            otp: otp,
        })

        if (!emailResult.success) {
            return {
                success: false,
                error: "Failed to send verification email. Please try again.",
            }
        }

        return {
            success: true,
            message: "Verification code sent successfully!",
        }
    } catch (error) {
        console.error("Resend OTP error:", error)
        return {
            success: false,
            error: "Something went wrong. Please try again.",
        }
    }
}

// ============================================
// RESEND VERIFICATION EMAIL (OTP)
// ============================================
export async function resendVerificationEmail(email: string): Promise<ResendVerificationResult> {
    try {
        const user = await prisma.user.findUnique({
            where: { email },
        })

        if (!user) {
            return {
                success: false,
                error: "User not found",
            }
        }

        if (user.isEmailVerified) {
            return {
                success: false,
                error: "Email already verified",
            }
        }

        // Generate new OTP for verification
        const otp = generateOTP()
        const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

        // Update user with new OTP
        await prisma.user.update({
            where: { id: user.id },
            data: {
                otp,
                otpExpiresAt,
            },
        })

        // Send verification email with OTP
        const emailResult = await sendOTPEmail({
            email,
            name: user.name || 'User',
            otp
        })

        if (!emailResult.success) {
            return {
                success: false,
                error: "Failed to send verification email. Please try again.",
            }
        }

        return {
            success: true,
            message: "Verification email sent successfully!",
        }
    } catch (error) {
        console.error("Resend verification email error:", error)
        return {
            success: false,
            error: "Something went wrong. Please try again.",
        }
    }
}

// ============================================
// FORGOT PASSWORD (Send OTP)
// ============================================
export async function forgotPassword(email: string): Promise<ForgotPasswordResult> {
    try {
        const user = await prisma.user.findUnique({
            where: { email },
        })

        // Don't reveal if user exists (security best practice)
        if (!user) {
            return {
                success: true,
                message: "If an account exists, a verification code has been sent",
            }
        }

        const otp = generateOTP()
        const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000)

        await prisma.user.update({
            where: { id: user.id },
            data: {
                otp: otp,
                otpExpiresAt: otpExpiresAt,
            },
        })

        const emailResult = await sendOTPEmail({
            email: user.email,
            name: user.name || "User",
            otp: otp,
        })

        if (!emailResult.success) {
            console.error("Failed to send email:", emailResult.error)
            return {
                success: false,
                error: "Failed to send verification email. Please try again.",
            }
        }

        return {
            success: true,
            message: "Verification code sent successfully",
        }
    } catch (error) {
        console.error("Forgot password error:", error)
        return {
            success: false,
            error: "Something went wrong. Please try again.",
        }
    }
}

// ============================================
// RESET PASSWORD
// ============================================
export async function resetPassword(
    email: string,
    newPassword: string
): Promise<ResetPasswordResult> {
    try {
        const user = await prisma.user.findUnique({
            where: { email },
        })

        if (!user) {
            return {
                success: false,
                error: "User not found",
            }
        }

        // Hash new password
        const hashedPassword = await hash(newPassword, 12)

        // Update password
        await prisma.user.update({
            where: { id: user.id },
            data: {
                password: hashedPassword,
                otp: null,
                otpExpiresAt: null,
            },
        })

        return {
            success: true,
            message: "Password reset successfully!",
        }
    } catch (error) {
        console.error("Reset password error:", error)
        return {
            success: false,
            error: "Something went wrong. Please try again.",
        }
    }
}