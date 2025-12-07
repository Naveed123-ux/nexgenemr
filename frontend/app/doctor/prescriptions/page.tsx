"use client";

import { PrescriptionManager } from "@/components/prescriptions/PrescriptionManager";
import { Pill, FileText, Activity } from "lucide-react";

export default function DoctorPrescriptionsPage() {
  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-[#388fe5] rounded-xl shadow-lg">
              <Pill className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Prescription Management</h1>
          </div>
          <p className="text-gray-500 ml-14">Create and manage patient prescriptions</p>
        </div>
        <div className="hidden md:flex items-center gap-4">
          <div className="text-center px-4 py-2 bg-blue-50 rounded-lg">
            <FileText className="h-5 w-5 text-blue-600 mx-auto mb-1" />
            <p className="text-xs text-gray-600">Active Rx</p>
          </div>
          <div className="text-center px-4 py-2 bg-green-50 rounded-lg">
            <Activity className="h-5 w-5 text-[#388fe5] mx-auto mb-1" />
            <p className="text-xs text-gray-600">Today</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <PrescriptionManager />
    </div>
  );
}
