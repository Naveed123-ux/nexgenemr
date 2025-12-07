import { Appointment } from "@/store/slices/appointmentSlice";

// Re-exporting from the slice allows a single source of truth
export type { Appointment, UpcomingAppointment } from "@/store/slices/appointmentSlice";

export interface FormattedAppointment extends Appointment {
    date: Date;
    startTime: string;
    endTime: string;
    timeDisplay: string;
    reason_for_visit:string;
}