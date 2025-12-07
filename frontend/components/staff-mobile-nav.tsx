"use client";

import { useState } from "react";
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
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const navigation = [
  { name: "Dashboard", href: "/staff", icon: BarChart3 },
  { name: "Patient Records", href: "/doctor/patient-records", icon: FileText },
  { name: "Appointments", href: "/doctor/appointments", icon: Calendar },
  {
    name: "Patient Intake",
    href: "/doctor/patientIntake",
    icon: NotepadTextDashed,
  },
];

export function StaffMoblileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className="md:hidden">
      {/* Menu Button */}
      <Button
        variant="ghost"
        size="sm"
        className="p-2"
        onClick={() => setOpen(true)}
      >
        <Menu className="w-5 h-5" />
      </Button>

      {/* Full Screen Overlay */}
      {open && (
        <div className="fixed inset-0 z-50 bg-white">
          <div className="flex flex-col h-full">
            {/* Header with Close Button and Logo */}
            <div className="flex items-center justify-between p-4 border-b">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setOpen(false)}
                className="p-2"
              >
                <X className="w-5 h-5" />
              </Button>
              <h1 className="text-xl font-bold text-green-primary">EMRAKON</h1>
              <div className="w-9" /> {/* Spacer for centering */}
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-4 py-6 space-y-2">
              {navigation.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-center gap-4 rounded-lg p-4 transition-colors text-base",
                      isActive
                        ? "bg-green-primary text-white"
                        : "text-gray-600 hover:bg-gray-100"
                    )}
                  >
                    <item.icon className="w-5 h-5 flex-shrink-0" />
                    <span className="font-medium">{item.name}</span>
                  </Link>
                );
              })}
            </nav>

            {/* User Profile */}
            <div className="p-4 border-t mt-auto">
              <Link
                href="/hospital-admin/profile"
                onClick={() => setOpen(false)}
              >
                <div className="flex items-center gap-3 hover:bg-gray-100 rounded-lg p-2 transition-colors">
                  <Avatar className="w-12 h-12 flex-shrink-0">
                    <AvatarImage src="/doctor-profile.png" />
                    <AvatarFallback>RP</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-green-primary">
                      Dr. Robert Patel
                    </p>
                    <p className="text-sm text-gray-500">Hospital Admin</p>
                  </div>
                </div>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
