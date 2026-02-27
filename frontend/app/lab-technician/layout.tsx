"use client";

import { useState, useEffect } from "react";
import { LabTechnicianSidebar } from "@/components/lab-technician-sidebar";
import { cn } from "@/lib/utils";
import { useDispatch, useSelector } from "react-redux";
import { fetchHospitalInfo } from "@/store/slices/authSlice";
import { AppDispatch, RootState } from "@/store/store";
import { DoctorHeader } from "@/components/doctor-header";
import { DoctorMobileNav } from "@/components/doctor-mobile-nav";
import { Home, ClipboardList, FileText } from "lucide-react";

export default function LabTechnicianLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const dispatch = useDispatch<AppDispatch>();
    const hospital = useSelector((state: RootState) => state.auth?.hospital);

    useEffect(() => {
        dispatch(fetchHospitalInfo());
    }, [dispatch]);

    const navigation = [
        { name: "Practice Management", href: "/practice-management" },
        { name: "Dashboard", href: "/dashboard" },
        { name: "Manage Dashboard", href: "/manage-dashboard" },
    ];

    const mobileNavigation = [
        { name: "Dashboard", href: "/lab-technician", icon: Home },
        { name: "Requests", href: "/lab-technician/requests", icon: ClipboardList },
        { name: "Reports", href: "/lab-technician/reports", icon: FileText },
    ];

    return (
        <div className="h-screen grid grid-rows-[auto_1fr]" style={{ backgroundColor: hospital?.sidebar_color || "#233141" }}>
            {/* Header */}
            <header className="z-50" style={{ backgroundColor: hospital?.header_color || "#233141" }}>
                <div className="lg:hidden">
                    <DoctorMobileNav navigation={mobileNavigation} />
                </div>
                <DoctorHeader navigation={navigation} />
            </header>

            {/* Content area with sidebar */}
            <div className="flex overflow-hidden" style={{ backgroundColor: "#f9fafb" }}>
                {/* Desktop Sidebar */}
                <aside className="hidden lg:block" style={{ backgroundColor: hospital?.sidebar_color || "#233141" }}>
                    <LabTechnicianSidebar
                        isCollapsed={isCollapsed}
                        onToggle={() => setIsCollapsed(!isCollapsed)}
                    />
                </aside>

                {/* Main Content */}
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
