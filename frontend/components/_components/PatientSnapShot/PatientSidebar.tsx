"use client";

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MedicalHistoryCard } from "./MedicalHistoryCard";
import { PatientTasks } from "./PatientTasks";
import { Mail, User2 } from "lucide-react";

export const PatientSidebar = ({ header, patientUserId }: { header: any; patientUserId: number }) => (
  <aside className="lg:col-span-1 space-y-6">
    <Card className="shadow-sm overflow-hidden">
      <div className="h-24 bg-gradient-to-br from-[#388fe5] to-[#6fb043]" />
      <CardContent className="-mt-12 pb-6">
        <div className="flex flex-col items-center">
          <Avatar className="h-24 w-24 border-4 border-white shadow-lg">
            <AvatarImage
              src={`https://api.dicebear.com/7.x/initials/svg?seed=${header.full_name}`}
              alt={header.full_name}
            />
            <AvatarFallback className="bg-[#388fe5] text-white text-2xl font-semibold">
              {header.full_name.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="mt-4 text-center space-y-2">
            <h2 className="text-2xl font-bold text-gray-900">{header.full_name}</h2>
            <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
              <Mail className="h-4 w-4" />
              <span>{header.email}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
    <MedicalHistoryCard medicalHistory={header.medical_history} />
    <PatientTasks patientUserId={patientUserId} />
  </aside>
);