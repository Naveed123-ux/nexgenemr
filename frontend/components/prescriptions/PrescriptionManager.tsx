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
import { Search, User, Calendar, Phone, Mail, MapPin, Loader2, CheckCircle2, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { privateApi } from "@/lib/axios";
import { format } from "date-fns";

interface Appointment {
  id: number;
  patient_profile_id: number;
  doctor_user_id: number;
  doctor_name: string;
  start_time: string;
  end_time: string;
  status: string;
  reason_for_visit: string;
}

export function PrescriptionManager() {
  const dispatch = useDispatch<AppDispatch>();
  const { prescriptions, status: prescriptionStatus } = useSelector(
    (state: RootState) => state.prescriptions
  );
  const auth = useSelector((state: RootState) => state.auth);

  const [patients, setPatients] = useState<PatientProfile[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<PatientProfile | null>(
    null
  );
  const [patientQuery, setPatientQuery] = useState("");
  const [loadingPatients, setLoadingPatients] = useState(false);

  // Appointment states
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<number | null>(null);
  const [loadingAppointments, setLoadingAppointments] = useState(false);

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
      loadPatientAppointments(selectedPatient.profile_id);
    } else {
      setAppointments([]);
      setSelectedAppointmentId(null);
    }
  }, [selectedPatient, dispatch]);

  const loadPatientAppointments = async (profileId: number) => {
    try {
      setLoadingAppointments(true);
      const response = await privateApi.get(`/appointments/patient/${profileId}/appointments?include_past=true`);
      setAppointments(response.data);

      // Auto-select the most recent appointment if any
      if (response.data.length > 0) {
        // Sort by start_time descending
        const sorted = [...response.data].sort((a: Appointment, b: Appointment) =>
          new Date(b.start_time).getTime() - new Date(a.start_time).getTime()
        );
        setSelectedAppointmentId(sorted[0].id);
      }
    } catch (error) {
      console.error("Failed to load appointments", error);
    } finally {
      setLoadingAppointments(false);
    }
  };

  const handlePatientSelect = (value: string) => {
    const patient = patients.find((p) => p.profile_id.toString() === value);
    setSelectedPatient(patient || null);
  };

  const handleAppointmentSelect = (value: string) => {
    setSelectedAppointmentId(parseInt(value));
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
                  <Loader2 className="h-3 w-3 animate-spin" /> Searching...
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-6">
            <Card className="shadow-lg border-2 border-gray-100">
              <CardHeader className="bg-blue-50/50 border-b py-4">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-blue-500" />
                  <CardTitle className="text-base">Select Appointment</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                {loadingAppointments ? (
                  <div className="flex flex-col items-center py-8 space-y-2">
                    <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
                    <p className="text-sm text-gray-500">Loading visits...</p>
                  </div>
                ) : appointments.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-sm text-gray-500">No appointments found.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Choose a visit</Label>
                    <Select value={selectedAppointmentId?.toString()} onValueChange={handleAppointmentSelect}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select an appointment" />
                      </SelectTrigger>
                      <SelectContent>
                        {appointments.map((appt) => (
                          <SelectItem key={appt.id} value={appt.id.toString()}>
                            <div className="flex flex-col items-start gap-0.5">
                              <span className="font-medium">{format(new Date(appt.start_time), "MMM d, yyyy")}</span>
                              <span className="text-xs text-xs text-gray-500">
                                {appt.doctor_user_id === auth.id ? "Me" : appt.doctor_name} - {appt.status}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {selectedAppointmentId && (
                      <div className="mt-4 p-3 rounded-lg bg-gray-50 border border-gray-100 space-y-2">
                        {appointments.find(a => a.id === selectedAppointmentId) && (
                          <>
                            <div className="flex items-center gap-2 text-xs font-medium text-gray-600">
                              <Clock className="h-3 w-3" />
                              {format(new Date(appointments.find(a => a.id === selectedAppointmentId)!.start_time), "p")}
                            </div>
                            <div className="text-xs text-gray-700 italic line-clamp-2">
                              "{appointments.find(a => a.id === selectedAppointmentId)!.reason_for_visit}"
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-2 space-y-6">
            {selectedAppointmentId ? (
              <PrescriptionForm
                patientProfileId={selectedPatient.user_id}
                appointmentId={selectedAppointmentId}
              />
            ) : (
              <Card className="border-dashed border-2 flex items-center justify-center p-12 bg-gray-50/50">
                <div className="text-center space-y-3">
                  <div className="inline-flex p-3 bg-blue-50 rounded-full">
                    <Calendar className="h-6 w-6 text-blue-400" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900">Select an Appointment First</h4>
                    <p className="text-xs text-gray-500 mt-1">Choose a visit from the left to start writing a prescription.</p>
                  </div>
                </div>
              </Card>
            )}

            {prescriptionStatus === "loading" ? (
              <div className="flex justify-center py-10">
                <InfinitySpin width="150" color="#388fe5" />
              </div>
            ) : (
              <PrescriptionList prescriptions={prescriptions} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
