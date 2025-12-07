import { privateApi } from "@/lib/axios";
import { CreatePrescriptionPayload } from "@/hooks/types/types";
import { isAxiosError } from "axios";

export const createPrescription = async (data: CreatePrescriptionPayload) => {
  try {
    const response = await privateApi.post("/prescriptions", data);
    return response.data;
  } catch (error) {
    if (isAxiosError(error)) {
      throw new Error(
        error.response?.data?.detail || "Failed to create prescription"
      );
    }
    throw new Error("An unknown error occurred");
  }
};

export const getPrescriptionsForPatient = async (patientProfileId: number) => {
  try {
    const response = await privateApi.get(
      `/prescriptions/patient/${patientProfileId}`
    );
    return response.data;
  } catch (error) {
    if (isAxiosError(error)) {
      throw new Error(
        error.response?.data?.detail || "Failed to fetch prescriptions"
      );
    }
    throw new Error("An unknown error occurred");
  }
};

export const cancelPrescription = async (prescriptionId: number) => {
  try {
    const response = await privateApi.put(
      `/prescriptions/${prescriptionId}/cancel`
    );
    return response.data;
  } catch (error) {
    if (isAxiosError(error)) {
      throw new Error(
        error.response?.data?.detail || "Failed to cancel prescription"
      );
    }
    throw new Error("An unknown error occurred");
  }
};

export const deletePrescription = async (prescriptionId: number) => {
  try {
    const response = await privateApi.delete(`/prescriptions/${prescriptionId}`);
    return response.data;
  } catch (error) {
    if (isAxiosError(error)) {
      throw new Error(
        error.response?.data?.detail || "Failed to delete prescription"
      );
    }
    throw new Error("An unknown error occurred");
  }
};
