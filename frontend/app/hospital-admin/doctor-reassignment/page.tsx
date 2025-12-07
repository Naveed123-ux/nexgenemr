"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import toast from "react-hot-toast";
import { format, parseISO, isSameDay, startOfDay } from "date-fns";
import {
  CalendarIcon,
  UserIcon,
  ClockIcon,
  MapPinIcon,
  VideoIcon,
  ArrowRightIcon,
  SearchIcon,
  RefreshCwIcon,
  CheckCircle2Icon,
  AlertCircleIcon,
  UsersIcon,
  StethoscopeIcon,
  FilterIcon,
  ArrowLeftRight,
} from "lucide-react";
import { InfinitySpin } from "react-loader-spinner";

import {
  getAllDoctors,
  getDoctorAppointments,
  getAvailableSlots,
  reassignAppointmentDoctor,
  getDoctorStatistics,
  type Doctor,
  type Appointment,
  type AppointmentSlot,
} from "@/app/_apis/hospital_Admin/doctorReassignment";

export default function DoctorReassignmentPage() {
  // State management
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [newDoctor, setNewDoctor] = useState<Doctor | null>(null);
  const [availableSlots, setAvailableSlots] = useState<AppointmentSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<AppointmentSlot | null>(null);
  const [reason, setReason] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [includePast, setIncludePast] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [doctorStats, setDoctorStats] = useState<any>(null);

  // Load doctors on mount
  useEffect(() => {
    loadDoctors();
  }, []);

  // Load appointments when doctor or filter changes
  useEffect(() => {
    if (selectedDoctor) {
      loadAppointments();
    }
  }, [selectedDoctor, includePast]);

  const loadDoctors = async () => {
    try {
      setLoading(true);
      const allDoctors = await getAllDoctors();
      setDoctors(allDoctors);
    } catch (error: any) {
      toast.error(error.response?.data?.detail || error.message || "Failed to load doctors");
    } finally {
      setLoading(false);
    }
  };

  const loadAppointments = async () => {
    if (!selectedDoctor) return;

    try {
      setLoading(true);
      const doctorAppointments = await getDoctorAppointments(
        selectedDoctor.user_id,
        includePast
      );

      // Sort appointments by date (earliest first)
      const sortedAppointments = doctorAppointments.sort((a, b) =>
        new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
      );

      setAppointments(sortedAppointments);
    } catch (error: any) {
      toast.error(error.response?.data?.detail || error.message || "Failed to load appointments");
    } finally {
      setLoading(false);
    }
  };

  const loadDoctorStats = async (doctorId: number) => {
    try {
      const stats = await getDoctorStatistics(doctorId);
      setDoctorStats(stats);
    } catch (error) {
      console.error("Failed to load doctor stats:", error);
    }
  };

  const handleDoctorSelect = (doctor: Doctor) => {
    setSelectedDoctor(doctor);
    setSelectedAppointment(null);
    setNewDoctor(null);
    setSelectedSlot(null);
    setReason("");
    loadDoctorStats(doctor.user_id);
  };

  const handleAppointmentSelect = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setNewDoctor(null);
    setSelectedSlot(null);
  };

  const handleNewDoctorSelect = async (doctor: Doctor) => {
    setNewDoctor(doctor);
    setSelectedSlot(null);

    // Load available slots for the new doctor on the appointment date
    if (selectedAppointment) {
      try {
        setLoading(true);
        const appointmentDate = format(parseISO(selectedAppointment.start_time), "yyyy-MM-dd");
        const slots = await getAvailableSlots(doctor.user_id, appointmentDate);
        setAvailableSlots(slots);
      } catch (error: any) {
        toast.error(error.response?.data?.detail || error.message || "Failed to load available slots");
        setAvailableSlots([]);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleReassign = async () => {
    if (!selectedAppointment || !newDoctor) return;

    try {
      setLoading(true);
      const response = await reassignAppointmentDoctor(selectedAppointment.id, {
        new_doctor_user_id: newDoctor.user_id,
        reason: reason || undefined,
      });

      toast.success(`${response.patient_name}'s appointment has been reassigned to ${response.new_doctor.name}`);

      // Reset and reload
      setShowConfirmDialog(false);
      setSelectedAppointment(null);
      setNewDoctor(null);
      setSelectedSlot(null);
      setReason("");
      loadAppointments();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || error.message || "Failed to reassign appointment");
    } finally {
      setLoading(false);
    }
  };

  const filteredDoctors = doctors.filter(
    (doc) =>
      doc.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.last_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.specialization.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const availableNewDoctors = doctors.filter(
    (doc) => selectedDoctor && doc.user_id !== selectedDoctor.user_id
  );

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Doctor Appointment Reassignment</h1>
            <p className="text-gray-600 mt-1">
              Manage and reassign appointments between doctors
            </p>
          </div>
          <Button
            onClick={loadDoctors}
            className="bg-[#388fe5] hover:bg-[#6fb043] text-white"
          >
            <RefreshCwIcon className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Progress Indicator */}
        <div className="mt-6 flex items-center justify-between max-w-3xl mx-auto">
          <div className="flex items-center space-x-2">
            <div
              className={`flex items-center justify-center w-10 h-10 rounded-full ${selectedDoctor ? "bg-[#388fe5] text-white" : "bg-gray-200 text-gray-600"
                }`}
            >
              {selectedDoctor ? <CheckCircle2Icon className="h-5 w-5" /> : "1"}
            </div>
            <span className={`font-medium text-sm ${selectedDoctor ? "text-gray-900" : "text-gray-500"}`}>
              Select Doctor
            </span>
          </div>
          <div className="flex-1 h-1 bg-gray-200 mx-3">
            <div
              className={`h-full transition-all ${selectedDoctor ? "bg-[#388fe5]" : ""}`}
              style={{ width: selectedDoctor ? "100%" : "0%" }}
            />
          </div>
          <div className="flex items-center space-x-2">
            <div
              className={`flex items-center justify-center w-10 h-10 rounded-full ${selectedAppointment ? "bg-[#388fe5] text-white" : "bg-gray-200 text-gray-600"
                }`}
            >
              {selectedAppointment ? <CheckCircle2Icon className="h-5 w-5" /> : "2"}
            </div>
            <span className={`font-medium text-sm ${selectedAppointment ? "text-gray-900" : "text-gray-500"}`}>
              Select Appointment
            </span>
          </div>
          <div className="flex-1 h-1 bg-gray-200 mx-3">
            <div
              className={`h-full transition-all ${selectedAppointment ? "bg-[#388fe5]" : ""}`}
              style={{ width: selectedAppointment ? "100%" : "0%" }}
            />
          </div>
          <div className="flex items-center space-x-2">
            <div
              className={`flex items-center justify-center w-10 h-10 rounded-full ${newDoctor ? "bg-[#388fe5] text-white" : "bg-gray-200 text-gray-600"
                }`}
            >
              {newDoctor ? <CheckCircle2Icon className="h-5 w-5" /> : "3"}
            </div>
            <span className={`font-medium text-sm ${newDoctor ? "text-gray-900" : "text-gray-500"}`}>
              Reassign
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Step 1: Select Doctor */}
        <Card className="bg-white shadow">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-gray-900">Step 1: Select Doctor</CardTitle>
            <CardDescription>Choose a doctor to view their appointments</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="relative">
                <SearchIcon className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search doctors..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              {loading && !selectedDoctor ? (
                <div className="flex items-center justify-center py-12">
                  <InfinitySpin width="150" color="#388fe5" />
                </div>
              ) : (
                <ScrollArea className="h-[500px] pr-4">
                  <div className="space-y-2">
                    {filteredDoctors.map((doctor) => (
                      <div
                        key={doctor.user_id}
                        className={`cursor-pointer transition-all rounded-lg border p-4 hover:shadow-md ${selectedDoctor?.user_id === doctor.user_id
                            ? "border-[#388fe5] bg-green-50"
                            : "border-gray-200 hover:border-gray-300"
                          }`}
                        onClick={() => handleDoctorSelect(doctor)}
                      >
                        <div className="flex items-start space-x-3">
                          <Avatar className="h-12 w-12">
                            <AvatarImage src={doctor.profile_picture_url || undefined} />
                            <AvatarFallback className="bg-[#388fe5] text-white">
                              {doctor.first_name[0]}
                              {doctor.last_name[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-900 truncate">
                              Dr. {doctor.first_name} {doctor.last_name}
                            </p>
                            <p className="text-sm text-gray-600 truncate">
                              {doctor.specialization}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              {doctor.department_name}
                            </p>
                          </div>
                          {selectedDoctor?.user_id === doctor.user_id && (
                            <CheckCircle2Icon className="h-5 w-5 text-[#388fe5] flex-shrink-0" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Step 2: Select Appointment */}
        <Card className="lg:col-span-2 bg-white shadow">
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <CardTitle className="text-xl font-semibold text-gray-900">Step 2: Select Appointment</CardTitle>
                <CardDescription className="mt-1">
                  {selectedDoctor
                    ? `Viewing ${includePast ? "all" : "upcoming"} appointments for Dr. ${selectedDoctor.first_name} ${selectedDoctor.last_name}`
                    : "Select a doctor to view appointments"}
                </CardDescription>
              </div>
              {selectedDoctor && (
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-sm">
                    {appointments.length} {appointments.length === 1 ? "appointment" : "appointments"}
                  </Badge>
                  <Button
                    variant={includePast ? "default" : "outline"}
                    size="sm"
                    onClick={() => setIncludePast(!includePast)}
                    className={includePast ? "bg-[#388fe5] hover:bg-[#6fb043]" : ""}
                  >
                    <FilterIcon className="h-4 w-4 mr-2" />
                    {includePast ? "All" : "Upcoming"}
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {!selectedDoctor ? (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <UsersIcon className="h-16 w-16 text-gray-400 mb-4" />
                <p className="text-lg font-semibold text-gray-900">No Doctor Selected</p>
                <p className="text-sm text-gray-600 mt-2">
                  Please select a doctor from the list to view their appointments
                </p>
              </div>
            ) : loading ? (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <InfinitySpin width="150" color="#388fe5" />
                <p className="text-sm text-gray-600 mt-4">Loading appointments...</p>
              </div>
            ) : appointments.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <AlertCircleIcon className="h-16 w-16 text-gray-400 mb-4" />
                <p className="text-lg font-semibold text-gray-900">No Appointments Found</p>
                <p className="text-sm text-gray-600 mt-2">
                  {includePast
                    ? "This doctor has no appointments scheduled"
                    : "This doctor has no upcoming appointments"}
                </p>
              </div>
            ) : (
              <ScrollArea className="h-[500px]">
                <div className="space-y-4">
                  {appointments.reduce((acc, appointment, index, arr) => {
                    const appointmentDate = startOfDay(parseISO(appointment.start_time));
                    const prevAppointment = index > 0 ? arr[index - 1] : null;
                    const prevDate = prevAppointment
                      ? startOfDay(parseISO(prevAppointment.start_time))
                      : null;

                    // Add date header if this is a new date
                    if (!prevDate || !isSameDay(appointmentDate, prevDate)) {
                      acc.push(
                        <div key={`date-${appointment.id}`} className="sticky top-0 bg-white z-10 py-2">
                          <div className="flex items-center gap-2 bg-gray-50 p-2 rounded">
                            <CalendarIcon className="h-4 w-4 text-[#388fe5]" />
                            <h3 className="font-semibold text-sm text-gray-900">
                              {format(appointmentDate, "EEEE, MMMM d, yyyy")}
                            </h3>
                          </div>
                        </div>
                      );
                    }

                    // Add appointment card
                    acc.push(
                      <div
                        key={appointment.id}
                        className={`cursor-pointer transition-all rounded-lg border p-4 hover:shadow-md ${selectedAppointment?.id === appointment.id
                            ? "border-[#388fe5] bg-green-50"
                            : "border-gray-200 hover:border-gray-300"
                          }`}
                        onClick={() => handleAppointmentSelect(appointment)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="space-y-2 flex-1">
                            <div className="flex items-center space-x-2 flex-wrap gap-2">
                              <UserIcon className="h-4 w-4 text-gray-500" />
                              <span className="font-semibold text-gray-900">{appointment.patient_name}</span>
                              <Badge
                                variant={appointment.is_telehealth ? "default" : "secondary"}
                                className={appointment.is_telehealth ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-800"}
                              >
                                {appointment.is_telehealth ? (
                                  <>
                                    <VideoIcon className="h-3 w-3 mr-1" />
                                    Telehealth
                                  </>
                                ) : (
                                  <>
                                    <MapPinIcon className="h-3 w-3 mr-1" />
                                    In-Person
                                  </>
                                )}
                              </Badge>
                              <Badge variant="outline">{appointment.status}</Badge>
                            </div>
                            <div className="flex items-center text-sm text-gray-600">
                              <ClockIcon className="h-4 w-4 mr-1" />
                              {format(parseISO(appointment.start_time), "h:mm a")} - {format(parseISO(appointment.end_time), "h:mm a")}
                            </div>
                            {appointment.reason_for_visit && (
                              <p className="text-sm text-gray-600">
                                <span className="font-medium">Reason:</span> {appointment.reason_for_visit}
                              </p>
                            )}
                          </div>
                          {selectedAppointment?.id === appointment.id && (
                            <CheckCircle2Icon className="h-5 w-5 text-[#388fe5] flex-shrink-0" />
                          )}
                        </div>
                      </div>
                    );

                    return acc;
                  }, [] as React.ReactNode[])}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Step 3 & 4: Select New Doctor and Confirm */}
      {selectedAppointment && (
        <Card className="bg-white shadow">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-gray-900">Step 3: Select New Doctor & Confirm Reassignment</CardTitle>
            <CardDescription>
              Choose a new doctor and provide a reason for the reassignment
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-6">
              {/* Select New Doctor */}
              <div className="space-y-2">
                <Label htmlFor="new-doctor" className="text-gray-900 font-medium">Select New Doctor</Label>
                <Select
                  value={newDoctor?.user_id.toString()}
                  onValueChange={(value) => {
                    const doctor = availableNewDoctors.find((d) => d.user_id === parseInt(value));
                    if (doctor) handleNewDoctorSelect(doctor);
                  }}
                >
                  <SelectTrigger id="new-doctor">
                    <SelectValue placeholder="Choose a doctor to reassign to" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableNewDoctors.map((doctor) => (
                      <SelectItem key={doctor.user_id} value={doctor.user_id.toString()}>
                        Dr. {doctor.first_name} {doctor.last_name} - {doctor.specialization}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Show Available Slots */}
              {newDoctor && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-gray-900 font-medium">Available Time Slots on {format(parseISO(selectedAppointment.start_time), "MMMM d, yyyy")}</Label>
                    {loading && <RefreshCwIcon className="h-4 w-4 animate-spin text-gray-400" />}
                  </div>

                  {availableSlots.length === 0 ? (
                    <div className="p-4 border border-gray-200 rounded-lg bg-gray-50 text-center">
                      <AlertCircleIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-600">
                        No available slots found for this doctor on this date.
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        The appointment will keep its current time slot.
                      </p>
                    </div>
                  ) : (
                    <div className="border border-gray-200 rounded-lg p-4 space-y-2 max-h-48 overflow-y-auto bg-gray-50">
                      <p className="text-sm text-gray-600 mb-3">
                        {availableSlots.length} available {availableSlots.length === 1 ? "slot" : "slots"} found
                      </p>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {availableSlots.map((slot) => (
                          <Button
                            key={slot.id}
                            variant={selectedSlot?.id === slot.id ? "default" : "outline"}
                            size="sm"
                            onClick={() => setSelectedSlot(slot)}
                            className={selectedSlot?.id === slot.id ? "bg-[#388fe5] hover:bg-[#6fb043]" : "hover:bg-white"}
                          >
                            <ClockIcon className="h-3 w-3 mr-2" />
                            {format(parseISO(slot.start_time), "h:mm a")}
                          </Button>
                        ))}
                      </div>
                      {selectedSlot && (
                        <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded text-sm">
                          <p className="font-medium text-gray-900">Selected Time:</p>
                          <p className="text-gray-700">{format(parseISO(selectedSlot.start_time), "h:mm a")} - {format(parseISO(selectedSlot.end_time), "h:mm a")}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Reason for Reassignment */}
              <div className="space-y-2">
                <Label htmlFor="reason" className="text-gray-900 font-medium">Reason for Reassignment (Optional)</Label>
                <Textarea
                  id="reason"
                  placeholder="e.g., Dr. Smith is on emergency leave"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                />
              </div>
            </div>

            {newDoctor && (
              <div className="p-4 bg-green-50 rounded-lg border border-green-200 space-y-3">
                <h4 className="font-semibold text-gray-900">Reassignment Summary</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                  <div>
                    <p className="text-gray-600">Patient</p>
                    <p className="font-semibold text-gray-900">{selectedAppointment.patient_name}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">From Doctor</p>
                    <p className="font-semibold text-gray-900">{selectedAppointment.doctor_name}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">To Doctor</p>
                    <p className="font-semibold text-[#388fe5]">
                      Dr. {newDoctor.first_name} {newDoctor.last_name}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600">Current Time</p>
                    <p className="font-semibold text-gray-900">
                      {format(parseISO(selectedAppointment.start_time), "PPP 'at' h:mm a")}
                    </p>
                  </div>
                  {selectedSlot && (
                    <div>
                      <p className="text-gray-600">New Time</p>
                      <p className="font-semibold text-[#388fe5]">
                        {format(parseISO(selectedSlot.start_time), "PPP 'at' h:mm a")}
                      </p>
                    </div>
                  )}
                  <div>
                    <p className="text-gray-600">Type</p>
                    <p className="font-semibold text-gray-900">
                      {selectedAppointment.is_telehealth ? "Telehealth" : "In-Person"}
                    </p>
                  </div>
                </div>
                {!selectedSlot && availableSlots.length > 0 && (
                  <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 p-3 rounded border border-amber-200">
                    <AlertCircleIcon className="h-4 w-4 flex-shrink-0" />
                    <span>No time slot selected. The appointment will keep its current time.</span>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end space-x-3">
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedAppointment(null);
                  setNewDoctor(null);
                  setReason("");
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={() => setShowConfirmDialog(true)}
                disabled={!newDoctor || loading}
                className="bg-[#388fe5] hover:bg-[#6fb043] text-white"
              >
                Reassign Appointment
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-gray-900">Confirm Appointment Reassignment</DialogTitle>
            <DialogDescription className="text-gray-600">
              Are you sure you want to reassign this appointment? This action will:
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <div className="flex items-start gap-3">
                <CheckCircle2Icon className="h-5 w-5 text-[#388fe5] flex-shrink-0 mt-0.5" />
                <p className="text-sm text-gray-700">
                  Update the appointment's assigned doctor to <strong className="text-gray-900">Dr. {newDoctor?.first_name} {newDoctor?.last_name}</strong>
                </p>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2Icon className="h-5 w-5 text-[#388fe5] flex-shrink-0 mt-0.5" />
                <p className="text-sm text-gray-700">
                  {selectedSlot ? (
                    <>Change appointment time to <strong className="text-gray-900">{format(parseISO(selectedSlot.start_time), "h:mm a")}</strong></>
                  ) : (
                    "Keep the current appointment time"
                  )}
                </p>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2Icon className="h-5 w-5 text-[#388fe5] flex-shrink-0 mt-0.5" />
                <p className="text-sm text-gray-700">Send email notifications to the patient, previous doctor, and new doctor</p>
              </div>
              {selectedAppointment?.is_telehealth && (
                <div className="flex items-start gap-3">
                  <CheckCircle2Icon className="h-5 w-5 text-[#388fe5] flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-gray-700">Generate a new Google Meet link (if applicable)</p>
                </div>
              )}
            </div>
            {selectedSlot && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertCircleIcon className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-amber-800">
                    <p className="font-medium">Note: Time slot change is currently not supported</p>
                    <p className="text-xs mt-1">The appointment will be reassigned to the new doctor but will keep its current time slot. Time slot changes require rescheduling the appointment separately.</p>
                  </div>
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowConfirmDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleReassign}
              disabled={loading}
              className="bg-[#388fe5] hover:bg-[#6fb043] text-white"
            >
              {loading ? (
                <>
                  <RefreshCwIcon className="h-4 w-4 mr-2 animate-spin" />
                  Reassigning...
                </>
              ) : (
                "Confirm Reassignment"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
