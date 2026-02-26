"use client";

import { useState } from "react";
import {
  BarChart3,
  Users,
  Building2,
  Calendar,
  Shield,
  Plus,
  LogOut,
  BookAudio,
  AudioLines,
  Home,
  UserCheck,
  FileText,
  User,
  ChevronLeft,
  ChevronRight,
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
  { name: "Dashboard", href: "/hospital-admin/dashboard", icon: Home },
  { name: "Tracker", href: "/hospital-admin", icon: AudioLines },
  { name: "Secure Messaging", href: "/hospital-admin/chat", icon: MessageSquare },
  { name: "Add Staff", href: "/hospital-admin/addStaff", icon: Plus },
  { name: "Hospital Staff", href: "/hospital-admin/staff", icon: Users },
  { name: "Departments", href: "/hospital-admin/departments", icon: Building2 },
  { name: "Doctor Reassignment", href: "/hospital-admin/doctor-reassignment", icon: UserCheck },
  {
    name: "Discharge Summaries",
    href: "/hospital-admin/discharge-summaries",
    icon: FileText,
  },
  { name: "Profile", href: "/hospital-admin/profile", icon: User },
  { name: "Audit Logs", href: "/hospital-admin/audit-log", icon: BookAudio },
];

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

export function HospitalAdminSidebar({ isCollapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useDispatch();
  const hospital = useSelector((state: RootState) => state.auth.hospital);

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
        "h-full bg-[#233141] flex flex-col transition-all duration-300 ease-in-out relative",
        isCollapsed ? "w-20" : "w-64"
      )}
    >
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
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center px-3 py-3 rounded-lg transition-all duration-200",
                  isCollapsed ? "justify-center" : "gap-3",
                  isActive
                    ? "bg-[#388fe5] text-white"
                    : "text-gray-400 hover:text-white hover:bg-[#2a3f54]"
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
        {/* Hospital Logo and Name */}
        <div
          className={cn(
            "flex items-center gap-3",
            isCollapsed ? "justify-center" : "px-3"
          )}
        >
          <Avatar className="w-10 h-10 bg-white flex-shrink-0">
            <AvatarImage src={hospital?.logo_url} alt={hospital?.name} />
            <AvatarFallback className="text-gray-800 font-semibold text-sm">
              {hospital?.name
                ? hospital.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()
                  .slice(0, 2)
                : "HA"}
            </AvatarFallback>
          </Avatar>
          {!isCollapsed && (
            <span className="text-white font-semibold text-sm truncate">
              {hospital?.name || "Hospital Admin"}
            </span>
          )}
        </div>

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
        className="absolute -right-3 top-16 bg-[#233141] border-2 border-gray-700 rounded-full p-1 hover:bg-[#2a3f54] transition-colors z-10"
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
