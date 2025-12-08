"use client"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ReactQueryDevtools } from "@tanstack/react-query-devtools"
import { SessionProvider as NextAuthSessionProvider } from "next-auth/react"
import NotificationListener from '@/components/notifications/notificationsListener';
import { NotificationProvider } from '@/context/notificationContext';
import { useState } from "react"

export function AppProviders({ children }: { children: React.ReactNode }) {
    const [queryClient] = useState(
        () =>
            new QueryClient({
                defaultOptions: {
                    queries: {
                        staleTime: 60 * 1000, // 1 minute
                        refetchOnWindowFocus: false,
                    },
                },
            })
    )

    return (
        <NextAuthSessionProvider basePath="/api/auth">
            <QueryClientProvider client={queryClient}>
                <NotificationProvider>
                    <NotificationListener />
                    {children}
                </NotificationProvider>
                <ReactQueryDevtools initialIsOpen={false} />
            </QueryClientProvider>
        </NextAuthSessionProvider>
    )
}