"use client";

import type React from "react";

import { useEffect, useState } from "react";
import { HospitalAdminSidebar } from "@/components/hospital-admin-sidebar";

import { HospitalAdminMobileNav } from "@/components/hospital-admin-mobile-nav";
import { useSelector } from "react-redux";
import { fetchHospitalInfo } from "@/store/slices/authSlice";
import { useDispatch } from "react-redux";
import { AppDispatch, RootState } from "@/store/store";
import { AdminHeader } from "@/components/admin-header";
import { fetchDepartments } from "@/store/slices/departmentSlice";
import { SuperAdminHeader } from "@/components/superadmin-header";
import { DoctorMobileNav } from "@/components/doctor-mobile-nav";
import { DoctorHeader } from "@/components/doctor-header";
import {
  Menu,
  BarChart3,
  Users,
  Building2,
  Calendar,
  Shield,
  X,
  Plus,
  BookAudio,
  AudioLines,
  Home,
  UserCheck,
  FileText,
  User,
} from "lucide-react";
export default function HospitalAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const dispatch = useDispatch<AppDispatch>();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const hospital = useSelector((state: RootState) => state.auth?.hospital);

  // useEffect(() => {
  //   const faviconUrl = hospital?.favicon_url || "/favicon.png"; // Fallback to default favicon
  //   const link: HTMLLinkElement =
  //     document.querySelector("link[rel*='icon']") ||
  //     document.createElement("link");

  //   link.type = "image/png";
  //   link.rel = "icon";
  //   link.href = faviconUrl;

  //   // Remove existing favicon links to avoid duplicates
  //   const existingLinks = document.querySelectorAll("link[rel*='icon']");
  //   existingLinks.forEach((existingLink) => {
  //     if (existingLink !== link) {
  //       existingLink.remove();
  //     }
  //   });

  //   document.head.appendChild(link);

  //   // Cleanup blob URLs if used
  //   return () => {
  //     if (faviconUrl.startsWith("blob:")) {
  //       URL.revokeObjectURL(faviconUrl);
  //     }
  //   };
  // }, [hospital?.favicon_url]);

  useEffect(() => {
    dispatch(fetchHospitalInfo());
    dispatch(fetchDepartments());
  }, [dispatch]);
const navigation = [
  { name: "Practice Management", href: "/practice-management" },
  { name: "Dashboard", href: "/dashboard" },
  { name: "Manage Dashboard", href: "/manage-dashboard" },
];
const sideBarnavigation  = [
  { name: "Dashboard", href: "/hospital-admin", icon: BarChart3 },
  { name: "Hospital Staff", href: "/hospital-admin/staff", icon: Users },
  { name: "Add Staff", href: "/hospital-admin/addStaff", icon: Plus },
  { name: "Departments", href: "/hospital-admin/departments", icon: Building2 },
  { name: "Scheduling", href: "/hospital-admin/scheduling", icon: Calendar },
  {
    name: "Permissions & Data",
    href: "/hospital-admin/permissions",
    icon: Shield,
  },
  { name: "Audit Logs", href: "/hospital-admin/audit-log", icon: BookAudio },
];
const sideBarMainnavigation = [
  { name: "Dashboard", href: "/hospital-admin/dashboard", icon: Home },
  { name: "Tracker", href: "/hospital-admin", icon: AudioLines },
  // { name: "Patients", href: "/hospital-admin/patients", icon: UserCheck },
  { name: "Add Staff", href: "/hospital-admin/addStaff", icon: Plus },
  { name: "Hospital Staff", href: "/hospital-admin/staff", icon: Users },
  { name: "Departments", href: "/hospital-admin/departments", icon: Building2 },
  { name: "Discharge Summaries", href: "/hospital-admin/discharge-summaries", icon: FileText },
  { name: "Profile", href: "/hospital-admin/profile", icon: User },
  { name: "Audit Logs", href: "/hospital-admin/audit-log", icon: BookAudio },
];
  return (
    <div className="h-screen bg-gray-50 grid grid-rows-[auto_1fr]">
      {/* Header - Full width at top */}
      <header
        className="z-50"
        style={{
          backgroundColor: "#233141",
        }}
      >
        <div className="lg:hidden">
          <DoctorMobileNav navigation={sideBarnavigation} />
        </div>
        <DoctorHeader navigation={navigation} />
      </header>

      {/* Content area with sidebar */}
      <div className="flex overflow-hidden">
        {/* Desktop Sidebar - Below header */}
        <aside className="hidden lg:block">
          <HospitalAdminSidebar
            isCollapsed={sidebarCollapsed}
            onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
          />
        </aside>

        {/* Main Content - Adjusts based on sidebar state */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
