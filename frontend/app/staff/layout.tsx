"use client";

import type React from "react";

import { useState } from "react";
import { StaffSidebar } from "@/components/staff-sidebar";
import { HospitalAdminMobileNav } from "@/components/hospital-admin-mobile-nav";
import { StaffMoblileNav } from "@/components/staff-mobile-nav";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/store/store";
import { AdminHeader } from "@/components/admin-header";
import { useEffect } from "react";
import { fetchHospitalInfo, fetchStaffInfo, fetchUserInfo } from "@/store/slices/authSlice";
import { SuperAdminHeader } from "@/components/superadmin-header";
import {
  Menu,
  BarChart3,
  Users,
  Building2,
  Calendar,
  Shield,
  X,
  NotepadTextDashed,
  ClipboardList,
  FileText,
} from "lucide-react";
import {

  Plus,
  LogOut,
  MessageSquareText,
  AudioLines,
} from "lucide-react";
import { DoctorMobileNav } from "@/components/doctor-mobile-nav";
import { DoctorHeader } from "@/components/doctor-header";
import { Sidebar } from "@/components/doctor-sidebar";
export default function HospitalAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const dispatch = useDispatch<AppDispatch>();
  const name = useSelector((state: RootState) => state.auth.name);
  const [sidebarOpen, setSidebarOpen] = useState(false);
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

    dispatch(fetchStaffInfo());
    dispatch(fetchUserInfo());
  }, [dispatch]);
  const sideBarNavigation = [
    { name: "Dashboard", href: "/staff", icon: BarChart3 },
    { name: "Patient Records", href: "/doctor/patient-records", icon: FileText },
    { name: "Appointments", href: "/doctor/appointments", icon: Calendar },
    {
      name: "Patient Intake",
      href: "/doctor/patientIntake",
      icon: NotepadTextDashed,
    },
  ];
  const navigation = [
    { name: "Practice Management", href: "/practice-management" },
    { name: "Dashboard", href: "/dashboard" },
    { name: "Manage Dashboard", href: "/manage-dashboard" },
  ];
  const sideBarMainNavigation = [
    { name: "Tracker", href: "/staff", icon: AudioLines },

    { name: "Appointments", href: "/staff/appointments", icon: Calendar },
    {
      name: "Patient Intake",
      href: "/staff/patientIntake",
      icon: NotepadTextDashed,
    },
    {
      name: "Handoff Notes",
      href: "/staff/handoff-notes",
      icon: ClipboardList,
    },
    {
      name: "Chat",
      href: "/staff/chat",
      icon: MessageSquareText,
    },
  ];
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="h-screen grid grid-rows-[auto_1fr]" style={{ backgroundColor: hospital?.sidebar_color || "#233141" }}>
      {/* Header - Full width at top */}
      <header
        className="z-50"
        style={{
          backgroundColor: hospital?.header_color || "#233141",
        }}
      >
        <div className="lg:hidden">
          <DoctorMobileNav navigation={sideBarMainNavigation} />
        </div>
        <DoctorHeader navigation={navigation} />
      </header>

      {/* Content area with sidebar */}
      <div className="flex overflow-hidden" style={{ backgroundColor: "#f9fafb" }}>
        {/* Desktop Sidebar - Below header */}
        <aside className="hidden lg:block" style={{ backgroundColor: hospital?.sidebar_color || "#233141" }}>
          <StaffSidebar
            isCollapsed={sidebarCollapsed}
            onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
          />
        </aside>

        {/* Main Content - Adjusts based on sidebar state */}
        <main className="flex-1 overflow-y-auto p-6" style={{ backgroundColor: "#f9fafb" }}>
          {children}
        </main>
      </div>
    </div>
  );
}
