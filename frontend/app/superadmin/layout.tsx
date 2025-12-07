"use client";

import type React from "react";
import { useState } from "react";
import { Sidebar } from "@/components/sidebar";
import { BarChart3, Plus, DollarSign, Settings, BarChart, InboxIcon } from "lucide-react";
import { DoctorMobileNav } from "@/components/doctor-mobile-nav";
import { DoctorHeader } from "@/components/doctor-header";

export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const navigation = [
    { name: "Dashboard", href: "/superadmin", icon: BarChart3 },
    { name: "Create Hospital", href: "/superadmin/create-hospital", icon: Plus },
    { name: "Subscriptions", href: "/superadmin/subscriptions", icon: DollarSign },
    { name: "Configure", href: "/superadmin/configure", icon: Settings },
    { name: "Analytics", href: "/superadmin/analytics", icon: BarChart },
    { name: "Requests", href: "/superadmin/requests", icon: InboxIcon },
  ];

  const HeaderNavigation = [
    { name: "Practice Management", href: "/practice-management" },
    { name: "Dashboard", href: "/dashboard" },
    { name: "Manage Dashboard", href: "/manage-dashboard" },
  ];

  return (
    <div className="h-screen grid grid-rows-[auto_1fr]" style={{ backgroundColor: "#233141" }}>
      {/* Header - Full width at top */}
      <header className="z-50" style={{ backgroundColor: "#233141" }}>
        <div className="lg:hidden">
          <DoctorMobileNav navigation={navigation} />
        </div>
        <DoctorHeader navigation={HeaderNavigation} />
      </header>

      {/* Content area with sidebar */}
      <div className="flex overflow-hidden" style={{ backgroundColor: "#f9fafb" }}>
        {/* Desktop Sidebar - Below header */}
        <aside className="hidden lg:block" style={{ backgroundColor: "#233141" }}>
          <Sidebar
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
