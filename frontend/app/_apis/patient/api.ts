// FILE: app/_apis/patient/api.ts
import { privateApi } from "@/lib/axios";
import { isAxiosError } from "axios";
import { PatientDashboardData } from "@/hooks/types/types";

export const getPatientDashboard = async (): Promise<PatientDashboardData> => {
  try {
    const response = await privateApi.get<PatientDashboardData>("/patient/me");
    return response.data;
  } catch (error) {
    if (isAxiosError(error)) {
      throw new Error(
        error.response?.data?.detail || "Failed to fetch patient dashboard"
      );
    }
    throw new Error("An unknown error occurred while fetching the dashboard.");
  }
};