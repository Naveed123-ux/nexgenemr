"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Pill, HeartPulse, Activity } from "lucide-react";

// A small reusable component for each history section
const HistorySection = ({
  title,
  icon,
  items,
  color
}: {
  title: string;
  icon: React.ReactNode;
  items: string[];
  color: string;
}) => (
  <div className="space-y-3">
    <div className="flex items-center gap-2">
      <div className={`p-1.5 rounded-md ${color}`}>
        {icon}
      </div>
      <h4 className="font-semibold text-sm text-gray-900">{title}</h4>
    </div>
    <div className="flex flex-wrap gap-2 pl-8">
      {items.length > 0 ? (
        items.map((item, i) => (
          <Badge
            key={i}
            variant="outline"
            className="bg-white hover:bg-gray-50 border-gray-300"
          >
            {item}
          </Badge>
        ))
      ) : (
        <p className="text-sm text-gray-500 italic">None reported</p>
      )}
    </div>
  </div>
);

export const MedicalHistoryCard = ({ medicalHistory }: { medicalHistory: any }) => (
  <Card className="shadow-sm">
    <CardHeader className="bg-gradient-to-r from-[#388fe5]/10 to-transparent pb-3">
      <div className="flex items-center gap-2">
        <div className="p-2 bg-[#388fe5] rounded-lg">
          <Activity className="h-4 w-4 text-white" />
        </div>
        <CardTitle className="text-lg">Medical History</CardTitle>
      </div>
    </CardHeader>
    <CardContent className="space-y-5 pt-5">
      <HistorySection
        title="Allergies"
        icon={<AlertTriangle className="h-4 w-4 text-white" />}
        items={medicalHistory.allergies}
        color="bg-amber-500"
      />
      <div className="border-t border-gray-100" />
      <HistorySection
        title="Current Medications"
        icon={<Pill className="h-4 w-4 text-white" />}
        items={medicalHistory.current_medications}
        color="bg-blue-500"
      />
      <div className="border-t border-gray-100" />
      <HistorySection
        title="Past Medical History"
        icon={<HeartPulse className="h-4 w-4 text-white" />}
        items={medicalHistory.past_medical_history}
        color="bg-rose-500"
      />
    </CardContent>
  </Card>
);