// app/staff/appointments/_components/types.ts

import { Appointment as ApiAppointment, DoctorProfile as ApiDoctorProfile, PatientProfile as ApiPatientProfile, ScheduleSlot } from "@/hooks/types/types";

export type Appointment = ApiAppointment;
export type DoctorProfile = ApiDoctorProfile;
export type PatientProfile = ApiPatientProfile;

export interface SlotWithExtras extends ScheduleSlot {
  // FIX: Change 'string' to 'number'
  duration: number; 
}