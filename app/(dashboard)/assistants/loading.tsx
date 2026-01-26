"use client"

import { Skeleton } from "@/components/ui/skeleton"

export default function AssistantsLoading() {
    return (
        <div className="h-full overflow-y-auto">
            <div className="container mx-auto py-4 px-4 max-w-4xl pb-16">
                {/* Header Skeleton */}
                <div className="mb-8">
                    <div className="flex items-center justify-between mb-6">
                        <div className="space-y-2">
                            <Skeleton className="h-8 w-48" />
                            <Skeleton className="h-4 w-64" />
                        </div>
                    </div>

                    {/* Tabs Skeleton */}
                    <div className="flex space-x-2 border-b">
                        <Skeleton className="h-10 w-24" />
                        <Skeleton className="h-10 w-32" />
                        <Skeleton className="h-10 w-32" />
                    </div>
                </div>

                {/* Search Bar Skeleton */}
                <div className="mb-8 p-1">
                    <Skeleton className="h-10 w-full rounded-md" />
                </div>

                {/* Grid Skeleton */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {Array.from({ length: 8 }).map((_, i) => (
                        <div key={i} className="flex flex-col space-y-3 rounded-xl">
                            <div className="flex items-center gap-3">
                                <Skeleton className="h-10 w-10 rounded-full" />
                                <div className="space-y-1">
                                    <Skeleton className="h-4 w-24" />
                                    <Skeleton className="h-3 w-16" />
                                </div>
                            </div>
                            <Skeleton className="h-20 w-full rounded-md" />
                            <div className="flex items-center justify-between pt-2">
                                <Skeleton className="h-4 w-12" />
                                <Skeleton className="h-8 w-8 rounded-full" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
