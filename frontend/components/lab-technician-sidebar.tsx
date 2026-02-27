"use client";

import { useState } from "react";
import {
    Home,
    FileText,
    Upload,
    LogOut,
    ChevronLeft,
    ChevronRight,
    ClipboardList,
    MessageSquare,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/store/store";
import { Logout } from "@/store/slices/authSlice";
import { toast } from "react-hot-toast";

const navigation = [
    { name: "Dashboard", href: "/lab-technician", icon: Home },
    { name: "Requests", href: "/lab-technician/requests", icon: ClipboardList },
    { name: "Reports", href: "/lab-technician/reports", icon: FileText },
    { name: "Upload", href: "/lab-technician/upload", icon: Upload },
    { name: "Secure Messaging", href: "/lab-technician/chat", icon: MessageSquare },
];

interface SidebarProps {
    isCollapsed: boolean;
    onToggle: () => void;
}

export function LabTechnicianSidebar({ isCollapsed, onToggle }: SidebarProps) {
    const pathname = usePathname();
    const router = useRouter();
    const dispatch = useDispatch();
    const user = useSelector((state: RootState) => state.auth); // Assuming auth slice holds user info directly or via another property

    const hospital = useSelector((state: RootState) => state.auth?.hospital);

    function signOut() {
        dispatch(Logout());
        toast.success("Logged out successfully!");
        document.cookie = "token=; path=/; max-age=0";
        if (typeof window !== "undefined") {
            window.location.href = "/auth/login";
        }
    }

    return (
        <div
            className={cn(
                "h-full flex flex-col transition-all duration-300 ease-in-out relative",
                isCollapsed ? "w-20" : "w-64"
            )}
            style={{ backgroundColor: hospital?.sidebar_color || "#1e293b" }}
        >
            {/* Logo Section */}
            <div className="flex items-center h-16 px-4" style={{ backgroundColor: 'rgba(0,0,0,0.1)' }}>
                <div className={cn("flex items-center gap-3", isCollapsed ? "justify-center w-full" : "")}>
                    {hospital?.logo_url ? (
                        <img src={hospital.logo_url} alt="Logo" className="w-8 h-8 rounded-lg object-contain bg-white" />
                    ) : (
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                            N
                        </div>
                    )}
                    {!isCollapsed && (
                        <span className="text-white font-bold text-lg truncate tracking-tight">
                            {hospital?.header_text || hospital?.name || "NexGenEMR"}
                        </span>
                    )}
                </div>
            </div>

            {/* Navigation */}
            <nav
                className="flex-1 overflow-y-auto py-4 px-3 cursor-pointer"
                onClick={(e) => {
                    // Only toggle if not clicking on a link
                    const clickedLink = (e.target as HTMLElement).closest("a");
                    if (!clickedLink) {
                        onToggle();
                    }
                }}
            >
                <div className="space-y-1">
                    {navigation.map((item) => {
                        const isActive = item.href === "/lab-technician"
                            ? pathname === "/lab-technician"
                            : pathname === item.href || pathname.startsWith(item.href + "/");
                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                className={cn(
                                    "flex items-center px-3 py-3 rounded-lg transition-all duration-200",
                                    isCollapsed ? "justify-center" : "gap-3",
                                    isActive
                                        ? "bg-[#3b82f6] text-white"
                                        : "text-gray-400 hover:text-white hover:bg-[#334155]"
                                )}
                                title={isCollapsed ? item.name : undefined}
                            >
                                <item.icon className="w-5 h-5 flex-shrink-0" />
                                {!isCollapsed && (
                                    <span className="text-sm font-medium truncate">
                                        {item.name}
                                    </span>
                                )}
                            </Link>
                        );
                    })}
                </div>
            </nav>

            {/* Bottom Section - Logo and Logout */}
            <div className="border-t border-gray-700 p-3 space-y-2">
                {/* User Info Section - Dynamic Route */}
                <Link
                    href={`/${pathname.split("/")[1]}/profile`}
                    className={cn(
                        "flex items-center gap-3 hover:bg-white/10 rounded-lg transition-all duration-200 cursor-pointer py-2",
                        isCollapsed ? "justify-center" : "px-3"
                    )}
                >
                    <Avatar className="w-10 h-10 bg-white flex-shrink-0">
                        <AvatarImage src={user?.profile_picture_url || ""} alt={user?.name || "User"} />
                        <AvatarFallback className="text-gray-800 font-semibold text-sm">
                            {user?.name
                                ? user.name
                                    .split(" ")
                                    .map((n) => n[0])
                                    .join("")
                                    .toUpperCase()
                                    .slice(0, 2)
                                : "LT"}
                        </AvatarFallback>
                    </Avatar>
                    {!isCollapsed && (
                        <div className="flex flex-col overflow-hidden">
                            <span className="text-white font-semibold text-sm truncate">
                                {user?.name || "Lab Technician"}
                            </span>
                            <span className="text-gray-400 text-xs truncate">
                                {user?.email}
                            </span>
                        </div>
                    )}
                </Link>

                {/* Logout Button */}
                <button
                    onClick={signOut}
                    className={cn(
                        "flex items-center gap-3 px-3 py-3 rounded-lg text-gray-400 hover:text-white hover:bg-red-600/20 transition-all duration-200 w-full",
                        isCollapsed && "justify-center"
                    )}
                    title={isCollapsed ? "Logout" : undefined}
                >
                    <LogOut className="w-5 h-5 flex-shrink-0" />
                    {!isCollapsed && <span className="text-sm font-medium">Logout</span>}
                </button>
            </div>

            {/* Toggle Button */}
            <button
                onClick={onToggle}
                className="absolute -right-3 top-16 bg-[#1e293b] border-2 border-gray-700 rounded-full p-1 hover:bg-[#334155] transition-colors z-10"
                aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
                {isCollapsed ? (
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                ) : (
                    <ChevronLeft className="w-4 h-4 text-gray-400" />
                )}
            </button>
        </div>
    );
}
