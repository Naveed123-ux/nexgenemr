"use client";

import type React from "react";

import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/store/store";
import { AdminHeader } from "@/components/admin-header";
import { Sidebar } from "@/components/doctor-sidebar";
import { DoctorMobileNav } from "@/components/doctor-mobile-nav";
import { useState } from "react";
import { useEffect } from "react";
import { fetchDoctorInfo, fetchHospitalInfo } from "@/store/slices/authSlice";

import { DoctorHeader } from "@/components/doctor-header";
import {
  BaggageClaim,
  BrickWallIcon,
  Calendar,
  CalendarPlus,
  ClipboardList,
  FileText,
  Home,
  Icon,
  MessageSquare,
  PartyPopper,
  PillBottle,
  Pyramid,
  Settings,
  Stethoscope,
  Users,
  UserPlus,
} from "lucide-react";

export default function HospitalAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const dispatch = useDispatch<AppDispatch>();

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
    dispatch(fetchDoctorInfo());
  }, [dispatch]);
  const navigation = [
    { name: "Practice Management", href: "/practice-management" },
    { name: "Dashboard", href: "/dashboard" },
    { name: "Manage Dashboard", href: "/manage-dashboard" },
  ];
  const sideBarnavigation = [
    { name: "Home", href: "/doctor", icon: Home },
    { name: "Patient Billing", href: "/doctor/patient-billing", icon: Users },
    { name: "Scheduling", href: "/doctor/scheduling", icon: Calendar },
    { name: "Claims", href: "/doctor/claims", icon: FileText },
    { name: "Chats", href: "/doctor/chats", icon: MessageSquare },
    { name: "Settings", href: "/doctor/settings", icon: Settings },
  ]
  const sideBarMainNavigation = [
    { name: "Home", href: "/doctor", icon: Pyramid },
    { name: "Register Patient", href: "/doctor/register-patient", icon: UserPlus },
    { name: "Book Appointment", href: "/doctor/book-appointment", icon: CalendarPlus },
    { name: "Prescriptions", href: "/doctor/prescriptions", icon: PillBottle },
    { name: "Appointments", href: "/doctor/appointments", icon: Calendar },
    { name: "Notes Taker", href: "/doctor/soap-notes", icon: ClipboardList },
    { name: "Chats", href: "/doctor/chat", icon: MessageSquare },

  ];

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="h-screen grid grid-rows-[auto_1fr]" style={{ backgroundColor: "#233141" }}>
      {/* Header - Full width at top */}
      <header
        className="z-50"
        style={{
          backgroundColor: "#233141",
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
        <aside
          className="hidden lg:block"
          style={{ backgroundColor: "#233141" }}
        >
          <Sidebar
            navigation={sideBarMainNavigation}
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
