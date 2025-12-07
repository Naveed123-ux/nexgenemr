"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Menu,
  X,
  Home,
  Users,
  Calendar,
  FileText,
  MessageSquare,
  Settings,
  Sidebar,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { useDispatch, useSelector } from "react-redux"
import { RootState } from "@/store/store"
import { setDoctorSidebarOpen, toggleDoctorSidebar } from "@/store/slices/DoctorSidebar"
import { useAppDispatch, useAppSelector } from "@/hooks/useStore"

// Updated navigation items to match the image

type Navigation = {
  name: string
  href: string
  icon: any
}[]
export function DoctorMobileNav({ navigation }: { navigation: Navigation }) {
  const dispatch = useAppDispatch()
  const open = useAppSelector((state) => state.doctorSidebar.isDoctorSidebarOpen);

  // const [open, setIsOpen] = useState(doctorSidebar)
  const setIsOpen = (newOpenState: boolean) => {
    dispatch(setDoctorSidebarOpen(newOpenState));
  };
  const pathname = usePathname()

  return (
    <Sheet open={open} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="hidden bg-gray-200 rounded-full fixed top-16  left-0 z-50 text-bg-main"
        >
          <Sidebar className="h-6 w-6" />
          <span className="sr-only">Open Menu</span>
        </Button>
      </SheetTrigger>
      {/* Updated styling for SheetContent */}
      <SheetContent
        side="left"
        className="w-full p-0 bg-[#1A1D3A] text-white border-r-0 sm:w-80"
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6">
            <Link
              href="/doctor"
              className="text-3xl font-bold text-[#388fe5]"
              onClick={() => setIsOpen(false)}
            >
              NexgenEMR
            </Link>

          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2">
            {navigation.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center px-4 py-3 rounded-lg text-base font-medium transition-colors ${isActive
                      ? "bg-[#70C847] text-gray-900"
                      : "text-gray-400 hover:bg-white/10 hover:text-white"
                    }`}
                >
                  <item.icon
                    className={`h-5 w-5 mr-4 ${isActive ? "text-gray-900" : "text-gray-400"
                      }`}
                  />
                  {item.name}
                </Link>
              )
            })}
          </nav>

          {/* Profile Section */}
          <div className="p-4 mt-auto">
            <Link
              href="/doctor/profile"
              onClick={() => setIsOpen(false)}
              className="flex items-center space-x-3 p-2 rounded-lg hover:bg-white/10"
            >
              <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center text-gray-900 font-semibold">
                PM
              </div>
              <div>
                <p className="font-medium text-white">Prostual Marlyin</p>
              </div>
            </Link>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}