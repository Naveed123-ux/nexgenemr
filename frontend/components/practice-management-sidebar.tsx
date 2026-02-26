"use client";

import {
  BarChart3,
  Users,
  Building2,
  Calendar,
  Shield,
  Plus,
  LogOut,
  BookAudio,
  AudioLines,
  Recycle,
  HandCoins,
  Sheet,
  FileText,
  MessageSquare,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/store/store";
import { Logout } from "@/store/slices/authSlice";
import { toast } from "react-hot-toast";

const navigation = [
  { name: "Claims", href: "/rcm/claims", icon: Sheet },
  { name: "Workflow", href: "/rcm/workflow", icon: Recycle },
  {
    name: "Patient Billing",
    href: "/rcm/billing",
    icon: Users,
  },
  { name: "Invoices", href: "/rcm/invoices", icon: FileText },
  { name: "Payments", href: "/rcm/payments", icon: HandCoins },
  { name: "Secure Messaging", href: "/rcm/chat", icon: MessageSquare },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useDispatch();
  const hospital = useSelector((state: RootState) => state.auth.hospital);

  function signOut() {
    dispatch(Logout());
    toast.success("Logged out successfully!");
    document.cookie = "token=; path=/; max-age=0";
    if (typeof window !== "undefined") {
      window.location.href = "/auth/login";
    }
  }

  return (
    <div className="fixed left-4 top-4 bottom-4 bg-[#1E2235] flex flex-col items-center w-16 rounded-2xl mt-14 py-6 z-40 shadow-lg">
      {/* Navigation */}
      <nav className="flex-1 flex flex-col items-center space-y-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "p-3 rounded-lg transition-all duration-200 group",
                isActive
                  ? "bg-[#388fe5] text-white shadow-lg"
                  : "text-gray-400 hover:text-white hover:bg-gray-600"
              )}
              title={item.name}
            >
              <item.icon className="w-5 h-5" />
            </Link>
          );
        })}
      </nav>

      {/* Bottom Avatar with Logout */}
      <div className="mt-auto flex flex-col items-center space-y-3">
        <Link
          href="/hospital-admin/profile"
          title={hospital?.name || "Profile"}
        >
          <Avatar className="w-10 h-10 bg-white cursor-pointer hover:ring-2 hover:ring-[#388fe5] transition-all">
            <AvatarImage src={hospital?.logo_url} alt={hospital?.name} />
            <AvatarFallback className="text-gray-800 font-semibold text-sm">
              {hospital?.name
                ? hospital.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()
                  .slice(0, 2)
                : "HA"}
            </AvatarFallback>
          </Avatar>
        </Link>

        <button
          onClick={signOut}
          className="p-3 rounded-lg text-gray-400 hover:text-white hover:bg-red-600 transition-all duration-200"
          title="Logout"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
