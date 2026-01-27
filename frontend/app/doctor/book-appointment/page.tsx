"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import {
  CalendarIcon,
  Loader2,
  CheckCircle2,
  Clock,
  User,
  Video,
  Stethoscope,
  Search,
  X
} from "lucide-react";
import { format } from "date-fns";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";
import {
  getMyPatients,
  getMyAvailableSlots,
  bookAppointment,
  searchIcdCodes,
} from "@/app/_apis/doctor/appointments";

// Form validation schema
const appointmentSchema = z.object({
  patient_user_id: z.number().min(1, "Please select a patient"),
  appointment_slot_id: z.number().min(1, "Please select a time slot"),
  is_telehealth: z.boolean(),
  reason_for_visit: z.string().min(3, "Please provide a reason for visit"),
  icd_code_id: z.number().optional(),
});

type AppointmentFormData = z.infer<typeof appointmentSchema>;

interface Patient {
  patientID: number;
  patient_name: string;
  assigned_md: string;
  visit_status: string;
  chief_complaint: string | null;
  length_of_stay: string;
  bay_or_room: string | null;
  triage_level: string | null;
  lab_status: string | null;
}

interface Slot {
  id: number;
  start_time: string;
  end_time: string;
  duration: number;
  slot_type: string;
  modality: string;
}

interface ICDCode {
  id: number;
  code: string;
  description: string;
}

