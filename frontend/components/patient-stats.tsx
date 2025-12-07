"use client";

import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/store/store";
import { fetchPatientSnapshot } from "@/store/slices/patientSnapshotSlice";
import { resetSynopsis } from "@/store/slices/patientSynopsisSlice";

// Import the newly created components
import { LoadingState } from "./_components/PatientSnapShot/LoadingState";
import { ErrorState } from "./_components/PatientSnapShot/ErrorState";
import { PatientSidebar } from "./_components/PatientSnapShot/PatientSidebar";
import { JourneyTimeline } from "./_components/PatientSnapShot/JourneyTimeline";
import { PatientSynopsis } from "./PatientSynopsis";
import { PatientPrescriptions } from "./_components/PatientSnapShot/PatientPrescriptions";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WaitlistManagementPanel } from "./waitlist/waitlist-management-panel";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface PatientSnapshotProps {
  id: string | number;
}

const PatientSnapshot: React.FC<PatientSnapshotProps> = ({ id }) => {
  const dispatch = useDispatch<AppDispatch>();
  const patientId = Number(id);

  const { data, status, error } = useSelector(
    (state: RootState) => state.patientSnapshot
  );
  
  // Get user info to determine if waitlist tab should be shown
  const authState = useSelector((state: RootState) => state.auth);
  
  // Doctors have specialization field, staff have job_title field
  // Only show waitlist tab to staff (not doctors)
  const isDoctor = !!authState.specialization;
  const isStaff = !!authState.job_title;
  
  // Show waitlist tab if user is staff (has job_title) and not a doctor (no specialization)
  // Also show by default if we can't determine (to avoid hiding from staff accidentally)
  const canManageWaitlist = isStaff || (!isDoctor && !isStaff);
  
  // Debug logging (remove in production)
  console.log('Waitlist Tab Visibility Check:', {
    isDoctor,
    isStaff,
    canManageWaitlist,
    job_title: authState.job_title,
    specialization: authState.specialization
  });

  useEffect(() => {
    if (patientId) {
      // Reset synopsis state when the patient ID changes to avoid showing old data
      dispatch(resetSynopsis());
      // Fetch the main snapshot data
      dispatch(fetchPatientSnapshot(patientId));
    }
  }, [dispatch, patientId]);

  if (status === "loading" || status === "idle") {
    return <LoadingState />;
  }

  if (status === "failed") {
    return <ErrorState error={error || "An unknown error occurred."} />;
  }

  return (
    <div className="p-4 md:p-6 bg-slate-50 min-h-screen">
      {data ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
          <PatientSidebar header={data.header} patientUserId={patientId} />
          <main className="lg:col-span-2 space-y-6">
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className={`grid w-full ${canManageWaitlist ? 'grid-cols-4' : 'grid-cols-3'}`}>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="journey">Journey</TabsTrigger>
                <TabsTrigger value="prescriptions">Prescriptions</TabsTrigger>
                {canManageWaitlist && (
                  <TabsTrigger value="waitlist">Waitlist</TabsTrigger>
                )}
              </TabsList>
              
              <TabsContent value="overview" className="space-y-6 mt-6">
                <PatientSynopsis patientId={patientId} />
              </TabsContent>
              
              <TabsContent value="journey" className="mt-6">
                <JourneyTimeline journey={data.journey} />
              </TabsContent>
              
              <TabsContent value="prescriptions" className="mt-6">
                <PatientPrescriptions patientProfileId={patientId}/>
              </TabsContent>
              
              {canManageWaitlist && (
                <TabsContent value="waitlist" className="mt-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Patient Waitlist</CardTitle>
                      <CardDescription>
                        View and manage this patient's waitlist entries for appointments
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <WaitlistManagementPanel patientId={patientId} />
                    </CardContent>
                  </Card>
                </TabsContent>
              )}
            </Tabs>
          </main>
        </div>
      ) : (
        <div className="text-center py-20 text-slate-500">
          No data available for this patient.
        </div>
      )}
    </div>
  );
};

export default PatientSnapshot;