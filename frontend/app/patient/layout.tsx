// FILE: app/patient/layout.tsx
"use client";

import type React from "react";
import { Sidebar } from "@/components/doctor-sidebar";
import { DoctorHeader } from "@/components/doctor-header";
import { DoctorMobileNav } from "@/components/doctor-mobile-nav";
import ChatbotWidget from "@/components/patient/ChatbotWidget";
import { Home, CreditCard, FileText, Heart } from "lucide-react";

const navigation = [
  { name: "Dashboard", href: "/patient", icon: Home },
  { name: "Billing", href: "/patient/billing", icon: CreditCard },
  // { name: "Discharge Summaries", href: "/patient/discharge-summaries", icon: FileText },
  // { name: "My Health Summaries", href: "/patient/patient-summaries", icon: Heart },
];

export default function PatientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen bg-gray-50">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <Sidebar navigation={navigation} />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden lg:ml-20">
        <div>
          <div className="lg:hidden">
            <DoctorMobileNav navigation={navigation} />
          </div>
          <div className="">
            {/* Using a generic header component */}
            <DoctorHeader navigation={[]} />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-6 mt-20">{children}</div>
      </div>

      {/* Chatbot Widget */}
      <ChatbotWidget />
    </div>
  );
}