export default function DoctorBookAppointment() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [loading, setLoading] = useState(false);
  const [loadingPatients, setLoadingPatients] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [icdSearchQuery, setIcdSearchQuery] = useState("");
  const [icdResults, setIcdResults] = useState<ICDCode[]>([]);
  const [selectedIcd, setSelectedIcd] = useState<ICDCode | null>(null);
  const [searchingIcd, setSearchingIcd] = useState(false);

  const form = useForm<AppointmentFormData>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      patient_user_id: 0,
      appointment_slot_id: 0,
      is_telehealth: false,
      reason_for_visit: "",
      icd_code_id: undefined,
    },
  });

  // Load patients on mount
  useEffect(() => {
    loadPatients();
  }, []);

  // Load slots when date changes
  useEffect(() => {
    if (selectedDate) {
      loadSlots(format(selectedDate, "yyyy-MM-dd"));
    }
  }, [selectedDate]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.patient-search-container')) {
        setShowPatientDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Search ICD codes with debounce
  useEffect(() => {
    if (icdSearchQuery.length >= 2) {
      const timer = setTimeout(() => {
        searchIcd();
      }, 500);
      return () => clearTimeout(timer);
    } else {
      setIcdResults([]);
    }
  }, [icdSearchQuery]);

  const loadPatients = async () => {
    try {
      setLoadingPatients(true);
      const data = await getMyPatients();
      setPatients(data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load patients");
    } finally {
      setLoadingPatients(false);
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
      toast.error(error instanceof Error ? error.message : "Failed to load slots");
      setSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  };

  const searchIcd = async () => {
    try {
      setSearchingIcd(true);
      const data = await searchIcdCodes(icdSearchQuery);
      setIcdResults(data);
    } catch (error) {
      console.error("Failed to search ICD codes:", error);
    } finally {
      setSearchingIcd(false);
    }
  };

  const selectIcdCode = (icd: ICDCode) => {
    setSelectedIcd(icd);
    form.setValue("icd_code_id", icd.id);
    setIcdSearchQuery("");
    setIcdResults([]);
  };

  const removeIcdCode = () => {
    setSelectedIcd(null);
    form.setValue("icd_code_id", undefined);
  };

  const onSubmit = async (data: AppointmentFormData) => {
    setLoading(true);
    let toastId;

    try {
      toastId = toast.loading("Booking appointment...");

      const appointmentData = {
        patient_user_id: data.patient_user_id,
        appointment_slot_id: data.appointment_slot_id,
        is_telehealth: data.is_telehealth,
        reason_for_visit: data.reason_for_visit,
        icd_code_id: data.icd_code_id || 0,
      };

      await bookAppointment(appointmentData);

      toast.success(
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5" />
          <div>
            <p className="font-semibold">Appointment booked successfully!</p>
            <p className="text-sm text-gray-600">Confirmation emails have been sent</p>
          </div>
        </div>,
        { id: toastId, duration: 5000 }
      );

      // Reset form and reload slots
      form.reset();
      setSelectedIcd(null);
      setSelectedDate(undefined);
      setSlots([]);
    } catch (error) {
      console.error("Error booking appointment:", error);
      if (toastId) toast.dismiss(toastId);
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
      toast.error(`Booking failed: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const filteredPatients = patients.filter((patient) =>
    patient.patient_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectPatient = (patient: Patient) => {
    setSelectedPatient(patient);
    setSearchQuery(patient.patient_name);
    setShowPatientDropdown(false);
    form.setValue("patient_user_id", patient.patientID);
  };

  const clearPatientSelection = () => {
    setSelectedPatient(null);
    setSearchQuery("");
    form.setValue("patient_user_id", 0);
  };

  const formatTime = (dateString: string) => {
    return format(new Date(dateString), "h:mm a");
  };

  return (
    <div className="bg-gray-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-[#388fe5] rounded-lg">
              <CalendarIcon className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-3xl font-semibold text-gray-900">Book Appointment</h1>
          </div>
          <p className="text-gray-600 ml-14">
            Schedule an appointment with one of your patients
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Patient Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Select Patient
                </CardTitle>
                <CardDescription>Choose from your assigned patients</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="patient_user_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Patient *</FormLabel>
                      <div className="relative patient-search-container">
                        {/* Search Input */}
                        <div className="relative">
                          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400 z-10" />
                          <Input
                            placeholder="Type patient name or email..."
                            value={searchQuery}
                            onChange={(e) => {
                              setSearchQuery(e.target.value);
                              setShowPatientDropdown(e.target.value.length > 0);
                            }}
                            onFocus={() => searchQuery.length > 0 && setShowPatientDropdown(true)}
                            className="pl-10 pr-10"
                          />
                          {selectedPatient && (
                            <button
                              type="button"
                              onClick={clearPatientSelection}
                              className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          )}
                        </div>

                        {/* Dropdown Results */}
                        {showPatientDropdown && searchQuery.length > 0 && (
                          <div className="absolute z-50 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-[300px] overflow-y-auto">
                            {loadingPatients ? (
                              <div className="flex items-center justify-center py-4">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span className="ml-2 text-sm">Loading patients...</span>
                              </div>
                            ) : filteredPatients.length === 0 ? (
                              <div className="py-4 text-center text-gray-500 text-sm">
                                No patients found
                              </div>
                            ) : (
                              filteredPatients.map((patient) => (
                                <button
                                  key={patient.patientID}
                                  type="button"
                                  onClick={() => selectPatient(patient)}
                                  className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b last:border-b-0 transition-colors"
                                >
                                  <div className="flex items-start gap-3">
                                    <div className="w-10 h-10 rounded-full bg-[#388fe5]/10 flex items-center justify-center flex-shrink-0">
                                      <User className="w-5 h-5 text-[#388fe5]" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="font-medium text-gray-900 truncate">
                                        {patient.patient_name}
                                      </p>
                                      <div className="flex items-center gap-2 mt-1">
                                        <Badge variant="outline" className="text-xs">
                                          {patient.visit_status}
                                        </Badge>
                                        {patient.chief_complaint && (
                                          <p className="text-xs text-gray-500 truncate">
                                            {patient.chief_complaint}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </button>
                              ))
                            )}
                          </div>
                        )}

                        {/* Selected Patient Display */}
                        {selectedPatient && (
                          <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-[#388fe5] flex items-center justify-center">
                                <User className="w-5 h-5 text-white" />
                              </div>
                              <div className="flex-1">
                                <p className="font-semibold text-gray-900">
                                  {selectedPatient.patient_name}
                                </p>
                                <div className="flex items-center gap-2 mt-1">
                                  <Badge variant="outline" className="text-xs">
                                    {selectedPatient.visit_status}
                                  </Badge>
                                  {selectedPatient.chief_complaint && (
                                    <p className="text-xs text-gray-600">
                                      {selectedPatient.chief_complaint}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <Badge variant="secondary" className="bg-green-100 text-green-800">
                                Selected
                              </Badge>
                            </div>
                          </div>
                        )}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Date and Slot Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Select Date & Time
                </CardTitle>
                <CardDescription>Choose an available slot from your schedule</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Date Picker */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Appointment Date *</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !selectedDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {selectedDate ? format(selectedDate, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={setSelectedDate}
                        disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Slot Selection */}
                {selectedDate && (
                  <FormField
                    control={form.control}
                    name="appointment_slot_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Available Time Slots *</FormLabel>
                        {loadingSlots ? (
                          <div className="flex items-center justify-center py-8">
                            <Loader2 className="w-6 h-6 animate-spin text-[#388fe5]" />
                            <span className="ml-2">Loading available slots...</span>
                          </div>
                        ) : slots.length === 0 ? (
                          <div className="text-center py-8 text-gray-500">
                            No available slots for this date
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                            {slots.map((slot) => (
                              <button
                                key={slot.id}
                                type="button"
                                onClick={() => field.onChange(slot.id)}
                                className={cn(
                                  "p-3 rounded-lg border-2 transition-all text-center hover:border-[#388fe5]",
                                  field.value === slot.id
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
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </CardContent>
            </Card>

            {/* Appointment Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Stethoscope className="w-5 h-5" />
                  Appointment Details
                </CardTitle>
                <CardDescription>Add clinical information and visit details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Telehealth Toggle */}
                <FormField
                  control={form.control}
                  name="is_telehealth"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="flex items-center gap-2">
                          <Video className="w-4 h-4" />
                          Telehealth Appointment
                        </FormLabel>
                        <FormDescription>
                          Enable video consultation via Google Meet
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Button
                          type="button"
                          variant={field.value ? "default" : "outline"}
                          size="sm"
                          onClick={() => field.onChange(!field.value)}
                          className={field.value ? "bg-[#388fe5] hover:bg-[#6fb043]" : ""}
                        >
                          {field.value ? "Enabled" : "Disabled"}
                        </Button>
                      </FormControl>
                    </FormItem>
                  )}
                />

                {/* Reason for Visit */}
                <FormField
                  control={form.control}
                  name="reason_for_visit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reason for Visit *</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="e.g., Annual checkup, Follow-up consultation, Symptom evaluation..."
                          className="min-h-[100px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* ICD Code Search */}
                <div className="space-y-3">
                  <label className="text-sm font-medium">Diagnosis Code (ICD-10)</label>
                  <p className="text-sm text-gray-500">Optional - Add a diagnosis code if known</p>

                  {selectedIcd ? (
                    <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <Badge variant="secondary" className="bg-blue-100">
                        {selectedIcd.code}
                      </Badge>
                      <span className="text-sm flex-1">{selectedIcd.description}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={removeIcdCode}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="relative">
                        <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          placeholder="Search ICD codes (e.g., diabetes, hypertension)..."
                          value={icdSearchQuery}
                          onChange={(e) => setIcdSearchQuery(e.target.value)}
                          className="pl-10"
                        />
                        {searchingIcd && (
                          <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-gray-400" />
                        )}
                      </div>

                      {icdResults.length > 0 && (
                        <div className="border rounded-lg max-h-[200px] overflow-y-auto">
                          {icdResults.map((icd) => (
                            <button
                              key={icd.id}
                              type="button"
                              onClick={() => selectIcdCode(icd)}
                              className="w-full text-left p-3 hover:bg-gray-50 border-b last:border-b-0 transition-colors"
                            >
                              <div className="flex items-start gap-2">
                                <Badge variant="outline" className="mt-0.5">
                                  {icd.code}
                                </Badge>
                                <span className="text-sm">{icd.description}</span>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Submit Button */}
            <div className="flex justify-end gap-4 sticky bottom-0 bg-gray-50 py-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  form.reset();
                  setSelectedIcd(null);
                  setSelectedDate(undefined);
                  setSlots([]);
                }}
                disabled={loading}
              >
                Clear Form
              </Button>
              <Button
                type="submit"
                disabled={loading}
                size="lg"
                className="bg-[#388fe5] hover:bg-[#6fb043]"
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {loading ? "Booking..." : "Book Appointment"}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
