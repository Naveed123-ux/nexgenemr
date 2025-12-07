import { privateApi } from "@/lib/axios";

export interface IcdCode {
  id: number;
  code: string;
  description: string;
}

export interface AppointmentIcdCode {
  id: number;
  appointment_id: number;
  icd_code_id: number;
  icd_code: IcdCode;
  added_at: string;
  added_by_user_id: number | null;
}

export interface AddIcdCodesRequest {
  icd_code_ids: number[];
}

export interface RemoveIcdCodeRequest {
  icd_code_id: number;
}

export interface ReplaceIcdCodesRequest {
  icd_code_ids: number[];
}

// Get all ICD codes for an appointment
export async function getAppointmentIcdCodes(appointmentId: number): Promise<AppointmentIcdCode[]> {
  try {
    const response = await privateApi.get<AppointmentIcdCode[]>(`/appointment/${appointmentId}/icd-codes`);
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.detail || "Failed to fetch appointment ICD codes");
  }
}

// Add ICD codes to an appointment
export async function addAppointmentIcdCodes(
  appointmentId: number,
  data: AddIcdCodesRequest
): Promise<AppointmentIcdCode[]> {
  try {
    const response = await privateApi.post<AppointmentIcdCode[]>(
      `/appointment/${appointmentId}/icd-codes`,
      data
    );
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.detail || "Failed to add ICD codes");
  }
}

// Remove an ICD code from an appointment
export async function removeAppointmentIcdCode(
  appointmentId: number,
  data: RemoveIcdCodeRequest
): Promise<AppointmentIcdCode[]> {
  try {
    const response = await privateApi.delete<AppointmentIcdCode[]>(
      `/appointment/${appointmentId}/icd-codes`,
      { data }
    );
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.detail || "Failed to remove ICD code");
  }
}

// Replace all ICD codes for an appointment
export async function replaceAppointmentIcdCodes(
  appointmentId: number,
  data: ReplaceIcdCodesRequest
): Promise<AppointmentIcdCode[]> {
  try {
    const response = await privateApi.put<AppointmentIcdCode[]>(
      `/appointment/${appointmentId}/icd-codes`,
      data
    );
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.detail || "Failed to replace ICD codes");
  }
}
