"use client";

import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/store/store";
import { fetchPatients } from "@/app/_apis/staff/receptionist";
import { fetchPrescriptions } from "@/store/slices/prescriptionSlice";
import { PatientProfile } from "@/hooks/types/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { PrescriptionForm } from "./PrescriptionForm";
import { PrescriptionList } from "./PrescriptionList";
import { InfinitySpin } from "react-loader-spinner";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, User, Calendar, Phone, Mail, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function PrescriptionManager() {
  const dispatch = useDispatch<AppDispatch>();
  const { prescriptions, status: prescriptionStatus } = useSelector(
    (state: RootState) => state.prescriptions
  );

  const [patients, setPatients] = useState<PatientProfile[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<PatientProfile | null>(
    null
  );
  const [patientQuery, setPatientQuery] = useState("");
  const [loadingPatients, setLoadingPatients] = useState(false);

  useEffect(() => {
    const loadPatients = async () => {
      setLoadingPatients(true);
      try {
        const result = await fetchPatients(patientQuery, 1);
        setPatients(result.data);
      } finally {
        setLoadingPatients(false);
      }
    };
    const handler = setTimeout(() => loadPatients(), 500);
    return () => clearTimeout(handler);
  }, [patientQuery]);

  useEffect(() => {
    if (selectedPatient) {
      dispatch(fetchPrescriptions(selectedPatient.user_id));
    }
  }, [selectedPatient, dispatch]);

  const handlePatientSelect = (value: string) => {
    const patient = patients.find((p) => p.profile_id.toString() === value);
    setSelectedPatient(patient || null);
  };

  return (
    <div className="space-y-6">
      {/* Patient Selection Card */}
      <Card className="shadow-lg border-2 border-gray-100">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-white border-b">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500 rounded-lg">
              <User className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-xl">Select Patient</CardTitle>
              <CardDescription>Search and select a patient to manage prescriptions</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-gray-700">Search Patient</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by name or ID..."
                  value={patientQuery}
                  onChange={(e) => setPatientQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              {loadingPatients && (
                <p className="text-xs text-gray-500 flex items-center gap-1">
                  <span className="animate-spin">⏳</span> Searching...
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-gray-700">Select from Results</Label>
              <Select onValueChange={handlePatientSelect}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Choose a patient" />
                </SelectTrigger>
                <SelectContent>
                  {loadingPatients ? (
                    <SelectItem value="loading" disabled>
                      Loading...
                    </SelectItem>
                  ) : patients.length === 0 ? (
                    <SelectItem value="none" disabled>
                      No patients found
                    </SelectItem>
                  ) : (
                    patients.map((p) => (
                      <SelectItem key={p.user_id} value={p.profile_id.toString()}>
                        {p.full_name} (ID: {p.user_id})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Selected Patient Info */}
          {selectedPatient && (
            <div className="mt-6 p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border border-green-200">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16 border-4 border-white shadow-lg">
                  <AvatarImage src={(selectedPatient as any).profile_picture_url} />
                  <AvatarFallback className="bg-[#388fe5] text-white text-lg font-bold">
                    {selectedPatient.full_name?.charAt(0) || 'P'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-900">{selectedPatient.full_name}</h3>
                  <div className="flex flex-wrap items-center gap-3 mt-1">
                    <Badge variant="outline" className="text-xs">
                      ID: {selectedPatient.user_id}
                    </Badge>
                    {(selectedPatient as any).date_of_birth && (
                      <span className="text-xs text-gray-600 flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {(selectedPatient as any).date_of_birth}
                      </span>
                    )}
                  </div>
                </div>
                <Badge className="bg-green-500 text-white">Selected</Badge>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedPatient && (
        <>
          <PrescriptionForm
            patientProfileId={selectedPatient.user_id}
            appointmentId={1} // NOTE: Replace with actual appointment ID logic
          />
          {prescriptionStatus === "loading" ? (
            <div className="flex justify-center">
              <InfinitySpin color="#388fe5" />
            </div>
          ) : (
            <PrescriptionList prescriptions={prescriptions} />
          )}
        </>
      )}
    </div>
  );
}
