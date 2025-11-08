export type RegisterResult =
    | { success: true; message: string; userId: string }
    | { success: false; error: string; fieldErrors?: Record<string, string> }

export type VerifyOTPResult =
    | { success: true; message: string }
    | { success: false; error: string }

export type ForgotPasswordResult =
    | { success: true; message: string }
    | { success: false; error: string }

export type ResetPasswordResult =
    | { success: true; message: string }
    | { success: false; error: string }

export type ResendVerificationResult =
    | { success: true; message: string }
    | { success: false; error: string }


export interface ProtectedRouteProps {
    children: React.ReactNode
    redirectTo?: string
}