"use client";

import { useState } from "react";
import { LabTechnicianSidebar } from "@/components/lab-technician-sidebar";
import { cn } from "@/lib/utils";

export default function LabTechnicianLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [isCollapsed, setIsCollapsed] = useState(false);

    return (
        <div className="flex h-screen bg-gray-100 overflow-hidden">
            {/* Sidebar */}
            <LabTechnicianSidebar
                isCollapsed={isCollapsed}
                onToggle={() => setIsCollapsed(!isCollapsed)}
            />

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0 transition-all duration-300">
                <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-20 md:pb-6 relative">
                    <div
                        className={cn(
                            "mx-auto transition-all duration-300",
                            isCollapsed ? "max-w-7xl" : "max-w-6xl"
                        )}
                    >
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
