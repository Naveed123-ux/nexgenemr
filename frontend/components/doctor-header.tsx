"use client";

import { useState } from "react";

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
  Sidebar,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Button } from "./ui/button";
import { useAppDispatch, useAppSelector } from "@/hooks/useStore";
import { toggleDoctorSidebar } from "@/store/slices/DoctorSidebar";
import { toast } from 'sonner'
import { ChangePasswordModal } from "./ChangePasswordModal";


export function DoctorHeader({ navigation }: {
  navigation:
  {
    name: string,
    href: string,

  }[]
}) {
  const pathname = usePathname();
  const router = useRouter();
  const auth = useAppSelector(state => state.auth);
  const hospital = auth.hospital;
  const dispatch = useAppDispatch();
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  function signOut() {
    toast.success("Logged out successfully!");
    // Note: This only clears client-accessible cookies. HttpOnly cookies must be cleared by the server.
    document.cookie = "token=; path=/; max-age=0";

    // FIX 2: Used Next.js router for a smoother client-side navigation.
    router.push("/auth/login");
  }

  return (
    <div className="text-white" style={{ backgroundColor: hospital?.header_color || "#233141" }}>
      <div className="flex items-center justify-between px-3 py-3">
        {/* Left side - Logo */}

        <div className="max-md:hidden flex space-x-3">
          <div className="flex items-center gap-2">
            {hospital?.logo_url && (
              <img src={hospital.logo_url} alt="Logo" className="w-8 h-8 object-contain rounded bg-white" />
            )}
            <div className="text-white font-bold text-xl">
              {hospital?.header_text || hospital?.name || "NexgenEMR"}
            </div>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden rounded-full z-50 text-white"
          onClick={() => {
            dispatch(toggleDoctorSidebar());
          }}
        >
          <Sidebar className="h-6 w-6" />
          <span className="sr-only">Open Menu</span>
        </Button>
        {/* Center - Navigation */}

        {/* Right side - Actions and Profile */}
        <div className="flex items-center space-x-4">
          {/* Dashboard button */}
          {/* <button className="text-gray-300 hover:text-white text-sm bg-[#2A2E42] px-6 py-2 rounded-md">
            Dashboard
          </button> */}

          {/* Announcement button */}
          {/* <button className="text-gray-300 hover:text-white text-sm">
            Announcement
          </button> */}

          {/* Notification bell with red dot */}
          <div className="relative">
            <Bell className="w-5 h-5 text-gray-300 hover:text-white cursor-pointer" />
            <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></div>
          </div>

          {/* Plus icon */}
          <div className="bg-[#388fe5] p-1.5 hover:bg-bg-main transition-all rounded-md">
            <Plus className="w-5 h-5 hover:text-white text-black cursor-pointer" />
          </div>

          {/* Search icon */}
          <Search className="w-5 h-5 text-gray-300 hover:text-white cursor-pointer" />

          {/* Profile Avatar */}
          <Popover>
            <PopoverTrigger asChild>
              <Avatar className="w-8 h-8">
                <AvatarImage src={auth?.profile_picture_url ? auth?.profile_picture_url : "/profile-avatar.jpg"} />
                <AvatarFallback className="bg-gray-600 text-white text-sm">
                  U
                </AvatarFallback>
              </Avatar>
            </PopoverTrigger>
            <PopoverContent side="bottom" align="end" className="w-48">
              <div className="flex flex-col space-y-2">
                <Button
                  variant="ghost"
                  className="justify-start"
                  onClick={() => {
                    const jobTitle = auth?.job_title?.toLowerCase();
                    const path = pathname.split('/')[1]; // Get first segment of path

                    // Route based on current path context
                    if (path === 'doctor') {
                      router.push('/doctor/profile');
                    } else if (path === 'hospital-admin') {
                      router.push('/hospital-admin/profile');
                    } else if (path === 'staff') {
                      router.push('/staff/profile');
                    } else {
                      // Fallback based on job title
                      if (jobTitle?.includes('doctor')) {
                        router.push('/doctor/profile');
                      } else if (jobTitle?.includes('admin')) {
                        router.push('/hospital-admin/profile');
                      } else {
                        router.push('/profile');
                      }
                    }
                  }}
                >
                  Profile
                </Button>
                <Button
                  variant="ghost"
                  className="justify-start"
                  onClick={() => setIsPasswordModalOpen(true)}
                >
                  Change Password
                </Button>
                <Button variant="ghost" className="justify-start">
                  Settings
                </Button>
                <Button
                  variant="ghost"
                  className="justify-start text-red-500"
                  onClick={signOut}
                >
                  Logout
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>
      <ChangePasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
      />
    </div>
  );
}
