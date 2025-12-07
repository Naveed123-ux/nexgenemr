"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import toast from "react-hot-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import {
  CalendarIcon,
  Loader2,
  CheckCircle2,
  Clock,
  User,
  ArrowLeft,
  ArrowRight,
  Video,
  MapPin
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getMyAvailableSlots } from "@/app/_apis/doctor/appointments";
import { privateApi } from "@/lib/axios";

interface Slot {
  id: number;
  start_time: string;
  end_time: string;
  duration: number;
  slot_type: string;
  modality: string;
}

interface AppointmentDetails {
  id: number;
  patient_name: string;
  start_time: string;
  end_time: string;
  is_telehealth: boolean;
  reason_for_visit: string;
  status: string;
}

function RescheduleAppointmentContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const appointmentId = searchParams.get("appointmentId");

  const [appointment, setAppointment] = useState<AppointmentDetails | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingAppointment, setLoadingAppointment] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);

  // Load appointment details
  useEffect(() => {
    if (!appointmentId) {
      toast.error("No appointment ID provided");
      router.push("/doctor/appointments");
      return;
    }

    loadAppointmentDetails();
  }, [appointmentId]);

  // Load slots when date changes
  useEffect(() => {
    if (selectedDate) {
      loadSlots(format(selectedDate, "yyyy-MM-dd"));
    }
  }, [selectedDate]);

  const loadAppointmentDetails = async () => {
    try {
      setLoadingAppointment(true);
      const response = await privateApi.get(`/appointments/appointment/${appointmentId}`);
      setAppointment(response.data);
    } catch (error) {
      toast.error("Failed to load appointment details");
      router.push("/doctor/appointments");
    } finally {
      setLoadingAppointment(false);
    }
  };

  const loadSlots = async (date: string) => {
    try {
      setLoadingSlots(true);
      const data = await getMyAvailableSlots(date);
      setSlots(data);
      if (data.length === 0) {
        toast.error("No available slots for this date");
      }
    } catch (error) {
      toast.error("Failed to load available slots");
      setSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleReschedule = async () => {
    if (!selectedSlot) {
      toast.error("Please select a time slot");
      return;
    }

    setLoading(true);
    let toastId;

    try {
      toastId = toast.loading("Rescheduling appointment...");

      await privateApi.put(`/appointments/appointment/${appointmentId}/reschedule`, {
        new_appointment_slot_id: selectedSlot.id
      });

      toast.success(
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5" />
          <div>
            <p className="font-semibold">Appointment rescheduled successfully!</p>
            <p className="text-sm text-gray-600">
              New time: {format(new Date(selectedSlot.start_time), "PPP 'at' p")}
            </p>
          </div>
        </div>,
        { id: toastId, duration: 5000 }
      );

      // Redirect back to appointments page
      setTimeout(() => {
        router.push("/doctor/appointments");
      }, 1500);
    } catch (error: any) {
      console.error("Error rescheduling appointment:", error);
      if (toastId) toast.dismiss(toastId);
      const errorMessage = error.response?.data?.detail || "Failed to reschedule appointment";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (dateString: string) => {
    return format(new Date(dateString), "h:mm a");
  };

  if (loadingAppointment) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-[#388fe5] mx-auto mb-4" />
          <p className="text-gray-600">Loading appointment details...</p>
        </div>
      </div>
    );
  }

  if (!appointment) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => router.push("/doctor/appointments")}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Appointments
          </Button>

          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-[#388fe5] rounded-lg">
              <CalendarIcon className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-3xl font-semibold text-gray-900">Reschedule Appointment</h1>
          </div>
          <p className="text-gray-600 ml-14">
            Select a new date and time for this appointment
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Current Appointment Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Current Appointment
              </CardTitle>
              <CardDescription>Details of the appointment to reschedule</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Patient Name */}
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">
                  Patient
                </p>
                <p className="text-lg font-semibold text-gray-900">
                  {appointment.patient_name}
                </p>
              </div>

              {/* Current Date & Time */}
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">
                  Current Date & Time
                </p>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-600" />
                  <p className="text-sm font-semibold text-gray-900">
                    {format(new Date(appointment.start_time), "PPP 'at' p")}
                  </p>
                </div>
              </div>

              {/* Appointment Type */}
              <div className="flex items-center gap-2">
                {appointment.is_telehealth ? (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-100 rounded-full">
                    <Video className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-700">Telehealth</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-100 rounded-full">
                    <MapPin className="w-4 h-4 text-[#388fe5]" />
                    <span className="text-sm font-medium text-green-700">In-Person</span>
                  </div>
                )}
                <Badge variant="outline">{appointment.status}</Badge>
              </div>

              {/* Reason for Visit */}
              <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">
                  Reason for Visit
                </p>
                <p className="text-sm text-gray-900 leading-relaxed">
                  {appointment.reason_for_visit}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* New Date & Time Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ArrowRight className="w-5 h-5" />
                Select New Date & Time
              </CardTitle>
              <CardDescription>Choose an available slot from your schedule</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Date Picker */}
              <div>
                <label className="text-sm font-medium mb-2 block">New Date *</label>
                <div className="flex justify-center">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                    className="rounded-md border"
                  />
                </div>
              </div>

              {/* Slot Selection */}
              {selectedDate && (
                <div>
                  <label className="text-sm font-medium mb-2 block">Available Time Slots *</label>
                  {loadingSlots ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-[#388fe5]" />
                      <span className="ml-2">Loading available slots...</span>
                    </div>
                  ) : slots.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 border rounded-lg">
                      No available slots for this date
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3 max-h-[300px] overflow-y-auto">
                      {slots.map((slot) => (
                        <button
                          key={slot.id}
                          type="button"
                          onClick={() => setSelectedSlot(slot)}
                          className={cn(
                            "p-3 rounded-lg border-2 transition-all text-center hover:border-[#388fe5]",
                            selectedSlot?.id === slot.id
                              ? "border-[#388fe5] bg-[#388fe5]/10"
                              : "border-gray-200"
                          )}
                        >
                          <div className="font-semibold text-sm">
                            {formatTime(slot.start_time)}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {slot.duration} min
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Selected Slot Display */}
              {selectedSlot && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">
                    New Appointment Time
                  </p>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#388fe5]" />
                    <p className="text-sm font-semibold text-gray-900">
                      {format(new Date(selectedSlot.start_time), "PPP 'at' p")}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-4 mt-6 sticky bottom-0 bg-gray-50 py-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/doctor/appointments")}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleReschedule}
            disabled={!selectedSlot || loading}
            size="lg"
            className="bg-[#388fe5] hover:bg-[#6fb043]"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {loading ? "Rescheduling..." : "Confirm Reschedule"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function RescheduleAppointment() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-[#388fe5] mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <RescheduleAppointmentContent />
    </Suspense>
  );
}
