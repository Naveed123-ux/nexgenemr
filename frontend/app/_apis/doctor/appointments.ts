import { privateApi } from "@/lib/axios";
import axios from "axios";
import { CreateAppointmentRequest } from "@/hooks/types/types";

/**
 * Get all patients assigned to the logged-in doctor
 * Uses the same endpoint as the doctor homepage tracker
 */
export const getMyPatients = async () => {
  try {
    const response = await privateApi.get("/patient-list/doctor");
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
 * Get available slots for the logged-in doctor for a specific date
 */
export const getMyAvailableSlots = async (date: string) => {
  try {
    const response = await privateApi.get(
      `/appointments/me/available-slots?start_date=${date}`
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(
        error.response?.data?.detail || "Failed to fetch available slots"
      );
    }
    throw new Error("Failed to fetch available slots");
  }
};

/**
 * Get all upcoming available slots for the logged-in doctor
 */
export const getAllMyAvailableSlots = async () => {
  try {
    const response = await privateApi.get("/appointments/me/all-available-slots");
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(
        error.response?.data?.detail || "Failed to fetch available slots"
      );
    }
    throw new Error("Failed to fetch available slots");
  }
};

/**
 * Book an appointment (doctor booking for their patient)
 */
export const bookAppointment = async (data: CreateAppointmentRequest) => {
  try {
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
 * Search ICD codes for diagnosis
 */
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
    throw new Error("Failed to search ICD codes");
  }
};
