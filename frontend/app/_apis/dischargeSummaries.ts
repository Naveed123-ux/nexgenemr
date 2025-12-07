import { privateApi } from "@/lib/axios";

export interface DischargeSummary {
  id: number;
  patient_user_id: number;
  doctor_user_id: number;
  hospital_id: number;
  discharge_date: string;
  admission_date: string;
  ai_generated_summary: string;
  hospital_course: string;
  discharge_diagnosis: string;
  discharge_medications: string;
  discharge_instructions: string;
  follow_up_plan: string;
  diet_and_activity?: string;
  warning_signs?: string;
  doctor_notes?: string;
  follow_up_instructions?: string;
  pdf_file_path?: string;
  word_file_path?: string;
  created_at: string;
  updated_at?: string;
  patient_name?: string;
  doctor_name?: string;
}

export interface CreateDischargeSummaryRequest {
  patient_user_id: number;
  discharge_date: string;
  admission_date: string;
  doctor_notes?: string;
  follow_up_instructions?: string;
}

export interface UpdateDischargeSummaryRequest {
  doctor_notes?: string;
  follow_up_instructions?: string;
}

// Create discharge summary (Doctor only)
export async function createDischargeSummary(
  data: CreateDischargeSummaryRequest
): Promise<DischargeSummary> {
  try {
    const response = await privateApi.post<DischargeSummary>("/discharge-summaries/", data);
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.detail || "Failed to create discharge summary");
  }
}

// Get discharge summary by ID
export async function getDischargeSummary(summaryId: number): Promise<DischargeSummary> {
  try {
    const response = await privateApi.get<DischargeSummary>(`/discharge-summaries/${summaryId}`);
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.detail || "Failed to fetch discharge summary");
  }
}

// Get patient's discharge summaries
export async function getPatientDischargeSummaries(
  patientUserId: number
): Promise<DischargeSummary[]> {
  try {
    const response = await privateApi.get<DischargeSummary[]>(
      `/discharge-summaries/patient/${patientUserId}`
    );
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.detail || "Failed to fetch patient summaries");
  }
}

// Get my discharge summaries (Patient only)
export async function getMyDischargeSummaries(): Promise<DischargeSummary[]> {
  try {
    const response = await privateApi.get<DischargeSummary[]>("/discharge-summaries/my/summaries");
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.detail || "Failed to fetch your summaries");
  }
}

// Update discharge summary (Doctor only)
export async function updateDischargeSummary(
  summaryId: number,
  data: UpdateDischargeSummaryRequest
): Promise<DischargeSummary> {
  try {
    const response = await privateApi.put<DischargeSummary>(
      `/discharge-summaries/${summaryId}`,
      data
    );
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.detail || "Failed to update discharge summary");
  }
}

// Download PDF
export async function downloadDischargeSummaryPDF(summaryId: number): Promise<Blob> {
  try {
    const response = await privateApi.get(`/discharge-summaries/${summaryId}/download/pdf`, {
      responseType: "blob",
    });
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.detail || "Failed to download PDF");
  }
}

// Download Word document
export async function downloadDischargeSummaryWord(summaryId: number): Promise<Blob> {
  try {
    const response = await privateApi.get(`/discharge-summaries/${summaryId}/download/word`, {
      responseType: "blob",
    });
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.detail || "Failed to download Word document");
  }
}

// Get recent summaries (Doctor only)
export async function getRecentDischargeSummaries(limit: number = 20): Promise<DischargeSummary[]> {
  try {
    const response = await privateApi.get<DischargeSummary[]>(
      `/discharge-summaries/doctor/recent?limit=${limit}`
    );
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.detail || "Failed to fetch recent summaries");
  }
}

// Get all hospital discharge summaries (Doctor or Staff)
export async function getHospitalDischargeSummaries(
  limit: number = 50,
  offset: number = 0
): Promise<DischargeSummary[]> {
  try {
    const response = await privateApi.get<DischargeSummary[]>(
      `/discharge-summaries/hospital/all?limit=${limit}&offset=${offset}`
    );
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.detail || "Failed to fetch hospital summaries");
  }
}

// Helper function to trigger download
export function triggerFileDownload(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}
