"use server"

import { hash } from "bcryptjs"
import prisma from "@/lib/prisma"
import { registerSchema } from "@/lib/validations/auth"
import { z } from "zod"
import { generateOTP, sendOTPEmail } from "@/lib/email"
import { RegisterResult, VerifyOTPResult, ForgotPasswordResult, ResetPasswordResult, ResendVerificationResult } from "@/types/auth"
import { randomBytes } from "crypto"

// ============================================
// SESSION HELPERS
// ============================================

/**
 * Generate a secure session token
 */
function generateSessionToken(): string {
  return randomBytes(32).toString("hex")
}

/**
 * Create a new session for a user
 */
async function createSession(userId: bigint) {
  const sessionToken = generateSessionToken()
  const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days

  await prisma.session.create({
    data: {
      sessionToken,
      userId,
      expires,
    },
  })

  return { sessionToken, expires }
}

/**
 * Delete all sessions for a user
 */
async function deleteUserSessions(userId: bigint) {
  await prisma.session.deleteMany({
    where: { userId },
  })
}

/**
 * Delete a specific session
 */
async function deleteSession(sessionToken: string) {
  await prisma.session.delete({
    where: { sessionToken },
  })
}

/**
 * Validate and get session
 */
async function getSession(sessionToken: string) {
  const session = await prisma.session.findUnique({
    where: { sessionToken },
    include: { user: true },
  })

  if (!session) {
    return null
  }

  // Check if session is expired
  if (new Date() > session.expires) {
    await deleteSession(sessionToken)
    return null
  }

  return session
}

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
        const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

        const user = await prisma.user.create({
            data: {
                name: validatedData.name,
                email: validatedData.email,
                password: hashedPassword,
                loginType: "email",
                status: "active",
                isEmailVerified: false,
            },
        })

        // Create verification token in VerificationToken table
        await prisma.verificationToken.create({
            data: {
                identifier: user.email,
                token: otp,
                expires: otpExpiresAt,
            },
        })

        const emailResult = await sendOTPEmail({
            email: user.email,
            name: user.name || "User",
            otp: otp,
        })

        if (!emailResult.success) {
            // Cleanup: Delete user and verification token
            await prisma.user.delete({ where: { id: user.id } })
            await prisma.verificationToken.deleteMany({
                where: { identifier: user.email },
            })
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

        // Find verification token
        const verificationToken = await prisma.verificationToken.findUnique({
            where: {
                identifier_token: {
                    identifier: email,
                    token: otp,
                },
            },
        })

        if (!verificationToken) {
            return {
                success: false,
                error: "Invalid verification code",
            }
        }

        // Check if token is expired
        if (new Date() > verificationToken.expires) {
            // Delete expired token
            await prisma.verificationToken.delete({
                where: {
                    identifier_token: {
                        identifier: email,
                        token: otp,
                    },
                },
            })
            return {
                success: false,
                error: "Verification code expired. Please request a new one.",
            }
        }

        // Update user and delete verification token
        await prisma.$transaction([
            prisma.user.update({
                where: { id: user.id },
                data: {
                    isEmailVerified: true,
                },
            }),
            prisma.verificationToken.delete({
                where: {
                    identifier_token: {
                        identifier: email,
                        token: otp,
                    },
                },
            }),
        ])

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

        // Find verification token
        const verificationToken = await prisma.verificationToken.findUnique({
            where: {
                identifier_token: {
                    identifier: email,
                    token: otp,
                },
            },
        })

        if (!verificationToken) {
            return {
                success: false,
                error: "Invalid code",
            }
        }

        // Check if token is expired
        if (new Date() > verificationToken.expires) {
            // Delete expired token
            await prisma.verificationToken.delete({
                where: {
                    identifier_token: {
                        identifier: email,
                        token: otp,
                    },
                },
            })
            return {
                success: false,
                error: "Code expired. Please request a new one.",
            }
        }

        // Delete the verification token (it will be used for password reset)
        await prisma.verificationToken.delete({
            where: {
                identifier_token: {
                    identifier: email,
                    token: otp,
                },
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

        // Delete any existing verification tokens for this email
        await prisma.verificationToken.deleteMany({
            where: { identifier: email },
        })

        // Generate new OTP
        const otp = generateOTP()
        const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

        // Create new verification token
        await prisma.verificationToken.create({
            data: {
                identifier: email,
                token: otp,
                expires: otpExpiresAt,
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

        // Delete any existing verification tokens for this email
        await prisma.verificationToken.deleteMany({
            where: { identifier: email },
        })

        // Generate new OTP for verification
        const otp = generateOTP()
        const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

        // Create new verification token
        await prisma.verificationToken.create({
            data: {
                identifier: email,
                token: otp,
                expires: otpExpiresAt,
            },
        })

        // Send verification email with OTP
        const emailResult = await sendOTPEmail({
            email,
            name: user.name || "User",
            otp,
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

        // Delete any existing verification tokens for this email
        await prisma.verificationToken.deleteMany({
            where: { identifier: email },
        })

        // Generate new OTP
        const otp = generateOTP()
        const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

        // Create new verification token
        await prisma.verificationToken.create({
            data: {
                identifier: email,
                token: otp,
                expires: otpExpiresAt,
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

        // Update password and clean up any verification tokens
        await prisma.$transaction([
            prisma.user.update({
                where: { id: user.id },
                data: {
                    password: hashedPassword,
                },
            }),
            prisma.verificationToken.deleteMany({
                where: { identifier: email },
            }),
        ])

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

// ============================================
// LOGOUT USER
// ============================================
export async function logoutUser(sessionToken?: string) {
  try {
    if (sessionToken) {
      // Delete specific session
      await deleteSession(sessionToken)
    }

    return {
      success: true,
      message: "Logged out successfully",
    }
  } catch (error) {
    console.error("Logout error:", error)
    return {
      success: false,
      error: "Something went wrong. Please try again.",
    }
  }
}

// ============================================
// LOGOUT FROM ALL DEVICES
// ============================================
export async function logoutAllDevices(userId: string) {
  try {
    const userIdBigInt = BigInt(userId)
    await deleteUserSessions(userIdBigInt)

    return {
      success: true,
      message: "Logged out from all devices successfully",
    }
  } catch (error) {
    console.error("Logout all devices error:", error)
    return {
      success: false,
      error: "Something went wrong. Please try again.",
    }
  }
}

// ============================================
// GET ACTIVE SESSIONS
// ============================================
export async function getActiveSessions(userId: string) {
  try {
    const userIdBigInt = BigInt(userId)
    const sessions = await prisma.session.findMany({
      where: {
        userId: userIdBigInt,
        expires: {
          gt: new Date(), // Only active (non-expired) sessions
        },
      },
      orderBy: {
        expires: "desc",
      },
    })

    return {
      success: true,
      sessions: sessions.map((session) => ({
        sessionToken: session.sessionToken,
        expires: session.expires,
      })),
    }
  } catch (error) {
    console.error("Get active sessions error:", error)
    return {
      success: false,
      error: "Something went wrong. Please try again.",
      sessions: [],
    }
  }
}

// ============================================
// VALIDATE SESSION
// ============================================
export async function validateSession(sessionToken: string) {
  try {
    const session = await getSession(sessionToken)

    if (!session) {
      return {
        success: false,
        error: "Invalid or expired session",
      }
    }

    return {
      success: true,
      user: {
        id: session.user.id.toString(),
        email: session.user.email,
        name: session.user.name,
        image: session.user.image,
        isEmailVerified: session.user.isEmailVerified,
      },
    }
  } catch (error) {
    console.error("Validate session error:", error)
    return {
      success: false,
      error: "Something went wrong. Please try again.",
    }
  }
}

// ============================================
// CHANGE PASSWORD
// ============================================
export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string
): Promise<ResetPasswordResult> {
  try {
    const userIdBigInt = BigInt(userId)

    // Get user with password
    const user = await prisma.user.findUnique({
      where: { id: userIdBigInt },
      select: {
        id: true,
        email: true,
        password: true,
        loginType: true,
      },
    })

    if (!user) {
      return {
        success: false,
        error: "User not found",
      }
    }

    // Check if user uses email/password login
    if (user.loginType !== "email" || !user.password) {
      return {
        success: false,
        error: "Password change is not available for social login accounts",
      }
    }

    // Verify current password
    const { compare } = await import("bcryptjs")
    const isPasswordValid = await compare(currentPassword, user.password)

    if (!isPasswordValid) {
      return {
        success: false,
        error: "Current password is incorrect",
      }
    }

    // Validate new password (minimum 8 characters)
    if (newPassword.length < 8) {
      return {
        success: false,
        error: "New password must be at least 8 characters long",
      }
    }

    // Check if new password is same as current password
    const isSamePassword = await compare(newPassword, user.password)
    if (isSamePassword) {
      return {
        success: false,
        error: "New password must be different from current password",
      }
    }

    // Hash new password
    const hashedPassword = await hash(newPassword, 12)

    // Update password
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
      },
    })

    return {
      success: true,
      message: "Password changed successfully!",
    }
  } catch (error) {
    console.error("Change password error:", error)
    return {
      success: false,
      error: "Something went wrong. Please try again.",
    }
  }
}