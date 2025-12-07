import { CreateAppointmentRequest, PatientIntake } from "@/hooks/types/types";
import { privateApi } from "@/lib/axios";
import axios from "axios";
import { VitalSignsPayload, MedicalHistoryPayload } from "@/hooks/types/types";

export const submitPatientIntakeForm = async (data: PatientIntake) => {
  try {
    const response = await privateApi.post("/patients/", data);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(error.response?.data?.detail || "Submission failed");
    }
    throw new Error("Submission failed");
  }
};

/**
 * Fetch available slots for a doctor using the NEW slot-based API
 * @param doctorId - The doctor's user ID
 * @param date - The date in YYYY-MM-DD format
 * @returns Array of available slots
 */
export const fetchAvailableSlots = async (doctorId: number, date: string) => {
  try {
    // NEW ENDPOINT: /appointments/available-slots/{doctor_id}
    const response = await privateApi.get(
      `/appointments/available-slots/${doctorId}?start_date=${date}`
    );
    
    // The new API returns SlotResponse[] with more detailed information
    // Map to the format expected by the component
    const slots = response.data.map((slot: any) => ({
      id: slot.id,
      start_time: slot.start_time,
      end_time: slot.end_time,
      // Map slot status based on is_blocked and is_booked flags
      status: slot.is_booked 
        ? "Booked" 
        : slot.is_blocked 
        ? "Blocked" 
        : "Available",
      // Include waitlist data
      waitlist_match_count: slot.waitlist_match_count || 0,
      has_high_priority_matches: slot.has_high_priority_matches || false
    }));
    
    return slots;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(error.response?.data?.detail || "Failed to fetch slots");
    }
    throw new Error("Failed to fetch slots");
  }
};

export const fetchPatients = async (query: string, page: number) => {
  try {
    const response = await privateApi.get(
      `patients/search?q=${query}&page=${page}`
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(
        error.response?.data?.detail || "Failed to fetch patients"
      );
    }
    throw new Error("Failed to fetch patients");
  }
};

/**
 * Confirm and book an appointment using the slot-based API
 * @param data - Appointment booking data with appointment_slot_id
 * @returns Appointment confirmation data
 */
export const confirmAppointment = async (data: CreateAppointmentRequest) => {
  try {
    // Endpoint: POST /appointments/
    // Payload should include appointment_slot_id (not appointment_session_id)
    const response = await privateApi.post("/appointments/", data);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(
        error.response?.data?.detail || "Failed to book appointment"
      );
    }
    throw new Error("Failed to book appointment");
  }
};

/**
 * Get all appointments with pagination and filtering
 * @param page - Page number for pagination
 * @param date - Target date filter (YYYY-MM-DD)
 * @param query - Search query for patient/doctor name
 * @returns Paginated appointments data
 */
export const getAllAppointments = async (
  page: number,
  date: string | undefined,
  query: string
) => {
  try {
    // Endpoint: GET /appointments/ with query parameters
    const response = await privateApi.get(
      `/appointments/?page=${page}&target_date=${date}&query=${query}`
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(
        error.response?.data?.detail || "Failed to fetch appointments"
      );
    }
    throw new Error("Failed to fetch appointments");
  }
};
export const AddVitals = async (data: VitalSignsPayload, id: number | null) => {
  try {
    const response = await privateApi.post(`/clinical-data/vitals/${id}`, data);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(
        error.response?.data?.detail || "Failed to submit vitals"
      );
    }
    throw new Error("Failed to submit vitals");
  }
};

export const AddMedicalHistory = async (
  data: MedicalHistoryPayload,
  id: number | null
) => {
  try {
    const response = await privateApi.post(
      `/clinical-data/history/${id}`,
      data
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(
        error.response?.data?.detail || "Failed to submit medical history"
      );
    }
    throw new Error("Failed to submit medical history");
  }
};


export const searchIcdCodes = async (query: string) => {
  try {
    const response = await privateApi.get(`/icd-codes/search?query=${query}`);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(
        error.response?.data?.detail || "Failed to search ICD codes"
      );
    }
    throw new Error("An unknown error occurred while searching for codes.");
  }
};