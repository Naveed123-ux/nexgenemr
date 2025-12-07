// src/components/PatientCards.tsx

"use client";

import React, { useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";

// State Management & Utils
import { AppDispatch, RootState } from "@/store/store";
import { fetchAllPatientsList } from "@/store/slices/allPatientsSlice";
import { PatientListItem } from "@/hooks/types/types";

// UI Components
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { User, Stethoscope, Clock, AlertCircle } from "lucide-react";

// --- Sub-Components for Clarity ---

const LoadingState = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    {Array.from({ length: 6 }).map((_, i) => (
      <Skeleton key={i} className="h-48 w-full" />
    ))}
  </div>
);

const ErrorState = ({ error }: { error: string }) => (
  <div className="text-center py-10 px-4 col-span-full">
    <p className="text-red-500 font-semibold">Failed to load patient data</p>
    <p className="text-gray-500 text-sm mt-1">{error}</p>
  </div>
);

const EmptyState = () => (
  <div className="text-center py-10 text-gray-500 col-span-full">
    <p>No patient records found.</p>
  </div>
);

const getLengthOfStayColor = (value: string): string => {
  const hours = parseInt(value.replace(/[^0-9]/g, ""));
  if (isNaN(hours)) return "bg-gray-100 text-gray-800";
  if (hours < 200) return "bg-green-100 text-green-800";
  if (hours >= 200 && hours < 400) return "bg-yellow-100 text-yellow-800";
  return "bg-red-100 text-red-800";
};

const PatientCard = ({ patient, link }: { patient: PatientListItem; link: string }) => {
  const router = useRouter();

  const handleCardClick = () => {
    router.push(`/${link}/${patient.patientID}`);
  };

  return (
    <Card onClick={handleCardClick} className="cursor-pointer hover:shadow-lg transition-shadow duration-300">
      <CardHeader>
        <div className="flex justify-between items-start">
            <div>
                <CardTitle className="text-lg flex items-center gap-2">
                <User className="w-5 h-5 text-gray-500" />
                {patient.patient_name}
                </CardTitle>
                <Badge variant="outline" className="mt-2">{patient.visit_status}</Badge>
            </div>
            <Badge className={getLengthOfStayColor(patient.length_of_stay)}>
                <Clock className="w-3 h-3 mr-1" />
                {patient.length_of_stay}
            </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="flex items-center text-gray-600">
            <Stethoscope className="w-4 h-4 mr-2" />
            <span>Assigned MD: <strong>{patient.assigned_md}</strong></span>
        </div>
        {patient.chief_complaint &&
            <div className="flex items-start text-gray-600">
                <AlertCircle className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                <span>Chief Complaint: <strong>{patient.chief_complaint}</strong></span>
            </div>
        }
         {patient.bay_or_room &&
            <div className="flex items-start text-gray-600">
                <span>Bay/Room: <strong>{patient.bay_or_room}</strong></span>
            </div>
        }
      </CardContent>
    </Card>
  );
};

// --- Main Component ---

export default function PatientCards({ link }: { link: string }) {
  const dispatch = useDispatch<AppDispatch>();
  const {
    data: patients,
    status,
    error,
  } = useSelector((state: RootState) => state.allPatients);

  useEffect(() => {
    if (status === "idle") {
      dispatch(fetchAllPatientsList());
    }
  }, [status, dispatch]);

  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  const renderContent = () => {
    if (status === "loading" || status === "idle") {
      return <LoadingState />;
    }
    if (status === "failed") {
      return <ErrorState error={error!} />;
    }
    if (status === "succeeded" && (!patients || patients.length === 0)) {
      return <EmptyState />;
    }
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {(patients as PatientListItem[]).map((patient) => (
          <PatientCard key={patient.patientID} patient={patient} link={link} />
        ))}
      </div>
    );
  };

  return (
     <div className="mt-8">
      <h2 className="text-2xl font-semibold text-gray-800 mb-6">All Patients</h2>
      {renderContent()}
    </div>
  );
}
