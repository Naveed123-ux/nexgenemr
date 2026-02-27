// FILE: app/patient/layout.tsx
"use client";

import { useState } from "react";
import { Sidebar } from "@/components/doctor-sidebar";
import { DoctorHeader } from "@/components/doctor-header";
import { DoctorMobileNav } from "@/components/doctor-mobile-nav";
import ChatbotWidget from "@/components/patient/ChatbotWidget";
import { Home, CreditCard, FileText, Heart, MessageSquare } from "lucide-react";

const navigation = [
  { name: "Dashboard", href: "/patient", icon: Home },
  { name: "Billing", href: "/patient/billing", icon: CreditCard },
  { name: "Discharge Summaries", href: "/patient/discharge-summaries", icon: FileText },
  { name: "My Health Summaries", href: "/patient/patient-summaries", icon: Heart },
  { name: "Lab Results", href: "/patient/lab-results", icon: FileText },
  { name: "Doctor Chat", href: "/patient/chat", icon: MessageSquare },
];

import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/store/store";
import { useEffect } from "react";
import { updateUserPictureUrl, fetchHospitalInfo } from "@/store/slices/authSlice";

export default function PatientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const dispatch = useDispatch<AppDispatch>();
  const { data: dashboardData } = useSelector((state: RootState) => state.patientDashboard);
  const auth = useSelector((state: RootState) => state.auth);
  const hospital = auth.hospital;

  useEffect(() => {
    dispatch(fetchHospitalInfo());
  }, [dispatch]);

  useEffect(() => {
    if (dashboardData && dashboardData.profile_picture_url && !auth.profile_picture_url) {
      dispatch(updateUserPictureUrl(dashboardData.profile_picture_url));
    }
  }, [dashboardData, dispatch, auth.profile_picture_url]);

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block" style={{ backgroundColor: hospital?.sidebar_color || "#233141" }}>
        <Sidebar
          navigation={navigation}
          isCollapsed={isCollapsed}
          onToggle={() => setIsCollapsed(!isCollapsed)}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="z-50" style={{ backgroundColor: hospital?.header_color || "#233141" }}>
          <div className="lg:hidden">
            <DoctorMobileNav navigation={navigation} />
          </div>
          <DoctorHeader navigation={[]} />
        </header>
        <div className="flex-1 overflow-y-auto p-6">{children}</div>
      </div>

      {/* Chatbot Widget */}
      <ChatbotWidget />
    </div>
  );
}