"use client";

import {
  Settings,
  LogOut,
  BarChart3,
  Plus,
  DollarSign,
  BarChart,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useDispatch } from "react-redux";
import { Logout } from "@/store/slices/authSlice";
import { toast } from "react-hot-toast";

const navigation = [
  { name: "Dashboard", href: "/superadmin", icon: BarChart3 },
  { name: "Create Hospital", href: "/superadmin/create-hospital", icon: Plus },

  { name: "Requests", href: "/superadmin/requests", icon: Plus },
  // {
  //   name: "Subscriptions",
  //   href: "/superadmin/subscriptions",
  //   icon: DollarSign,
  // },
  // { name: "Configure", href: "/superadmin/configure", icon: Settings },
  // { name: "Analytics", href: "/superadmin/analytics", icon: BarChart },
  // { name: "Secure Messaging", href: "/superadmin/chat", icon: MessageSquare },
];

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ isCollapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const dispatch = useDispatch();

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

      {/* Bottom Section - Profile and Logout */}
      <div className="border-t border-gray-700 p-3 space-y-2">
        {/* Admin Profile */}
        <div
          className={cn(
            "flex items-center gap-3",
            isCollapsed ? "justify-center" : "px-3"
          )}
        >
          <Avatar className="w-10 h-10 bg-white flex-shrink-0">
            <AvatarFallback className="text-gray-800 font-semibold text-sm">
              SA
            </AvatarFallback>
          </Avatar>
          {!isCollapsed && (
            <span className="text-white font-semibold text-sm truncate">
              Super Admin
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
