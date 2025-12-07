"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export const CalendarSkeleton = () => (
    <Card className="p-3 md:p-6">
        <CardHeader className="flex flex-row items-center justify-between p-0 mb-6">
            <div className="flex items-center gap-2">
                <Skeleton className="h-10 w-10" />
                <Skeleton className="h-10 w-64" />
                <Skeleton className="h-10 w-10" />
            </div>
            <Skeleton className="h-10 w-28" />
        </CardHeader>
        <CardContent className="p-0">
            <div className="grid grid-cols-8 border-b pb-4 mb-4">
                <Skeleton className="h-5 w-10" />
                {Array.from({ length: 7 }).map((_, i) => (
                    <div key={i} className="flex flex-col items-center gap-2">
                        <Skeleton className="h-5 w-5 rounded-full" />
                        <Skeleton className="h-4 w-8" />
                    </div>
                ))}
            </div>
            <div className="relative">
                <div className="grid grid-cols-8 h-[640px]">
                    <div className="space-y-4">
                        {Array.from({ length: 8 }).map((_, i) => (
                            <Skeleton key={i} className="h-5 w-12 mt-3" />
                        ))}
                    </div>
                    {Array.from({ length: 7 }).map((_, i) => (
                        <div key={i} className="border-r last:border-r-0"></div>
                    ))}
                </div>
            </div>
        </CardContent>
    </Card>
);