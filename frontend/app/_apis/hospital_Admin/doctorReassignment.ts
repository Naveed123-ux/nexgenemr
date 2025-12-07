/**
 * API functions for doctor appointment reassignment
 */

import { privateApi } from "@/lib/axios";

export interface Doctor {
  user_id: number;
  email: string;
  first_name: string;
  last_name: string;
  profile_id: number;
  specialization: string;
  department_name: string;
  profile_picture_url: string | null;
}

export interface PaginatedDoctorsResponse {
  total: number;
  page: number;
  size: number;
  totalPages: number;
  doctors: Doctor[];
}

export interface AppointmentSlot {
  id: number;
  start_time: string;
  end_time: string;
  duration: number;
  slot_type: string;
  modality: string | null;
  is_blocked: boolean;
  is_booked: boolean;
}

export interface Appointment {
  id: number;
  patient_id: number;
  patient_profile_id: number;
  patient_name: string;
  doctor_name: string;
  start_time: string;
  end_time: string;
  is_telehealth: boolean;
  status: string;
  reason_for_visit: string | null;
  google_meet_link: string | null;
  results: string | null;
}

export interface PaginatedAppointmentsResponse {
  total: number;
  page: number;
  size: number;
  totalPages: number;
  appointments: Appointment[];
}

export interface ReassignDoctorRequest {
  new_doctor_user_id: number;
  reason?: string;
}

export interface ReassignDoctorResponse {
  detail: string;
  appointment_id: number;
  patient_name: string;
  old_doctor: {
    id: number;
    name: string;
  };
  new_doctor: {
    id: number;
    name: string;
  };
  appointment_time: string;
  is_telehealth: boolean;
  new_meet_link: string | null;
}

/**
 * Get all doctors in the hospital (paginated)
 */
export const getDoctors = async (page: number = 1): Promise<PaginatedDoctorsResponse> => {
  const response = await privateApi.get(`/doctors/?page=${page}`);
  return response.data;
};

/**
 * Get ALL doctors in the hospital (fetches all pages)
 */
export const getAllDoctors = async (): Promise<Doctor[]> => {
  const allDoctors: Doctor[] = [];
  let currentPage = 1;
  let hasMorePages = true;

  while (hasMorePages) {
    const response = await getDoctors(currentPage);
    allDoctors.push(...response.doctors);
    
    // Check if there are more pages
    if (currentPage >= response.totalPages) {
      hasMorePages = false;
    } else {
      currentPage++;
    }
  }

  return allDoctors;
};

/**
 * Get all appointments for a specific date with optional search
 */
export const getAppointments = async (
  targetDate: string,
  page: number = 1,
  query?: string
): Promise<PaginatedAppointmentsResponse> => {
  let url = `/appointments/?page=${page}&target_date=${targetDate}`;
  if (query) {
    url += `&query=${encodeURIComponent(query)}`;
  }
  const response = await privateApi.get(url);
  return response.data;
};

/**
 * Get appointments for a specific doctor (Hospital Admin endpoint)
 * @param doctorId - The doctor's user ID
 * @param includePast - Include past appointments (default: false, only upcoming)
 */
export const getDoctorAppointments = async (
  doctorId: number,
  includePast: boolean = false
): Promise<Appointment[]> => {
  const url = `/appointments/admin/doctor/${doctorId}/appointments?include_past=${includePast}`;
  const response = await privateApi.get(url);
  return response.data;
};

/**
 * Get available slots for a specific doctor on a date
 */
export const getAvailableSlots = async (
  doctorId: number,
  startDate: string
): Promise<AppointmentSlot[]> => {
  const response = await privateApi.get(
    `/appointments/available-slots/${doctorId}?start_date=${startDate}`
  );
  return response.data;
};

/**
 * Reassign an appointment to a different doctor
 */
export const reassignAppointmentDoctor = async (
  appointmentId: number,
  data: ReassignDoctorRequest
): Promise<ReassignDoctorResponse> => {
  const response = await privateApi.put(
    `/appointments/appointment/${appointmentId}/reassign-doctor`,
    data
  );
  return response.data;
};

/**
 * Get appointment statistics for a doctor
 */
export const getDoctorStatistics = async (doctorId: number) => {
  const response = await privateApi.get(`/appointments/doctor/${doctorId}/statistics`);
  return response.data;
};
