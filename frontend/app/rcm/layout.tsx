"use client";

import type React from "react";

import { useEffect, useState } from "react";
import { HospitalAdminMobileNav } from "@/components/hospital-admin-mobile-nav";
import { useSelector } from "react-redux";
import { fetchHospitalInfo } from "@/store/slices/authSlice";
import { useDispatch } from "react-redux";
import { AppDispatch, RootState } from "@/store/store";
import { AdminHeader } from "@/components/admin-header";
import { fetchDepartments } from "@/store/slices/departmentSlice";
import { SuperAdminHeader } from "@/components/superadmin-header";
import { Sidebar } from "@/components/practice-management-sidebar";
export default function HospitalAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const dispatch = useDispatch<AppDispatch>();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const hospital = useSelector((state: RootState) => state.auth?.hospital);

  useEffect(() => {
    const faviconUrl = hospital?.favicon_url || "/favicon.png"; // Fallback to default favicon
    const link: HTMLLinkElement =
      document.querySelector("link[rel*='icon']") ||
      document.createElement("link");

    link.type = "image/png";
    link.rel = "icon";
    link.href = faviconUrl;

    // Remove existing favicon links to avoid duplicates
    const existingLinks = document.querySelectorAll("link[rel*='icon']");
    existingLinks.forEach((existingLink) => {
      if (existingLink !== link) {
        existingLink.remove();
      }
    });

    document.head.appendChild(link);

    // Cleanup blob URLs if used
    return () => {
      if (faviconUrl.startsWith("blob:")) {
        URL.revokeObjectURL(faviconUrl);
      }
    };
  }, [hospital?.favicon_url]);

  useEffect(() => {
    dispatch(fetchHospitalInfo());
    dispatch(fetchDepartments());
  }, [dispatch]);

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      {/* Mobile Navigation */}

      {/* Main Content - Updated margin to match sidebar width (64px + 16px gap = 80px) */}
      <div className="flex-1 flex flex-col overflow-hidden lg:ml-20">
        <div
          style={{
            backgroundColor: "#233141",
          }}
        >
          <div className="lg:hidden">
            <HospitalAdminMobileNav />
          </div>
          <SuperAdminHeader />
        </div>
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
