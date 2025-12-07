import { privateApi } from "@/lib/axios";
import { HospitalPatient } from "@/hooks/types/types";
import { isAxiosError } from "axios";

export const fetchAllHospitalPatients = async (): Promise<HospitalPatient[]> => {
  try {
    const response = await privateApi.get<HospitalPatient[]>("/patients/hospital/all");
    return response.data;
  } catch (error) {
    if (isAxiosError(error)) {
      if (error.response) {
        throw new Error(error.response.data.detail || "Failed to fetch hospital patients");
      } else if (error.request) {
        throw new Error("No response from server");
      } else {
        throw new Error("Error in request setup: " + error.message);
      }
    }
    throw new Error("Failed to fetch hospital patients");
  }
};
