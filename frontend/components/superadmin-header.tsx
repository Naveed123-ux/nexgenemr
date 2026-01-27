"use client";

import {
  Home,
  Users,
  Calendar,
  FileText,
  MessageCircle,
  Settings,
  LogOut,
  Bell,
  Search,
  Plus,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Button } from "./ui/button";
import { toast } from "react-hot-toast";

const navigation = [
  { name: "Practice Management", href: "/practice-management" },
  { name: "Dashboard", href: "/dashboard" },
  { name: "Manage Dashboard", href: "/manage-dashboard" },
];

export function SuperAdminHeader() {
  const pathname = usePathname();
  const router = useRouter();

  function signOut() {
    toast.success("Logged out successfully!");
    // Note: This only clears client-accessible cookies. HttpOnly cookies must be cleared by the server.
    document.cookie = "token=; path=/; max-age=0";

    // FIX 2: Used Next.js router for a smoother client-side navigation.
    router.push("/auth/login");
  }

  return (
    <div className="fixed top-0 left-0 right-0 bg-bg-main text-white z-50 shadow-lg">
      <div className="flex items-center justify-between px-3 py-3">
        {/* Left side - Logo */}
        <div className="flex space-x-3">
          <div className="flex items-center">
            <div className="text-[#388fe5] font-bold text-xl">NexgenEMR</div>
          </div>
        </div>
        {/* Center - Navigation */}

        {/* Right side - Actions and Profile */}
        <div className="flex items-center space-x-4">
          {/* Dashboard button */}
          <button className="text-gray-300 hover:text-white text-sm bg-[#2A2E42] px-6 py-2 rounded-md">
            Dashboard
          </button>

          {/* Announcement button */}
          <button className="text-gray-300 hover:text-white text-sm">
            Announcement
          </button>

          {/* Notification bell with red dot */}
          <div className="relative">
            <Bell className="w-5 h-5 text-gray-300 hover:text-white cursor-pointer" />
            <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></div>
          </div>

          {/* Plus icon */}
          <div className="bg-[#388fe5] p-1.5 hover:bg-bg-main transition-all rounded-md">
            <Plus className="w-5 h-5 hover:text-white text-black cursor-pointer " />
          </div>

          {/* Search icon */}
          <Search className="w-5 h-5 text-gray-300 hover:text-white cursor-pointer" />

          {/* Profile Avatar */}
          <Popover>
            <PopoverTrigger asChild>
              <Avatar className="w-8 h-8">
                <AvatarImage src="/profile-avatar.jpg" />
                <AvatarFallback className="bg-gray-600 text-white text-sm">
                  U
                </AvatarFallback>
              </Avatar>
            </PopoverTrigger>
            <PopoverContent side="bottom" align="end" className="w-48">
              <div className="flex flex-col space-y-2">
                <Button variant="ghost" className="justify-start">
                  <Link href="/superadmin/profile">
                    Profile
                  </Link>
                </Button>
                <Button variant="ghost" className="justify-start">
                  Settings
                </Button>
                <Button
                  onClick={signOut}
                  variant="ghost"
                  className="justify-start text-red-500"
                >
                  Logout
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </div>
  );
}
