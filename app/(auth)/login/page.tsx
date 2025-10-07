import Image from 'next/image';
import { LoginForm } from "@/components/login-form"

export default function LoginPage() {
    return (
        <div className="grid min-h-svh lg:grid-cols-2">
            <div className="flex flex-col gap-4 p-6 md:p-10">
                <div className="flex justify-center gap-2 md:justify-start">
                    <a href="/" className="flex items-center gap-2">
                        <Image
                            src="/bmaster-logo.svg"
                            alt="Bmaster Logo"
                            width={164}
                            height={42}
                            style={{ width: 'auto', height: '42px' }}
                            unoptimized
                            priority
                        />
                    </a>
                </div>
            <div className="flex flex-1 items-center justify-center">
                <div className="w-full max-w-xs animate-fade-in-up">
                        <LoginForm />
                    </div>
                </div>
            </div>
            <div className="bg-muted relative hidden lg:block">
                <img
                    src="/login-repeating-icons.svg"
                    alt="Image"
                    className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
                />
                {/* Add dark overlay for better text contrast */}
                <div className="absolute inset-0 bg-gradient-to-br from-black/60 via-black/50 to-black/40" />

                <div className="absolute inset-0 flex flex-col justify-center items-start p-12 lg:p-16">
                    <div className="max-w-lg space-y-8 animate-fade-in">
                        <div className="space-y-3">
                            <h1 className="text-5xl font-bold tracking-tight text-white drop-shadow-lg animate-scale-in">
                                Welcome Back!
                            </h1>
                            <p className="text-xl text-white drop-shadow-md animate-fade-in">
                                We're so happy to see you again.
                            </p>
                        </div>

                        <div className="space-y-6 pt-4">
                            <div className="space-y-2 border-l-4 border-white/80 pl-4 animate-fade-in-up animation-delay-200">
                                <h2 className="text-xl font-semibold text-white">
                                    Quick Access
                                </h2>
                                <p className="text-sm text-white/90 leading-relaxed">
                                    Login to access all your favorite features.
                                </p>
                            </div>

                            <div className="space-y-2 border-l-4 border-white/80 pl-4 animate-fade-in-up animation-delay-400">
                                <h2 className="text-xl font-semibold text-white">
                                    Secure Login
                                </h2>
                                <p className="text-sm text-white/90 leading-relaxed">
                                    Your account is protected with best-in-class security.
                                </p>
                            </div>

                            <div className="space-y-2 border-l-4 border-white/80 pl-4 animate-fade-in-up animation-delay-600">
                                <h2 className="text-xl font-semibold text-white">
                                    Stay Updated
                                </h2>
                                <p className="text-sm text-white/90 leading-relaxed">
                                    Get notified about new features and updates.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
