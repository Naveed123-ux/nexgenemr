// src/app/dashboard/patients/page.tsx (or your component file)

"use client";

import React, { useEffect, useMemo } from "react";
import { useSelector, useDispatch } from "react-redux";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation"; // <-- 1. ADD THIS IMPORT

// State Management & Utils
import { AppDispatch, RootState } from "@/store/store";
import { createColumnsFromData, DynamicData } from "@/lib/tableUtils";

// UI Components
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  flexRender,
  ColumnDef,
} from "@tanstack/react-table";
import { InfinitySpin } from "react-loader-spinner";
import { fetchAllstaff } from "@/store/slices/staffSlice";
import PatientTable from "@/components/patientTable";
import PatientCards from "@/components/PatientCards";

// --- Sub-Components for Clarity ---

const LoadingState = () => (
  <div className="flex items-center justify-center h-80">
    <InfinitySpin width="200" color="#388fe5" aria-label="loading-data" />
  </div>
);

const ErrorState = ({ error }: { error: string }) => (
  <div className="text-center py-10 px-4">
    <p className="text-red-500 font-semibold">Failed to load data</p>
    <p className="text-gray-500 text-sm mt-1">{error}</p>
  </div>
);

const EmptyState = () => (
  <div className="text-center py-10 text-gray-500">
    <p>No records found.</p>
  </div>
);


// --- Main Dashboard Component ---

export default function PatientsDashboard() {
  const dispatch = useDispatch<AppDispatch>();
  const {
    data: patients,
    status,
    error,
  } = useSelector((state: RootState) => state.staffSidePatients);

  useEffect(() => {
    if (status === "idle") {
      dispatch(fetchAllstaff());
    }
  }, [status, dispatch]);

  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  const columns = useMemo(() => createColumnsFromData(patients), [patients]);

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
    return <PatientTable link="staff/patient-stats" data={patients} columns={columns} />;
  };

  return (
    <div className="p-4 md:p-6 w-full">
      <Card className="bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-gray-800">
            Tracker Dashboard {/* Changed title for clarity */}
          </CardTitle>
        </CardHeader>
        <CardContent>{renderContent()}</CardContent>
      </Card>
    </div>
  );
}