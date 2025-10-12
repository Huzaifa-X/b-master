import Image from 'next/image';
import Link from 'next/link';
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form"

export default function LoginPage() {
    return (
        <div className="grid min-h-svh lg:grid-cols-2">
            <div className="flex flex-col gap-4 p-6 md:p-10">
                <div className="flex justify-center gap-2 md:justify-start">
                    <Link href="/" className="flex items-center gap-2">
                        <Image
                            src="/bmaster-logo.svg"
                            alt="Bmaster Logo"
                            width={164}
                            height={42}
                            style={{ width: 'auto', height: '42px' }}
                            unoptimized
                            priority
                        />
                    </Link>
                </div>
            <div className="flex flex-1 items-center justify-center">
                <div className="w-full max-w-xs animate-fade-in-up">
                        <ForgotPasswordForm />
                    </div>
                </div>
            </div>
            <div className="bg-muted relative hidden lg:block">
                <Image
                    src="/login-repeating-icons.svg"
                    alt="Image"
                    width={800}
                    height={600}
                    className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
                    unoptimized
                />
                {/* Add dark overlay for better text contrast */}
                <div className="absolute inset-0 bg-gradient-to-br from-black/60 via-black/50 to-black/40" />

                <div className="absolute inset-0 flex flex-col justify-center items-start p-12 lg:p-16">
                    <div className="max-w-lg space-y-8 animate-fade-in text-white">
                        <div className="space-y-3">
                            <h1 className="text-5xl font-bold tracking-tight drop-shadow-lg animate-scale-in">
                                Reset your password
                            </h1>
                            <p className="text-xl drop-shadow-md animate-fade-in">
                                Enter your email below to reset your password.
                            </p>
                        </div>

                        <div className="space-y-6 pt-4">
                            <div className="space-y-2 border-l-4 border-white/80 pl-4 animate-fade-in-up animation-delay-200">
                                <h2 className="text-xl font-semibold">
                                    Reset your password
                                </h2>
                                <p className="text-sm leading-relaxed">
                                    Reset your password to access your account.
                                </p>
                            </div>

                            <div className="space-y-2 border-l-4 border-white/80 pl-4 animate-fade-in-up animation-delay-400">
                                <h2 className="text-xl font-semibold">
                                    Secure reset
                                </h2>
                                <p className="text-sm leading-relaxed">
                                    Your password is protected with best-in-class security.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
